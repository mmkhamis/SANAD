import React, { useState } from 'react';
import { View, type ViewProps, type ViewStyle, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';
import { COLORS } from '../../constants/colors';
import { MetallicShine } from './MetallicShine';

interface GlassCardProps extends ViewProps {
  /** Extra vertical spacing below the card (default = cardSpacing token) */
  marginBottom?: number;
  /** Remove internal padding */
  noPadding?: boolean;
  /** Adds a faint violet→fuchsia shimmer on the top edge (dark mode only) */
  shimmer?: boolean;
  /** Animated metallic shine sweep across the card */
  metallic?: boolean;
  /** Render as a premium hero card with purple+blue radial washes. */
  hero?: boolean;
}

/**
 * Premium glass-styled card.
 * - Dark: semi-transparent slate bg, subtle border, soft shadow
 * - Light: white bg, light border, gentle shadow
 *
 * Does NOT use expo-blur — achieves depth through opacity + border.
 */
export const GlassCard = React.memo(function GlassCard({
  marginBottom,
  noPadding = false,
  shimmer = false,
  metallic = true,
  hero = false,
  style,
  children,
  onLayout: onLayoutProp,
  ...rest
}: GlassCardProps): React.ReactElement {
  const colors = useThemeColors();
  const mb = marginBottom ?? colors.cardSpacing;
  const [cardWidth, setCardWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setCardWidth(e.nativeEvent.layout.width);
    onLayoutProp?.(e);
  };

  const cardStyle: ViewStyle = colors.isDark
    ? {
        backgroundColor: hero ? 'rgba(255,255,255,0.045)' : colors.glassBg,
        borderWidth: 1,
        borderColor: hero ? colors.glassBorderStrong : colors.glassBorder,
        ...colors.elevation.card,
      }
    : {
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        shadowColor: 'rgba(72,75,106,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 6,
      };

  return (
    <View
      style={[
        {
          borderRadius: colors.cardRadius,
          marginHorizontal: 16,
          marginBottom: mb,
          overflow: 'hidden',
        },
        cardStyle,
        style,
      ]}
      onLayout={onLayout}
      {...rest}
    >
      {/* Metallic sheen overlay (static) */}
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(255,255,255,0.03)', 'transparent', 'rgba(255,255,255,0.015)']
          : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.08)', 'rgba(72,75,106,0.06)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: colors.cardRadius,
        }}
      />

      {/* Hero washes — top-right purple + bottom-left blue radial-sim gradients */}
      {hero && colors.isDark ? (
        <>
          <LinearGradient
            colors={colors.heroWashPrimary as unknown as [string, string]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.3, y: 0.7 }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: colors.cardRadius,
            }}
          />
          <LinearGradient
            colors={colors.heroWashSecondary as unknown as [string, string]}
            start={{ x: 0, y: 1 }}
            end={{ x: 0.6, y: 0.4 }}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: colors.cardRadius,
            }}
          />
        </>
      ) : null}

      {/* Top-edge inset-light band (1px highlight) */}
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

      {/* Animated metallic breathing shine */}
      {metallic && cardWidth > 0 ? (
        <MetallicShine
          width={cardWidth}
          borderRadius={colors.cardRadius}
          intensity={colors.isDark ? 0.18 : 0.55}
          tint="shine"
        />
      ) : null}

      {/* Optional shimmer gradient overlay — both dark mode + light mode palette shimmer */}
      {shimmer || !colors.isDark ? (
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(139,92,246,0.06)', 'rgba(217,70,239,0.03)', 'transparent']
            : ['rgba(148,152,210,0.18)', 'rgba(72,75,106,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 70,
            borderTopLeftRadius: colors.cardRadius,
            borderTopRightRadius: colors.cardRadius,
          }}
        />
      ) : null}

      <View style={noPadding ? undefined : { padding: COLORS.card.paddingH }}>
        {children}
      </View>
    </View>
  );
});
