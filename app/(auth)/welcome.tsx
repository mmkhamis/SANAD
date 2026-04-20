import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { impactMedium } from '../../utils/haptics';
import { useT } from '../../lib/i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Google Logo ─────────────────────────────────────────────────────

function GoogleLogo(): React.ReactElement {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <Path fill="none" d="M0 0h48v48H0z" />
    </Svg>
  );
}

// ─── Animated Orb ────────────────────────────────────────────────────

interface OrbProps {
  size: number;
  color: string;
  initialX: number;
  initialY: number;
  delay: number;
  duration: number;
  moveX: number;
  moveY: number;
}

function AnimatedOrb({ size, color, initialX, initialY, delay, duration, moveX, moveY }: OrbProps): React.ReactElement {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(moveX, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(moveY, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration * 1.3, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: initialX,
          top: initialY,
        },
        style,
      ]}
    />
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: string;
  title: string;
  subtitle: string;
  delay: number;
}

function FeatureCard({ icon, title, subtitle, delay }: FeatureCardProps): React.ReactElement {
  return (
    <Animated.View
      entering={Platform.OS !== 'web' ? FadeInDown.delay(delay).springify().damping(14) : undefined}
      style={{
        backgroundColor: 'rgba(255,255,255,0.13)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backdropFilter: 'blur(12px)',
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>{title}</Text>
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', marginTop: 2 }}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────

export default function WelcomeScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();

  const handleGetStarted = (): void => {
    impactMedium();
    router.push('/(auth)/register');
  };

  const handleSignIn = (): void => {
    impactMedium();
    router.push('/(auth)/login');
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ── Full-screen gradient ── */}
      <LinearGradient
        colors={['#4c1d95', '#7c3aed', '#6d28d9', '#4338ca']}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Animated background orbs ── */}
      <AnimatedOrb size={280} color="rgba(167,139,250,0.25)" initialX={-80} initialY={-60} delay={0} duration={5000} moveX={40} moveY={30} />
      <AnimatedOrb size={220} color="rgba(99,102,241,0.30)" initialX={SCREEN_WIDTH - 160} initialY={80} delay={800} duration={6500} moveX={-50} moveY={40} />
      <AnimatedOrb size={180} color="rgba(196,181,253,0.18)" initialX={SCREEN_WIDTH / 2 - 90} initialY={SCREEN_HEIGHT * 0.3} delay={400} duration={7000} moveX={30} moveY={-40} />
      <AnimatedOrb size={150} color="rgba(139,92,246,0.22)" initialX={20} initialY={SCREEN_HEIGHT * 0.55} delay={1200} duration={5500} moveX={60} moveY={-30} />
      <AnimatedOrb size={120} color="rgba(216,180,254,0.15)" initialX={SCREEN_WIDTH - 100} initialY={SCREEN_HEIGHT * 0.65} delay={600} duration={8000} moveX={-40} moveY={50} />

      {/* ── Content ── */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          justifyContent: 'space-between',
        }}
      >
        {/* Top: Logo + Headline */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          {/* Logo */}
          <Animated.View
            entering={Platform.OS !== 'web' ? FadeIn.delay(100).duration(600) : undefined}
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.20)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#7c3aed',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.6,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 36 }}>💜</Text>
          </Animated.View>

          <Animated.Text
            entering={Platform.OS !== 'web' ? FadeInDown.delay(200).springify() : undefined}
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Wallet
          </Animated.Text>

          <Animated.Text
            entering={Platform.OS !== 'web' ? FadeInDown.delay(300).springify() : undefined}
            style={{
              fontSize: 34,
              fontWeight: '800',
              color: '#fff',
              textAlign: 'center',
              lineHeight: 42,
              letterSpacing: -0.5,
            }}
          >
            {t('WELCOME_HEADLINE')}
          </Animated.Text>

          <Animated.Text
            entering={Platform.OS !== 'web' ? FadeInDown.delay(420).springify() : undefined}
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.72)',
              textAlign: 'center',
              marginTop: 12,
              lineHeight: 24,
              paddingHorizontal: 16,
            }}
          >
            {t('WELCOME_TAGLINE')}
          </Animated.Text>
        </View>

        {/* Middle: Feature Cards */}
        <View style={{ gap: 12, marginVertical: 8 }}>
          <FeatureCard
            icon="📊"
            title={t('WELCOME_FEATURE_DASHBOARD_TITLE')}
            subtitle={t('WELCOME_FEATURE_DASHBOARD_DESC')}
            delay={500}
          />
          <FeatureCard
            icon="🤖"
            title={t('WELCOME_FEATURE_AI_TITLE')}
            subtitle={t('WELCOME_FEATURE_AI_DESC')}
            delay={650}
          />
          <FeatureCard
            icon="🧾"
            title={t('WELCOME_FEATURE_SCAN_TITLE')}
            subtitle={t('WELCOME_FEATURE_SCAN_DESC')}
            delay={800}
          />
        </View>

        {/* Bottom: CTA Buttons */}
        <View style={{ gap: 12 }}>
          {/* Get Started — primary white button */}
          <Animated.View entering={Platform.OS !== 'web' ? FadeInUp.delay(900).springify().damping(14) : undefined}>
            <Pressable
              onPress={handleGetStarted}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: 18,
                backgroundColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#7c3aed' }}>
                {t('WELCOME_GET_STARTED')}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Sign In — ghost button */}
          <Animated.View entering={Platform.OS !== 'web' ? FadeInUp.delay(1000).springify().damping(14) : undefined}>
            <Pressable
              onPress={handleSignIn}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.30)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.92)' }}>
                {t('WELCOME_SIGN_IN')}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Social hint */}
          <Animated.View
            entering={Platform.OS !== 'web' ? FadeInUp.delay(1100).duration(400) : undefined}
            style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 }}
          >
            <GoogleLogo />
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>Google</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginHorizontal: 4 }}>·</Text>
            {Platform.OS === 'ios' ? (
              <>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}></Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>Apple</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginHorizontal: 4 }}>·</Text>
              </>
            ) : null}
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>{t('WELCOME_EMAIL_AVAILABLE')}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
