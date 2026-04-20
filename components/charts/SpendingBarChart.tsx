import React from 'react';
import { View, Text } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useRTL } from '../../hooks/useRTL';
import { formatAmount, formatPercentage } from '../../utils/currency';
import { COLORS } from '../../constants/colors';
import type { CategorySpending } from '../../types/index';

// Claude Design category palette — oklch-approx hex values.
// Rotates across slices to match the prototype's donut/bar visual language.
const CLAUDE_CHART_PALETTE = [
  '#E89B6E', // warm orange (mطاعم)
  '#A278EA', // purple (تسوق)
  '#6FB4E8', // blue (تنقل)
  '#7FD6A8', // green (ترفيه)
  '#9AA0C0', // neutral (أخرى)
];

interface SpendingBarChartProps {
  data: CategorySpending[];
  totalExpense: number;
  /** Bar width in px. Default 36. Use smaller (e.g. 22) for compact/sheet display. */
  barWidth?: number;
}

interface BarDataItem {
  value: number;
  frontColor: string;
  label: string;
  topLabelComponent?: () => React.ReactElement;
}

export function SpendingBarChart({
  data,
  totalExpense,
  barWidth = 36,
}: SpendingBarChartProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const { rowDir, textAlign } = useRTL();
  if (data.length === 0) {
    return (
      <View className="mx-4 mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12, textAlign }}>
          {t('SPENDING_BY_CATEGORY')}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
          {t('NO_TRANSACTIONS_DESC')}
        </Text>
      </View>
    );
  }

  const top5 = data.slice(0, 5);
  const maxValue = Math.max(...top5.map((d) => d.total), 1);

  const barData: BarDataItem[] = top5.map((item, index) => ({
    value: item.total,
    frontColor: item.category_color || CLAUDE_CHART_PALETTE[index % CLAUDE_CHART_PALETTE.length],
    label: '',
    topLabelComponent: () => (
      <Text style={{ fontSize: 10, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, marginBottom: 2, fontWeight: '500' }}>
        {formatAmount(item.total, { compact: true })}
      </Text>
    ),
  }));

  return (
    <View
      className="mx-4 mb-4"
      style={{
        borderRadius: 20,
        padding: 18,
        backgroundColor: colors.isDark ? COLORS.claude.glass1 : colors.surface,
        borderWidth: 1,
        borderColor: colors.isDark ? COLORS.claude.stroke : colors.glassBorder,
      }}
    >
      <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary }}>
          {t('SPENDING_BY_CATEGORY')}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.isDark ? COLORS.claude.p200 : colors.primary }}>
          {formatAmount(totalExpense, { compact: true })}
        </Text>
      </View>

      <View className="items-center mb-4">
        <BarChart
          data={barData}
          barWidth={barWidth}
          spacing={barWidth < 30 ? 14 : 20}
          noOfSections={4}
          maxValue={maxValue * 1.15}
          barBorderTopLeftRadius={6}
          barBorderTopRightRadius={6}
          xAxisThickness={1}
          yAxisThickness={0}
          xAxisColor={colors.isDark ? COLORS.claude.stroke : colors.border}
          yAxisTextStyle={{ fontSize: 10, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}
          hideRules
          animationDuration={0}
          height={160}
          formatYLabel={(val: string) => formatAmount(Number(val), { compact: true })}
        />
      </View>

      {/* Legend */}
      <View className="gap-2">
        {top5.map((item) => (
          <View key={item.category_id} className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.category_color }}
              />
              <CategoryIcon
                name={item.category_icon ?? 'circle-help'}
                size={14}
                color={item.category_color ?? colors.textSecondary}
              />
              <Text
                numberOfLines={1}
                style={{ fontSize: 14, color: colors.textPrimary, flex: 1 }}
              >
                {tc(item.category_name)}
              </Text>
            </View>
            <View className="flex-row items-center gap-3">
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                {formatAmount(item.total)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, width: 45, textAlign }}>
                {formatPercentage(item.percentage)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
