import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { formatShortDate } from '../../utils/locale-format';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { formatCompactNumber } from '../../utils/currency';
import { impactLight } from '../../utils/haptics';
import { CurrencyAmount } from '../ui/CurrencyAmount';
import { CategoryIcon } from '../ui/CategoryIcon';
import type { BudgetGoal } from '../../types/index';
import type { Transaction } from '../../types/index';

// ─── Single Budget Card ──────────────────────────────────────────────

interface BudgetCardProps {
  goal: BudgetGoal;
  isActive: boolean;
  onPress: () => void;
}

const BudgetCard = React.memo(function BudgetCard({ goal, isActive, onPress }: BudgetCardProps): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);
  const tc = useTranslateCategory();

  const percentage = goal.percent_used;
  const isOverBudget = percentage > 100;
  const isNearLimit = percentage >= 80 && percentage <= 100;

  const barColor =
    isOverBudget ? colors.expense :
    isNearLimit ? colors.warning :
    colors.income;

  const percentColor =
    isOverBudget ? colors.expense :
    isNearLimit ? colors.warning :
    (colors.isDark ? '#FFFFFF' : colors.textSecondary);

  return (
    <Pressable
      onPress={() => { impactLight(); onPress(); }}
      style={({ pressed }) => ({
        width: 140,
        height: 160,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: isActive ? colors.primary : (colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(226,232,240,0.8)'),
        opacity: pressed ? 0.7 : 1,
        shadowColor: colors.isDark ? '#8B5CF6' : '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: colors.isDark ? 0.10 : 0.04,
        shadowRadius: 8,
        elevation: 3,
      })}
    >
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(40,50,70,0.60)', 'rgba(30,40,58,0.50)', 'rgba(35,45,65,0.55)']
          : ['#FFFFFF', '#F8FAFC', '#F1F5F9', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: 12, borderRadius: 20 }}
      >
        {/* Metallic sheen */}
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(255,255,255,0.03)', 'transparent', 'rgba(255,255,255,0.015)']
            : ['rgba(255,255,255,0.9)', 'rgba(215,220,230,0.2)', 'rgba(255,255,255,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 }}
        />
        {/* Icon + Percentage */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: (goal.category_color ?? colors.primary) + '20',
            }}
          >
            <CategoryIcon
              name={goal.category_icon ?? 'piggy-bank'}
              size={16}
              color={goal.category_color ?? colors.primary}
            />
          </View>
          <View
            style={{
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
              backgroundColor: isOverBudget ? colors.expense + '18' : isNearLimit ? colors.warning + '18' : colors.income + '18',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: percentColor,
              }}
            >
              {Math.round(percentage)}%
            </Text>
          </View>
        </View>

        {/* Category name */}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 6,
            minHeight: 16,
          }}
        >
          {tc(goal.budget.category_name)}
        </Text>

        {/* Spent / Budget */}
        <Text
          numberOfLines={1}
          style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 10, minHeight: 14 }}
        >
          {maskIfHidden(formatCompactNumber(goal.actual_spent), hidden)} / {maskIfHidden(formatCompactNumber(goal.budget.amount), hidden)}
        </Text>

        {/* Spacer to push progress bar to bottom */}
        <View style={{ flex: 1 }} />

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.isDark ? 'rgba(15,23,42,0.8)' : 'rgba(241,245,249,1)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor,
              borderRadius: 3,
            }}
          />
        </View>
      </LinearGradient>
    </Pressable>
  );
});

// ─── Expanded Category Detail Panel ─────────────────────────────────

interface CategoryDetailProps {
  goal: BudgetGoal;
  transactions: Transaction[];
  onClose: () => void;
}

