/**
 * LiquidGlassFab — single AI button that morphs between idle / listening /
 * processing states using the Liquid Glass material.
 *
 * Behaviour:
 *  - Idle: ghost glass + sparkle. Tap → smart-input. Long-press + drag →
 *    radial menu with 3 hold options (Manual / Scan / Voice).
 *  - Listening: water bubble + reactive waveform + 2 concentric pulse rings.
 *    Tap → stop & process. Long-press → cancel.
 *  - Processing: water bubble + 3 bouncing dots. Non-interactive.
 *
 * The component reads `useVoiceInputStore` directly so the same button is
 * the *only* surface visible while voice noting (no separate sheet).
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
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
  type SharedValue,
} from 'react-native-reanimated';
import { Sparkles, Mic, Camera, Clipboard } from 'lucide-react-native';

import { LiquidGlass } from './LiquidGlass';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useVoiceInputStore } from '../../store/voice-input-store';
import { ReactiveWaveform } from '../voice/ReactiveWaveform';
import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { COLORS } from '../../constants/colors';

// ─── Layout constants ─────────────────────────────────────────────────────

const FAB_SIZE = 64;
const ARC_RADIUS = 102;
const OPTION_SIZE = 58;
const DEAD_ZONE = 28;
const ANGLE_SNAP_THRESHOLD = 40;

const OPTIONS = [
  { label: 'Manual', Icon: Clipboard, angle: 160 },
  { label: 'Scan', Icon: Camera, angle: 120 },
  { label: 'Voice', Icon: Mic, angle: 80 },
] as const;

const OPTION_POSITIONS = OPTIONS.map(({ angle }) => {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * ARC_RADIUS, y: -Math.sin(rad) * ARC_RADIUS };
});

const SPRING_OPEN = { damping: 14, stiffness: 220 } as const;
const SPRING_CLOSE = { damping: 20, stiffness: 350 } as const;

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

// ─── Public props ─────────────────────────────────────────────────────────

interface LiquidGlassFabProps {
  onPress: () => void;
  onVoice: () => void;
  onScan: () => void;
  onManual: () => void;
  /** Distance of FAB from the screen's right edge, in px. */
  right: number;
  /** Distance of FAB from the screen's bottom edge, in px. */
  bottom: number;
}

