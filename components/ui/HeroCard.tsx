import React, { useEffect } from 'react';
import { View, type ViewStyle, type ViewProps, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { COLORS } from '../../constants/colors';
import { BORDER_RADIUS } from '../../constants/layout';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface HeroCardProps extends ViewProps {
  /** Remove default 16px padding inside */
  noPadding?: boolean;
  /** Remove horizontal margin (used when parent handles it) */
  noMargin?: boolean;
  /** Hide the decorative top-left concentric rings */
  noRings?: boolean;
}

/**
 * Premium hero card matching the Claude Design `card-hero` class exactly:
 *
 * background:
 *   radial-gradient(120% 80% at 100% 0%, purple/0.30, transparent 60%),
 *   radial-gradient(110% 90% at 0% 100%, blue/0.18, transparent 65%),
 *   linear-gradient(rgba(255,255,255,0.055) → rgba(255,255,255,0.02))
 * border: 1px rgba(255,255,255,0.07)
 * borderRadius: 28
 * box-shadow: inset 0 1px rgba(255,255,255,0.08), 0 12px 40px rgba(0,0,0,0.35)
 *
 * Light mode: white card with subtle shadow.
 */
export const HeroCard = React.memo(function HeroCard({
  noPadding = false,
  noMargin = false,
  noRings = false,
  style,
  children,
  ...rest
}: HeroCardProps): React.ReactElement {
  const colors = useThemeColors();
  const radius = BORDER_RADIUS.xl; // 28

  // Silver shimmer sweep — light mode only. A diagonal highlight slides across
  // the card on a slow loop to read as brushed/glassy metal.
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (colors.isDark) return;
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [colors.isDark, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -SCREEN_WIDTH + shimmer.value * (SCREEN_WIDTH * 2) },
      { skewX: '-18deg' },
    ],
  }));

  const cardStyle: ViewStyle = colors.isDark
    ? {
        borderWidth: 1,
        borderColor: COLORS.claude.stroke,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
      }
    : {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        shadowColor: 'rgba(72,75,106,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 6,
      };

  return (
    <View
      style={[
        {
          borderRadius: radius,
          marginHorizontal: noMargin ? 0 : 16,
          overflow: 'hidden',
        },
        cardStyle,
        style,
      ]}
      {...rest}
    >
      {/* Base glass gradient: bright-top → dim-bottom */}
      {colors.isDark ? (
        <LinearGradient
          colors={[
            COLORS.claude.heroCard.glassBgStart,
            COLORS.claude.heroCard.glassBgEnd,
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : (
        <>
          {/* Light-mode brushed-silver base: pale radial washes + subtle gradient. */}
          <LinearGradient
            colors={['#FFFFFF', '#F6F4EF', '#EDEAE3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Top-left cool sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.9)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.6 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Bottom-right warm shadow for depth */}
          <LinearGradient
            colors={['transparent', 'rgba(160,150,180,0.12)']}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Animated shimmer sweep — skewed vertical band moving L→R. */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: -20,
                bottom: -20,
                width: 140,
                left: 0,
              },
              shimmerStyle,
            ]}
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.55)',
                'rgba(255,255,255,0.85)',
                'rgba(255,255,255,0.55)',
                'rgba(255,255,255,0)',
              ]}
              locations={[0, 0.35, 0.5, 0.65, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </>
      )}

      {/* Purple radial-like wash — top-right corner */}
      {colors.isDark ? (
        <LinearGradient
          colors={[COLORS.claude.heroCard.purpleWash, 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 0.7 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      {/* Blue radial-like wash — bottom-left corner */}
      {colors.isDark ? (
        <LinearGradient
          colors={[COLORS.claude.heroCard.blueWash, 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.65, y: 0.35 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      {/* Top-edge inset light (1px highlight) */}
      {colors.isDark ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: COLORS.claude.heroCard.innerShadow,
          }}
        />
      ) : null}

      {/* Decorative concentric rings — top-left, 8% opacity */}
      {colors.isDark && !noRings ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -80,
            left: -60,
            opacity: 0.08,
          }}
        >
          <Svg width={260} height={260}>
            <Circle cx={130} cy={130} r={128} stroke="white" strokeWidth={0.5} fill="none" />
            <Circle cx={130} cy={130} r={100} stroke="white" strokeWidth={0.5} fill="none" />
            <Circle cx={130} cy={130} r={72} stroke="white" strokeWidth={0.5} fill="none" />
          </Svg>
        </View>
      ) : null}

      <View style={noPadding ? undefined : { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18 }}>
        {children}
      </View>
    </View>
  );
});
