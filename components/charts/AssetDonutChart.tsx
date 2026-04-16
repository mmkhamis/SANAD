import React from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatAmount, formatPercentage } from '../../utils/currency';
import type { PortfolioSummary } from '../../types/index';

interface AssetDonutChartProps {
  portfolio: PortfolioSummary;
}

const ASSET_COLORS: Record<'gold' | 'silver' | 'crypto' | 'stock', string> = {
  gold: '#F59E0B',
  silver: '#94A3B8',
  crypto: '#F97316',
  stock: '#3B82F6',
};

const ASSET_LABELS: Record<'gold' | 'silver' | 'crypto' | 'stock', string> = {
  gold: 'Gold',
  silver: 'Silver',
  crypto: 'Crypto',
  stock: 'Stocks',
};

interface PieDataItem {
  value: number;
  color: string;
  text: string;
  focused?: boolean;
}

export function AssetDonutChart({ portfolio }: AssetDonutChartProps): React.ReactElement {
  const colors = useThemeColors();
  const { breakdown, total_value } = portfolio;

  const segments: { key: keyof typeof ASSET_COLORS; value: number; color: string; label: string }[] = [];
  if (breakdown.gold > 0) segments.push({ key: 'gold', value: breakdown.gold, color: ASSET_COLORS.gold, label: ASSET_LABELS.gold });
  if (breakdown.silver > 0) segments.push({ key: 'silver', value: breakdown.silver, color: ASSET_COLORS.silver, label: ASSET_LABELS.silver });
  if (breakdown.crypto > 0) segments.push({ key: 'crypto', value: breakdown.crypto, color: ASSET_COLORS.crypto, label: ASSET_LABELS.crypto });
  if (breakdown.stock > 0) segments.push({ key: 'stock', value: breakdown.stock, color: ASSET_COLORS.stock, label: ASSET_LABELS.stock });

  if (segments.length === 0 || total_value === 0) return <></>;

  const pieData: PieDataItem[] = segments.map((s, i) => ({
    value: s.value,
    color: s.color,
    text: formatPercentage((s.value / total_value) * 100),
    focused: i === 0,
  }));

  const centerLabel = (): React.ReactElement => {
    const formatted = formatAmount(total_value, { compact: true });
    const fontSize = formatted.length > 8 ? 12 : formatted.length > 6 ? 14 : 16;
    return (
      <View className="items-center justify-center" style={{ width: 80, alignSelf: 'center' }}>
        <Text style={{ fontSize: 10, color: colors.textSecondary }}>Total</Text>
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
    <View className="mx-4 mt-3 rounded-2xl p-4" style={{ backgroundColor: colors.surface }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 16,
        }}
      >
        Portfolio Allocation
      </Text>

      <View className="items-center mb-4">
        <PieChart
          data={pieData}
          donut
          showText={false}
          innerRadius={50}
          radius={75}
          centerLabelComponent={centerLabel}
          focusOnPress
          toggleFocusOnPress
          innerCircleColor={colors.surface}
        />
      </View>

      <View className="gap-2">
        {segments.map((s) => {
          const pct = (s.value / total_value) * 100;
          return (
            <View key={s.key} className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>
                  {s.label}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                  {formatAmount(s.value)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, width: 45, textAlign: 'right' }}>
                  {formatPercentage(pct)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
