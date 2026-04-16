/**
 * PreviewInsightCard — Design sandbox ONLY.
 * NOT for production use. Renders only inside Assets tab for visual testing.
 *
 * Variants: 'default' | 'alert' | 'saving'
 */

import React, { useEffect } from 'react';
import { View, Text, Dimensions, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { AlertTriangle, PiggyBank, TrendingUp, ArrowRight } from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const GRADIENT_COLORS = ['#5A2D91', '#1B1F2A', '#2CE6C2', '#FF4FD8'];
const CARD_W = SCREEN_W - 48; // marginHorizontal 16 each side
const SHINE_W = CARD_W * 0.4;
const GRADIENT_LOOP = 8000;
const SHINE_DELAY = 4000;

type Variant = 'default' | 'alert' | 'saving';

const VARIANT_CONFIG: Record<Variant, { label: string; icon: React.ReactElement; accent: string; message: string; sub: string }> = {
  default: {
    label: 'SPENDING INSIGHT',
    icon: <TrendingUp size={16} color="#2CE6C2" strokeWidth={2} />,
    accent: '#2CE6C2',
    message: 'You spent 120 SAR on coffee this week',
    sub: 'That\'s 15% more than last week. Small habits add up.',
  },
  alert: {
    label: '⚠ ALERT',
    icon: <AlertTriangle size={16} color="#FF4FD8" strokeWidth={2} />,
    accent: '#FF4FD8',
    message: 'Unusual transaction detected',
    sub: 'A transfer of 2,400 SAR exceeds your typical pattern.',
  },
  saving: {
    label: '💡 SAVING TIP',
    icon: <PiggyBank size={16} color="#34D399" strokeWidth={2} />,
    accent: '#34D399',
    message: 'You could save 200 SAR/month',
    sub: 'Reviewing your subscriptions shows unused recurring charges.',
  },
};

// ─── Animated gradient background ─────────────────────────────────────

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

function AnimatedBg({ progress }: { progress: SharedValue<number> }): React.ReactElement {
  return (
    <AnimatedGradient
      colors={GRADIENT_COLORS as unknown as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

// ─── Metallic shine ───────────────────────────────────────────────────

function MetallicShine({ delay = 0 }: { delay?: number }): React.ReactElement {
  const tx = useSharedValue(-SHINE_W);

  useEffect(() => {
    const runShine = (): void => {
      tx.value = withSequence(
        withDelay(delay, withTiming(SCREEN_W + SHINE_W, { duration: 1400, easing: Easing.inOut(Easing.ease) })),
        withDelay(SHINE_DELAY, withTiming(-SHINE_W, { duration: 0 })),
      );
    };
    // Initial run
    runShine();
    // Repeat
    const id = setInterval(runShine, SHINE_DELAY + 1400);
    return () => clearInterval(id);
  }, [tx, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 22, pointerEvents: 'none' }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: SHINE_W, height: '100%' }, animStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.04)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Preview card ─────────────────────────────────────────────────────

interface PreviewInsightCardProps {
  variant?: Variant;
}

export const PreviewInsightCard = React.memo(function PreviewInsightCard({
  variant = 'default',
}: PreviewInsightCardProps): React.ReactElement {
  const config = VARIANT_CONFIG[variant];
  const gradientProgress = useSharedValue(0);
  const entranceOpacity = useSharedValue(0);
  const entranceY = useSharedValue(24);

  useEffect(() => {
    entranceOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    entranceY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
    gradientProgress.value = withRepeat(
      withTiming(1, { duration: GRADIENT_LOOP, easing: Easing.linear }),
      -1,
      false,
    );
  }, [entranceOpacity, entranceY, gradientProgress]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceY.value }],
  }));

  const accentBorder = variant === 'alert' ? 'rgba(255,79,216,0.4)' : variant === 'saving' ? 'rgba(52,211,153,0.4)' : 'rgba(44,230,194,0.3)';

  return (
    <Animated.View style={[{ width: CARD_W, marginBottom: 16, borderRadius: 22, overflow: 'hidden' }, entranceStyle]}>
      {/* Outer border */}
      <View style={{ borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: accentBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 5 }}>
        {/* 1. Animated gradient */}
        <AnimatedBg progress={gradientProgress} />
        {/* 2. Glass overlay */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,20,35,0.60)' }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        {/* 3. Metallic shine */}
        <MetallicShine delay={variant === 'alert' ? 0 : variant === 'saving' ? 1200 : 600} />
        {/* 4. Content */}
        <View style={{ padding: 18, position: 'relative' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 10 }}>
              {config.icon}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: config.accent, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {config.label}
              </Text>
            </View>
            {variant === 'alert' ? (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
            ) : null}
          </View>
          {/* Message */}
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', lineHeight: 22, marginBottom: 6 }}>
            {config.message}
          </Text>
          {/* Subtitle */}
          <Text style={{ fontSize: 13, color: '#B9BEC7', lineHeight: 19, marginBottom: 16 }}>
            {config.sub}
          </Text>
          {/* CTA */}
          <Pressable style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#5865F2', opacity: 0.95 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginRight: 6 }}>
              View Details
            </Text>
            <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
});
