import React from 'react';
import { View, type ViewStyle, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';
import { COLORS } from '../../constants/colors';

interface CardProps extends ViewProps {
  noPadding?: boolean;
}

/**
 * Standard card matching Claude Design `.card` class exactly:
 *
 * border-radius: var(--r-lg) = 20px
 * background: linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%)
 * border: 1px solid var(--stroke) = rgba(255,255,255,0.07)
 * box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.25)
 *
 * NOTE: This is NOT card-hero. card-hero has radial purple/blue washes and r-xl=28.
 * This regular card is for upcoming payments, transactions, commitments etc.
 */
export const Card = React.memo(function Card({
  noPadding = false,
  style,
  children,
  ...rest
}: CardProps): React.ReactElement {
  const colors = useThemeColors();

  if (!colors.isDark) {
    return (
      <View
        style={[
          {
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.glassBorder,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          },
          style,
        ]}
        {...rest}
      >
        {!noPadding ? (
          <View style={{ padding: 16 }}>{children}</View>
        ) : (
          children
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.claude.stroke,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.25,
          shadowRadius: 2,
          elevation: 2,
        },
        style,
      ]}
      {...rest}
    >
      {/* Glass gradient: 180deg top-bright → bottom-dim */}
      <LinearGradient
        colors={['rgba(255,255,255,0.045)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Inset top highlight 1px */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: COLORS.claude.insetLight,
        }}
      />

      {!noPadding ? (
        <View style={{ padding: 16 }}>{children}</View>
      ) : (
        children
      )}
    </View>
  );
});
