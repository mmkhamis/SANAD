/**
 * ScanAnimation — contextual animation for OCR / receipt scanning states.
 *
 * variant="full"    → centered full-area view with receipt icon, animated scan
 *                     beam, optional multi-receipt progress, and labels.
 * variant="compact" → smaller receipt + scan beam, fits inside a card button.
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';

// ─── Document dimensions ──────────────────────────────────────────────

const FULL_W  = 108;
const FULL_H  = 148;
const COMP_W  = 68;
const COMP_H  = 88;

// ─── Receipt line group ───────────────────────────────────────────────
// Simulates printed text rows on the receipt.

function ReceiptLines({
  compact,
  lineColor,
}: {
  compact: boolean;
  lineColor: string;
}): React.ReactElement {
  const H  = compact ? 5 : 7;
  const R  = H / 2;
  const MB = compact ? 8 : 11;
  const rows = compact
    ? [1, 0.65, 1, 0.5]
    : [1, 0.72, 1, 0.55, 0.88];

  return (
    <>
      {rows.map((w, i) => (
        <View
          key={i}
          style={{
            height: H,
            borderRadius: R,
            backgroundColor: lineColor,
            width: `${w * 100}%`,
            marginBottom: i < rows.length - 1 ? MB : 0,
          }}
        />
      ))}
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────

export interface ScanAnimationProps {
  /**
   * 'full'    → centered full-area view with document + labels.
   * 'compact' → smaller document only, fits inside a card button.
   */
  variant?: 'full' | 'compact';
  /** Multi-receipt progress. When provided, updates the label. */
  progress?: { current: number; total: number };
  label?: string;
  sublabel?: string;
}

export function ScanAnimation({
  variant = 'full',
  progress,
  label,
  sublabel = 'Extracting details from image',
}: ScanAnimationProps): React.ReactElement {
  const colors = useThemeColors();

  const docW = variant === 'compact' ? COMP_W : FULL_W;
  const docH = variant === 'compact' ? COMP_H : FULL_H;

  const scanY = useSharedValue(0);

  useEffect(() => {
    // Beam travels from top to bottom of the document, then jumps back and repeats.
    scanY.value = withRepeat(
      withTiming(docH, { duration: 1900, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [docH]);

  const beamStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  const defaultLabel = progress
    ? `Scanning ${progress.current} of ${progress.total}…`
    : 'Scanning receipt…';

  const lineColor = colors.isDark
    ? 'rgba(148,163,184,0.12)'
    : 'rgba(100,116,139,0.10)';

  const docBg = colors.isDark ? 'rgba(22,30,46,0.92)' : '#F8FAFC';
  const docBorder = colors.isDark
    ? 'rgba(139,92,246,0.20)'
    : 'rgba(148,163,184,0.32)';

  const padding = variant === 'compact' ? 10 : 16;
  const radius  = variant === 'compact' ? 10 : 14;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: variant === 'full' ? 80 : 0,
      }}
    >
      {/* ── Receipt document ─────────────────────────────── */}
      <View
        style={{
          width: docW,
          height: docH,
          borderRadius: radius,
          backgroundColor: docBg,
          borderWidth: 1,
          borderColor: docBorder,
          overflow: 'hidden',          // clips the scan beam at document edges
          padding,
          justifyContent: 'center',
          marginBottom: variant === 'full' ? 28 : 0,
          shadowColor: colors.isDark ? '#8B5CF6' : '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: colors.isDark ? 0.22 : 0.07,
          shadowRadius: 14,
          elevation: 5,
        }}
      >
        <ReceiptLines compact={variant === 'compact'} lineColor={lineColor} />

        {/* Scan beam: glow above + solid line + glow below, all translate together */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -14,       // starts slightly above the visible area
              left: 0,
              right: 0,
              height: 28,     // glow + line + glow
            },
            beamStyle,
          ]}
        >
          {/* Glow above the line */}
          <LinearGradient
            colors={['transparent', `${colors.primary}1A`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
          {/* Scan line: horizontal gradient for a soft edge glow on left/right */}
          <LinearGradient
            colors={[
              'transparent',
              `${colors.primary}88`,
              colors.primary,
              `${colors.primary}88`,
              'transparent',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 2 }}
          />
          {/* Glow below the line */}
          <LinearGradient
            colors={[`${colors.primary}1A`, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>

      {/* ── Labels (full variant only) ────────────────────── */}
      {variant === 'full' ? (
        <>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: colors.textPrimary,
              marginBottom: 5,
            }}
          >
            {label ?? defaultLabel}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
            }}
          >
            {sublabel}
          </Text>
        </>
      ) : (
        /* Compact: just a small status label under the document */
        <Text
          style={{
            fontSize: 11,
            color: colors.textTertiary,
            marginTop: 8,
            letterSpacing: 0.1,
          }}
        >
          {progress ? `${progress.current} of ${progress.total}` : 'Scanning…'}
        </Text>
      )}
    </View>
  );
}
