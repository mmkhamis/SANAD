import React from 'react';
import { View, Text as BaseText, type TextProps, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatAmount } from '../../utils/currency';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { impactLight } from '../../utils/haptics';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { BudgetGoal } from '../../types/index';

// RTL-aware Text wrapper (caller style still wins).
function Text({ style, ...rest }: TextProps): React.ReactElement {
  const { textAlign } = useRTL();
  return <BaseText style={[{ textAlign }, style]} {...rest} />;
}

function useStatusConfig(): Record<string, { label: string; color: string; bg: string }> {
  const t = useT();
  return {
    on_track: { label: t('GOALS_ON_TRACK_BADGE' as any), color: COLORS.income, bg: COLORS.incomeBg },
    near_limit: { label: t('GOALS_NEAR_LIMIT_BADGE' as any), color: COLORS.warning, bg: COLORS.warningBg },
    exceeded: { label: t('GOALS_EXCEEDED_BADGE' as any), color: COLORS.expense, bg: COLORS.expenseBg },
  };
}

interface GoalCardProps {
  goal: BudgetGoal;
  onPress?: (goal: BudgetGoal) => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const tc = useTranslateCategory();
  const { rowDir } = useRTL();
  const statusConfig = useStatusConfig();
  const config = statusConfig[goal.status];
  const clampedPercent = Math.min(goal.percent_used, 100);

  return (
    <Pressable
      onPress={() => {
        if (onPress) {
          impactLight();
          onPress(goal);
        }
      }}
      style={({ pressed }) => ({
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        opacity: pressed && onPress ? 0.85 : 1,
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(203,213,225,0.4)',
      })}
    >
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(30,38,56,0.95)', 'rgba(22,30,48,0.98)']
          : ['#FFFFFF', '#F8FAFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
      >
        {/* Content */}
        <View>
          {/* Header: icon + name + status badge */}
          <View style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: (goal.category_color ?? colors.primary) + '12',
                alignItems: 'center',
                justifyContent: 'center',
                marginEnd: 12,
              }}
            >
              <CategoryIcon
                name={goal.category_icon ?? 'piggy-bank'}
                size={20}
                color={goal.category_color ?? colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}
              >
                {tc(goal.budget.category_name)}
              </Text>
              {goal.group_name ? (
                <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }}>{goal.group_name}</Text>
              ) : null}
            </View>
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: config.bg }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: config.color }}>
                {config.label}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View
            className="rounded-full overflow-hidden mb-3"
            style={{ height: 8, backgroundColor: colors.isDark ? 'rgba(15,23,42,0.8)' : 'rgba(241,245,249,1)' }}
          >
            <View
              className="rounded-full"
              style={{
                height: 8,
                width: `${clampedPercent}%`,
                backgroundColor: config.color,
              }}
            />
          </View>

          {/* Amounts row */}
          <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {maskIfHidden(formatAmount(goal.actual_spent), hidden)}{' '}
              <Text style={{ color: colors.textTertiary }}>
                / {maskIfHidden(formatAmount(goal.budget.amount), hidden)}
              </Text>
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: goal.status === 'exceeded' ? colors.expense : colors.income,
              }}
            >
              {goal.status === 'exceeded'
                ? (t('GOALS_OVER_BY' as any) as string).replace('{amount}', maskIfHidden(formatAmount(Math.abs(goal.remaining)), hidden))
                : (t('GOALS_REMAINING' as any) as string).replace('{amount}', maskIfHidden(formatAmount(goal.remaining), hidden))}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
