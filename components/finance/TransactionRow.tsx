import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { parseISO } from 'date-fns';
import { Image } from 'expo-image';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { formatCompactNumberLocale } from '../../utils/currency';
import { useLanguageStore } from '../../store/language-store';
import { formatShortDate } from '../../utils/locale-format';
import { CurrencyIcon, hasCurrencyIcon } from '../ui/CurrencyIcon';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useSettingsStore } from '../../store/settings-store';
import { usePrivacyStore } from '../../store/privacy-store';
import { findBrand } from '../../constants/brand-presets';
import { useRTL } from '../../hooks/useRTL';
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
  const { isRTL, textAlign, rowDir } = useRTL();
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const hidden = usePrivacyStore((s) => s.hidden);
  const currency = useSettingsStore((s) => s.activeCurrency);
  const hasIcon = hasCurrencyIcon(currency);
  const language = useLanguageStore((s) => s.language);

  const brand = findBrand(transaction.merchant) ?? findBrand(transaction.description);
  const displayName = brand
    ? (isRTL ? brand.nameAr : brand.nameEn)
    : transaction.description;

  const handlePress = (): void => {
    onPress?.(transaction);
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        flexDirection: rowDir,
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 11,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Brand logo or Category Icon Circle */}
      {brand?.logo ? (
        <View
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <Image
            source={{ uri: brand.logo }}
            style={{ width: 24, height: 24, borderRadius: 4 }}
            contentFit="contain"
          />
        </View>
      ) : (
        <View
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isRTL ? 0 : 12,
            marginLeft: isRTL ? 12 : 0,
            backgroundColor: (transaction.category_color ?? colors.textTertiary) + '20',
          }}
        >
          <CategoryIcon
            name={transaction.category_icon ?? 'smartphone'}
            size={20}
            color={transaction.category_color ?? colors.textSecondary}
          />
        </View>
      )}

      {/* Description & Category */}
      <View style={{ flex: 1, marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
            textAlign,
            writingDirection: isRTL ? 'rtl' : 'ltr',
          }}
        >
          {displayName}
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
            textAlign,
            writingDirection: isRTL ? 'rtl' : 'ltr',
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
            {formatCompactNumberLocale(Math.abs(transaction.amount), language)}
          </Text>
          <CurrencyIcon currency={currency} size={13} color={amountColor} />
        </View>
      ) : (
        <Text style={{ fontSize: 15, fontWeight: '600', color: amountColor }}>
          {sign}{formatCompactNumberLocale(Math.abs(transaction.amount), language)}
        </Text>
      )}
    </Pressable>
  );
});
