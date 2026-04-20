import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';

interface BackButtonProps {
  onPress?: () => void;
  /** 'back' (default) or 'close' (X icon — use for modals/sheets). */
  variant?: 'back' | 'close';
  /** Icon color override. */
  color?: string;
  /** Size of the hit area; icon scales to 60%. */
  size?: number;
}

/**
 * Shared back / dismiss affordance used in screen headers and modals.
 * - In Arabic (RTL), the back chevron points RIGHT so it still reads
 *   as "previous" in the direction of text flow.
 * - Always routes through `router.back()` unless `onPress` overrides.
 */
export const BackButton = React.memo(function BackButton({
  onPress,
  variant = 'back',
  color,
  size = 38,
}: BackButtonProps): React.ReactElement {
  const router = useRouter();
  const colors = useThemeColors();
  const { isRTL } = useRTL();
  const iconColor = color ?? colors.textSecondary;
  const iconSize = Math.round(size * 0.5);

  const handlePress = onPress ?? (() => {
    if (router.canGoBack()) router.back();
  });

  const Icon = variant === 'close'
    ? X
    : isRTL ? ChevronRight : ChevronLeft;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={variant === 'close' ? 'Close' : 'Back'}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {colors.isDark ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 1,
            backgroundColor: colors.insetLight,
            borderTopLeftRadius: size / 2,
            borderTopRightRadius: size / 2,
          }}
        />
      ) : null}
      <Icon size={iconSize} color={iconColor} strokeWidth={2} />
    </Pressable>
  );
});
