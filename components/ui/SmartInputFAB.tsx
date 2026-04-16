import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Sparkles, Mic, Camera, Clipboard } from 'lucide-react-native';

import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { useThemeColors } from '../../hooks/useThemeColors';

// ─── Option definitions ────────────────────────────────────────────────────

const ARC_RADIUS = 90;
const OPTION_SIZE = 52;
const DEAD_ZONE = 25;
const ANGLE_SNAP_THRESHOLD = 40; // degrees

// Angles in standard math convention (0° = right, CCW positive)
// Fan upward-left since FAB is at bottom-right of screen
const OPTIONS = [
  { label: 'Manual',  Icon: Clipboard, angle: 160, color: '#3B82F6' },
  { label: 'Voice',   Icon: Mic,       angle: 120, color: '#8B5CF6' },
  { label: 'Scan',    Icon: Camera,    angle: 80,  color: '#10B981' },
] as const;

// Pre-compute Cartesian offsets from FAB center
// In RN, y-axis is flipped (positive = down), so y-offset = -sin(angle)*R
const OPTION_POSITIONS = OPTIONS.map(({ angle }) => {
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * ARC_RADIUS,
    y: -Math.sin(rad) * ARC_RADIUS,
  };
});

const SPRING_OPEN  = { damping: 14, stiffness: 220 } as const;
const SPRING_CLOSE = { damping: 20, stiffness: 350 } as const;

// ─── Worklet: find closest option index ───────────────────────────────────

function closestOptionWorklet(angleDeg: number): number {
  'worklet';
  let best = -1;
  let bestDist = ANGLE_SNAP_THRESHOLD;
  for (let i = 0; i < OPTIONS.length; i++) {
    const diff = Math.abs(angleDeg - OPTIONS[i].angle);
    const wrapped = diff > 180 ? 360 - diff : diff;
    if (wrapped < bestDist) {
      bestDist = wrapped;
      best = i;
    }
  }
  return best;
}

// ─── Option bubble sub-component ─────────────────────────────────────────

interface OptionBubbleProps {
  index: number;
  isMenuOpen: Animated.SharedValue<number>;
  activeIndex: Animated.SharedValue<number>;
}

