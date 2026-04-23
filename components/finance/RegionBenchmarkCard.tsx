import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { TrendingUp, TrendingDown, Users } from 'lucide-react-native';

import { Card } from '../ui/Card';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { useBenchmarks } from '../../hooks/useBenchmarks';
import { COLORS } from '../../constants/colors';

/**
 * "How you compare to people like you" insight card.
 *
 * Shows the top 3 categories where the user diverges most from the median for
 * their age band + region. Backed by `useBenchmarks` which already wires up
 * the `spending_benchmarks` table (migration 014).
 */
export function RegionBenchmarkCard({ month }: { month?: string }): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const { rowDir, textAlign } = useRTL();
  const { data, isLoading } = useBenchmarks(month);

  const top = useMemo(() => {
    if (!data?.comparisons) return [];
    return [...data.comparisons]
      .filter((c) => Math.abs(c.diff_percent) >= 5)
      .sort((a, b) => Math.abs(b.diff_percent) - Math.abs(a.diff_percent))
      .slice(0, 3);
  }, [data]);

  if (isLoading) return null;
  if (!data || !data.has_profile) return null;

  return (
    <Card style={{ marginTop: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(111,180,232,0.14)',
          }}
        >
          <Users size={16} color={COLORS.claude.blue} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary }}>
          {t('REGION_BENCHMARK_TITLE' as any)}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
          marginBottom: 14,
          textAlign,
        }}
      >
        {t('REGION_BENCHMARK_DESC' as any)}
      </Text>

      {/* Body */}
      {!data.has_data || top.length === 0 ? (
        <Text
          style={{
            fontSize: 13,
            color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary,
            textAlign,
            lineHeight: 19,
          }}
        >
          {t('REGION_BENCHMARK_NO_DATA' as any)}
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {top.map((c) => {
            const above = c.diff_percent > 0;
            const Icon = above ? TrendingUp : TrendingDown;
            const tone = above ? COLORS.claude.amber : COLORS.claude.green;
            const label = above ? t('REGION_BENCHMARK_HIGHER' as any) : t('REGION_BENCHMARK_LOWER' as any);
            return (
              <View
                key={c.category_name}
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                  borderWidth: 1,
                  borderColor: colors.isDark ? COLORS.claude.stroke : colors.glassBorder,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${c.category_color}1F`,
                  }}
                >
                  <CategoryIcon name={c.category_icon ?? 'circle-help'} size={16} color={c.category_color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: '600', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary, textAlign }}
                    numberOfLines={1}
                  >
                    {tc(c.category_name)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, textAlign, marginTop: 1 }}>
                    {label}
                  </Text>
                </View>
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 4 }}>
                  <Icon size={13} color={tone} strokeWidth={2.5} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: tone }}>
                    {Math.round(Math.abs(c.diff_percent))}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
