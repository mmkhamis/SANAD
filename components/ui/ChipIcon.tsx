import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';

type ChipVariant = 'purple' | 'green' | 'blue' | 'amber' | 'red';

interface ChipIconProps {
  variant: ChipVariant;
  size?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Colored icon chip matching Claude Design exactly:
 *
 * 36×36, borderRadius 11
 * chip-*: gradient 135deg tint/0.28 → tint/0.12, border tint/0.35
 * Dark mode: gradient bg + colored border + colored glow (purple only)
 * Light mode: solid muted bg + subtle border
 */

const CHIP_COLORS = {
  purple: {
    bgStart: 'rgba(139,92,246,0.28)',
    bgEnd: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.35)',
    glow: 'rgba(139,92,246,0.30)',
    icon: '#C4B5FD',
    light: 'rgba(139,92,246,0.12)',
  },
  green: {
    bgStart: 'rgba(78,203,151,0.28)',
    bgEnd: 'rgba(78,203,151,0.12)',
    border: 'rgba(78,203,151,0.35)',
    glow: undefined,
    icon: '#A7F3D0',
    light: 'rgba(78,203,151,0.12)',
  },
  blue: {
    bgStart: 'rgba(111,180,232,0.28)',
    bgEnd: 'rgba(111,180,232,0.12)',
    border: 'rgba(111,180,232,0.35)',
    glow: undefined,
    icon: '#BAE6FD',
    light: 'rgba(111,180,232,0.12)',
  },
  amber: {
    bgStart: 'rgba(232,178,84,0.28)',
    bgEnd: 'rgba(232,178,84,0.12)',
    border: 'rgba(232,178,84,0.35)',
    glow: undefined,
    icon: '#FDE68A',
    light: 'rgba(232,178,84,0.12)',
  },
  red: {
    bgStart: 'rgba(240,104,96,0.28)',
    bgEnd: 'rgba(240,104,96,0.12)',
    border: 'rgba(240,104,96,0.35)',
    glow: undefined,
    icon: '#FECACA',
    light: 'rgba(240,104,96,0.12)',
  },
} as const;

const PURPLE_GLOW_SHADOW = '#8B5CF6';

export const ChipIcon = React.memo(function ChipIcon({
  variant,
  size = 36,
  children,
  style,
}: ChipIconProps): React.ReactElement {
  const colors = useThemeColors();
  const chip = CHIP_COLORS[variant];

  if (!colors.isDark) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: 11,
            backgroundColor: chip.light,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: chip.border,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          ...(chip.glow
            ? {
                shadowColor: PURPLE_GLOW_SHADOW,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
              }
            : {}),
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[chip.bgStart, chip.bgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {children}
    </View>
  );
});

/** Returns the icon tint color for a given chip variant in dark mode. */
export function chipIconColor(variant: ChipVariant): string {
  return CHIP_COLORS[variant].icon;
}
