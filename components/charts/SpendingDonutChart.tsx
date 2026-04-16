import React from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslateCategory } from '../../lib/i18n';
import { CategoryIcon } from '../ui/CategoryIcon';
import { STRINGS } from '../../constants/strings';
import { formatAmount } from '../../utils/currency';
import { formatPercentage } from '../../utils/currency';
import type { CategorySpending } from '../../types/index';

interface SpendingDonutChartProps {
  data: CategorySpending[];
  totalExpense: number;
}

interface PieDataItem {
  value: number;
  color: string;
  text: string;
  focused?: boolean;
}

export function SpendingDonutChart({
  data,
  totalExpense,
}: SpendingDonutChartProps): React.ReactElement {
  const colors = useThemeColors();
  const tc = useTranslateCategory();
  if (data.length === 0) {
    return (
      <View className="mx-4 mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 }}>
          {STRINGS.SPENDING_BY_CATEGORY}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
          {STRINGS.NO_TRANSACTIONS_DESC}
        </Text>
      </View>
    );
  }

  const pieData: PieDataItem[] = data.map((item, index) => ({
    value: item.total,
    color: item.category_color || colors.chart[index % colors.chart.length],
    text: formatPercentage(item.percentage),
    focused: index === 0,
  }));

  const centerLabel = (): React.ReactElement => {
    const formatted = formatAmount(totalExpense, { compact: true });
    const fontSize = formatted.length > 8 ? 13 : formatted.length > 6 ? 15 : 18;
    return (
      <View className="items-center justify-center" style={{ width: 90, alignSelf: 'center' }}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>Total</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}
        >
          {formatted}
        </Text>
      </View>
    );
  };

  return (
    <View className="mx-4 mb-4 rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 16,
        }}
      >
        {STRINGS.SPENDING_BY_CATEGORY}
      </Text>

      <View className="items-center mb-4">
        <PieChart
          data={pieData}
          donut
          showText={false}
          innerRadius={55}
          radius={85}
          centerLabelComponent={centerLabel}
          focusOnPress
          toggleFocusOnPress
          innerCircleColor={colors.surface}
        />
      </View>

      {/* Legend */}
      <View className="gap-2">
        {data.map((item) => (
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
              <Text style={{ fontSize: 12, color: colors.textSecondary, width: 45, textAlign: 'right' }}>
                {formatPercentage(item.percentage)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
