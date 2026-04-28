/**
 * ProcessingOverlay — sheet shown after recording stops, while
 * transcription + parsing run. Matches the Claude Design Processing.html
 * layout: animated ear → flowing dots → writing pen, progress track,
 * file meta pill, stages list, cancel.
 *
 * Minimizable into the bottom pill — the user can navigate while it
 * keeps working in the background.
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import Svg, { Path, Rect, Circle, Line, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';

import { useVoiceInputStore, type ProcessingStageState } from '../../store/voice-input-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { impactLight } from '../../utils/haptics';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

// ─── Animated wave bar inside the ear glyph ─────────────────────────

function AnimatedBar({
  x,
  h,
  y,
  color,
}: {
  x: number;
  h: SharedValue<number>;
  y: SharedValue<number>;
  color: string;
}): React.ReactElement {
  const animatedProps = useAnimatedProps(() => ({
    height: h.value,
    y: y.value,
  }));
  return (
    <AnimatedRect
      x={x}
      width={3}
      rx={1.5}
      fill={color}
      animatedProps={animatedProps as any}
    />
  );
}

function EarWaveBar({
  x,
  delay,
  color,
}: {
  x: number;
  delay: number;
  color: string;
}): React.ReactElement {
  const h = useSharedValue(6);
  const y = useSharedValue(47);

  useEffect(() => {
    h.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(22, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(14, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(28, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(6, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(39, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(43, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(36, { duration: 300, easing: Easing.inOut(Easing.sin) }),
          withTiming(47, { duration: 300, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(h);
      cancelAnimation(y);
    };
  }, []);

  return <AnimatedBar x={x} h={h} y={y} color={color} />;
}

// ─── Ear input glyph ────────────────────────────────────────────────

function EarGlyph({
  size,
  stroke,
  accent,
}: {
  size: number;
  stroke: string;
  accent: string;
}): React.ReactElement {
  const pulseR = useSharedValue(2.4);
  const pulseO = useSharedValue(0.6);

  useEffect(() => {
    pulseR.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 600 }),
        withTiming(1.6, { duration: 600 }),
      ),
      -1,
    );
    pulseO.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 }),
      ),
      -1,
    );
    return () => {
      cancelAnimation(pulseR);
      cancelAnimation(pulseO);
    };
  }, []);

  const animatedCircleProps = useAnimatedProps(() => ({
    r: pulseR.value,
    opacity: pulseO.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <EarWaveBar x={6} delay={0} color={accent} />
      <EarWaveBar x={13} delay={120} color={accent} />
      <EarWaveBar x={20} delay={240} color={accent} />
      <EarWaveBar x={27} delay={360} color={accent} />

      <G stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M55 30 Q72 30 72 50 Q72 60 66 64 Q60 68 60 76 Q60 84 52 84" />
        <Path d="M52 84 Q46 84 44 78" />
        <Path d="M62 50 Q62 42 55 42 Q49 42 49 50 Q49 56 54 58" />
      </G>

      <AnimatedCircle cx={55} cy={50} fill={accent} animatedProps={animatedCircleProps as any} />
    </Svg>
  );
}

// ─── Writing pen glyph ──────────────────────────────────────────────

function WritingGlyph({
  size,
  stroke,
  dim,
}: {
  size: number;
  stroke: string;
  dim: string;
}): React.ReactElement {
  const drawA = useSharedValue(32);
  const drawB = useSharedValue(27);
  const drawC = useSharedValue(22);

  useEffect(() => {
    const opts = { duration: 1200, easing: Easing.inOut(Easing.cubic) };
    drawA.value = withRepeat(
      withSequence(withTiming(0, opts), withTiming(32, { duration: 0 })),
      -1,
    );
    drawB.value = withDelay(
      300,
      withRepeat(withSequence(withTiming(0, opts), withTiming(27, { duration: 0 })), -1),
    );
    drawC.value = withDelay(
      600,
      withRepeat(withSequence(withTiming(0, opts), withTiming(22, { duration: 0 })), -1),
    );
    return () => {
      cancelAnimation(drawA);
      cancelAnimation(drawB);
      cancelAnimation(drawC);
    };
  }, []);

  const propsA = useAnimatedProps(() => ({ strokeDashoffset: drawA.value }));
  const propsB = useAnimatedProps(() => ({ strokeDashoffset: drawB.value }));
  const propsC = useAnimatedProps(() => ({ strokeDashoffset: drawC.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <G stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M28 18 H62 L74 30 V82 a3 3 0 0 1 -3 3 H28 a3 3 0 0 1 -3 -3 V21 a3 3 0 0 1 3 -3 Z" />
        <Path d="M62 18 V30 H74" />
      </G>
      <G stroke={dim} strokeWidth={2} strokeLinecap="round">
        <AnimatedLine
          x1={33}
          y1={44}
          x2={65}
          y2={44}
          strokeDasharray="32"
          animatedProps={propsA as any}
        />
        <AnimatedLine
          x1={33}
          y1={54}
          x2={60}
          y2={54}
          strokeDasharray="27"
          animatedProps={propsB as any}
        />
        <AnimatedLine
          x1={33}
          y1={64}
          x2={55}
          y2={64}
          strokeDasharray="22"
          animatedProps={propsC as any}
        />
      </G>
    </Svg>
  );
}

// ─── Flow dots ──────────────────────────────────────────────────────

function FlowDots({ accent }: { accent: string }): React.ReactElement {
  const o0 = useSharedValue(0.15);
  const o1 = useSharedValue(0.15);
  const o2 = useSharedValue(0.15);
  const o3 = useSharedValue(0.15);

  useEffect(() => {
    const seq = (sv: SharedValue<number>, delay: number): void => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 700 }),
            withTiming(0.15, { duration: 700 }),
          ),
          -1,
        ),
      );
    };
    seq(o0, 0);
    seq(o1, 180);
    seq(o2, 360);
    seq(o3, 540);
    return () => {
      cancelAnimation(o0);
      cancelAnimation(o1);
      cancelAnimation(o2);
      cancelAnimation(o3);
    };
  }, []);

  const p0 = useAnimatedProps(() => ({ opacity: o0.value }));
  const p1 = useAnimatedProps(() => ({ opacity: o1.value }));
  const p2 = useAnimatedProps(() => ({ opacity: o2.value }));
  const p3 = useAnimatedProps(() => ({ opacity: o3.value }));

  return (
    <Svg width={44} height={14} viewBox="0 0 44 14" fill="none">
      <AnimatedCircle cx={6} cy={7} r={2} fill={accent} animatedProps={p0 as any} />
      <AnimatedCircle cx={16} cy={7} r={2} fill={accent} animatedProps={p1 as any} />
      <AnimatedCircle cx={26} cy={7} r={2} fill={accent} animatedProps={p2 as any} />
      <AnimatedCircle cx={36} cy={7} r={2} fill={accent} animatedProps={p3 as any} />
    </Svg>
  );
}

// ─── Progress track with shimmer ────────────────────────────────────

function ProgressTrack({
  progress,
  accent,
  bg,
  border,
}: {
  progress: number;
  accent: string;
  bg: string;
  border: string;
}): React.ReactElement {
  const shimX = useSharedValue(-200);

  useEffect(() => {
    shimX.value = withRepeat(
      withTiming(400, { duration: 1600, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(shimX);
  }, []);

  const shimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimX.value }],
  }));

  return (
    <View
      style={{
        position: 'relative',
        height: 6,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: `${Math.max(0, Math.min(100, progress))}%`,
          backgroundColor: accent,
          borderRadius: 999,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '40%',
            backgroundColor: 'rgba(255,255,255,0.32)',
          },
          shimStyle,
        ]}
      />
    </View>
  );
}

// ─── Stage marker + list ────────────────────────────────────────────

function StageMark({
  state,
  accent,
  done,
  pendingDim,
}: {
  state: ProcessingStageState;
  accent: string;
  done: string;
  pendingDim: string;
}): React.ReactElement {
  if (state === 'done') {
    return (
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: done,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 12 10 18 20 6"
            stroke="#0a0a12"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    );
  }
  if (state === 'active') {
    return (
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: accent,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: pendingDim,
        borderStyle: 'dashed',
      }}
    />
  );
}

interface StageItem {
  label: string;
  state: ProcessingStageState;
}

function Stages({
  items,
  accent,
  done,
  pendingDim,
  textPrimary,
  textPending,
  bg,
  border,
}: {
  items: StageItem[];
  accent: string;
  done: string;
  pendingDim: string;
  textPrimary: string;
  textPending: string;
  bg: string;
  border: string;
}): React.ReactElement {
  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 16,
      }}
    >
      {items.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <StageMark state={s.state} accent={accent} done={done} pendingDim={pendingDim} />
          <Text
            style={{
              fontSize: 13,
              color: s.state === 'pending' ? textPending : textPrimary,
              fontWeight: s.state === 'active' ? '600' : '400',
            }}
          >
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Public overlay ─────────────────────────────────────────────────

export function ProcessingOverlay(): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const state = useVoiceInputStore((s) => s.state);
  const visible = useVoiceInputStore((s) => s.visible);
  const minimized = useVoiceInputStore((s) => s.minimized);
  const progress = useVoiceInputStore((s) => s.progress);
  const stageIndex = useVoiceInputStore((s) => s.stageIndex);
  const elapsedMs = useVoiceInputStore((s) => s.elapsedMs);
  const minimize = useVoiceInputStore((s) => s.minimize);
  const cancel = useVoiceInputStore((s) => s.cancel);

  const isProcessing = state === 'transcribing' || state === 'parsing';
  const showSheet = isProcessing && visible && !minimized;

  if (!showSheet) return null;

  const stroke = colors.textPrimary;
  const accent = colors.primary;
  const dim = colors.textTertiary;

  const stageStateAt = (idx: number): ProcessingStageState => {
    if (idx < stageIndex) return 'done';
    if (idx === stageIndex) return 'active';
    return 'pending';
  };
  const stages: StageItem[] = [
    { label: t('PROCESSING_STAGE_LOAD' as any), state: stageStateAt(0) },
    { label: t('PROCESSING_STAGE_CLEAN' as any), state: stageStateAt(1) },
    { label: t('PROCESSING_STAGE_TRANSCRIBE' as any), state: stageStateAt(2) },
    { label: t('PROCESSING_STAGE_FORMAT' as any), state: stageStateAt(3) },
  ];

  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const fileMeta = `voice_note · 0:${String(elapsedSec).padStart(2, '0')}`;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => minimize()}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => { impactLight(); minimize(); }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LinearGradient
          colors={
            colors.isDark
              ? ['rgba(7,8,15,0.55)', 'rgba(7,8,15,0.92)']
              : ['rgba(245,243,250,0.55)', 'rgba(245,243,250,0.92)']
          }
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: colors.border,
            paddingTop: 12,
            paddingBottom: insets.bottom + 22,
            paddingHorizontal: 22,
          }}
        >
          <Pressable
            onPress={() => { impactLight(); minimize(); }}
            hitSlop={20}
            style={{ alignItems: 'center', paddingBottom: 14 }}
          >
            <View
              style={{
                width: 38,
                height: 4,
                borderRadius: 4,
                backgroundColor: colors.border,
              }}
            />
          </Pressable>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 18,
            }}
          >
            <EarGlyph size={92} stroke={stroke} accent={accent} />
            <FlowDots accent={accent} />
            <WritingGlyph size={92} stroke={stroke} dim={dim} />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: '700',
                color: colors.textPrimary,
                letterSpacing: -0.2,
                textAlign: 'center',
              }}
            >
              {t('PROCESSING_AUDIO_TITLE' as any)}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                marginTop: 6,
                textAlign: 'center',
              }}
            >
              {t('PROCESSING_AUDIO_SUB' as any)}
            </Text>
          </View>

          <View
            style={{
              alignSelf: 'center',
              marginTop: 14,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 999,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: accent,
              }}
            />
            <Text
              style={{
                fontSize: 11.5,
                color: colors.textSecondary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {fileMeta}
            </Text>
          </View>

          <ProgressTrack
            progress={progress}
            accent={accent}
            bg={colors.surfaceSecondary}
            border={colors.border}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 11.5,
                color: colors.textSecondary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {Math.round(progress)}%
            </Text>
            <Pressable onPress={() => { impactLight(); minimize(); }} hitSlop={6}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <ChevronDown size={14} color={colors.textSecondary} strokeWidth={2} />
                <Text style={{ fontSize: 11.5, color: colors.textSecondary }}>
                  {t('MINIMIZE' as any)}
                </Text>
              </View>
            </Pressable>
          </View>

          <Stages
            items={stages}
            accent={accent}
            done={colors.income}
            pendingDim={colors.textTertiary}
            textPrimary={colors.textSecondary}
            textPending={colors.textTertiary}
            bg={colors.surfaceSecondary}
            border={colors.border}
          />

          <Pressable
            onPress={async () => { impactLight(); await cancel(); }}
            style={({ pressed }) => ({
              marginTop: 16,
              height: 44,
              borderRadius: 12,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>
              {t('CANCEL' as any)}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
