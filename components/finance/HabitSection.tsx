import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Repeat,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Hash,
} from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { formatCompactAmount, formatAmount } from '../../utils/currency';
import { impactLight } from '../../utils/haptics';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useT } from '../../lib/i18n';
import type { HabitInsights, SpendingHabit } from '../../types/index';

function useFreqLabels(): Record<string, string> {
  const t = useT();
  return {
    daily: t('FREQ_DAILY' as any),
    weekly: t('FREQ_WEEKLY' as any),
    biweekly: t('FREQ_BIWEEKLY' as any),
    monthly: t('FREQ_MONTHLY' as any),
    irregular: t('FREQ_RECURRING' as any),
  };
}

function useDayNames(): string[] {
  const t = useT();
  return [
    t('DAY_SUN' as any), t('DAY_MON' as any), t('DAY_TUE' as any),
    t('DAY_WED' as any), t('DAY_THU' as any), t('DAY_FRI' as any),
    t('DAY_SAT' as any),
  ];
}

const FREQ_COLORS: Record<string, string> = {
  daily: '#F87171',
  weekly: '#FB923C',
  biweekly: '#FACC15',
  monthly: '#34D399',
  irregular: '#A78BFA',
};

const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Single habit row ────────────────────────────────────────────────

function HabitRow({ habit, rank }: { habit: SpendingHabit; rank: number }): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign, isRTL } = useRTL();
  const hidden = usePrivacyStore((s) => s.hidden);
  const freqColor = FREQ_COLORS[habit.frequency] ?? colors.primaryLight;
  const freqLabels = useFreqLabels();
  const dayNames = useDayNames();

  return (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      }}
    >
      {/* Rank + icon */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.isDark ? 'rgba(139,92,246,0.1)' : colors.primary + '0D',
          marginEnd: 12,
        }}
      >
        <Text style={{ fontSize: 16 }}>{habit.icon ?? `#${rank}`}</Text>
      </View>

      {/* Name + meta */}
      <View style={{ flex: 1, marginEnd: 8 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign }}
        >
          {habit.name}
        </Text>
        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 6, marginTop: 3 }}>
          {/* Frequency badge */}
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              backgroundColor: freqColor + '18',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '600', color: freqColor }}>
              {freqLabels[habit.frequency] ?? freqLabels.irregular}
            </Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textTertiary }}>
            {habit.transactionCount}x
          </Text>
          {habit.preferredDayOfWeek != null ? (
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
              · {dayNames[habit.preferredDayOfWeek]}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Amount + annualized */}
      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>
          {maskIfHidden(formatCompactAmount(habit.totalSpend), hidden)}
        </Text>
        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 2, marginTop: 2 }}>
          {habit.momChange != null ? (
            <>
              {habit.momChange > 0 ? (
                <TrendingUp size={10} color={colors.expense} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={10} color={colors.income} strokeWidth={2.5} />
              )}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: habit.momChange > 0 ? colors.expense : colors.income,
                }}
              >
                {habit.momChange > 0 ? '+' : ''}{habit.momChange}%
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 10, color: colors.textTertiary }}>
              ~{maskIfHidden(formatCompactAmount(habit.annualizedCost), hidden)}/yr
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Summary stat pill ───────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      }}
    >
      <Icon size={14} color={color} strokeWidth={2} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 4 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

// ─── Main section ────────────────────────────────────────────────────

interface HabitSectionProps {
  insights: HabitInsights;
}

/** Rich habit analytics section for the Analytics tab. */
export function HabitSection({ insights }: HabitSectionProps): React.ReactElement | null {
  const colors = useThemeColors();
  const { rowDir } = useRTL();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const [expanded, setExpanded] = React.useState(false);

  if (insights.habits.length === 0) return null;

  const visibleHabits = expanded ? insights.habits : insights.habits.slice(0, 5);

  return (
    <View className="mx-4 mt-3 mb-2">
      {/* Section header */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12',
          }}
        >
          <Repeat size={14} color={colors.primaryLight} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
          {t('SPENDING_HABITS')}
        </Text>
      </View>

      {/* Summary stats row */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <StatPill
          icon={Hash}
          label={t('HABITS_DETECTED' as any)}
          value={String(insights.habits.length)}
          color={colors.primaryLight}
        />
        <StatPill
          icon={DollarSign}
          label={t('HABIT_SPEND' as any)}
          value={maskIfHidden(formatCompactAmount(insights.totalHabitSpend), hidden)}
          color={colors.expense}
        />
        <StatPill
          icon={Calendar}
          label={t('OF_SPENDING' as any)}
          value={`${insights.habitPercentage}%`}
          color={colors.warning}
        />
      </View>

      {/* Habit list card */}
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.isDark ? 'rgba(139,92,246,0.1)' : colors.glassBorder,
        }}
      >
        <LinearGradient
          colors={
            colors.isDark
              ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)']
              : ['#FFFFFF', '#F8F9FB']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 14 }}
        >
          {visibleHabits.map((habit, i) => (
            <HabitRow key={habit.key} habit={habit} rank={i + 1} />
          ))}
        </LinearGradient>

        {/* Expand / collapse toggle */}
        {insights.habits.length > 5 ? (
          <Pressable
            onPress={() => { impactLight(); setExpanded((p) => !p); }}
            style={{
              alignItems: 'center',
              paddingVertical: 10,
              backgroundColor: colors.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
              {expanded ? t('SHOW_LESS' as any) : `${t('SHOW_ALL_HABITS' as any)} (${insights.habits.length})`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
