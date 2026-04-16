import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { parseISO } from 'date-fns';
import { Pencil, Users } from 'lucide-react-native';
import { CategoryIcon } from '../ui/CategoryIcon';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatAmount } from '../../utils/currency';
import { formatShortDate } from '../../utils/locale-format';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { impactMedium } from '../../utils/haptics';
import { useT, useTranslateCategory } from '../../lib/i18n';
import type { Transaction } from '../../types/index';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onSplit: (transaction: Transaction) => void;
}

export const TransactionCard = React.memo(function TransactionCard({
  transaction,
  onEdit,
  onDelete,
  onSplit,
}: TransactionCardProps): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const tc = useTranslateCategory();
  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';

  const handleLongPress = (): void => {
    impactMedium();
    Alert.alert(
      transaction.description,
      `${t('AMOUNT_LABEL' as any)}: ${maskIfHidden(formatAmount(Math.abs(transaction.amount)), hidden)}`,
      [
        {
          text: t('ACTION_EDIT' as any),
          onPress: () => onEdit(transaction),
          style: 'default',
        },
        {
          text: t('ACTION_SPLIT_BILL' as any),
          onPress: () => onSplit(transaction),
          style: 'default',
        },
        {
          text: t('ACTION_DELETE' as any),
          onPress: () => {
            Alert.alert(
              t('DELETE_TRANSACTION' as any),
              `${transaction.description}`,
              [
                { text: t('CANCEL'), style: 'cancel' },
                {
                  text: t('DELETE'),
                  style: 'destructive',
                  onPress: () => onDelete(transaction.id),
                },
              ],
            );
          },
          style: 'destructive',
        },
        { text: t('CANCEL'), style: 'cancel' },
      ],
    );
  };

  return (
    <Pressable
      onPress={() => onEdit(transaction)}
      onLongPress={handleLongPress}
      delayLongPress={400}
      style={({ pressed }) => ({
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
        opacity: pressed ? 0.9 : 1,
        shadowColor: colors.isDark ? '#8B5CF6' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.15 : 0.06,
        shadowRadius: 8,
        elevation: 2,
      })}
    >
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
          : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 14, flexDirection: 'row', alignItems: 'center' }}
      >
        {/* Metallic sheen */}
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
            : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Subtle shimmer */}
        {colors.isDark ? (
          <LinearGradient
            colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
        {/* Content */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {/* Category icon */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: (transaction.category_color ?? colors.textTertiary) + '15',
            }}
          >
            <CategoryIcon
              name={transaction.category_icon ?? 'smartphone'}
              size={20}
              color={transaction.category_color ?? colors.textSecondary}
            />
          </View>
          {/* Description + date */}
          <View style={{ flex: 1, marginRight: 10 }}>
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
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {tc(transaction.category_name ?? '') || t('UNCATEGORIZED')} · {formatShortDate(parseISO(transaction.date))}
              {transaction.merchant ? ` · ${transaction.merchant}` : ''}
            </Text>
          </View>
          {/* Amount + action icons */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: amountColor,
              }}
            >
              {sign}{maskIfHidden(formatAmount(Math.abs(transaction.amount)), hidden)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Pencil size={12} color={colors.textTertiary} strokeWidth={2} />
              <Users size={12} color={colors.textTertiary} strokeWidth={2} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
});
