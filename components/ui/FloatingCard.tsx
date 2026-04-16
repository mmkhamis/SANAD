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
            ? 'rgba(15,23,42,0.80)'        // slate-900/80
            : variant === 'glass'
              ? 'rgba(30,41,56,0.60)'       // slate-800/60
              : 'rgba(30,41,56,0.75)',      // slate-800/75
        borderWidth: 1,
        borderColor:
          variant === 'glass'
            ? 'rgba(51,65,85,0.40)'         // slate-700/40
            : 'rgba(51,65,85,0.30)',        // slate-700/30
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.20,
        shadowRadius: 12,
        elevation: variant === 'elevated' ? 6 : 3,
      }
    : {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: 'rgba(15,23,42,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: variant === 'elevated' ? 4 : 2,
      };

  return (
    <View
      style={[
        {
          borderRadius: 16,
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
          borderRadius: 16,
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

      {/* Animated metallic shine sweep */}
      {metallic && cardWidth > 0 ? (
        <MetallicShine
          width={cardWidth}
          borderRadius={16}
          duration={3500}
          intensity={colors.isDark ? 0.3 : 0.45}
        />
      ) : null}

      {children}
    </View>
  );
}
