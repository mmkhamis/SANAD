import React from 'react';
import { Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  makeMutable,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface MetallicShineProps {
  /** Width of the parent container */
  width?: number;
  /** Border radius of the parent card */
  borderRadius?: number;
  /**
   * @deprecated Kept for API compatibility. All instances now share a single
   * global animation driver so per-instance duration is ignored.
   */
  duration?: number;
  /** Base opacity of the shine (0–1). Default: 0.35 */
  intensity?: number;
}

// ─── Module-level global animation driver ────────────────────────────────────
// Instead of each instance running its own withRepeat loops (N×2 concurrent
// Reanimated animations), all MetallicShine components share ONE pair of
// shared values. Each instance derives its style via interpolation.
const _breathProgress = makeMutable(0);  // 0 → 1 → 0 (breathing)
const _sweepProgress  = makeMutable(0);  // 0 → 1 → 0 (sweep back-and-forth)
let _animStarted = false;

function ensureGlobalAnim(): void {
  if (_animStarted) return;
  _animStarted = true;
  // Breathing cycle: ~7 s full cycle (3.5 s up + 3.5 s down)
  _breathProgress.value = withRepeat(
    withSequence(
      withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
      withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
    ),
    -1,
    false,
  );
  // Sweep cycle: 14 s one-way with reverse (ping-pong)
  _sweepProgress.value = withRepeat(
    withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.ease) }),
    -1,
    true,
  );
}

/**
 * Animated metallic breathing shine effect.
 * Shares a single global animation driver across all instances — zero per-card
 * animation overhead after the first mount.
 *
 * Must be placed INSIDE a parent with overflow: 'hidden'.
 */
export const MetallicShine = React.memo(function MetallicShine({
  width = Dimensions.get('window').width,
  borderRadius = 16,
  intensity = 0.35,
}: MetallicShineProps): React.ReactElement {
  // Start the single global animation on first mount (no-op on subsequent mounts)
  React.useEffect(() => {
    ensureGlobalAnim();
  }, []);

  const bandWidth = width * 0.4;

  const breatheStyle = useAnimatedStyle(() => ({
    opacity: interpolate(_breathProgress.value, [0, 1], [intensity * 0.4, intensity]),
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(_sweepProgress.value, [0, 1], [-bandWidth, width]) },
    ],
  }));

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
