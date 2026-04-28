/**
 * AnimatedAuroraBg — entrance-screen background with drifting aurora blobs.
 *
 * Mirrors the `BloomBg` / `FormBg` from `Welcome & Auth.html`:
 *  - Dark base gradient matching the app's bg0/bg1 tokens
 *  - 3–4 large soft radial blobs (SVG RadialGradient) drifting + pulsing
 *  - Blob colors are chosen from the app's aurora palette with per-blob offsets
 *
 * Purple intensity matches the app's brand `#8B5CF6` (claude p500) — softer
 * than the previous `#7c3aed/#4c1d95` used by the legacy welcome screen.
 */

import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

import { COLORS } from '../../constants/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Aurora palette tuned to the app's brand purple #8B5CF6 (claude p500),
// with softer magenta / blue / cyan neighbours so the background doesn't
// feel candy-colored.
const HUE_STOPS = [
  '#8B5CF6', // purple (app brand)
  '#A063D6', // muted magenta
  '#5E74E6', // blue-violet
  '#5EAFD7', // soft cyan
  '#8B5CF6', // close the loop
] as const;

const HUE_INPUTS = [0, 0.25, 0.5, 0.75, 1];

function getHueIndex(offset: number): number {
  const normalized = ((offset % 1) + 1) % 1;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  HUE_INPUTS.forEach((input, index) => {
    const distance = Math.abs(input - normalized);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function getBlobColors(phaseOffset: number): { center: string; mid: string } {
  const centerIndex = getHueIndex(phaseOffset);
  const midIndex = getHueIndex(phaseOffset + 0.18);

  return {
    center: HUE_STOPS[centerIndex],
    mid: HUE_STOPS[midIndex],
  };
}

interface BlobConfig {
  /** Center position (px) */
  x: number;
  y: number;
  /** Diameter (px) — square SVG side */
  size: number;
  /** Palette offset 0..1 — shifts which aurora hues this blob uses */
  phaseOffset: number;
  /** Drift amplitude (px) on each axis */
  driftX: number;
  driftY: number;
  /** Drift duration (ms) */
  driftDur: number;
  /** Drift delay (ms) */
  driftDelay: number;
  /** Center stop alpha (0..1) */
  centerAlpha: number;
  /** Mid stop alpha (0..1) */
  midAlpha: number;
  /** Pulse this blob in scale 0.92→1.15 */
  pulse?: boolean;
}

// ─── Variants ────────────────────────────────────────────────────────────

const BLOOM_BLOBS: BlobConfig[] = [
  // Big bottom bloom
  {
    x: SCREEN_W / 2 - 270, y: SCREEN_H - 200,
    size: 540, phaseOffset: 0,
    driftX: 0, driftY: -14, driftDur: 6000, driftDelay: 0,
    centerAlpha: 0.42, midAlpha: 0.18, pulse: true,
  },
  // Right side
  {
    x: SCREEN_W - 240, y: 180,
    size: 320, phaseOffset: 0.3,
    driftX: 40, driftY: -30, driftDur: 14000, driftDelay: 200,
    centerAlpha: 0.32, midAlpha: 0.10,
  },
  // Left side
  {
    x: -60, y: 280,
    size: 280, phaseOffset: 0.55,
    driftX: -50, driftY: 40, driftDur: 18000, driftDelay: 800,
    centerAlpha: 0.30, midAlpha: 0.08,
  },
  // Top right small accent
  {
    x: SCREEN_W - 230, y: 60,
    size: 200, phaseOffset: 0.78,
    driftX: 20, driftY: 30, driftDur: 11000, driftDelay: 400,
    centerAlpha: 0.22, midAlpha: 0.06,
  },
];

const FORM_BLOBS: BlobConfig[] = [
  // Top-right glow
  {
    x: SCREEN_W - 240, y: -140,
    size: 380, phaseOffset: 0,
    driftX: 40, driftY: -30, driftDur: 16000, driftDelay: 0,
    centerAlpha: 0.32, midAlpha: 0.10,
  },
  // Bottom-left glow
  {
    x: -140, y: SCREEN_H - 200,
    size: 340, phaseOffset: 0.45,
    driftX: -50, driftY: 40, driftDur: 20000, driftDelay: 600,
    centerAlpha: 0.26, midAlpha: 0.08,
  },
  // Center accent
  {
    x: SCREEN_W / 2 - 110, y: SCREEN_H * 0.4 - 110,
    size: 220, phaseOffset: 0.7,
    driftX: 20, driftY: 30, driftDur: 13000, driftDelay: 300,
    centerAlpha: 0.18, midAlpha: 0.05,
  },
];

// ─── Component ───────────────────────────────────────────────────────────

interface AnimatedAuroraBgProps {
  variant?: 'bloom' | 'form';
  /** Multiply blob alphas by this. Default 1. */
  intensity?: number;
}

export function AnimatedAuroraBg({
  variant = 'bloom',
  intensity = 1,
}: AnimatedAuroraBgProps): React.ReactElement {
  const blobs = variant === 'bloom' ? BLOOM_BLOBS : FORM_BLOBS;

  // Base gradient matches the app's dark bg tokens (bg0 → bg1).
  const baseColors =
    variant === 'bloom'
      ? [COLORS.claude.bg0, '#0C0A1C', '#15102A']
      : ['#0B0A18', COLORS.claude.bg0];

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={baseColors as [string, string, ...string[]]}
        locations={variant === 'bloom' ? [0, 0.55, 1] : [0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {blobs.map((cfg, i) => (
        <AuroraBlob key={i} cfg={cfg} intensity={intensity} />
      ))}
    </View>
  );
}

// ─── Single blob ─────────────────────────────────────────────────────────

interface AuroraBlobProps {
  cfg: BlobConfig;
  intensity: number;
}

function AuroraBlob({ cfg, intensity }: AuroraBlobProps): React.ReactElement {
  // Drift: independent per blob but seeded from the same useEffect timing.
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);
  const scale = useSharedValue(1);
  const blobColors = React.useMemo(() => getBlobColors(cfg.phaseOffset), [cfg.phaseOffset]);

  React.useEffect(() => {
    driftX.value = withDelay(
      cfg.driftDelay,
      withRepeat(
        withSequence(
          withTiming(cfg.driftX, { duration: cfg.driftDur, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: cfg.driftDur, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    driftY.value = withDelay(
      cfg.driftDelay,
      withRepeat(
        withSequence(
          withTiming(cfg.driftY, { duration: cfg.driftDur * 1.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: cfg.driftDur * 1.3, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    if (cfg.pulse) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.96, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    }

    return () => {
      cancelAnimation(driftX);
      cancelAnimation(driftY);
      cancelAnimation(scale);
    };
  }, [cfg, driftX, driftY, scale]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: driftX.value },
      { translateY: driftY.value },
      { scale: scale.value },
    ],
  }));

  const gradId = `aurora-${cfg.x}-${cfg.y}-${cfg.size}`;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: cfg.x,
          top: cfg.y,
          width: cfg.size,
          height: cfg.size,
        },
        wrapperStyle,
      ]}
    >
      <Svg width={cfg.size} height={cfg.size}>
        <Defs>
          <RadialGradient
            id={gradId}
            cx="50%" cy="50%" r="50%"
            fx="50%" fy="50%"
          >
            <Stop
              offset="0%"
              stopColor={blobColors.center}
              stopOpacity={cfg.centerAlpha * intensity}
            />
            <Stop
              offset="38%"
              stopColor={blobColors.mid}
              stopOpacity={cfg.midAlpha * intensity}
            />
            <Stop offset="72%" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={cfg.size} height={cfg.size} fill={`url(#${gradId})`} />
      </Svg>
    </Animated.View>
  );
}
