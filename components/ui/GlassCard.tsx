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
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 3,
      }
    : {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.glassBorder,
        shadowColor: 'rgba(15,23,42,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
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
          : ['rgba(255,255,255,0.9)', 'rgba(215,220,230,0.2)', 'rgba(255,255,255,0.5)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: colors.cardRadius,
        }}
      />

      {/* Animated metallic breathing shine */}
      {metallic && cardWidth > 0 ? (
        <MetallicShine
          width={cardWidth}
          borderRadius={colors.cardRadius}
          duration={4000}
          intensity={colors.isDark ? 0.3 : 0.45}
        />
      ) : null}

      {/* Optional shimmer gradient overlay on dark */}
      {shimmer && colors.isDark ? (
        <LinearGradient
          colors={['rgba(139,92,246,0.06)', 'rgba(217,70,239,0.03)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 60,
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