export const LiquidGlassFab = React.memo(function LiquidGlassFab({
  onPress,
  onVoice,
  onScan,
  onManual,
  right,
  bottom,
}: LiquidGlassFabProps): React.ReactElement {
  const colors = useThemeColors();
  const theme = colors.isDark ? 'dark' : 'light';

  const voiceState = useVoiceInputStore((s) => s.state);
  const stopAndProcess = useVoiceInputStore((s) => s.stopAndProcess);
  const cancelVoice = useVoiceInputStore((s) => s.cancel);

  const isListening = voiceState === 'recording';
  const isProcessing = voiceState === 'transcribing' || voiceState === 'parsing';

  // ── Shared values ───────────────────────────────────────────────────
  const isMenuOpen = useSharedValue(0);
  const activeIndex = useSharedValue(-1);
  const pressProgress = useSharedValue(0);
  const fabScale = useSharedValue(1);

  // ── Listening pulse rings ──────────────────────────────────────────
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  React.useEffect(() => {
    if (isListening) {
      ringA.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      );
      ringB.value = withDelay(
        600,
        withRepeat(
          withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) }),
          -1,
          false,
        ),
      );
    } else {
      ringA.value = withTiming(0, { duration: 200 });
      ringB.value = withTiming(0, { duration: 200 });
    }
  }, [isListening, ringA, ringB]);

  const ringAStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringA.value, [0, 0.05, 1], [0, 0.7, 0]),
    transform: [{ scale: interpolate(ringA.value, [0, 1], [1, 1.7]) }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringB.value, [0, 0.05, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(ringB.value, [0, 1], [1, 1.9]) }],
  }));

  // ── Idle breathing scale (subtle) ──────────────────────────────────
  const breathe = useSharedValue(0);
  React.useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [breathe]);

  // ── JS-thread handlers ─────────────────────────────────────────────
  const handleTap = React.useCallback(() => {
    impactLight();
    if (isListening) {
      stopAndProcess();
      return;
    }
    if (isProcessing) return;
    onPress();
  }, [isListening, isProcessing, onPress, stopAndProcess]);

  const handleListeningCancel = React.useCallback(() => {
    impactMedium();
    cancelVoice();
  }, [cancelVoice]);

  const handleOptionSelect = React.useCallback(
    (index: number) => {
      notifySuccess();
      if (index === 0) onManual();
      else if (index === 1) onScan();
      else if (index === 2) onVoice();
    },
    [onManual, onScan, onVoice],
  );

  // ── Gestures ───────────────────────────────────────────────────────
  const tapGesture = Gesture.Tap()
    .maxDuration(350)
    .onEnd(() => {
      'worklet';
      runOnJS(handleTap)();
    });

  const radialGesture = Gesture.Pan()
    .activateAfterLongPress(400)
    .onBegin(() => {
      'worklet';
      pressProgress.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.ease) });
      fabScale.value = withTiming(0.92, { duration: 380 });
    })
    .onStart(() => {
      'worklet';
      pressProgress.value = withTiming(0, { duration: 100 });
      fabScale.value = withSpring(1, SPRING_OPEN);
      // While listening, long-press cancels rather than opening the radial.
      if (isListening || isProcessing) {
        runOnJS(handleListeningCancel)();
        return;
      }
      isMenuOpen.value = withSpring(1, SPRING_OPEN);
      runOnJS(impactMedium)();
    })
    .onUpdate((e) => {
      'worklet';
      if (isListening || isProcessing) return;
      const dist = Math.sqrt(e.translationX * e.translationX + e.translationY * e.translationY);
      if (dist < DEAD_ZONE) {
        activeIndex.value = -1;
        return;
      }
      const angleDeg = Math.atan2(-e.translationY, e.translationX) * (180 / Math.PI);
      const norm = angleDeg < 0 ? angleDeg + 360 : angleDeg;
      const next = closestOptionWorklet(norm);
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
      if (sel >= 0) runOnJS(handleOptionSelect)(sel);
    })
    .onFinalize(() => {
      'worklet';
      pressProgress.value = withTiming(0, { duration: 150 });
      fabScale.value = withSpring(1, SPRING_CLOSE);
      if (isMenuOpen.value > 0) isMenuOpen.value = withSpring(0, SPRING_CLOSE);
      activeIndex.value = -1;
    });

  const gesture = Gesture.Exclusive(tapGesture, radialGesture);

  // ── Animated styles ────────────────────────────────────────────────
  const fabContainerStyle = useAnimatedStyle(() => {
    const breath = interpolate(breathe.value, [0, 1], [1, 1.03]);
    return { transform: [{ scale: fabScale.value * (isListening ? 1 : breath) }] };
  });

  const pressRingStyle = useAnimatedStyle(() => ({
    opacity: pressProgress.value,
    transform: [{ scale: interpolate(pressProgress.value, [0, 1], [0.85, 1.1]) }],
  }));

  // ── Render ─────────────────────────────────────────────────────────
  // The radial fans up + left, so we make the container large enough on
  // those sides while pinning the FAB to its bottom-right.
  const PAD = 24;
  const containerW = ARC_RADIUS + FAB_SIZE + PAD;
  const containerH = ARC_RADIUS + FAB_SIZE + PAD;
  const fabLeft = containerW - FAB_SIZE - PAD;
  const fabTop = containerH - FAB_SIZE - PAD;

  // The arc fan area must NOT receive taps while the menu is closed — only
  // the FAB itself does. We achieve that by wrapping the GestureDetector
  // around the FAB-sized box only; the bubbles, pulse rings, and press-ring
  // sit as siblings with pointerEvents="none". Once the Pan gesture activates
  // on the FAB, react-native-gesture-handler keeps tracking the finger across
  // the rest of the screen, so the radial drag still works.
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        width: containerW,
        height: containerH,
        right: right - PAD,
        bottom: bottom - PAD,
      }}
    >
      {/* Radial options */}
      {OPTIONS.map((_, i) => (
        <OptionBubble
          key={i}
          index={i}
          theme={theme}
          isMenuOpen={isMenuOpen}
          activeIndex={activeIndex}
          fabLeft={fabLeft}
          fabTop={fabTop}
        />
      ))}

      {/* Listening pulse rings */}
      {isListening && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: fabLeft - 8,
                top: fabTop - 8,
                width: FAB_SIZE + 16,
                height: FAB_SIZE + 16,
                borderRadius: (FAB_SIZE + 16) / 2,
                borderWidth: 2,
                borderColor: COLORS.claude.p500,
              },
              ringAStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: fabLeft - 8,
                top: fabTop - 8,
                width: FAB_SIZE + 16,
                height: FAB_SIZE + 16,
                borderRadius: (FAB_SIZE + 16) / 2,
                borderWidth: 2,
                borderColor: COLORS.claude.p500,
              },
              ringBStyle,
            ]}
          />
        </>
      )}

      {/* Press-ring indicator — fills as user holds */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: fabLeft - 7,
            top: fabTop - 7,
            width: FAB_SIZE + 14,
            height: FAB_SIZE + 14,
            borderRadius: (FAB_SIZE + 14) / 2,
            borderWidth: 2,
            borderColor: COLORS.claude.p500,
          },
          pressRingStyle,
        ]}
      />

      {/* Main FAB — only this region captures taps */}
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            { position: 'absolute', left: fabLeft, top: fabTop, width: FAB_SIZE, height: FAB_SIZE },
            fabContainerStyle,
          ]}
        >
          <LiquidGlass
            size={FAB_SIZE}
            shape="circle"
            material={isListening || isProcessing ? 'water' : 'ghost'}
            theme={theme}
            intensity={1}
          >
            <FabIcon
              state={isListening ? 'listening' : isProcessing ? 'processing' : 'idle'}
              color={colors.isDark ? '#F4F4F8' : '#14132A'}
            />
          </LiquidGlass>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

