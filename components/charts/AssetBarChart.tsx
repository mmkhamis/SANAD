import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-gifted-charts';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatAmount } from '../../utils/currency';
import type { PortfolioSummary } from '../../types/index';

const ASSET_COLORS: Record<'gold' | 'silver' | 'crypto' | 'stock', string> = {
  gold: '#F59E0B',
  silver: '#94A3B8',
  crypto: '#F97316',
  stock: '#3B82F6',
};

const ASSET_EMOJI: Record<'gold' | 'silver' | 'crypto' | 'stock', string> = {
  gold: '🥇',
  silver: '🥈',
  crypto: '₿',
  stock: '📈',
};

interface BarDataItem {
  value: number;
  frontColor: string;
  label: string;
  topLabelComponent?: () => React.ReactElement;
}

export function AssetBarChart({ portfolio }: { portfolio: PortfolioSummary }): React.ReactElement {
  const colors = useThemeColors();
  const { breakdown, total_value } = portfolio;

  const segments: { key: keyof typeof ASSET_COLORS; value: number; color: string; label: string }[] = [];
  if (breakdown.gold > 0) segments.push({ key: 'gold', value: breakdown.gold, color: ASSET_COLORS.gold, label: ASSET_EMOJI.gold });
  if (breakdown.silver > 0) segments.push({ key: 'silver', value: breakdown.silver, color: ASSET_COLORS.silver, label: ASSET_EMOJI.silver });
  if (breakdown.crypto > 0) segments.push({ key: 'crypto', value: breakdown.crypto, color: ASSET_COLORS.crypto, label: ASSET_EMOJI.crypto });
  if (breakdown.stock > 0) segments.push({ key: 'stock', value: breakdown.stock, color: ASSET_COLORS.stock, label: ASSET_EMOJI.stock });

  if (segments.length === 0 || total_value === 0) return <></>;

  const maxValue = Math.max(...segments.map((s) => s.value), 1);
  const textColor = colors.textPrimary;
  const barData: BarDataItem[] = segments.map((s) => ({
    value: s.value,
    frontColor: s.color,
    label: s.label,
    topLabelComponent: () => (
      <Text style={{ fontSize: 13, color: textColor, marginBottom: 2, fontWeight: '700' }}>
        {formatAmount(s.value, { compact: true })}
      </Text>
    ),
  }));

  return (
    <View className="mx-4 mt-3 rounded-2xl overflow-hidden" style={{
      borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
      shadowColor: colors.isDark ? '#8B5CF6' : '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: colors.isDark ? 0.15 : 0.06,
      shadowRadius: 16,
      elevation: 5,
    }}>
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
          : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
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
        <View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 }}>
            Asset Breakdown
          </Text>

          <View className="items-center">
            <BarChart
              data={barData}
              barWidth={50}
              spacing={28}
              height={160}
              maxValue={maxValue * 1.3}
              noOfSections={3}
              barBorderRadius={10}
              hideYAxisText
              yAxisThickness={0}
              yAxisLabelWidth={0}
              xAxisLabelTextStyle={{ fontSize: 20, color: colors.textPrimary }}
              xAxisThickness={0.5}
              xAxisColor={colors.borderLight}
              rulesColor={colors.borderLight}
              rulesType="dashed"
              hideRules
              animationDuration={0}
              showValuesAsTopLabel
              labelsExtraHeight={30}
              topLabelContainerStyle={{ marginBottom: 6 }}
              backgroundColor={'transparent'}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
