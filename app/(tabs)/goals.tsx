import React, { useState, useCallback } from 'react';
import {
  View,
  Text as BaseText,
  type TextProps,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, AlertTriangle, AlertOctagon, Plus, X, Pencil, Trash2 } from 'lucide-react-native';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { format, startOfMonth, endOfMonth } from 'date-fns';

import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { GoalCard } from '../../components/finance/GoalCard';
import { GoalInsights } from '../../components/finance/GoalInsights';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { useGoals } from '../../hooks/useGoals';
import { useCreateBudget, useUpdateBudget, useDeleteBudget } from '../../hooks/useBudgets';
import { formatAmount } from '../../utils/currency';
import { formatShortMonthYear } from '../../utils/locale-format';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { useT, useTranslateCategory } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import type { Category, BudgetGoal } from '../../types/index';

// RTL-aware Text wrapper: every <Text> in this file auto-aligns to the
// active language's start edge (right in Arabic, left in English).
// Caller-provided `style` still wins because it comes after in the array.
function Text({ style, ...rest }: TextProps): React.ReactElement {
  const { textAlign } = useRTL();
  return <BaseText style={[{ textAlign }, style]} {...rest} />;
}

// ─── Period options ──────────────────────────────────────────────────

const PERIODS: { labelKey: string; value: 'weekly' | 'monthly' | 'yearly' }[] = [
  { labelKey: 'GOALS_PERIOD_WEEKLY', value: 'weekly' },
  { labelKey: 'GOALS_PERIOD_MONTHLY', value: 'monthly' },
  { labelKey: 'GOALS_PERIOD_YEARLY', value: 'yearly' },
];

function computeDateRange(period: 'weekly' | 'monthly' | 'yearly'): { start: string; end: string } {
  const now = new Date();
  if (period === 'weekly') {
    const start = now;
    const end = new Date(now);
    end.setDate(end.getDate() + 6);
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  }
  if (period === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    return { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') };
  }
  // monthly default
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  };
}

// ─── Scroll collapse thresholds ──────────────────────────────────────

const COLLAPSE_START = 100;
const COLLAPSE_END = 200;

// ─── Screen Content ──────────────────────────────────────────────────

