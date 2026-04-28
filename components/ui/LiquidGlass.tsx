/**
 * LiquidGlass — Apple-style liquid glass / water-droplet material.
 *
 * RN port of the design in `Liquid Glass.html`. Three materials:
 *  - 'ghost'   — barely-there transparent glass (idle FAB)
 *  - 'water'   — clear refractive bubble with bright specular (listening, mic, light primary)
 *  - 'mercury' — dark chrome capsule (dark-mode primary CTA / hold options on dark)
 *
 * Layers (water/ghost):
 *  1. Drop shadow wrapper
 *  2. BlurView backdrop (refraction base)
 *  3. Gradient body — soft white film (lighter for ghost)
 *  4. Specular: top highlight + secondary spot + bottom catch
 *  5. Rotating iridescent rim (SVG conic-style approximation)
 *  6. Inner white edge (glass thickness)
 *  7. Drifting shine streak
 *  8. Children (icon) on top
 */

import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';

export type GlassMaterial = 'ghost' | 'water' | 'mercury';
export type GlassShape = 'circle' | 'pill' | 'rounded';

interface LiquidGlassProps {
  size?: number | { w: number; h: number };
  shape?: GlassShape;
  material?: GlassMaterial;
  theme?: 'light' | 'dark';
  intensity?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function LiquidGlass({
  size = 80,
  shape = 'circle',
  material = 'water',
  theme = 'light',
  intensity = 1,
  children,
  style,
}: LiquidGlassProps): React.ReactElement {
  const w = typeof size === 'object' ? size.w : size;
  const h = typeof size === 'object' ? size.h : size;
  const radius = shape === 'circle' ? Math.min(w, h) / 2 : shape === 'pill' ? 999 : 22;
  const isLight = theme === 'light';
  const isDark = !isLight;
  const ghost = material === 'ghost';

  if (material === 'mercury') {
    return (
      <View
        style={[
          {
            width: w,
            height: h,
            borderRadius: radius,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 18 },
            shadowOpacity: 0.55,
            shadowRadius: 22,
            elevation: 14,
          },
          style,
        ]}
      >
        {/* Dark glassy body */}
        <LinearGradient
          colors={['rgba(28,28,34,0.95)', 'rgba(8,8,12,0.99)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
        >
          {/* Faint inner top highlight */}
          <View
            style={{
              position: 'absolute',
              top: '6%',
              left: '15%',
              right: '15%',
              height: '35%',
              borderRadius: 9999,
              backgroundColor: 'rgba(255,255,255,0.10)',
              opacity: 0.7,
            }}
          />
          {/* Bottom-left prism flare (warm) */}
          <View
            style={{
              position: 'absolute',
              left: -2,
              bottom: '15%',
              width: '32%',
              height: '32%',
              borderRadius: 9999,
              backgroundColor: 'rgba(255,80,120,0.55)',
              opacity: 0.55 * intensity,
            }}
          />
          {/* Bottom-left prism flare (cool) */}
          <View
            style={{
              position: 'absolute',
              left: -2,
              bottom: '8%',
              width: '32%',
              height: '28%',
              borderRadius: 9999,
              backgroundColor: 'rgba(120,200,255,0.45)',
              opacity: 0.5 * intensity,
            }}
          />
          {/* Bottom-right warm flare */}
          <View
            style={{
              position: 'absolute',
              right: -2,
              bottom: '20%',
              width: '28%',
              height: '30%',
              borderRadius: 9999,
              backgroundColor: 'rgba(255,200,150,0.45)',
              opacity: 0.5 * intensity,
            }}
          />
        </LinearGradient>

        {/* Chrome rim (silver top → warm bottom) */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius,
            borderWidth: 1.4,
            borderTopColor: 'rgba(245,245,255,0.95)',
            borderLeftColor: 'rgba(220,225,240,0.65)',
            borderRightColor: 'rgba(220,225,240,0.65)',
            borderBottomColor: 'rgba(255,170,160,0.65)',
            opacity: intensity,
          }}
        />

        {/* Inner darken at very edge */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 1.4,
            left: 1.4,
            right: 1.4,
            bottom: 1.4,
            borderRadius: radius - 1.4,
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.5)',
          }}
        />

        {/* Content */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </View>
      </View>
    );
  }

