import React, { useCallback } from 'react';
import { View, Text, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useSubscription } from '../../hooks/useSubscription';
import { canAccess, getMinPlanFor, PLAN_DISPLAY_NAMES } from '../../lib/plan';
import { useT } from '../../lib/i18n';
import type { FeatureKey } from '../../types/index';
import { useThemeColors } from '../../hooks/useThemeColors';
import { impactLight } from '../../utils/haptics';

// ─── Types ───────────────────────────────────────────────────────────

interface FeatureGateProps {
  /** Feature key from the entitlement model in lib/plan.ts */
  feature: FeatureKey;
  children: React.ReactNode;
  /** Style applied to the outermost container */
  style?: ViewStyle;
  /**
   * Horizontal inset (px) for the frosted overlay — matches the child card's
   * marginHorizontal so the overlay aligns with card edges.
   * Defaults to 16, matching GlassCard's default marginHorizontal.
   */
  overlayHorizontalInset?: number;
  /**
   * Border radius of the frosted overlay.
   * Defaults to colors.cardRadius (16).
   */
  overlayBorderRadius?: number;
  /**
   * 'card'   – frosted overlay covering the full card (default)
   * 'button' – minimal lock badge on top of a dimmed button
   */
  mode?: 'card' | 'button';
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Returns the display name of the lowest plan that grants access. */
function minPlanLabel(feature: FeatureKey): string {
  return PLAN_DISPLAY_NAMES[getMinPlanFor(feature)];
}

// ─── Component ───────────────────────────────────────────────────────

/**
 * Wraps any feature with plan-based access control.
 *
 * When the user's effective plan satisfies the feature requirement:
 *   → renders children as-is
 *
 * When locked:
 *   → children are rendered but dimmed (pointerEvents disabled)
 *   → a frosted overlay appears with a lock icon and upgrade CTA
 *   → tapping navigates to the profile / subscription screen
 *
 * Reads entitlement from useSubscription() internally — no prop drilling.
 */
export function FeatureGate({
  feature,
  children,
  style,
  overlayHorizontalInset = 16,
  overlayBorderRadius,
  mode = 'card',
}: FeatureGateProps): React.ReactElement {
  const { entitlement } = useSubscription();
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();

  const locked = !canAccess(entitlement.effectivePlan, feature);
  const planLabel = minPlanLabel(feature);

  const handleUpgrade = useCallback(() => {
    impactLight();
    router.push('/(tabs)/profile');
  }, [router]);

  // ── Unlocked: render children normally ──────────────────────────
  if (!locked) {
    return <>{children}</>;
  }

  // ── Button mode: lock badge ──────────────────────────────────────
  if (mode === 'button') {
    return (
      <Pressable onPress={handleUpgrade} style={style} hitSlop={4}>
        {/* Dimmed content — non-interactive */}
        <View style={{ opacity: 0.35 }} pointerEvents="none">
          {children}
        </View>

        {/* Lock badge (top-right corner) */}
        <View
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            width: 15,
            height: 15,
            borderRadius: 8,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 4,
            elevation: 4,
          }}
        >
          <Lock size={8} color="#fff" strokeWidth={3.5} />
        </View>
      </Pressable>
    );
  }

  // ── Card mode: frosted overlay ───────────────────────────────────
  const radius = overlayBorderRadius ?? colors.cardRadius;

  return (
    <Pressable onPress={handleUpgrade} style={[{ marginTop: 12, marginBottom: colors.cardSpacing }, style]}>
      {/* Dimmed content — non-interactive */}
      <View style={{ opacity: 0.28 }} pointerEvents="none">
        {children}
      </View>

      {/* Frosted overlay — inset to align with card edges */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: overlayHorizontalInset,
          right: overlayHorizontalInset,
          bottom: 0,
          borderRadius: radius,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Base frosted layer */}
        <LinearGradient
          colors={
            colors.isDark
              ? [
                  'rgba(14,19,34,0.80)',
                  'rgba(18,25,44,0.86)',
                  'rgba(13,18,32,0.82)',
                ]
              : [
                  'rgba(238,242,254,0.86)',
                  'rgba(230,234,250,0.90)',
                  'rgba(235,240,255,0.88)',
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Violet shimmer — dark mode only */}
        {colors.isDark ? (
          <LinearGradient
            colors={[
              'rgba(139,92,246,0.10)',
              'rgba(217,70,239,0.05)',
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}

        {/* Subtle border */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: radius,
            borderWidth: 1,
            borderColor: colors.isDark
              ? 'rgba(139,92,246,0.18)'
              : 'rgba(139,92,246,0.14)',
          }}
        />

        {/* Lock content */}
        <View style={{ alignItems: 'center', paddingHorizontal: 28 }}>
          {/* Icon ring */}
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: colors.isDark
                ? 'rgba(139,92,246,0.14)'
                : 'rgba(139,92,246,0.08)',
              borderWidth: 1,
              borderColor: colors.isDark
                ? 'rgba(139,92,246,0.30)'
                : 'rgba(139,92,246,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 11,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: colors.isDark ? 0.35 : 0.15,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <Lock size={19} color={colors.primary} strokeWidth={2} />
          </View>

          {/* Plan label */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: colors.isDark ? colors.textPrimary : '#1a1f2e',
              textAlign: 'center',
              marginBottom: 4,
              letterSpacing: -0.1,
            }}
          >
            {t('FEATURE_AVAILABLE_IN')} {planLabel}
          </Text>

          {/* Subtitle */}
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: 16,
              lineHeight: 17,
            }}
          >
              {t('FEATURE_UPGRADE_UNLOCK')}
          </Text>

          {/* CTA pill */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 9,
              borderRadius: 22,
              backgroundColor: colors.isDark
                ? 'rgba(139,92,246,0.20)'
                : 'rgba(139,92,246,0.10)',
              borderWidth: 1,
              borderColor: colors.isDark
                ? 'rgba(139,92,246,0.36)'
                : 'rgba(139,92,246,0.24)',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.primary,
                letterSpacing: 0.1,
              }}
            >
              {t('FEATURE_UPGRADE_TO')} {planLabel} →
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
