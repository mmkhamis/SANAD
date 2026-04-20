import React from 'react';
import { View, Text } from 'react-native';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';

type PillVariant = 'purple' | 'green' | 'red';

interface PillBadgeProps {
  variant: PillVariant;
  children: React.ReactNode;
}

/**
 * Small pill badge matching Claude Design:
 *
 * padding 4/10, borderRadius 999, fontSize 11, fontWeight 600
 * pill-purple: bg oklch(55% 0.2 290 / 0.18), color oklch(82% 0.12 290), border oklch(70% 0.18 290 / 0.3)
 * pill-green: bg oklch(55% 0.14 160 / 0.18), color oklch(82% 0.11 160), border oklch(70% 0.12 160 / 0.3)
 * pill-red: bg oklch(55% 0.2 20 / 0.15), color oklch(78% 0.14 20), border oklch(68% 0.18 20 / 0.3)
 */
export const PillBadge = React.memo(function PillBadge({
  variant,
  children,
}: PillBadgeProps): React.ReactElement {
  const colors = useThemeColors();
  const pill = COLORS.claude.pill;

  const variantStyles = {
    purple: {
      bg: colors.isDark ? pill.purpleBg : 'rgba(139,92,246,0.12)',
      text: colors.isDark ? pill.purpleText : COLORS.primary,
      border: colors.isDark ? pill.purpleBorder : 'rgba(139,92,246,0.20)',
    },
    green: {
      bg: colors.isDark ? pill.greenBg : 'rgba(52,211,153,0.12)',
      text: colors.isDark ? pill.greenText : COLORS.income,
      border: colors.isDark ? pill.greenBorder : 'rgba(52,211,153,0.20)',
    },
    red: {
      bg: colors.isDark ? pill.redBg : 'rgba(251,113,133,0.12)',
      text: colors.isDark ? pill.redText : COLORS.expense,
      border: colors.isDark ? pill.redBorder : 'rgba(251,113,133,0.20)',
    },
  };

  const v = variantStyles[variant];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 9999,
        backgroundColor: v.bg,
        borderWidth: 1,
        borderColor: v.border,
      }}
    >
      {typeof children === 'string' ? (
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: v.text,
          }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
});
