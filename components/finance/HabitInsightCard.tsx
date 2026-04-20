import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Repeat, TrendingUp, TrendingDown, ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatCompactAmount } from '../../utils/currency';
import { impactLight } from '../../utils/haptics';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import type { SpendingHabit } from '../../types/index';

interface HabitInsightCardProps {
  habit: SpendingHabit;
  totalHabitSpend: number;
  habitPercentage: number;
}

/** Compact habit insight card for the Dashboard. Shows the top spending habit. */
export function HabitInsightCard({
  habit,
  totalHabitSpend,
  habitPercentage,
}: HabitInsightCardProps): React.ReactElement {
  const colors = useThemeColors();
  const router = useRouter();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const { isRTL } = useRTL();
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  const freqLabels: Record<string, string> = {
    daily: t('FREQ_DAILY' as any),
    weekly: t('FREQ_WEEKLY' as any),
    biweekly: t('FREQ_BIWEEKLY' as any),
    monthly: t('FREQ_MONTHLY' as any),
    irregular: t('FREQ_RECURRING' as any),
  };
  const dayNames = [
    t('DAY_SUN' as any), t('DAY_MON' as any), t('DAY_TUE' as any),
    t('DAY_WED' as any), t('DAY_THU' as any), t('DAY_FRI' as any),
    t('DAY_SAT' as any),
  ];

  const freqLabel = freqLabels[habit.frequency] ?? t('FREQ_RECURRING' as any);
  const dayLabel = habit.preferredDayOfWeek != null ? dayNames[habit.preferredDayOfWeek] : null;

  return (
    <Pressable
      onPress={() => { impactLight(); router.push('/(tabs)/analytics'); }}
      style={{
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(139,92,246,0.12)' : colors.glassBorder,
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
        style={{ padding: 16 }}
      >
        {/* Sheen */}
        <LinearGradient
          colors={
            colors.isDark
              ? ['rgba(255,255,255,0.03)', 'transparent']
              : ['rgba(255,255,255,0.7)', 'rgba(220,225,235,0.2)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12',
              }}
            >
              <Repeat size={14} color={colors.primaryLight} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
              {t('SPENDING_HABITS')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>{t('SEE_ALL')}</Text>
            <ForwardArrow size={12} color={colors.textTertiary} strokeWidth={2} />
          </View>
        </View>

        {/* Main content */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: 16, fontWeight: '700', color: colors.isDark ? '#FFFFFF' : colors.textPrimary, marginBottom: 3 }}
            >
              {habit.icon ? `${habit.icon} ` : ''}{habit.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {freqLabel} · {habit.transactionCount}x{dayLabel ? ` · ${dayLabel}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.expense }}>
              {maskIfHidden(formatCompactAmount(habit.totalSpend), hidden)}
            </Text>
            {habit.momChange != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                {habit.momChange > 0 ? (
                  <TrendingUp size={11} color={colors.expense} strokeWidth={2.5} />
                ) : (
                  <TrendingDown size={11} color={colors.income} strokeWidth={2.5} />
                )}
                <Text style={{ fontSize: 11, color: habit.momChange > 0 ? colors.expense : colors.income }}>
                  {habit.momChange > 0 ? '+' : ''}{habit.momChange}% vs last month
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Footer stat */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          }}
        >
          <Text style={{ fontSize: 11, color: colors.textTertiary }}>
            ~{maskIfHidden(formatCompactAmount(habit.annualizedCost), hidden)}/year if continued
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary }}>
            {habitPercentage}% of spending is habitual
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
