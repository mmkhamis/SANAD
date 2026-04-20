import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ChevronDown } from 'lucide-react-native';

import { useT } from '../../lib/i18n';
import { impactLight } from '../../utils/haptics';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslateCategory } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { COLORS } from '../../constants/colors';
import { STRINGS } from '../../constants/strings';
import { formatPercentage } from '../../utils/currency';
import { CurrencyAmount } from '../ui/CurrencyAmount';
import type { CategorySpending } from '../../types/index';

// Claude Design category palette — oklch-approx hex values.
const CLAUDE_CHART_PALETTE = [
  '#E89B6E', // warm orange
  '#A278EA', // purple
  '#6FB4E8', // blue
  '#7FD6A8', // green
  '#9AA0C0', // neutral
];

interface SpendingDonutChartProps {
  data: CategorySpending[];
  totalExpense: number;
}

/**
 * SVG Donut chart matching Claude Design exactly:
 *
 * Outer: 150px diameter, 22px stroke, butt linecap
 * Tiny gap between segments (2% of circumference)
 * Center: label "المجموع" + total amount + currency icon
 * Legend: right column with 3px vertical color bar + name + amount + %
 */
export function SpendingDonutChart({
  data,
  totalExpense,
}: SpendingDonutChartProps): React.ReactElement {
  const colors = useThemeColors();
  const tc = useTranslateCategory();
  const t = useT();
  const { isRTL, rowDir } = useRTL();
  const [showAll, setShowAll] = useState(false);

  const MAX_VISIBLE = 5;
  const visibleData = showAll ? data : data.slice(0, MAX_VISIBLE);
  const hiddenCount = Math.max(0, data.length - MAX_VISIBLE);

  if (data.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
          {STRINGS.NO_TRANSACTIONS_DESC}
        </Text>
      </View>
    );
  }

  // ─── SVG Donut geometry ──────────────────────────────
  const SIZE = 150;
  const STROKE_WIDTH = 22;
  const r = (SIZE - STROKE_WIDTH) / 2;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * r;
  const GAP_FRACTION = 0.02; // 2% gap between segments

  const totalPct = data.reduce((sum, c) => sum + c.percentage, 0) || 1;

  let offset = 0;
  const segments = data.map((item, index) => {
    const fraction = item.percentage / totalPct;
    const segmentLength = circumference * fraction - circumference * GAP_FRACTION;
    const dashArray = `${Math.max(segmentLength, 0)} ${circumference}`;
    const dashOffset = -offset * circumference;
    offset += fraction;

    return {
      key: item.category_id,
      color: item.category_color || CLAUDE_CHART_PALETTE[index % CLAUDE_CHART_PALETTE.length],
      dashArray,
      dashOffset,
    };
  });

  return (
    <View>
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 16 }}>
        {/* Donut */}
        <View style={{ width: SIZE, height: SIZE, flexShrink: 0 }}>
          <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Background track */}
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke={colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Data segments */}
            {segments.map((seg) => (
              <Circle
                key={seg.key}
                cx={cx}
                cy={cy}
                r={r}
                stroke={seg.color}
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
              />
            ))}
          </Svg>
          {/* Center label */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 9.5,
                color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
              }}
            >
              {isRTL ? 'المجموع' : 'Total'}
            </Text>
            <CurrencyAmount
              value={totalExpense}
              color={colors.isDark ? COLORS.claude.fg : colors.textPrimary}
              fontSize={18}
              fontWeight="700"
              iconSize={10}
            />
          </View>
        </View>

        {/* Legend — vertical color bars. Shows top 5 by default to respect
            pie space; tapping "See all" reveals the full list. */}
        <View style={{ flex: 1, gap: 9 }}>
          {visibleData.map((item, index) => {
            const barColor = item.category_color || CLAUDE_CHART_PALETTE[index % CLAUDE_CHART_PALETTE.length];
            return (
              <View
                key={item.category_id}
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {/* Vertical color bar */}
                <View
                  style={{
                    width: 3,
                    height: 22,
                    borderRadius: 2,
                    backgroundColor: barColor,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '500',
                      color: colors.isDark ? COLORS.claude.fg : colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    }}
                    numberOfLines={1}
                  >
                    {tc(item.category_name)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'baseline', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                    <CurrencyAmount
                      value={item.total}
                      color={colors.isDark ? COLORS.claude.fg3 : colors.textSecondary}
                      fontSize={10.5}
                      fontWeight="400"
                      iconSize={8}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
                        marginLeft: 4,
                      }}
                    >
                      · {formatPercentage(item.percentage)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {hiddenCount > 0 ? (
            <Pressable
              onPress={() => { impactLight(); setShowAll((v) => !v); }}
              hitSlop={6}
              style={({ pressed }) => ({
                flexDirection: rowDir,
                alignItems: 'center',
                gap: 4,
                marginTop: 2,
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <ChevronDown
                size={12}
                color={COLORS.claude.p400}
                strokeWidth={2.5}
                style={{ transform: [{ rotate: showAll ? '180deg' : '0deg' }] }}
              />
              <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.claude.p400 }}>
                {showAll
                  ? (t('SHOW_LESS' as any) ?? (isRTL ? 'عرض أقل' : 'Show less'))
                  : (isRTL ? `عرض الكل (${hiddenCount}+)` : `See all (+${hiddenCount})`)}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