  // ─── WATER / GHOST ─────────────────────────────────────────────────
  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderRadius: radius,
          shadowColor: isLight ? '#28195A' : '#000',
          shadowOffset: { width: 0, height: ghost ? 8 : 14 },
          shadowOpacity: isLight ? (ghost ? 0.10 : 0.18) : (ghost ? 0.32 : 0.5),
          shadowRadius: ghost ? 16 : 24,
          elevation: ghost ? 8 : 14,
        },
        style,
      ]}
    >
      {/* Backdrop blur — gives the refractive base */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          borderRadius: radius,
          overflow: 'hidden',
        }}
      >
        <BlurView
          tint={isLight ? 'light' : 'dark'}
          intensity={ghost ? 14 : 28}
          style={StyleSheet.absoluteFill}
        />

        {/* Soft white film body */}
        <LinearGradient
          colors={
            ghost
              ? isLight
                ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.22)']
                : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)', 'rgba(255,255,255,0.10)']
              : isLight
                ? ['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.42)']
                : ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.18)']
          }
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Top specular highlight */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '6%',
            left: '18%',
            width: '58%',
            height: '38%',
            borderRadius: 9999,
            backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
            opacity: ghost ? 0.55 : 1,
          }}
        />

        {/* Secondary highlight — small left */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: '20%',
            left: '14%',
            width: '14%',
            height: '20%',
            borderRadius: 9999,
            backgroundColor: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)',
            opacity: ghost ? 0.4 : 0.85,
          }}
        />

        {/* Bottom light pool */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '20%',
            width: '60%',
            height: '24%',
            borderRadius: 9999,
            backgroundColor: isLight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)',
            opacity: ghost ? 0.5 : 1,
          }}
        />

        {/* Chromatic rim ring (rotating) — only for circles, simulated via SVG */}
        {shape === 'circle' && !ghost && (
          <ChromaticRim size={Math.min(w, h)} intensity={intensity} isDark={isDark} />
        )}

        {/* Drifting shine streak */}
        {!ghost && <ShineStreak width={w} isLight={isLight} />}
      </View>

      {/* Bright inner edge — glass thickness */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: radius,
          borderWidth: ghost ? 1 : 1.3,
          borderColor: isLight
            ? `rgba(255,255,255,${ghost ? 0.7 : 0.95})`
            : `rgba(255,255,255,${ghost ? 0.35 : 0.55})`,
        }}
      />

      {/* Soft outer rim on dark for definition */}
      {isDark && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -0.5,
            left: -0.5,
            right: -0.5,
            bottom: -0.5,
            borderRadius: radius + 0.5,
            borderWidth: 0.5,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        />
      )}

      {/* Content */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Sub-layers ────────────────────────────────────────────────────────────

function ChromaticRim({
  size,
  intensity,
  isDark,
}: {
  size: number;
  intensity: number;
  isDark: boolean;
}): React.ReactElement {
  const rot = useSharedValue(0);
  React.useEffect(() => {
    rot.value = withRepeat(
      withTiming(360, { duration: 12000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rot]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const r = size / 2 - 1.5;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        { opacity: 0.85 * intensity },
        animStyle,
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="rimA" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#78C8FF" stopOpacity={isDark ? 0.85 : 0.6} />
            <Stop offset="0.5" stopColor="#FFE0B4" stopOpacity={0} />
            <Stop offset="1" stopColor="#FFA0B4" stopOpacity={isDark ? 0.85 : 0.6} />
          </SvgLinearGradient>
          <SvgLinearGradient id="rimB" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C890FF" stopOpacity={isDark ? 0.7 : 0.5} />
            <Stop offset="0.5" stopColor="#B4FFE0" stopOpacity={0} />
            <Stop offset="1" stopColor="#FFE0B4" stopOpacity={isDark ? 0.7 : 0.5} />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="url(#rimA)" strokeWidth={1.6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r - 1.2} stroke="url(#rimB)" strokeWidth={1.2} fill="none" />
      </Svg>
    </Animated.View>
  );
}

function ShineStreak({ width, isLight }: { width: number; isLight: boolean }): React.ReactElement {
  const tx = useSharedValue(0);
  React.useEffect(() => {
    tx.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.bezier(0.6, 0.0, 0.4, 1) }),
      -1,
      false,
    );
  }, [tx]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      // start off-screen left, sweep to off-screen right
      { translateX: -width + tx.value * (width * 2.4) },
      { rotate: '20deg' },
    ],
    opacity: tx.value < 0.9 ? 1 : 0,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -width * 0.5,
          bottom: -width * 0.5,
          width: width * 0.5,
        },
        animStyle,
      ]}
    >
      <LinearGradient
        colors={[
          'transparent',
          isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.40)',
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}
