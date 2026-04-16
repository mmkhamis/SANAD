/**
 * VoiceWaveform — contextual animation for voice recording / transcription states.
 *
 * variant="full"    → centered full-area view with mic, animated bars, and labels.
 *                     Use inside a full-screen loading placeholder.
 * variant="compact" → mic + bars inline, fits inside a card button.
 *                     Use to replace ActivityIndicator inside small cards.
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Mic } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';

// ─── Bar configs ──────────────────────────────────────────────────────
// Five bars: tallest in the center, tapering to edges.
// [baseHeight, amplitude, phaseDelayMs]

const BAR_CONFIGS = [
  { base: 8,  amp: 9,  delay: 240 },
  { base: 14, amp: 15, delay: 120 },
  { base: 20, amp: 22, delay: 0   },
  { base: 14, amp: 15, delay: 120 },
  { base: 8,  amp: 9,  delay: 240 },
] as const;

// ─── Single animated bar ──────────────────────────────────────────────

function WaveBar({
  base,
  amp,
  delay,
  color,
  widthFactor = 1,
}: {
  base: number;
  amp: number;
  delay: number;
  color: string;
  widthFactor?: number;
}): React.ReactElement {
  const height = useSharedValue(base * widthFactor);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming((base + amp) * widthFactor, {
            duration: 620,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(Math.max(3, (base - 3) * widthFactor), {
            duration: 620,
            easing: Easing.inOut(Easing.sin),
          }),
        ),
        -1,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[
        {
          width: Math.round(3 * widthFactor),
          borderRadius: Math.round(1.5 * widthFactor),
          backgroundColor: color,
          marginHorizontal: Math.round(3 * widthFactor),
        },
        animStyle,
      ]}
    />
  );
}

// ─── Public component ─────────────────────────────────────────────────

export interface VoiceWaveformProps {
  /**
   * 'full'    → centered full-area view with mic + waveform + labels.
   * 'compact' → mic + bars inline, fits inside a small card button.
   */
  variant?: 'full' | 'compact';
  label?: string;
  sublabel?: string;
}

export function VoiceWaveform({
  variant = 'full',
  label = 'Transcribing voice…',
  sublabel = 'Processing your audio with AI',
}: VoiceWaveformProps): React.ReactElement {
  const colors = useThemeColors();

  // Pulse ring: emanates outward from mic, fading as it expands.
  const ringScale   = useSharedValue(1);
  const ringOpacity = useSharedValue(0.22);

  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.55, { duration: 1100, easing: Easing.out(Easing.quad) }),
        withTiming(1,    { duration: 0 }),
      ),
      -1,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0,    { duration: 1100, easing: Easing.out(Easing.quad) }),
        withTiming(0.22, { duration: 0 }),
      ),
      -1,
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const barColor    = colors.primary;
  const barColorDim = `${colors.primary}88`;

  // ── Compact variant (for inline card buttons) ─────────────────────
  if (variant === 'compact') {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Left 2 bars */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {BAR_CONFIGS.slice(0, 2).map((b, i) => (
              <WaveBar key={i} {...b} color={barColorDim} widthFactor={0.7} />
            ))}
          </View>

          {/* Center mic with pulse ring */}
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginHorizontal: 6,
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${colors.primary}22`,
                },
                ringStyle,
              ]}
            />
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: `${colors.primary}16`,
                borderWidth: 1,
                borderColor: `${colors.primary}28`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={16} color={colors.primary} strokeWidth={2} />
            </View>
          </View>

          {/* Right 2 bars */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {BAR_CONFIGS.slice(3).map((b, i) => (
              <WaveBar key={i} {...b} color={barColorDim} widthFactor={0.7} />
            ))}
          </View>
        </View>

        <Text
          style={{
            fontSize: 11,
            color: colors.textTertiary,
            marginTop: 8,
            letterSpacing: 0.1,
          }}
        >
          Transcribing…
        </Text>
      </View>
    );
  }

  // ── Full variant (for full-screen loading areas) ──────────────────
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
      }}
    >
      {/* Mic with emanating pulse ring */}
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 26,
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: `${colors.primary}22`,
            },
            ringStyle,
          ]}
        />
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: `${colors.primary}14`,
            borderWidth: 1,
            borderColor: `${colors.primary}28`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Mic size={28} color={colors.primary} strokeWidth={1.8} />
        </View>
      </View>

      {/* Waveform bars */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
        }}
      >
        {BAR_CONFIGS.map((b, i) => (
          <WaveBar key={i} {...b} color={barColor} />
        ))}
      </View>

      {/* Labels */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
        }}
      >
        {sublabel}
      </Text>
    </View>
  );
}
