import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatAmount } from '../../utils/currency';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import type { MonthSummary } from '../../types/index';
import { STRINGS } from '../../constants/strings';

interface MonthSummaryCardProps {
  summary: MonthSummary;
  onIncomePress?: () => void;
  onExpensePress?: () => void;
}

export const MonthSummaryCard = React.memo(function MonthSummaryCard({ summary, onIncomePress, onExpensePress }: MonthSummaryCardProps): React.ReactElement {
  const colors = useThemeColors();
  const isPositive = summary.net_balance >= 0;
  const hidden = usePrivacyStore((s) => s.hidden);

  return (
    <View className="px-4">
      {/* Income / Expense Row */}
      <View className="flex-row gap-3">
        <Pressable
          onPress={onIncomePress}
          className="flex-1 rounded-2xl p-4"
          style={({ pressed }) => ({
            backgroundColor: colors.incomeBg,
            opacity: pressed && onIncomePress ? 0.7 : 1,
          })}
        >
          <View className="flex-row items-center gap-2 mb-1">
            <TrendingUp size={16} color={colors.income} strokeWidth={2} />
            <Text style={{ fontSize: 13, color: colors.income, fontWeight: '500' }}>
              {STRINGS.TOTAL_INCOME}
            </Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 24, fontWeight: '700', color: colors.income }}>
            {maskIfHidden(formatAmount(summary.total_income), hidden)}
          </Text>
        </Pressable>

        <Pressable
          onPress={onExpensePress}
          className="flex-1 rounded-2xl p-4"
          style={({ pressed }) => ({
            backgroundColor: colors.expenseBg,
            opacity: pressed && onExpensePress ? 0.7 : 1,
          })}
        >
          <View className="flex-row items-center gap-2 mb-1">
            <TrendingDown size={16} color={colors.expense} strokeWidth={2} />
            <Text style={{ fontSize: 13, color: colors.expense, fontWeight: '500' }}>
              {STRINGS.TOTAL_SPENT}
            </Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 24, fontWeight: '700', color: colors.expense }}>
            {maskIfHidden(formatAmount(summary.total_expense), hidden)}
          </Text>
        </Pressable>
      </View>

      {/* Net Balance */}
      <View
        className="mt-3 rounded-2xl p-4 flex-row items-center justify-between"
        style={{
          backgroundColor: colors.glassBg,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textSecondary }}>
          {STRINGS.NET_BALANCE}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: isPositive ? colors.income : colors.expense,
            flexShrink: 1,
          }}
        >
          {maskIfHidden(formatAmount(summary.net_balance, { showSign: true }), hidden)}
        </Text>

      </View>
    </View>
  );
});
