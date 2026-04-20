import React from 'react';
import { View, Pressable, type ViewStyle, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';
import { COLORS } from '../../constants/colors';

interface SoftGlowButtonProps extends Omit<PressableProps, 'style'> {
  /** Diameter of the button (default 56) */
  size?: number;
  /** Background color override (default: primary gradient). Pass a solid color to disable the gradient. */
  color?: string;
  /** Custom glow color (default: based on primary) */
  glowColor?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Circular floating action button with a quiet outer glow.
 *
 * Dark theme renders a p500→p700 vertical gradient with a 1px inset-light rim
 * and a p-glow shadow. Press feedback shrinks to 0.96.
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
  const glow = glowColor ?? colors.glowPrimaryStrong;
  const glowSize = size + 20; // glow extends 10px beyond button
  const useGradient = !color && colors.isDark;

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
          backgroundColor: color ?? (useGradient ? 'transparent' : colors.primary),
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.92 : 1,
          borderWidth: colors.isDark ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.20)',
          shadowColor: color ?? COLORS.claude.p500,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: colors.isDark ? 0.55 : 0.20,
          shadowRadius: 16,
          elevation: 6,
        })}
      >
        {useGradient ? (
          <LinearGradient
            colors={[COLORS.claude.p500, COLORS.claude.p700]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
        {children}
      </Pressable>
    </View>
  );
});
