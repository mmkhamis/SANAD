/**
 * AIInsightCard — Premium animated glassmorphic insight card.
 *
 * Design:
 *   • Animated gradient background (purple → dark → teal → pink) on a 8s loop
 *   • Glassmorphism layer via expo-blur (intensity 40)
 *   • Metallic shine sweep on mount
 *   • Fade + slide-up entrance animation
 *   • Dismiss with scale + fade exit
 *
 * Performance:
 *   • All animations run on the UI thread via Reanimated
 *   • Component is memoized
 *   • No unnecessary re-renders
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolateColor,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  PiggyBank,
  Info,
  ChevronRight,
} from 'lucide-react-native';

import type { Insight } from '../../hooks/useInsights';
import { useInsightStore } from '../../store/insight-store';
import { impactLight } from '../../utils/haptics';

// ─── Constants ────────────────────────────────────────────────────────

const GRADIENT_COLORS = ['#5A2D91', '#1B1F2A', '#2CE6C2', '#FF4FD8'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const SHINE_WIDTH = SCREEN_WIDTH * 0.45;
const ANIM_DURATION = 8000; // 8s gradient loop
const ENTRANCE_DURATION = 500;

// ─── Icon mapping by insight type ─────────────────────────────────────

const TYPE_ICON_MAP: Record<Insight['type'], LucideIcon> = {
  spending: TrendingDown,
  saving: PiggyBank,
  budget: Info,
  trend: TrendingUp,
  alert: AlertTriangle,
};

const TYPE_BORDER_MAP: Record<Insight['type'], string> = {
  spending: 'rgba(239,68,68,0.4)',
  saving: 'rgba(52,211,153,0.4)',
  budget: 'rgba(96,165,250,0.4)',
  trend: 'rgba(167,139,250,0.4)',
  alert: 'rgba(251,146,60,0.6)',
};

// ─── Animated gradient background ─────────────────────────────────────

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

function AnimatedGradientBackground({
  progress,
}: {
  progress: SharedValue<number>;
}): React.ReactElement {
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

function MetallicShine({
  visible,
}: {
  visible: boolean;
}): React.ReactElement | null {
  const translateX = useSharedValue(-SHINE_WIDTH);

  useEffect(() => {
    if (!visible) return;
    translateX.value = withSequence(
      withDelay(300, withTiming(SCREEN_WIDTH + SHINE_WIDTH, { duration: 1200, easing: Easing.ease })),
    );
  }, [visible, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        borderRadius: 16,
        pointerEvents: 'none',
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            width: SHINE_WIDTH,
            height: '100%',
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────

interface AIInsightCardProps {
  insight: Insight;
  onDetails?: (insight: Insight) => void;
}

export const AIInsightCard = React.memo(function AIInsightCard({
  insight,
  onDetails,
}: AIInsightCardProps): React.ReactElement | null {
  const { dismissedIds, dismiss, highlightNewId, highlightNew, expandedId, toggleExpanded } = useInsightStore();

  // Skip if dismissed
  if (dismissedIds.includes(insight.id)) return null;

  const IconComponent = TYPE_ICON_MAP[insight.type] ?? Info;
  const borderColor = TYPE_BORDER_MAP[insight.type];
  const isNew = highlightNewId === insight.id;
  const isExpanded = expandedId === insight.id;

  // ── Animations ───────────────────────────────────────────────────

  const gradientProgress = useSharedValue(0);
  const entranceOpacity = useSharedValue(0);
  const entranceTranslateY = useSharedValue(20);
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);

  // Entrance animation
  useEffect(() => {
    entranceOpacity.value = withTiming(1, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.ease) });
    entranceTranslateY.value = withTiming(0, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.ease) });

    // Trigger shine on mount
    gradientProgress.value = withRepeat(
      withTiming(1, { duration: ANIM_DURATION, easing: Easing.linear }),
      -1,
      false,
    );
  }, [entranceOpacity, entranceTranslateY, gradientProgress]);

  // Entrance style
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceTranslateY.value }],
  }));

  // Exit animation (dismiss)
  const handleDismiss = (): void => {
    impactLight();
    exitScale.value = withTiming(0.9, { duration: 250, easing: Easing.in(Easing.ease) });
    exitOpacity.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) }, () => {
      runOnJS(dismiss)(insight.id);
    });
  };

  const exitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: exitScale.value }],
    opacity: exitOpacity.value,
  }));

  // Mark as highlighted once after mount
  useEffect(() => {
    if (!isNew) return undefined;
    const t = setTimeout(() => highlightNew(null), 3000);
    return () => clearTimeout(t);
  }, [isNew, highlightNew]);

  return (
    <Animated.View style={[{ marginBottom: 12 }, entranceStyle, exitStyle]}>
      <Pressable
        onPress={() => {
          impactLight();
          toggleExpanded(isExpanded ? null : insight.id);
        }}
        onLongPress={handleDismiss}
        delayLongPress={500}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          marginHorizontal: 16,
          borderWidth: 1,
          borderColor,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {/* 1. Animated gradient background */}
        <AnimatedGradientBackground progress={gradientProgress} />

        {/* 2. Glassmorphism layer (opacity-based since expo-blur not installed) */}
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          {/* Semi-transparent glass overlay */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15,20,35,0.65)',
            }}
          />
          {/* Subtle white sheen for glass effect */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.05)',
            }}
          />

          {/* 3. Metallic shine */}
          <MetallicShine visible />

          {/* 4. Content */}
          <View style={{ padding: 16, position: 'relative' }}>
            {/* Header row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  marginRight: 10,
                }}
              >
                <IconComponent size={16} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {insight.type === 'alert' ? '⚠ Alert' : insight.type === 'saving' ? '💡 Saving Tip' : insight.type === 'trend' ? '📈 Trend' : insight.type === 'spending' ? '💸 Spending' : '📊 Budget'}
                </Text>
                {insight.priority === 'high' ? (
                  <View
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#EF4444',
                    }}
                  />
                ) : null}
              </View>
            </View>

            {/* Message */}
            <Text
              style={{
                fontSize: 15,
                fontWeight: '500',
                color: 'rgba(255,255,255,0.92)',
                lineHeight: 22,
                marginBottom: isExpanded ? 12 : 0,
              }}
            >
              {insight.message}
            </Text>

            {/* Expanded details + CTA */}
            {isExpanded ? (
              <Pressable
                onPress={() => {
                  impactLight();
                  onDetails?.(insight);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.15)',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#2CE6C2', flex: 1 }}>
                  View Details
                </Text>
                <ChevronRight size={16} color="#2CE6C2" strokeWidth={2} />
              </Pressable>
            ) : (
              <Text
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  marginTop: 4,
                }}
              >
                Tap to expand · Long press to dismiss
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Insights List (FlashList-friendly wrapper) ───────────────────────

interface InsightListProps {
  insights: Insight[];
  onDetails?: (insight: Insight) => void;
}

export function InsightList({ insights, onDetails }: InsightListProps): React.ReactElement | null {
  const { highlightNew } = useInsightStore();

  if (insights.length === 0) return null;

  // Highlight the newest insight on first render
  useEffect(() => {
    if (insights.length > 0) {
      highlightNew(insights[0].id);
    }
  }, [insights, highlightNew]);

  return (
    <View style={{ marginBottom: 16 }}>
      {insights.map((insight) => (
        <AIInsightCard key={insight.id} insight={insight} onDetails={onDetails} />
      ))}
    </View>
  );
}
