import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MessageSquareWarning, ChevronRight, ChevronLeft } from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { formatAmount } from '../../utils/currency';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import type { Transaction } from '../../types/index';

interface SMSReviewBannerProps {
  count: number;
  transactions?: Transaction[];
  onPress: () => void;
}

const MAX_PREVIEW = 3;

export function SMSReviewBanner({ count, transactions, onPress }: SMSReviewBannerProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL } = useRTL();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  const preview = (transactions ?? []).slice(0, MAX_PREVIEW);

  return (
    <Pressable
      onPress={() => {
        impactLight();
        onPress();
      }}
      className="mx-4 my-2 rounded-xl overflow-hidden"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.warning + '40',
      }}
    >
      {/* Header row */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ backgroundColor: colors.warning + '08' }}
      >
        <View
          className="h-8 w-8 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: colors.warning + '18' }}
        >
          <MessageSquareWarning size={16} color={colors.warning} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
            {count} {count > 1 ? t('TRANSACTIONS_TO_REVIEW') : t('TRANSACTION_TO_REVIEW')}
          </Text>
        </View>
        <Chevron size={18} color={colors.textTertiary} strokeWidth={2} />
      </View>

      {/* Transaction previews */}
      {preview.length > 0 ? (
        <View className="px-4 pb-3 pt-1">
          {preview.map((tx, i) => {
            const isIncome = tx.type === 'income';
            return (
              <View
                key={tx.id}
                className="flex-row items-center py-2"
                style={i < preview.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.borderLight } : undefined}
              >
                <View
                  className="h-6 w-6 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: colors.primary + '12' }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                    #{i + 1}
                  </Text>
                </View>
                <View className="flex-1 mr-2">
                  <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>
                    {tx.description || 'Unknown'}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isIncome ? colors.income : colors.expense,
                  }}
                >
                  {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
                </Text>
              </View>
            );
          })}
          {count > MAX_PREVIEW ? (
            <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
              +{count - MAX_PREVIEW} {t('MORE')}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
