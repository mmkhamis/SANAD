import React from 'react';
import { View, Text } from 'react-native';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';

interface HeatmapDay {
  day: number;
  intensity: number; // 0-1
}

interface SubscriptionHeatmapProps {
  days: HeatmapDay[];
}

/**
 * 30-day subscription heat grid matching Claude Design exactly:
 *
 * 30 cells in a 10-column grid, gap 4
 * hot day: oklch(62% 0.20 290 / 0.9) + purple glow border + shadow
 * medium: oklch(62% 0.20 290 / 0.35)
 * empty: oklch(62% 0.20 290 / 0.08)
 * cell: aspectRatio 1:1, borderRadius 4
 */
export const SubscriptionHeatmap = React.memo(function SubscriptionHeatmap({
  days,
}: SubscriptionHeatmapProps): React.ReactElement {
  const colors = useThemeColors();

  // Ensure exactly 30 days
  const cells = Array.from({ length: 30 }, (_, i) => {
    const found = days.find((d) => d.day === i + 1);
    return found?.intensity ?? 0;
  });

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        {cells.map((intensity, i) => {
          const isHot = intensity > 0.5;
          const isMedium = intensity > 0.2 && intensity <= 0.5;
          const opacity = isHot ? 0.9 : isMedium ? 0.35 : 0.08;

          return (
            <View
              key={i}
              style={{
                width: '9%', // ~10 columns with gap
                aspectRatio: 1,
                borderRadius: 4,
                backgroundColor: colors.isDark
                  ? `rgba(139,92,246,${opacity})`
                  : `rgba(139,92,246,${opacity * 0.7})`,
                borderWidth: 1,
                borderColor: isHot
                  ? 'rgba(162,120,234,0.50)'
                  : 'rgba(255,255,255,0.04)',
                ...(isHot && colors.isDark
                  ? {
                      shadowColor: COLORS.claude.p500,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 3,
                    }
                  : {}),
              }}
            />
          );
        })}
      </View>
      {/* Day labels */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
        }}
      >
        <Text style={{ fontSize: 10, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}>١</Text>
        <Text style={{ fontSize: 10, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}>١٠</Text>
        <Text style={{ fontSize: 10, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}>٢٠</Text>
        <Text style={{ fontSize: 10, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}>٣٠</Text>
      </View>
    </View>
  );
});
