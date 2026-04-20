import React, { useState } from 'react';
import { View, type ViewProps, LayoutChangeEvent } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { MetallicShine } from './MetallicShine';

interface FloatingCardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'glass';
  noPadding?: boolean;
  /** Animated metallic shine sweep across the card */
  metallic?: boolean;
}

/**
 * Floating card with glass-morphism styling.
 * Adapts to light/dark themes automatically.
 *
 * - default: standard floating surface card
 * - elevated: slightly brighter / lifted
 * - glass: semi-transparent with stronger border
 */
export function FloatingCard({
  variant = 'default',
  noPadding = false,
  metallic = true,
  style,
  children,
  ...rest
}: FloatingCardProps): React.ReactElement {
  const colors = useThemeColors();
  const [cardWidth, setCardWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
  };

  const cardStyle = colors.isDark
    ? {
        backgroundColor:
          variant === 'elevated'
            ? 'rgba(255,255,255,0.08)'       // glass-3
            : variant === 'glass'
              ? 'rgba(255,255,255,0.03)'      // glass-1
              : 'rgba(255,255,255,0.055)',    // glass-2
        borderWidth: 1,
        borderColor:
          variant === 'elevated' ? colors.glassBorderStrong : colors.glassBorder,
        ...colors.elevation.card,
        elevation: variant === 'elevated' ? 6 : 3,
      }
    : {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        shadowColor: 'rgba(72,75,106,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: variant === 'elevated' ? 7 : 5,
      };

  return (
    <View
      style={[
        {
          borderRadius: colors.cardRadius,
          overflow: 'hidden',
          ...(noPadding ? {} : { padding: 16 }),
          marginHorizontal: 16,
        },
        cardStyle,
        style,
      ]}
      onLayout={onLayout}
      {...rest}
    >
      {/* Metallic sheen overlay (static) */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: colors.cardRadius,
        }}
        pointerEvents="none"
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.isDark
              ? 'rgba(255,255,255,0.02)'
              : 'rgba(255,255,255,0.5)',
          }}
        />
      </View>

      {/* Top-edge inset-light band in dark mode */}
      {colors.isDark ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: colors.insetLight,
          }}
        />
      ) : null}

      {/* Animated metallic shine sweep */}
      {metallic && cardWidth > 0 ? (
        <MetallicShine
          width={cardWidth}
          borderRadius={colors.cardRadius}
          intensity={colors.isDark ? 0.18 : 0.55}
          tint="shine"
        />
      ) : null}

      {children}
    </View>
  );
}
