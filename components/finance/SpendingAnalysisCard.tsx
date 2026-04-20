import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { PieChart } from 'lucide-react-native';

import { HeroCard } from '../ui/HeroCard';
import { CurrencyAmount } from '../ui/CurrencyAmount';
import { SpendingDonutChart } from '../charts/SpendingDonutChart';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { COLORS } from '../../constants/colors';
import type { CategorySpending, HabitInsights } from '../../types/index';

interface SpendingAnalysisCardProps {
  data: CategorySpending[];
  totalExpense: number;
  transactionCount: number;
  habitInsights: HabitInsights | undefined;
  selectedMonth: string;
  hidden: boolean;
}

function daysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

export function SpendingAnalysisCard({
  data,
  totalExpense,
  transactionCount,
  habitInsights,
  selectedMonth,
  hidden,
}: SpendingAnalysisCardProps): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign } = useRTL();

  const recurringCount = useMemo(() => {
    if (!habitInsights?.habits) return 0;
    return habitInsights.habits.filter((h) => h.frequency !== 'irregular').length;
  }, [habitInsights]);

  const avgPerDay = useMemo(() => {
    // For the currently-viewing month, divide by today's day-of-month so the
    // average reflects the elapsed portion only (e.g. on Apr 16 → ÷16,
    // not ÷30). For past months use the full month length.
    const [y, m] = selectedMonth.split('-').map(Number);
    const today = new Date();
    const isCurrentMonth = y === today.getFullYear() && m === today.getMonth() + 1;
    const days = isCurrentMonth ? today.getDate() : daysInMonth(selectedMonth);
    return days > 0 ? totalExpense / days : 0;
  }, [totalExpense, selectedMonth]);

  if (data.length === 0) return null;

  const tileBg = colors.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)';
  const tileBorder = colors.isDark ? COLORS.claude.stroke : colors.glassBorder;
  const labelColor = colors.isDark ? COLORS.claude.fg3 : colors.textSecondary;
  const valueColor = colors.isDark ? COLORS.claude.fg : colors.textPrimary;

  return (
    <HeroCard style={{ marginTop: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(162,120,234,0.15)',
          }}
        >
          <PieChart size={16} color={COLORS.claude.p400} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: valueColor }}>
          {t('SPENDING_ANALYSIS' as any)}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: labelColor,
          marginBottom: 16,
          textAlign,
        }}
      >
        {t('SPENDING_ANALYSIS_DESC' as any)}
      </Text>

      {/* Donut + legend */}
      <SpendingDonutChart data={data} totalExpense={totalExpense} />

      {/* Stat tiles */}
      <View style={{ flexDirection: rowDir, gap: 8, marginTop: 16 }}>
        <View
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: tileBg,
            borderWidth: 1,
            borderColor: tileBorder,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: valueColor }}>
            {transactionCount}
          </Text>
          <Text style={{ fontSize: 10.5, color: labelColor, marginTop: 3, textAlign: 'center' }}>
            {t('STAT_TXN_COUNT' as any)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: tileBg,
            borderWidth: 1,
            borderColor: tileBorder,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.claude.p400 }}>
            {recurringCount}
          </Text>
          <Text style={{ fontSize: 10.5, color: labelColor, marginTop: 3, textAlign: 'center' }}>
            {t('STAT_HABITS_RECURRING' as any)}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: tileBg,
            borderWidth: 1,
            borderColor: tileBorder,
          }}
        >
          {hidden ? (
            <Text style={{ fontSize: 18, fontWeight: '700', color: valueColor }}>••••</Text>
          ) : (
            <CurrencyAmount
              value={avgPerDay}
              color={valueColor}
              fontSize={16}
              fontWeight="700"
              iconSize={10}
            />
          )}
          <Text style={{ fontSize: 10.5, color: labelColor, marginTop: 3, textAlign: 'center' }}>
            {t('STAT_AVG_PER_DAY' as any)}
          </Text>
        </View>
      </View>
    </HeroCard>
  );
}