function OptionBubble({ index, isMenuOpen, activeIndex }: OptionBubbleProps) {
  const { Icon, label, color } = OPTIONS[index];
  const { x, y } = OPTION_POSITIONS[index];
  const staggerDelay = index * 30;

  const animStyle = useAnimatedStyle(() => {
    const open = isMenuOpen.value;
    const isActive = activeIndex.value === index;

    // Scale: spring from 0.3 (closed) to 1.0 (open) or 1.2 (active)
    const targetScale = isActive ? 1.2 : 1.0;
    const scale = interpolate(open, [0, 1], [0.1, targetScale]);

    // Opacity: fade in as menu opens
    const opacity = interpolate(open, [0, 0.35], [0, 1], 'clamp');

    return { transform: [{ scale }], opacity };
  });

  const glowStyle = useAnimatedStyle(() => {
    const isActive = activeIndex.value === index;
    return {
      opacity: withTiming(isActive ? 0.6 : 0, { duration: 120 }),
    };
  });

  // FAB is 48px wide with 8px glow padding on each side → total container 64px
  // FAB center is at (32, 32) within the 64px container
  const FAB_CENTER = 32; // half of glowSize (48 + 16)
  const left = FAB_CENTER + x - OPTION_SIZE / 2;
  const top  = FAB_CENTER + y - OPTION_SIZE / 2;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: OPTION_SIZE,
          height: OPTION_SIZE,
          alignItems: 'center',
        },
        animStyle,
      ]}
    >
      {/* Glow halo */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: OPTION_SIZE + 12,
            height: OPTION_SIZE + 12,
            borderRadius: (OPTION_SIZE + 12) / 2,
            backgroundColor: color,
            top: -6,
            left: -6,
          },
          glowStyle,
        ]}
      />

      {/* Circle */}
      <View
        style={{
          width: OPTION_SIZE,
          height: OPTION_SIZE,
          borderRadius: OPTION_SIZE / 2,
          backgroundColor: 'rgba(15,18,30,0.92)',
          borderWidth: 1.5,
          borderColor: color + '80',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: color,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Icon size={20} color={color} strokeWidth={2} />
      </View>

      {/* Label */}
      <Text
        style={{
          marginTop: 5,
          fontSize: 10,
          fontWeight: '600',
          color: '#FFFFFF',
          textShadowColor: 'rgba(0,0,0,0.8)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
          letterSpacing: 0.3,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

// ─── Main FAB component ───────────────────────────────────────────────────

interface SmartInputFABProps {
  onPress: () => void;
  onVoice: () => void;
  onScan: () => void;
  onManual: () => void;
  size?: number;
  style?: object;
}

export const SmartInputFAB = React.memo(function SmartInputFAB({
  onPress,
  onVoice,
  onScan,
  onManual,
  size = 48,
  style,
}: SmartInputFABProps): React.ReactElement {
  const colors = useThemeColors();

  // ── Shared animation values ──────────────────────────────────────────
  const breatheOpacity  = useSharedValue(0.5);
  const isMenuOpen      = useSharedValue(0);
  const activeIndex     = useSharedValue(-1);
  const pressProgress   = useSharedValue(0); // 0→1 during the 400ms hold window
  const fabScale        = useSharedValue(1);

  const glowSize   = size + 16; // 64px for size=48
  const breatheDuration = 2500;

  // ── Breathing glow ───────────────────────────────────────────────────
  React.useEffect(() => {
    breatheOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: breatheDuration, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [breatheOpacity]);

  // ── Handlers (JS thread) ─────────────────────────────────────────────
  const handleNormalTap = React.useCallback(() => {
    impactLight();
    onPress();
  }, [onPress]);

  const handleOptionSelect = React.useCallback((index: number) => {
    notifySuccess();
    if (index === 0) onManual();
    else if (index === 1) onVoice();
    else if (index === 2) onScan();
  }, [onManual, onVoice, onScan]);

  // ── Gestures ─────────────────────────────────────────────────────────

  // Quick tap — wins when finger lifts before 350ms
  const tapGesture = Gesture.Tap()
    .maxDuration(350)
    .onEnd(() => {
      'worklet';
      runOnJS(handleNormalTap)();
    });

  // Long-press + slide radial — activates after 400ms hold
  const radialGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onBegin(() => {
      'worklet';
      // Start filling the press-ring over 400ms
      pressProgress.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) });
      fabScale.value = withTiming(0.92, { duration: 380 });
    })
    .onStart(() => {
      'worklet';
      // Long press threshold met — open the radial
      pressProgress.value = withTiming(0, { duration: 100 });
      fabScale.value = withSpring(1, SPRING_OPEN);
      isMenuOpen.value = withSpring(1, SPRING_OPEN);
      runOnJS(impactMedium)();
    })
    .onUpdate((e) => {
      'worklet';
      const dist = Math.sqrt(e.translationX * e.translationX + e.translationY * e.translationY);
      if (dist < DEAD_ZONE) {
        activeIndex.value = -1;
        return;
      }
      // Standard math angle: atan2(y, x), but RN y-axis is flipped
      const angleDeg = Math.atan2(-e.translationY, e.translationX) * (180 / Math.PI);
      const normAngle = angleDeg < 0 ? angleDeg + 360 : angleDeg;
      const next = closestOptionWorklet(normAngle);
      if (next !== activeIndex.value) {
        activeIndex.value = next;
        if (next >= 0) runOnJS(impactLight)();
      }
    })
    .onEnd(() => {
      'worklet';
      const sel = activeIndex.value;
      activeIndex.value = -1;
      isMenuOpen.value = withSpring(0, SPRING_CLOSE);
      fabScale.value = withSpring(1, SPRING_CLOSE);
      if (sel >= 0) {
        runOnJS(handleOptionSelect)(sel);
      }
    })
    .onFinalize(() => {
      'worklet';
      // Finger lifted or gesture cancelled before long press activated
      pressProgress.value = withTiming(0, { duration: 150 });
      fabScale.value = withSpring(1, SPRING_CLOSE);
      if (isMenuOpen.value > 0) {
        isMenuOpen.value = withSpring(0, SPRING_CLOSE);
      }
      activeIndex.value = -1;
    });

  // Tap wins on quick press; radial wins on long hold
  const gesture = Gesture.Exclusive(tapGesture, radialGesture);

  // ── Animated styles ──────────────────────────────────────────────────

  const glowStyle = useAnimatedStyle(() => ({
    opacity: breatheOpacity.value,
  }));

  const fabContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  // Press-ring: border that fills as the user holds
  const pressRingStyle = useAnimatedStyle(() => ({
    opacity: pressProgress.value,
    transform: [{ scale: interpolate(pressProgress.value, [0, 1], [0.85, 1.1]) }],
  }));

  return (
    <View style={[{ position: 'absolute' }, style]}>
      <GestureDetector gesture={gesture}>
        {/* This View is the gesture anchor + overflow container */}
        <View
          style={{
            width: glowSize,
            height: glowSize,
            alignItems: 'center',
            justifyContent: 'center',
            // overflow: 'visible' is the RN default — options extend outside bounds
          }}
        >
          {/* ── Option bubbles (rendered first = behind FAB in z-order) ─ */}
          {OPTIONS.map((_, i) => (
            <OptionBubble
              key={i}
              index={i}
              isMenuOpen={isMenuOpen}
              activeIndex={activeIndex}
            />
          ))}

          {/* ── Press-ring indicator ─────────────────────────────────── */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: size + 14,
                height: size + 14,
                borderRadius: (size + 14) / 2,
                borderWidth: 2,
                borderColor: '#8B5CF6',
              },
              pressRingStyle,
            ]}
          />

          {/* ── Outer glow layer ────────────────────────────────────── */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: '#8B5CF6',
                opacity: 0.2,
              },
              glowStyle,
            ]}
          />

          {/* ── Shadow layer ────────────────────────────────────────── */}
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              shadowColor: '#8B5CF6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 8,
            }}
          />

          {/* ── Main FAB button ─────────────────────────────────────── */}
          <Animated.View
            style={[
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                overflow: 'hidden',
              },
              fabContainerStyle,
            ]}
          >
            {/* Gradient background */}
            <LinearGradient
              colors={['rgba(139,92,246,0.95)', 'rgba(109,72,226,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                borderRadius: size / 2,
              }}
            />

            {/* Metallic shine sweep */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: -size * 0.3,
                width: size * 0.3,
                height: '100%',
              }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.1)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: '100%', height: '100%' }}
              />
            </View>

            {/* Icon */}
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
});