// ─── Icon by state ────────────────────────────────────────────────────────

function FabIcon({
  state,
  color,
}: {
  state: 'idle' | 'listening' | 'processing';
  color: string;
}): React.ReactElement {
  if (state === 'listening') return <ListeningWave color={color} />;
  if (state === 'processing') return <ProcessingDots color={color} />;
  return <Sparkles size={24} color={color} strokeWidth={2} />;
}

function ListeningWave({ color }: { color: string }): React.ReactElement {
  // Live mic-driven bars
  return (
    <View style={{ width: 36, height: 22, alignItems: 'center', justifyContent: 'center' }}>
      <ReactiveWaveform bars={5} height={20} barWidth={3} gap={3} color={color} />
    </View>
  );
}

function ProcessingDots({ color }: { color: string }): React.ReactElement {
  const a = useSharedValue(0);
  React.useEffect(() => {
    a.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [a]);
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      <ProcessingDot phase={0.0} progress={a} color={color} />
      <ProcessingDot phase={0.18} progress={a} color={color} />
      <ProcessingDot phase={0.36} progress={a} color={color} />
    </View>
  );
}

function ProcessingDot({
  phase,
  progress,
  color,
}: {
  phase: number;
  progress: SharedValue<number>;
  color: string;
}): React.ReactElement {
  const animStyle = useAnimatedStyle(() => {
    const p = (progress.value + phase) % 1;
    const y = -3 * Math.sin(p * Math.PI * 2);
    const op = 0.3 + 0.7 * Math.max(0, Math.sin(p * Math.PI * 2));
    return { transform: [{ translateY: y }], opacity: op };
  });
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

// ─── Option bubble ─────────────────────────────────────────────────────────

interface OptionBubbleProps {
  index: number;
  theme: 'light' | 'dark';
  isMenuOpen: SharedValue<number>;
  activeIndex: SharedValue<number>;
  fabLeft: number;
  fabTop: number;
}

function OptionBubble({
  index,
  theme,
  isMenuOpen,
  activeIndex,
  fabLeft,
  fabTop,
}: OptionBubbleProps): React.ReactElement {
  const { Icon, label } = OPTIONS[index];
  const { x, y } = OPTION_POSITIONS[index];

  const animStyle = useAnimatedStyle(() => {
    const open = isMenuOpen.value;
    const isActive = activeIndex.value === index;
    const target = isActive ? 1.18 : 1.0;
    const scale = interpolate(open, [0, 1], [0.1, target]);
    const opacity = interpolate(open, [0, 0.35], [0, 1], 'clamp');
    return { transform: [{ scale }], opacity };
  });

  const fabCenterX = fabLeft + 32;
  const fabCenterY = fabTop + 32;
  const left = fabCenterX + x - OPTION_SIZE / 2;
  const top = fabCenterY + y - OPTION_SIZE / 2;

  const labelColor = theme === 'dark' ? '#F4F4F8' : '#14132A';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: OPTION_SIZE,
          alignItems: 'center',
        },
        animStyle,
      ]}
    >
      <LiquidGlass size={OPTION_SIZE} shape="circle" material="water" theme={theme}>
        <Icon size={22} color={labelColor} strokeWidth={2} />
      </LiquidGlass>
      <Text
        style={{
          marginTop: 6,
          fontSize: 10.5,
          fontWeight: '600',
          color: labelColor,
          textShadowColor: theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}