function GoalsContent(): React.ReactElement {
  const colors = useThemeColors();
  const { hPad } = useResponsive();
  const t = useT();
  const tc = useTranslateCategory();
  const { rowDir, textAlign } = useRTL();
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const { data: goalsSummary, isLoading, isError, error, refetch } = useGoals(selectedMonth);
  const hidden = usePrivacyStore((s) => s.hidden);

  // ── Scroll tracking ─────────────────────────────────────────────
  const scrollY = useSharedValue(0);
  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );
  const compactBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [-10, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  // ── Add-goal modal state ────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amountText, setAmountText] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const { mutateAsync: createBudgetAsync, isPending: isCreating } = useCreateBudget();
  const { mutateAsync: updateBudgetAsync, isPending: isUpdating } = useUpdateBudget();
  const { mutate: deleteBudgetMutate, isPending: isDeleting } = useDeleteBudget();

  // ── Edit-goal modal state ───────────────────────────────────────
  const [editGoal, setEditGoal] = useState<BudgetGoal | null>(null);
  const [editAmountText, setEditAmountText] = useState('');

  const handleOpenEdit = useCallback((goal: BudgetGoal): void => {
    setEditGoal(goal);
    setEditAmountText(String(goal.budget.amount));
  }, []);

  const handleCloseEdit = useCallback((): void => {
    setEditGoal(null);
    setEditAmountText('');
  }, []);

  const handleSaveEdit = useCallback(async (): Promise<void> => {
    if (!editGoal) return;
    const amount = parseFloat(editAmountText);
    if (isNaN(amount) || amount <= 0) return;
    impactMedium();
    try {
      await updateBudgetAsync({ id: editGoal.budget.id, amount });
      notifySuccess();
      handleCloseEdit();
      refetch();
    } catch {
      // error surfaced by hook
    }
  }, [editGoal, editAmountText, updateBudgetAsync, handleCloseEdit, refetch]);

  const handleDeleteGoal = useCallback((): void => {
    if (!editGoal) return;
    Alert.alert(
      t('DELETE_ASSET'),
      `${t('DELETE_ASSET_CONFIRM' as any)}`,
      [
        { text: t('CANCEL'), style: 'cancel' },
        {
          text: t('DELETE'),
          style: 'destructive',
          onPress: () => {
            impactMedium();
            deleteBudgetMutate(editGoal.budget.id);
            handleCloseEdit();
            refetch();
          },
        },
      ],
    );
  }, [editGoal, deleteBudgetMutate, handleCloseEdit, refetch]);

  const resetForm = useCallback((): void => {
    setSelectedCategory(null);
    setAmountText('');
    setPeriod('monthly');
  }, []);

  const handleOpenAdd = useCallback((): void => {
    impactMedium();
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const handleCloseAdd = useCallback((): void => {
    setShowAddModal(false);
  }, []);

  const handleSaveGoal = useCallback(async (): Promise<void> => {
    if (!selectedCategory || !amountText) return;
    const amount = parseFloat(amountText);
    if (isNaN(amount) || amount <= 0) return;

    const { start, end } = computeDateRange(period);
    impactMedium();
    try {
      await createBudgetAsync({
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
        amount,
        period,
        start_date: start,
        end_date: end,
      });
      setShowAddModal(false);
      resetForm();
      refetch();
    } catch {
      // error is surfaced via isError from hook
    }
  }, [selectedCategory, amountText, period, createBudgetAsync, resetForm, refetch]);

  const handleRefresh = (): void => {
    impactLight();
    refetch();
  };

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return <ErrorState message={error?.message ?? t('ERROR_LOADING_DASHBOARD')} onRetry={handleRefresh} />;
  }

  const hasGoals = goalsSummary && goalsSummary.goals.length > 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
    <Animated.ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 120,
      }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View className="px-5 mb-2">
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary }}>
          {t('GOALS_HEADER' as any)}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
          {t('GOALS_SUBTITLE' as any)}
        </Text>
      </View>

      {/* Month picker */}
      <MonthPicker month={selectedMonth} onMonthChange={setSelectedMonth} />

      {!hasGoals ? (
        <EmptyState
          title={t('GOALS_EMPTY_TITLE' as any)}
          description={t('GOALS_EMPTY_DESC' as any)}
        />
      ) : goalsSummary ? (
        <>
          {/* Summary stats */}
          <View className="flex-row gap-2 px-5 mt-3 mb-4">
            <View
              className="flex-row items-center rounded-full px-3 py-1.5"
              style={{ backgroundColor: colors.incomeBg }}
            >
              <CheckCircle size={12} color={colors.income} strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.income, marginLeft: 4 }}>
                {goalsSummary.on_track_count} {t('GOALS_ON_TRACK_BADGE' as any)}
              </Text>
            </View>
            {goalsSummary.near_limit_count > 0 ? (
              <View
                className="flex-row items-center rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.warningBg }}
              >
                <AlertTriangle size={12} color={colors.warning} strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.warning, marginLeft: 4 }}>
                  {goalsSummary.near_limit_count} {t('GOALS_NEAR_LIMIT_BADGE' as any)}
                </Text>
              </View>
            ) : null}
            {goalsSummary.exceeded_count > 0 ? (
              <View
                className="flex-row items-center rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.expenseBg }}
              >
                <AlertOctagon size={12} color={colors.expense} strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.expense, marginLeft: 4 }}>
                  {goalsSummary.exceeded_count} {t('GOALS_EXCEEDED_BADGE' as any)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Total budgeted vs spent card */}
          <View
            className="mx-5 mb-4 rounded-2xl overflow-hidden"
            style={{
              borderWidth: 1,
              borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
              shadowColor: colors.isDark ? '#8B5CF6' : '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: colors.isDark ? 0.15 : 0.06,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20 }}
            >
              {/* Metallic sheen */}
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {/* Subtle shimmer */}
              {colors.isDark ? (
                <LinearGradient
                  colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              ) : null}
              {/* Content */}
              <View className="flex-row justify-between">
            <View>
              <Text style={{ fontSize: 11, color: colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t('GOALS_TOTAL_BUDGETED' as any)}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 4 }}>
                {maskIfHidden(formatAmount(goalsSummary.total_budgeted), hidden)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: colors.textTertiary, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {t('GOALS_ACTUAL_SPENT' as any)}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  marginTop: 4,
                  color: goalsSummary.total_spent > goalsSummary.total_budgeted
                    ? colors.expense : colors.textPrimary,
                }}
              >
                {maskIfHidden(formatAmount(goalsSummary.total_spent), hidden)}
              </Text>
            </View>
            </View>
            </LinearGradient>
          </View>

          {/* Insights */}
          <GoalInsights insights={goalsSummary.insights} />

          {/* Individual goal cards */}
          <View
            className="mx-5"
            style={{
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
              shadowColor: colors.isDark ? '#8B5CF6' : '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: colors.isDark ? 0.15 : 0.06,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 16 }}
            >
              {/* Metallic sheen */}
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
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
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.textPrimary,
                  letterSpacing: -0.4,
                  marginBottom: 16,
                }}
              >
                {t('GOALS_YOUR_BUDGETS' as any)}
              </Text>
              {goalsSummary.goals.map((goal) => (
                <GoalCard key={goal.budget.id} goal={goal} onPress={handleOpenEdit} />
              ))}
            </LinearGradient>
          </View>
        </>
      ) : null}
    </Animated.ScrollView>

      {/* ── Compact bar (fades in on scroll) ─────────────────────── */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            paddingTop: insets.top + 4,
            paddingBottom: 10,
            paddingHorizontal: hPad,
          },
          compactBarStyle,
        ]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(15,20,32,0.97)', 'rgba(15,20,32,0.92)', 'rgba(15,20,32,0)']
            : ['rgba(248,250,252,0.97)', 'rgba(248,250,252,0.92)', 'rgba(248,250,252,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: -12 }}
        />
        <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
            {t('GOALS_HEADER' as any)}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>
            {formatShortMonthYear(new Date(selectedMonth + '-01'))}
          </Text>
        </View>
        {goalsSummary && goalsSummary.goals.length > 0 ? (
          <View style={{ flexDirection: rowDir, marginTop: 4, gap: 8 }}>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
              <CheckCircle size={10} color={colors.income} strokeWidth={2.5} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.income }}>
                {goalsSummary.on_track_count} {t('GOALS_TRACKED' as any)}
              </Text>
            </View>
            {goalsSummary.exceeded_count > 0 ? (
              <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
                <AlertOctagon size={10} color={colors.expense} strokeWidth={2.5} />
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.expense }}>
                  {goalsSummary.exceeded_count} {t('GOALS_EXCEEDED_LABEL' as any)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      {/* ── Floating Add-Goal button ─────────────────────────────── */}
      <Pressable
        onPress={handleOpenAdd}
        style={{
          position: 'absolute',
          alignSelf: 'center',
          bottom: insets.bottom + 110,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2} />
      </Pressable>

      {/* ── Add Goal Modal ───────────────────────────────────────── */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 16,
              maxHeight: '90%',
            }}
          >
            {/* Modal header */}
            <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign }}>
                {t('GOALS_NEW_BUDGET' as any)}
              </Text>
              <Pressable onPress={handleCloseAdd} hitSlop={12}>
                <X size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            {/* Category selection – scrollable */}
            <View className="px-5">
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textAlign }}>
                {t('CATEGORY')}
              </Text>
            </View>
            <ScrollView
              className="px-5"
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <CategoryPicker
                type="expense"
                selectedId={selectedCategory?.id ?? null}
                onSelect={setSelectedCategory}
              />
            </ScrollView>

            {/* Fixed controls below categories */}
            <View className="px-5">
              {/* Amount input */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginTop: 20,
                  marginBottom: 8,
                  textAlign,
                }}
              >
                {t('GOALS_BUDGET_AMOUNT' as any)}
              </Text>
              <TextInput
                value={amountText}
                onChangeText={setAmountText}
                placeholder={t('GOALS_PLACEHOLDER_AMOUNT' as any)}
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.textPrimary,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
              />

              {/* Period picker */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginTop: 20,
                  marginBottom: 8,
                  textAlign,
                }}
              >
                {t('GOALS_PERIOD' as any)}
              </Text>
              <View style={{ flexDirection: rowDir, gap: 8 }}>
                {PERIODS.map((p) => (
                  <Pressable
                    key={p.value}
                    onPress={() => {
                      impactLight();
                      setPeriod(p.value);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor:
                        period === p.value ? colors.primary : colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor:
                        period === p.value ? colors.primary : colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: period === p.value ? '#FFFFFF' : colors.textSecondary,
                      }}
                    >
                      {t(p.labelKey as any)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleSaveGoal}
                disabled={!selectedCategory || !amountText || isCreating}
                style={{
                  marginTop: 24,
                  marginBottom: 16,
                  backgroundColor:
                    selectedCategory && amountText ? colors.primary : colors.surfaceTertiary,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: 'center',
                  opacity: isCreating ? 0.6 : 1,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  {isCreating ? t('GOALS_CREATING' as any) : t('GOALS_CREATE' as any)}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit/Delete Goal Modal ───────────────────────────────── */}
      <Modal visible={editGoal != null} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: insets.bottom + 16,
            }}
          >
            {/* Modal header */}
            <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>
                {t('GOALS_EDIT_BUDGET' as any)}
              </Text>
              <Pressable onPress={handleCloseEdit} hitSlop={12}>
                <X size={22} color={colors.textTertiary} />
              </Pressable>
            </View>

            {editGoal ? (
              <View className="px-5">
                {/* Goal info */}
                <View
                  style={{
                    flexDirection: rowDir,
                    alignItems: 'center',
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: colors.surfaceSecondary,
                    marginBottom: 20,
                  }}
                >
                  <View style={{ marginRight: 12 }}>
                    <CategoryIcon name={editGoal.category_icon ?? 'piggy-bank'} size={24} color={editGoal.category_color ?? colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                      {tc(editGoal.budget.category_name)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {maskIfHidden(formatAmount(editGoal.actual_spent), hidden)} {t('GOALS_SPENT_OF' as any)} {maskIfHidden(formatAmount(editGoal.budget.amount), hidden)}
                    </Text>
                  </View>
                </View>

                {/* New amount input */}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  {t('GOALS_BUDGET_AMOUNT' as any)}
                </Text>
                <TextInput
                  value={editAmountText}
                  onChangeText={setEditAmountText}
                  placeholder={t('GOALS_PLACEHOLDER_AMOUNT' as any)}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  autoFocus
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.textPrimary,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                  }}
                />

                {/* Save button */}
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={!editAmountText || parseFloat(editAmountText) <= 0 || isUpdating}
                  style={{
                    marginTop: 24,
                    backgroundColor: editAmountText && parseFloat(editAmountText) > 0 ? colors.primary : colors.surfaceTertiary,
                    borderRadius: 14,
                    paddingVertical: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: rowDir,
                    opacity: isUpdating ? 0.6 : 1,
                  }}
                >
                  {isUpdating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Pencil size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>
                        {t('SAVE_CHANGES')}
                      </Text>
                    </>
                  )}
                </Pressable>

                {/* Delete button */}
                <Pressable
                  onPress={handleDeleteGoal}
                  disabled={isDeleting}
                  style={{
                    marginTop: 12,
                    marginBottom: 8,
                    backgroundColor: colors.expenseBg,
                    borderRadius: 14,
                    paddingVertical: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: rowDir,
                    opacity: isDeleting ? 0.6 : 1,
                  }}
                >
                  <Trash2 size={16} color={colors.expense} strokeWidth={2.5} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.expense, marginLeft: 6 }}>
                    {t('GOALS_DELETE_BUDGET' as any)}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default function GoalsScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <GoalsContent />
    </ErrorBoundary>
  );
}
