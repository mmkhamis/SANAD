import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { parseISO } from 'date-fns';
import { Image } from 'expo-image';

import { Card } from '../ui/Card';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { formatAmount } from '../../utils/currency';
import { formatFullDate } from '../../utils/locale-format';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { impactMedium } from '../../utils/haptics';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { findBrand } from '../../constants/brand-presets';
import { COLORS } from '../../constants/colors';
import type { Transaction } from '../../types/index';

interface TransactionDateSectionProps {
  dateKey: string;
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onSplit: (transaction: Transaction) => void;
}

interface TabRowProps {
  transaction: Transaction;
  showDivider: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onSplit: (transaction: Transaction) => void;
}

function TransactionsTabRow({
  transaction,
  showDivider,
  onEdit,
  onDelete,
  onSplit,
}: TabRowProps): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL, rowDir, textAlign } = useRTL();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const tc = useTranslateCategory();

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const brand = findBrand(transaction.merchant) ?? findBrand(transaction.description);
  const displayName = brand ? (isRTL ? brand.nameAr : brand.nameEn) : transaction.description;
  const categoryLabel = isTransfer
    ? t('TRANSFER')
    : (tc(transaction.category_name ?? '') || t('UNCATEGORIZED'));
  const subtitleParts = [
    transaction.counterparty && transaction.counterparty !== displayName ? transaction.counterparty : null,
    transaction.merchant && transaction.merchant !== displayName ? transaction.merchant : null,
    categoryLabel,
  ].filter((value): value is string => !!value);
  const subtitle = Array.from(new Set(subtitleParts)).join(' · ');
  const amountTypeLabel = isIncome ? t('INCOME') : isTransfer ? t('TRANSFER') : t('EXPENSE');

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
              transaction.description,
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
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <View
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: brand?.logo
              ? (colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,10,30,0.05)')
              : (transaction.category_color ?? colors.textTertiary) + '18',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(16,10,30,0.06)',
          }}
        >
          {brand?.logo ? (
            <Image
              source={{ uri: brand.logo }}
              style={{ width: 24, height: 24, borderRadius: 6 }}
              contentFit="contain"
            />
          ) : (
            <CategoryIcon
              name={transaction.category_icon ?? 'smartphone'}
              size={20}
              color={transaction.category_color ?? colors.textSecondary}
            />
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.textPrimary,
              textAlign,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}
          >
            {displayName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              marginTop: 3,
              fontSize: 12.5,
              color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
              textAlign,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', minWidth: 92 }}>
          {hidden ? (
            <Text style={{ fontSize: 15, fontWeight: '700', color: amountColor }}>••••</Text>
          ) : (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: amountColor,
                fontVariant: ['tabular-nums'],
              }}
            >
              {sign}{formatAmount(Math.abs(transaction.amount))}
            </Text>
          )}
          <Text
            numberOfLines={1}
            style={{
              marginTop: 3,
              fontSize: 13,
              fontWeight: '600',
              color: colors.textTertiary,
            }}
          >
            {hidden ? '••••' : amountTypeLabel}
          </Text>
        </View>
      </View>

      {showDivider ? (
        <View
          style={{
            height: 1,
            marginLeft: isRTL ? 16 : 72,
            marginRight: isRTL ? 72 : 16,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,10,30,0.06)',
          }}
        />
      ) : null}
    </Pressable>
  );
}

export const TransactionDateSection = React.memo(function TransactionDateSection({
  dateKey,
  transactions,
  onEdit,
  onDelete,
  onSplit,
}: TransactionDateSectionProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign } = useRTL();

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <View
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(16,10,30,0.08)',
          }}
        />
        <View
          style={{
            borderRadius: 999,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(16,10,30,0.08)',
          }}
        >
          <LinearGradient
            colors={
              colors.isDark
                ? ['rgba(139,92,246,0.16)', 'rgba(255,255,255,0.03)']
                : ['rgba(255,255,255,0.98)', 'rgba(238,235,248,0.92)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 14, paddingVertical: 7 }}
          >
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '700',
                color: colors.isDark ? COLORS.claude.fg2 : colors.textSecondary,
                textAlign,
              }}
            >
              {formatFullDate(parseISO(dateKey))}
            </Text>
          </LinearGradient>
        </View>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(16,10,30,0.08)',
          }}
        />
      </View>

      <Card noPadding style={{ overflow: 'hidden' }}>
        {transactions.map((transaction, index) => (
          <TransactionsTabRow
            key={transaction.id}
            transaction={transaction}
            showDivider={index < transactions.length - 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onSplit={onSplit}
          />
        ))}
      </Card>
    </View>
  );
});
