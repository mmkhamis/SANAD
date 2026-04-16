/**
 * LoadingScreen — full-page branded loading placeholder.
 *
 * Animated wallet icon with pulsing dots — feels intentional and app-themed.
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
import { Wallet } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';

// ─── Single pulsing dot ───────────────────────────────────────────────

function PulseDot({
  delay,
  color,
}: {
  delay: number;
  color: string;
}): React.ReactElement {
  const scale   = useSharedValue(0.4);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(0.4, { duration: 500, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(0.3, { duration: 500, easing: Easing.in(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [delay, scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          marginHorizontal: 6,
        },
        animStyle,
      ]}
    />
  );
}

// ─── Pulsing wallet icon ──────────────────────────────────────────────

function PulsingIcon({ color }: { color: string }): React.ReactElement {
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.92, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [scale, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Wallet size={34} color={color} strokeWidth={2} />
      </View>
    </Animated.View>
  );
}

// ─── Public component ─────────────────────────────────────────────────

export function LoadingScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <PulsingIcon color={colors.primary} />

      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: colors.textSecondary,
          marginTop: 20,
          marginBottom: 16,
        }}
      >
        {t('LOADING')}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <PulseDot delay={0}   color={colors.primary} />
        <PulseDot delay={180} color={colors.primary} />
        <PulseDot delay={360} color={colors.primary} />
      </View>
    </View>
  );
}
