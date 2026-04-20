import React from 'react';
import { View, Text } from 'react-native';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';

interface DistSegment {
  label: string;
  pct: number;
  color: string;
}

interface AssetDistributionBarProps {
  segments: DistSegment[];
}

/**
 * Horizontal segmented distribution bar matching Claude Design:
 *
 * Bar: flexDirection row, height 8, borderRadius 6, overflow hidden, gap 2
 * Each segment: flex = pct, background = color
 * Legend below: 7×7 colored square + label + pct%
 */
export const AssetDistributionBar = React.memo(function AssetDistributionBar({
  segments,
}: AssetDistributionBarProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, isRTL } = useRTL();

  return (
    <View style={{ marginTop: 18 }}>
      {/* Bar */}
      <View
        style={{
          flexDirection: 'row', // LTR always for the bar
          height: 8,
          borderRadius: 6,
          overflow: 'hidden',
          gap: 2,
        }}
      >
        {segments.map((seg, i) => (
          <View
            key={i}
            style={{
              flex: seg.pct,
              backgroundColor: seg.color,
            }}
          />
        ))}
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: rowDir,
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        {segments.map((seg, i) => (
          <View
            key={i}
            style={{
              flexDirection: rowDir,
              alignItems: 'center',
              gap: 5,
            }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                backgroundColor: seg.color,
              }}
            />
            <Text
              style={{
                fontSize: 10.5,
                color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
              }}
            >
              {seg.label}
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '600',
                color: colors.isDark ? COLORS.claude.fg2 : colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {seg.pct}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
