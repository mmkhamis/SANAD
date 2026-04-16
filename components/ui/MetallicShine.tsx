import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface MetallicShineProps {
  /** Width of the parent container */
  width?: number;
  /** Border radius of the parent card */
  borderRadius?: number;
  /** How long one breathe cycle takes (ms). Default: 3500 */
  duration?: number;
  /** Base opacity of the shine (0–1). Default: 0.35 */
  intensity?: number;
}

/**
 * Animated metallic breathing shine effect.
 * The entire card surface gets a soft white glow that pulses (breathes)
 * while a metallic band slowly sweeps across horizontally.
 *
 * Must be placed INSIDE a parent with overflow: 'hidden'.
 */
export const MetallicShine = React.memo(function MetallicShine({
  width = Dimensions.get('window').width,
  borderRadius = 16,
  duration = 3500,
  intensity = 0.35,
}: MetallicShineProps): React.ReactElement {
  const breatheOpacity = useSharedValue(intensity);
  const translateX = useSharedValue(-width * 0.5);

  useEffect(() => {
    // Breathing: pulse between full intensity and half intensity
    const low = intensity * 0.4;
    breatheOpacity.value = withRepeat(
      withSequence(
        withTiming(low, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(intensity, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(low, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(intensity, { duration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // Slow horizontal sweep back and forth
    translateX.value = withRepeat(
      withTiming(width, {
        duration: duration * 4,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [breatheOpacity, translateX, width, duration, intensity]);

  const breatheStyle = useAnimatedStyle(() => ({
    opacity: breatheOpacity.value,
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const bandWidth = width * 0.4;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius,
          overflow: 'hidden',
          pointerEvents: 'none',
        },
        breatheStyle,
      ]}
    >
      {/* Top-down soft white glow */}
      <LinearGradient
        colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Sweeping metallic band */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: bandWidth,
            height: '100%',
          },
          sweepStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </Animated.View>
  );
});
