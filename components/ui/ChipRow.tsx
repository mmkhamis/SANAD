import React from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';

type ChipColor = 'purple' | 'green' | 'blue' | 'amber' | 'red' | 'neutral';

interface Chip {
  key: string;
  label: string;
  color?: ChipColor;
  selected?: boolean;
}

interface ChipRowProps {
  chips: Chip[];
  onPress?: (key: string) => void;
  /** Horizontal padding at the scroll-view ends. */
  padding?: number;
}

const TINTS: Record<ChipColor, { bg: string; fg: string; border: string }> = {
  purple:  { bg: 'rgba(139,92,246,0.14)',  fg: COLORS.claude.p200, border: 'rgba(139,92,246,0.30)' },
  green:   { bg: 'rgba(78,203,151,0.14)',  fg: COLORS.claude.green, border: 'rgba(78,203,151,0.30)' },
  blue:    { bg: 'rgba(111,180,232,0.14)', fg: COLORS.claude.blue,  border: 'rgba(111,180,232,0.30)' },
  amber:   { bg: 'rgba(232,178,84,0.14)',  fg: COLORS.claude.amber, border: 'rgba(232,178,84,0.30)' },
  red:     { bg: 'rgba(240,104,96,0.14)',  fg: COLORS.claude.red,   border: 'rgba(240,104,96,0.30)' },
  neutral: { bg: 'rgba(255,255,255,0.055)', fg: COLORS.claude.fg2,  border: 'rgba(255,255,255,0.07)' },
};

/**
 * Horizontal row of color-tinted chips. RTL-aware.
 */
export const ChipRow = React.memo(function ChipRow({
  chips,
  onPress,
  padding = 16,
}: ChipRowProps): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL } = useRTL();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: padding,
        gap: 8,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}
    >
      {chips.map((c) => {
        const tint = TINTS[c.color ?? 'neutral'];
        const bg = colors.isDark ? tint.bg : tint.bg;
        return (
          <Pressable
            key={c.key}
            onPress={() => onPress?.(c.key)}
            style={({ pressed }) => ({
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 9999,
              backgroundColor: bg,
              borderWidth: 1,
              borderColor: tint.border,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View>
              <Text style={{ fontSize: 12, fontWeight: TYPOGRAPHY.semibold, color: tint.fg }}>
                {c.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