const CategoryDetail = React.memo(function CategoryDetail({ goal, transactions, onClose }: CategoryDetailProps): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const tc = useTranslateCategory();
  const router = useRouter();

  const relatedIds = new Set(goal.related_category_ids);
  const categoryTxns = transactions.filter(
    (tx) => tx.category_id != null && relatedIds.has(tx.category_id) && tx.type === 'expense',
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(300).springify()}
      exiting={FadeOutUp.duration(200)}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 8,
      }}
    >
      {/* Title header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: (goal.category_color ?? colors.primary) + '20',
            }}
          >
            <CategoryIcon
              name={goal.category_icon ?? 'piggy-bank'}
              size={18}
              color={goal.category_color ?? colors.primary}
            />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
              {tc(goal.budget.category_name)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>
              {maskIfHidden(formatCompactNumber(goal.actual_spent), hidden)} of {maskIfHidden(formatCompactNumber(goal.budget.amount), hidden)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => { impactLight(); onClose(); }}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <X size={14} color={colors.textSecondary} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Transactions list — each in its own card, matching recent transactions */}
      {categoryTxns.length > 0 ? (
        categoryTxns.slice(0, 5).map((tx) => {
          const isIncome = tx.type === 'income';
          const isTransfer = tx.type === 'transfer';
          const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;

          return (
            <Pressable
              key={tx.id}
              onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/transactions', params: { edit_id: tx.id } }); }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
            <View
              style={{
                borderRadius: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: colors.isDark ? 'rgba(139,92,246,0.10)' : 'rgba(226,232,240,0.8)',
                marginBottom: 8,
                height: 64,
              }}
            >
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(40,50,70,0.50)', 'rgba(30,40,58,0.40)', 'rgba(35,45,65,0.45)']
                  : ['#FFFFFF', '#F8FAFC', '#F1F5F9', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 16 }}
              >
                {/* Metallic sheen */}
                <LinearGradient
                  colors={colors.isDark
                    ? ['rgba(255,255,255,0.03)', 'transparent', 'rgba(255,255,255,0.015)']
                    : ['rgba(255,255,255,0.9)', 'rgba(215,220,230,0.2)', 'rgba(255,255,255,0.5)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 16 }}
                />
                {colors.isDark ? (
                  <LinearGradient
                    colors={['transparent', 'rgba(217,70,239,0.02)', 'rgba(139,92,246,0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                ) : null}
                {/* Category icon */}
                <View
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    backgroundColor: (tx.category_color ?? colors.textTertiary) + '20',
                  }}
                >
                  <CategoryIcon
                    name={tx.category_icon ?? 'smartphone'}
                    size={18}
                    color={tx.category_color ?? colors.textSecondary}
                  />
                </View>
                {/* Description + category */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}
                  >
                    {tx.description}
                  </Text>
                  <Text numberOfLines={1} style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {tc(tx.category_name ?? '') || t('UNCATEGORIZED')} · {formatShortDate(parseISO(tx.date))}
                  </Text>
                </View>
                {/* Amount */}
                {hidden ? (
                  <Text style={{ fontSize: 13, fontWeight: '600', color: amountColor }}>••••</Text>
                ) : (
                  <CurrencyAmount
                    value={Math.abs(tx.amount)}
                    color={amountColor}
                    fontSize={13}
                    fontWeight="600"
                    showSign={isIncome}
                    iconSize={11}
                  />
                )}
              </LinearGradient>
            </View>
            </Pressable>
          );
        })
      ) : (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>
            No expenses yet
          </Text>
        </View>
      )}
    </Animated.View>
  );
});

// ─── Budget Status Ribbon (horizontal scroll + expand) ──────────────

interface BudgetStatusRibbonProps {
  goals: BudgetGoal[];
  /** Recent transactions to show in expanded detail */
  transactions?: Transaction[];
}

export const BudgetStatusRibbon = React.memo(function BudgetStatusRibbon({ goals, transactions = [] }: BudgetStatusRibbonProps): React.ReactElement {
  const colors = useThemeColors();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCardPress = useCallback((goalId: string) => {
    setExpandedId((prev) => (prev === goalId ? null : goalId));
  }, []);

  const expandedGoal = expandedId ? goals.find((g) => g.budget.id === expandedId) : null;

  return (
    <View>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
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
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
          Budget Status
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {goals.map((g) => (
          <BudgetCard
            key={g.budget.id}
            goal={g}
            isActive={expandedId === g.budget.id}
            onPress={() => handleCardPress(g.budget.id)}
          />
        ))}
      </ScrollView>

      {/* Expanded category detail panel */}
      {expandedGoal ? (
        <View style={{
          marginTop: 14,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: colors.isDark ? 'rgba(15,23,42,0.40)' : 'rgba(241,245,249,0.6)',
          borderWidth: 1,
          borderColor: colors.isDark ? 'rgba(139,92,246,0.10)' : 'rgba(226,232,240,0.5)',
        }}>
          <CategoryDetail
            goal={expandedGoal}
            transactions={transactions}
            onClose={() => setExpandedId(null)}
          />
        </View>
      ) : null}
    </View>
  );
});
