import React, { useMemo } from 'react';
import { View, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { useLanguageStore } from '../../store/language-store';
import { maskIfHidden } from '../../store/privacy-store';
import { formatCompactNumberLocale } from '../../utils/currency';

export type HeroStatusItemStatus = 'on_track' | 'near_limit' | 'exceeded';

export interface HeroStatusItem {
  id: string;
  label: string;
  /** Spent so far against the budget. */
  value: number;
  /** Budget cap. Used to display "value / max" and to compute fill %. */
  max: number;
  /** Optional category color used to tint the gradient bar. */
  accentColor?: string | null;
  status?: HeroStatusItemStatus;
}

interface HeroStatusBarChartProps {
  title: string;
  items: HeroStatusItem[];
  hidden?: boolean;
  style?: ViewStyle;
  emptyLabel?: string;
  /**
   * Dense layout for use inside a stats row alongside other small metrics —
   * skips the title block, tightens spacing, and uses smaller bars so the
   * surrounding card doesn't grow taller.
   */
  compact?: boolean;
}

/**
 * Backgroundless luxe bar list for the hero card.
 *
 * Renders up to N horizontal bars (caller decides how many items to pass),
 * each tinted by category color and gradient-filled to the spent ratio.
 * Status `near_limit` adds an amber edge, `exceeded` overrides with red.
 */
export const HeroStatusBarChart = React.memo(function HeroStatusBarChart({
  title,
  items,
  hidden = false,
  style,
  emptyLabel,
  compact = false,
}: HeroStatusBarChartProps): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL, rowDir, textAlign } = useRTL();
  const language = useLanguageStore((s) => s.language);
  const barHeight = compact ? 4 : 7;
  const rowGap = compact ? 4 : 12;

  return (
    <View style={[{ paddingVertical: compact ? 0 : 4 }, style]}>
      {compact ? null : (
        <View
          style={{
            flexDirection: rowDir,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: items.length > 0 ? 12 : 6,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 10.5,
              fontWeight: '700',
              letterSpacing: 0.6,
              textAlign,
              color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
            }}
          >
            {title.toUpperCase()}
          </Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.isDark ? COLORS.claude.p400 : COLORS.primary,
              shadowColor: colors.isDark ? COLORS.claude.pGlow : 'rgba(139,92,246,0.24)',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 8,
            }}
          />
        </View>
      )}

      {items.length === 0 ? (
        <Text
          style={{
            fontSize: 11.5,
            color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
            textAlign,
          }}
        >
          {emptyLabel ?? ''}
        </Text>
      ) : null}

      {items.map((item, index) => {
        const safeMax = Math.max(item.max, 1);
        const ratio = Math.abs(item.value) / safeMax;
        const fillPercent = hidden ? 42 : Math.max(Math.min(ratio, 1.25) * 100, 4);
        const overflow = item.value > item.max && item.max > 0;

        // Resolve the bar color. Smoothly interpolate from the category accent
        // through amber toward red as spending approaches and exceeds the limit.
        const base = item.accentColor || (colors.isDark ? COLORS.claude.p400 : COLORS.primary);
        const status = item.status ?? (overflow ? 'exceeded' : 'on_track');

        // Intra-bar gradient: left edge is the category color, right edge shifts
        // toward amber then red as spending approaches / exceeds the limit.
        const pct = Math.min(ratio, 1.3); // cap at 130%
        const amber = colors.isDark ? COLORS.claude.amber : COLORS.warning;
        const red = colors.isDark ? COLORS.claude.red : COLORS.expense;

        let gradientEnd: string;
        if (pct <= 0.5) {
          // Under 50% — right edge stays the category color
          gradientEnd = base;
        } else if (pct <= 0.8) {
          // 50-80% — right edge blends category → amber
          const t = (pct - 0.5) / 0.3;
          gradientEnd = lerpColor(base, amber, t);
        } else {
          // 80%+ — right edge blends amber → red
          const t = Math.min((pct - 0.8) / 0.25, 1);
          gradientEnd = lerpColor(amber, red, t);
        }
        const gradient: [string, string] = [withAlpha(base, 0.85), gradientEnd];

        return (
          <View key={item.id} style={{ marginTop: index === 0 ? 0 : rowGap }}>
            <View
              style={{
                flexDirection: rowDir,
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: compact ? 2 : 6,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: compact ? 10 : 11,
                  fontWeight: '600',
                  color: colors.isDark ? COLORS.claude.fg2 : colors.textPrimary,
                  textAlign,
                }}
              >
                {item.label}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: compact ? 9.5 : 10.5,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                  color:
                    status === 'exceeded'
                      ? colors.expense
                      : status === 'near_limit'
                        ? colors.warning
                        : colors.isDark ? COLORS.claude.fg : colors.textPrimary,
                }}
              >
                {maskIfHidden(formatCompactNumberLocale(item.value, language), hidden)}
                <Text
                  style={{
                    fontWeight: '500',
                    color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
                  }}
                >
                  {' / '}
                  {maskIfHidden(formatCompactNumberLocale(item.max, language), hidden)}
                </Text>
              </Text>
            </View>

            <View
              style={{
                height: barHeight,
                borderRadius: 999,
                overflow: 'hidden',
                backgroundColor: colors.isDark
                  ? 'rgba(255,255,255,0.07)'
                  : 'rgba(20,19,42,0.06)',
              }}
            >
              {fillPercent > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: `${Math.min(fillPercent, 100)}%`,
                    [isRTL ? 'right' : 'left']: 0,
                    borderRadius: 999,
                    overflow: 'hidden',
                    shadowColor: gradient[1],
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: status === 'on_track' ? 0.45 : 0.6,
                    shadowRadius: 6,
                  }}
                >
                  <LinearGradient
                    colors={gradient}
                    start={isRTL ? { x: 1, y: 0.5 } : { x: 0, y: 0.5 }}
                    end={isRTL ? { x: 0, y: 0.5 } : { x: 1, y: 0.5 }}
                    style={{ flex: 1 }}
                  />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
});

/** Append an alpha component to a #RRGGBB hex (or pass through if already rgba). */
function withAlpha(hex: string, alpha: number): string {
  if (!hex) return hex;
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex;
  if (hex.length === 7 && hex.startsWith('#')) {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
  }
  return hex;
}

/** Linearly interpolate between two #RRGGBB hex colors. t=0 → a, t=1 → b. */
function lerpColor(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const ca = parse(a.slice(0, 7));
  const cb = parse(b.slice(0, 7));
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}
