import React from 'react';
import { View, Pressable, type ViewStyle, type PressableProps } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';

interface SoftGlowButtonProps extends Omit<PressableProps, 'style'> {
  /** Diameter of the button (default 56) */
  size?: number;
  /** Background color override (default: primary) */
  color?: string;
  /** Custom glow color (default: based on primary) */
  glowColor?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Circular floating action button with a quiet outer glow.
 *
 * Glow is rendered as an absolutely-positioned View with large borderRadius
 * and low-opacity background — no blur filter, no neon pulsing.
 *
 * Pressed state reduces opacity slightly.
 */
export const SoftGlowButton = React.memo(function SoftGlowButton({
  size = 56,
  color,
  glowColor,
  style,
  children,
  ...pressableProps
}: SoftGlowButtonProps): React.ReactElement {
  const colors = useThemeColors();
  const bg = color ?? colors.primary;
  const glow = glowColor ?? colors.glowPrimary;
  const glowSize = size + 20; // glow extends 10px beyond button

  return (
    <View style={[{ width: glowSize, height: glowSize, alignItems: 'center', justifyContent: 'center' }, style]}>
      {/* Glow layer — always behind the button */}
      {colors.isDark ? (
        <View
          style={{
            position: 'absolute',
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: glow,
          }}
        />
      ) : null}

      {/* Actual button */}
      <Pressable
        {...pressableProps}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.85 : 1,
          // Subtle shadow for light mode elevation
          shadowColor: bg,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: colors.isDark ? 0.35 : 0.20,
          shadowRadius: 10,
          elevation: 6,
        })}
      >
        {children}
      </Pressable>
    </View>
  );
});
