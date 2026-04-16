import React from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Users } from 'lucide-react-native';

import { formatAmount } from '../../utils/currency';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { BenchmarkComparison, BenchmarkSummary } from '../../types/index';

// ─── Single comparison row ───────────────────────────────────────────

function BenchmarkRow({ item }: { item: BenchmarkComparison }): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);
  const absDiff = Math.abs(Math.round(item.diff_percent));
  const isAbove = item.diff_percent > 5;
  const isBelow = item.diff_percent < -5;
  const isClose = !isAbove && !isBelow;

  const diffColor = isAbove ? colors.expense : isBelow ? colors.income : colors.textSecondary;
  const DiffIcon = isAbove ? TrendingUp : isBelow ? TrendingDown : Minus;

  return (
    <View
      className="rounded-2xl p-4 mb-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {/* Category row */}
      <View className="flex-row items-center mb-3">
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: item.category_color + '12',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Text style={{ fontSize: 18 }}>{item.category_icon}</Text>
        </View>
        <View className="flex-1">
          <Text
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
          >
            {item.category_name}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>
            {item.sample_size} users in cohort
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <DiffIcon size={14} color={diffColor} strokeWidth={2.5} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: diffColor }}>
            {isClose ? '≈' : `${isAbove ? '+' : '-'}${absDiff}%`}
          </Text>
        </View>
      </View>

      {/* Amounts */}
      <View className="flex-row justify-between">
        <View>
          <Text style={{ fontSize: 11, color: colors.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Your spend
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
            {maskIfHidden(formatAmount(item.user_spend), hidden)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: colors.textTertiary, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            Avg. Benchmark
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textSecondary, marginTop: 2 }}>
            {maskIfHidden(formatAmount(item.benchmark_average), hidden)}
          </Text>
        </View>
      </View>

      {/* Insight */}
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8, lineHeight: 17 }}>
        {item.insight}
      </Text>
    </View>
  );
}

// ─── No data fallback ────────────────────────────────────────────────

function BenchmarkNoData(): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      className="mx-4 mb-4 rounded-2xl p-4 items-center"
      style={{
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <Users size={20} color={colors.textTertiary} strokeWidth={1.8} />
      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 18 }}>
        Not enough anonymous data for your age group and region yet.{'\n'}Check back as more Wallet users opt in.
      </Text>
    </View>
  );
}

// ─── Benchmark Section (for analytics screen) ────────────────────────

interface BenchmarkSectionProps {
  summary: BenchmarkSummary;
}

export function BenchmarkSection({ summary }: BenchmarkSectionProps): React.ReactElement | null {
  const colors = useThemeColors();
  // Should not render if user hasn't set profile (unlock card handles that)
  if (!summary.has_profile) return null;

  return (
    <View className="mt-2">
      {/* Section header */}
      <View className="flex-row items-center gap-2 px-4 mb-3">
        <Users size={18} color={colors.primary} strokeWidth={2} />
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
            How You Compare
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }}>
            Your spending vs. similar users · Age {summary.age_band} · {summary.region_name}
          </Text>
        </View>
      </View>

      {/* Disclaimer */}
      <View className="mx-4 mb-3">
        <Text style={{ fontSize: 11, color: colors.textTertiary, fontStyle: 'italic' }}>
          Based on anonymized data from Wallet users. Minimum 3 users per cohort.
        </Text>
      </View>

      {!summary.has_data || summary.comparisons.length === 0 ? (
        <BenchmarkNoData />
      ) : (
        <View className="px-4">
          {summary.comparisons.map((c) => (
            <BenchmarkRow key={c.category_name} item={c} />
          ))}
        </View>
      )}
    </View>
  );
}
