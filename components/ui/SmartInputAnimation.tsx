/**
 * SmartInputAnimation — entertaining loading UI for voice / OCR / parse states.
 * - Voice (hearing + transcribing): animated person-with-headphones + pulsing waves.
 * - OCR (seeing + transcribing): animated person-observing + sweeping scan line.
 * - Text / loading: sparkle with pulsing glow.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import Svg, {
  Circle,
  Path,
  Rect,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import { useThemeColors } from '../../hooks/useThemeColors';

export type SmartInputAnimationMode = 'ocr' | 'loading' | 'text' | 'voice';

interface SmartInputAnimationProps {
  mode: SmartInputAnimationMode;
  label?: string;
  sublabel?: string;
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const MODE_COLOR: Record<SmartInputAnimationMode, string> = {
  ocr:     '#10B981',
  loading: '#8B5CF6',
  text:    '#3B82F6',
  voice:   '#F59E0B',
};

// ─── Voice illustration: person with headphones + sound waves ────────
function VoiceIllustration({ color }: { color: string }): React.ReactElement {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makePulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const a = makePulse(wave1, 0);
    const b = makePulse(wave2, 450);
    const c = makePulse(wave3, 900);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [wave1, wave2, wave3]);

  const makeWaveStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.35] }) }],
  });

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      {/* Animated sound waves behind */}
      <Animated.View style={[styles.waveRing, { borderColor: color }, makeWaveStyle(wave1)]} />
      <Animated.View style={[styles.waveRing, { borderColor: color }, makeWaveStyle(wave2)]} />
      <Animated.View style={[styles.waveRing, { borderColor: color }, makeWaveStyle(wave3)]} />

      {/* Person with headphones listening */}
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Defs>
          <LinearGradient id="voiceBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0.04" />
          </LinearGradient>
        </Defs>

        {/* Background blob */}
        <Circle cx="60" cy="60" r="54" fill="url(#voiceBg)" />

        {/* Person body (silhouette) */}
        <Path
          d="M60 28 C67 28 72 33 72 40 C72 47 67 52 60 52 C53 52 48 47 48 40 C48 33 53 28 60 28 Z"
          fill={color}
          opacity="0.95"
        />
        <Path
          d="M40 92 C40 78 49 70 60 70 C71 70 80 78 80 92 L80 100 L40 100 Z"
          fill={color}
          opacity="0.95"
        />

        {/* Headphone band */}
        <Path
          d="M38 48 C38 30 50 22 60 22 C70 22 82 30 82 48"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        {/* Left cup */}
        <Rect x="34" y="44" width="10" height="16" rx="4" fill={color} />
        {/* Right cup */}
        <Rect x="76" y="44" width="10" height="16" rx="4" fill={color} />

        {/* Mic stem (small) in front of mouth */}
        <Path
          d="M44 54 C44 62 52 68 60 68"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <Circle cx="60" cy="68" r="2.8" fill={color} />
      </Svg>
    </View>
  );
}

// ─── OCR illustration: person observing + scanning line over a receipt ──
function OcrIllustration({ color }: { color: string }): React.ReactElement {
  const scan = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scan, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.delay(2200),
      ]),
    );
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [scan, blink]);

  // The scan line sweeps across the receipt inside the SVG.
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [36, 90] });
  // Eye blink: height shrinks, y moves down so the eye closes from both sides.
  const eyeHeight = blink.interpolate({ inputRange: [0, 1], outputRange: [3.6, 0.4] });
  const eyeY = blink.interpolate({ inputRange: [0, 1], outputRange: [58.2, 59.8] });

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={150} height={150} viewBox="0 0 150 150">
        <Defs>
          <LinearGradient id="ocrBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0.04" />
          </LinearGradient>
          <LinearGradient id="scanFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.5" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Background blob */}
        <Circle cx="75" cy="75" r="68" fill="url(#ocrBg)" />

        {/* Receipt in the foreground */}
        <Rect x="38" y="30" width="62" height="82" rx="4" fill="#ffffff" opacity="0.95" />
        {/* Receipt ruled lines */}
        <Rect x="44" y="40" width="42" height="2" rx="1" fill={color} opacity="0.4" />
        <Rect x="44" y="48" width="50" height="2" rx="1" fill={color} opacity="0.3" />
        <Rect x="44" y="56" width="36" height="2" rx="1" fill={color} opacity="0.3" />
        <Rect x="44" y="64" width="50" height="2" rx="1" fill={color} opacity="0.3" />
        <Rect x="44" y="72" width="30" height="2" rx="1" fill={color} opacity="0.3" />
        <Rect x="44" y="80" width="50" height="2" rx="1" fill={color} opacity="0.3" />
        <Rect x="44" y="88" width="40" height="2" rx="1" fill={color} opacity="0.3" />
        <Rect x="44" y="98" width="28" height="3" rx="1.5" fill={color} opacity="0.6" />

        {/* Animated scan line over receipt */}
        <AnimatedRect
          x="38"
          y={scanY}
          width="62"
          height="3"
          fill="url(#scanFade)"
        />

        {/* Person peeking from right — head + shoulder */}
        <Circle cx="115" cy="60" r="12" fill={color} />
        <Path
          d="M100 96 C100 84 108 78 115 78 C122 78 130 84 130 96 L130 110 L100 110 Z"
          fill={color}
        />
        {/* Eye (animated blink) */}
        <AnimatedRect
          x={109.2}
          y={eyeY}
          width={3.6}
          height={eyeHeight}
          rx={1.8}
          fill="#ffffff"
        />
      </Svg>
    </View>
  );
}

// ─── Text / generic loading illustration: sparkle + pulsing ring ─────
function TextIllustration({ color }: { color: string }): React.ReactElement {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[styles.pulseRing, { borderColor: color, transform: [{ scale }], opacity }]} />
      <View style={[styles.iconCore, { backgroundColor: color + '1f', borderColor: color + '55' }]}>
        <Sparkles size={36} color={color} strokeWidth={2} />
      </View>
    </View>
  );
}

export function SmartInputAnimation({
  mode,
  label,
  sublabel,
}: SmartInputAnimationProps): React.ReactElement {
  const colors = useThemeColors();
  const accent = MODE_COLOR[mode];

  let illustration: React.ReactElement;
  if (mode === 'voice') illustration = <VoiceIllustration color={accent} />;
  else if (mode === 'ocr') illustration = <OcrIllustration color={accent} />;
  else illustration = <TextIllustration color={accent} />;

  return (
    <View style={styles.container}>
      {illustration}
      {label ? (
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      ) : null}
      {sublabel ? (
        <Text style={[styles.sublabel, { color: colors.textSecondary }]}>{sublabel}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  waveRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  iconCore: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
  sublabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
});
