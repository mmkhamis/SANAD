import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingDown } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useExpenseTrend } from '../../hooks/useExpenseTrend';
import { formatCompactAmount } from '../../utils/currency';
import { impactLight } from '../../utils/haptics';
import type { ExpenseTrendMode } from '../../types/index';

const MODES: { key: ExpenseTrendMode; label: string }[] = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly' },
];

interface ExpenseTrendChartProps {
  month: string; // YYYY-MM
}

export function ExpenseTrendChart({ month }: ExpenseTrendChartProps): React.ReactElement {
  const colors = useThemeColors();
  const [mode, setMode] = useState<ExpenseTrendMode>('day');
  const { data: points, isLoading } = useExpenseTrend(mode, month);

  const maxVal = Math.max(...(points ?? []).map((p) => p.value), 1);
  const totalExpense = (points ?? []).reduce((s, p) => s + p.value, 0);

  const lineColor = colors.expense;
  const pointColor = colors.isDark ? '#FFFFFF' : colors.expense;

  // Spacing adapts to mode so the line fills the card
  const spacing = mode === 'day' ? 16 : mode === 'week' ? 52 : 24;

  const lineData = (points ?? []).map((pt) => ({
    value: pt.value,
    label: pt.label,
    dataPointText: pt.value > 0 ? formatCompactAmount(pt.value) : '',
  }));

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.glassBorder,
      }}
    >
      <LinearGradient
        colors={
          colors.isDark
            ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
            : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        {/* Metallic sheen overlay */}
        <LinearGradient
          colors={
            colors.isDark
              ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
              : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {colors.isDark ? (
          <LinearGradient
            colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}

        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.isDark ? 'rgba(251,113,133,0.12)' : colors.expenseBg,
              }}
            >
              <TrendingDown size={16} color={colors.expense} strokeWidth={2} />
            </View>
            <View>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>Expense Trend</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.isDark ? '#FFFFFF' : colors.textPrimary }}>
                {formatCompactAmount(Math.round(totalExpense * 100) / 100)}
              </Text>
            </View>
          </View>

          {/* Mode pills */}
          <View
            style={{
              flexDirection: 'row',
              borderRadius: 12,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
          >
            {MODES.map((m) => {
              const active = m.key === mode;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => { impactLight(); setMode(m.key); }}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: active
                      ? (colors.isDark ? 'rgba(139,92,246,0.25)' : colors.primary + '14')
                      : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: active ? '700' : '500',
                      color: active ? colors.primaryLight : colors.textTertiary,
                    }}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Chart area */}
        {isLoading ? (
          <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : lineData.length === 0 ? (
          <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>No expenses yet</Text>
          </View>
        ) : (
          <View style={{ marginLeft: -8 }}>
            <LineChart
              data={lineData}
              color={lineColor}
              thickness={2.5}
              spacing={spacing}
              noOfSections={4}
              maxValue={maxVal * 1.2}
              areaChart
              startFillColor={lineColor + '25'}
              endFillColor={lineColor + '05'}
              startOpacity={0.3}
              endOpacity={0.05}
              dataPointsColor={pointColor}
              dataPointsRadius={4}
              textColor={colors.textTertiary}
              textFontSize={8}
              textShiftY={-10}
              textShiftX={-8}
              xAxisThickness={1}
              yAxisThickness={0}
              xAxisColor={colors.isDark ? 'rgba(255,255,255,0.06)' : colors.borderLight}
              yAxisTextStyle={{ fontSize: 9, color: colors.textTertiary }}
              xAxisLabelTextStyle={{ fontSize: mode === 'day' ? 8 : 10, color: colors.textTertiary }}
              rulesType="dashed"
              rulesColor={colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}
              dashWidth={4}
              dashGap={4}
              height={140}
              curved
              curvature={0.2}
              animationDuration={0}
              isAnimated={false}
              disableScroll={mode !== 'day'}
              initialSpacing={14}
              endSpacing={14}
              hideDataPoints={false}
              focusEnabled
              showStripOnFocus
              stripColor={colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
              stripWidth={1}
              formatYLabel={(val: string) => formatCompactAmount(Number(val))}
              pointerConfig={{
                pointerStripColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                pointerStripWidth: 1,
                pointerColor: lineColor,
                radius: 5,
                pointerLabelWidth: 80,
                pointerLabelHeight: 28,
                pointerLabelComponent: (items: { value: number }[]) => (
                  <View
                    style={{
                      backgroundColor: colors.isDark ? 'rgba(30,38,55,0.95)' : 'rgba(255,255,255,0.95)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.isDark ? 'rgba(139,92,246,0.2)' : colors.glassBorder,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: lineColor }}>
                      {formatCompactAmount(items[0]?.value ?? 0)}
                    </Text>
                  </View>
                ),
              }}
            />
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
