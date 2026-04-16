/**
 * PromoCard — Discord Nitro-style glassmorphic promo card.
 * DESIGN SANDBOX ONLY — renders inside Assets tab for visual testing.
 *
 * Colors:
 *   Deep plum:      #372445
 *   Indigo purple:  #28244B
 *   Card base:      #35353A
 *   Dark secondary: #2C2F36
 *   CTA:            #606AEA / #767FED
 *   Text primary:   #F4F5F8
 *   Text secondary: #B7BAC6
 *   Border:         rgba(255,255,255,0.08)
 *   Glass overlay:  rgba(255,255,255,0.04)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { X, Sparkles, ArrowRight } from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 48;
const CARD_H = 260;
const GRADIENT_COLORS = ['#372445', '#28244B', '#372445', '#28244B'];
const LOOP_DURATION = 10000; // 10s

const ANIMATED_GRADIENT = Animated.createAnimatedComponent(LinearGradient);

// ─── Animated gradient background ─────────────────────────────────────

function AnimatedGradient(): React.ReactElement {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Slow horizontal + vertical drift
    x.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: LOOP_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.1, { duration: LOOP_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: LOOP_DURATION, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    y.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: LOOP_DURATION * 1.2, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.15, { duration: LOOP_DURATION * 1.2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: LOOP_DURATION * 1.2, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    // Tiny scale pulse
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [x, y, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value * 40 },
      { translateY: y.value * 30 },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: -20,
          left: -20,
          right: -20,
          bottom: -20,
        },
        animStyle,
      ]}
    >
      <ANIMATED_GRADIENT
        colors={GRADIENT_COLORS as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: '100%', height: '100%' }}
      />
    </Animated.View>
  );
}

// ─── Promo Card ───────────────────────────────────────────────────────

interface PromoCardProps {
  /** Title line */
  title?: string;
  /** Subtitle / description */
  subtitle?: string;
  /** CTA button text */
  ctaText?: string;
  /** Called on close */
  onClose?: () => void;
  /** Called on CTA press */
  onCtaPress?: () => void;
}

export const PromoCard = React.memo(function PromoCard({
  title = 'Premium Insights',
  subtitle = 'Unlock advanced spending patterns, AI-powered alerts, and personalized saving recommendations.',
  ctaText = 'Upgrade Now',
  onClose,
  onCtaPress,
}: PromoCardProps): React.ReactElement {
  const [visible, setVisible] = useState(true);
  const entranceY = useSharedValue(20);
  const entranceOpacity = useSharedValue(0);

  useEffect(() => {
    entranceOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    entranceY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [entranceOpacity, entranceY]);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceY.value }],
  }));

  const handleClose = useCallback(() => {
    entranceOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) });
    onClose?.();
    setTimeout(() => setVisible(false), 350);
  }, [entranceOpacity, onClose]);

  if (!visible) return <></>;

  return (
    <Animated.View
      style={[
        {
          width: CARD_W,
          height: CARD_H,
          marginBottom: 12,
          borderRadius: 28,
          overflow: 'visible', // needed for notch
        },
        entranceStyle,
      ]}
    >
      {/* Outer shadow layer */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 28,
          backgroundColor: '#372445',
          shadowColor: '#372445',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
          elevation: 8,
        }}
      />

      {/* Card body */}
      <View
        style={{
          flex: 1,
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
          backgroundColor: '#35353A',
        }}
      >
        {/* 1. Animated gradient glow (behind content) */}
        <AnimatedGradient />

        {/* 2. Soft glass overlay */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        />

        {/* 3. Blur layer (simulates frosted glass) */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(44,47,54,0.55)',
          }}
        />

        {/* 4. Content */}
        <View style={{ flex: 1, padding: 22, position: 'relative' }}>
          {/* Close icon — top right */}
          <Pressable
            onPress={handleClose}
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <X size={14} color="#B7BAC6" strokeWidth={2} />
          </Pressable>

          {/* Sparkle icon + title */}
          <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(96,106,234,0.15)',
                marginBottom: 10,
              }}
            >
              <Sparkles size={18} color="#767FED" strokeWidth={2} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#F4F5F8',
                textAlign: 'center',
                letterSpacing: -0.3,
              }}
            >
              {title}
            </Text>
          </View>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '400',
              color: '#B7BAC6',
              textAlign: 'center',
              lineHeight: 21,
              marginBottom: 20,
            }}
          >
            {subtitle}
          </Text>

          {/* Spacer pushes CTA to bottom */}
          <View style={{ flex: 1 }} />

          {/* CTA button */}
          <Pressable
            onPress={onCtaPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              height: 46,
              borderRadius: 16,
              backgroundColor: '#606AEA',
              // Subtle gradient illusion via shadow
              shadowColor: '#606AEA',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: '#F4F5F8',
                marginRight: 6,
              }}
            >
              {ctaText}
            </Text>
            <ArrowRight size={16} color="#F4F5F8" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* 5. Bottom-center speech-bubble notch/pointer */}
      <View
        style={{
          position: 'absolute',
          bottom: -10,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 16,
            height: 12,
            backgroundColor: '#35353A',
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            borderTopWidth: 0,
            shadowColor: '#372445',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 4,
          }}
        />
      </View>
    </Animated.View>
  );
});
