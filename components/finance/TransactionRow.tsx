import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { parseISO } from 'date-fns';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { formatCompactNumber } from '../../utils/currency';
import { formatShortDate } from '../../utils/locale-format';
import { CurrencyIcon, hasCurrencyIcon } from '../ui/CurrencyIcon';
import { useSettingsStore } from '../../store/settings-store';
import { usePrivacyStore } from '../../store/privacy-store';
import type { Transaction } from '../../types/index';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: (transaction: Transaction) => void;
  onLongPress?: () => void;
}

export const TransactionRow = React.memo(function TransactionRow({ transaction, onPress, onLongPress }: TransactionRowProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const hidden = usePrivacyStore((s) => s.hidden);
  const currency = useSettingsStore((s) => s.activeCurrency);
  const hasIcon = hasCurrencyIcon(currency);

  const handlePress = (): void => {
    onPress?.(transaction);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Category Icon Circle */}
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          backgroundColor: (transaction.category_color ?? colors.textTertiary) + '20',
        }}
      >
        <Text style={{ fontSize: 18 }}>{transaction.category_icon ?? '📱'}</Text>
      </View>

      {/* Description & Category */}
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          {transaction.description}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          {tc(transaction.category_name ?? '') || t('UNCATEGORIZED')} · {formatShortDate(parseISO(transaction.date))}
        </Text>
      </View>

      {/* Amount — inline beside description */}
      {hidden ? (
        <Text style={{ fontSize: 15, fontWeight: '600', color: amountColor }}>••••</Text>
      ) : hasIcon ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: amountColor }}>{sign}</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: amountColor }}>
            {formatCompactNumber(Math.abs(transaction.amount))}
          </Text>
          <CurrencyIcon currency={currency} size={13} color={amountColor} />
        </View>
      ) : (
        <Text style={{ fontSize: 15, fontWeight: '600', color: amountColor }}>
          {sign}{formatCompactNumber(Math.abs(transaction.amount))}
        </Text>
      )}
    </Pressable>
  );
});
