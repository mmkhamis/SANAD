import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, differenceInDays, parseISO, addMonths } from 'date-fns';
import { Image } from 'expo-image';
import {
  Plus, Repeat, Eye, EyeOff, CalendarClock, AlertTriangle,
  Wallet, ArrowUpRight, ArrowDownRight, MessageSquareWarning,
} from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { formatShortDate } from '../../utils/locale-format';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { FloatingCard } from '../../components/ui/FloatingCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { SoftGlowButton } from '../../components/ui/SoftGlowButton';
import { SmartInputFAB } from '../../components/ui/SmartInputFAB';
import { MetallicShine } from '../../components/ui/MetallicShine';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { HorizonSelector, type HorizonMonths } from '../../components/ui/HorizonSelector';
import { TransactionRow } from '../../components/finance/TransactionRow';
import { SMSReviewSheet } from '../../components/finance/SMSReviewSheet';
import { BudgetStatusRibbon } from '../../components/finance/BudgetStatusRibbon';
import { HabitInsightCard } from '../../components/finance/HabitInsightCard';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { useDashboard } from '../../hooks/useDashboard';
import { useUnreviewedTransactions } from '../../hooks/useReviewTransactions';
import { usePortfolioSummary } from '../../hooks/useAssets';
import { useAccounts } from '../../hooks/useAccounts';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useCommitmentsDue } from '../../hooks/useCommitments';
import { useGoals } from '../../hooks/useGoals';
import { useHabitInsights } from '../../hooks/useHabits';
import { formatCompactNumber } from '../../utils/currency';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { STRINGS } from '../../constants/strings';
import { useT } from '../../lib/i18n';
import { useTranslateCategory } from '../../lib/i18n';
import type { Transaction, Commitment } from '../../types/index';
import { type Subscription, SUBSCRIPTION_PRESETS } from '../../services/subscription-service';
import { useAuthStore } from '../../store/auth-store';

// ─── Constants ───────────────────────────────────────────────────────
// Computed once at module level to avoid Dimensions.get() calls inside renderItem.
const TX_BLOCK_WIDTH = Dimensions.get('window').width - 32;

// ─── Section item types for FlashList ────────────────────────────────

type SectionType =
  | { type: 'header' }
  | { type: 'month-picker' }
  | { type: 'hero-balance' }
  | { type: 'budget-status' }
  | { type: 'habit-insight' }
  | { type: 'commitments-header' }
  | { type: 'commitment-item'; commitment: Commitment }
  | { type: 'upcoming-block'; subscriptions: Subscription[] }
  | { type: 'transactions-block'; transactions: Transaction[] }
  | { type: 'bottom-spacer' };

// ─── Commitment Row ──────────────────────────────────────────────────

const CommitmentRow = React.memo(function CommitmentRow({ commitment }: { commitment: Commitment }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const hidden = usePrivacyStore((s) => s.hidden);
  const dueDate = parseISO(commitment.next_due_date);
  const daysUntil = differenceInDays(dueDate, new Date());
  const isOverdue = daysUntil < 0;
  const isUrgent = daysUntil >= 0 && daysUntil <= 3;

  const recurrenceLabel = commitment.recurrence_type === 'yearly' ? t('RECURRENCE_YEARLY')
    : commitment.recurrence_type === 'quarterly' ? t('RECURRENCE_QUARTERLY')
      : commitment.recurrence_type === 'monthly' ? t('RECURRENCE_MONTHLY') : t('RECURRENCE_CUSTOM');

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.isDark ? 'rgba(15,23,42,0.40)' : 'rgba(241,245,249,0.6)',
        borderWidth: 1,
        borderColor: isOverdue ? colors.expense + '30' : isUrgent ? colors.warning + '25' : (colors.isDark ? 'rgba(139,92,246,0.10)' : 'rgba(226,232,240,0.5)'),
      }}
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
          backgroundColor: (commitment.category_color ?? colors.textTertiary) + '18',
        }}
      >
        <Text style={{ fontSize: 18 }}>{commitment.category_icon ?? '📋'}</Text>
      </View>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{commitment.name}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {recurrenceLabel} · {t('DUE')} {formatShortDate(dueDate)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {hidden ? (
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
        ) : (
          <CurrencyAmount value={commitment.amount} color={colors.expense} fontSize={13} />
        )}
        {isOverdue ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.expense }}>{t('OVERDUE')}</Text>
        ) : isUrgent ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>
            {daysUntil === 0 ? t('TODAY') : daysUntil === 1 ? t('TOMORROW') : `${daysUntil}d`}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

// ─── Upcoming Subscription Row ───────────────────────────────────────

const UpcomingPaymentRow = React.memo(function UpcomingPaymentRow({ sub }: { sub: Subscription }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const hidden = usePrivacyStore((s) => s.hidden);
  const daysUntil = differenceInDays(parseISO(sub.next_billing_date), new Date());
  const isUrgent = daysUntil <= 3;
  const isDueSoon = daysUntil <= 7;
  const dateLabel = daysUntil <= 0 ? t('TODAY') : daysUntil === 1 ? t('TOMORROW') : `${daysUntil}d`;

  // Use the subscription's own icon/color — fall back to a default if empty
  const subIcon = sub.icon || '💳';
  const subColor = sub.color || colors.primary;
  const iconBg = colors.isDark ? subColor + '30' : subColor + '18';
  const preset = SUBSCRIPTION_PRESETS.find((p) => p.name === sub.name);
  const logo = preset?.logo ?? null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.isDark ? 'rgba(15,23,42,0.40)' : 'rgba(241,245,249,0.6)',
        borderWidth: 1,
        borderColor: isUrgent ? colors.expense + '30' : isDueSoon ? colors.warning + '25' : (colors.isDark ? 'rgba(139,92,246,0.10)' : 'rgba(226,232,240,0.5)'),
      }}
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
          backgroundColor: iconBg,
        }}
      >
        {logo ? (
          <Image
            source={{ uri: logo }}
            style={{ width: 22, height: 22, borderRadius: 4 }}
            contentFit="contain"
          />
        ) : (
          <Text style={{ fontSize: 18 }}>{subIcon}</Text>
        )}
      </View>
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{sub.name}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {formatShortDate(parseISO(sub.next_billing_date))} · {sub.billing_cycle}
        </Text>
      </View>
      <View className="items-end">
        {hidden ? (
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
        ) : (
          <CurrencyAmount value={sub.amount} color={colors.expense} fontSize={14} />
        )}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: isUrgent ? colors.expense : isDueSoon ? colors.warning : colors.textTertiary,
          }}
        >
          {dateLabel}
        </Text>
      </View>
    </View>
  );
});
// ─── Dashboard ───────────────────────────────────────────────────────

function DashboardContent(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const { data, isLoading, isError, error, refetch } = useDashboard(selectedMonth);
  const scrollY = useSharedValue(0);
  // Defer secondary queries until the primary dashboard data loads.
  // This prevents ~18 simultaneous Supabase requests on cold start.
  const dashboardReady = !!data;
  const { data: unreviewed } = useUnreviewedTransactions(dashboardReady);
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolioSummary(dashboardReady);
  const { data: accounts } = useAccounts(dashboardReady);
  const { data: subscriptions } = useSubscriptions(dashboardReady);
  const { data: commitmentsDue } = useCommitmentsDue(selectedMonth, dashboardReady);
  const { data: goalsSummary } = useGoals(selectedMonth, dashboardReady);
  const { data: habitInsights } = useHabitInsights(selectedMonth, dashboardReady);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reviewVisible, setReviewVisible] = useState(false);
  const [horizon, setHorizon] = useState<HorizonMonths>(1);
  const hidden = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const userName = useAuthStore((s) => s.user?.full_name ?? '');
  const firstName = userName.split(' ')[0];

  const unreviewedCount = unreviewed?.length ?? 0;

  const onRefresh = useCallback(() => {
    impactLight();
    refetch();
  }, [refetch]);

  // ─── ALL hooks MUST be above early returns (React rules of hooks) ──

  const horizonDate = useMemo(() => addMonths(new Date(), horizon), [horizon]);

  const upcomingSubs = useMemo(() => (subscriptions ?? [])
    .filter((s) => s.is_active && s.next_billing_date && parseISO(s.next_billing_date) <= horizonDate)
    .sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date)), [subscriptions, horizonDate]);

  const upcomingTotal = useMemo(() => upcomingSubs.reduce((s, sub) => s + sub.amount, 0), [upcomingSubs]);

  const sections: SectionType[] = useMemo(() => {
    if (!data) return [];

    const s: SectionType[] = [
      { type: 'header' },
      { type: 'month-picker' },
    ];

    // Hero balance card (accounts)
    const includedAccounts = (accounts ?? []).filter((a) => a.include_in_total);
    if (includedAccounts.length > 0) {
      s.push({ type: 'hero-balance' });
    }



    // Commitments due this month
    const dueItems = commitmentsDue?.this_month ?? [];
    if (dueItems.length > 0) {
      s.push({ type: 'commitments-header' });
      for (const c of dueItems) {
        s.push({ type: 'commitment-item', commitment: c });
      }
    }

    s.push({ type: 'upcoming-block', subscriptions: upcomingSubs });

    // All recent transactions in ONE block
    s.push({ type: 'transactions-block', transactions: data.recent_transactions });

    s.push({ type: 'bottom-spacer' });
    return s;
  // NOTE: portfolio, upcomingTotal, goalsSummary, habitInsights are intentionally
  // excluded — they are NOT used in the sections array itself (data is read in
  // renderItem). Removing them avoids 4 spurious FlashList re-diffs on initial load.
  }, [accounts, upcomingSubs, commitmentsDue, data]);

  // ─── Scroll-driven compact header hooks ────────────────────────────
  const COLLAPSE_START = 180;
  const COLLAPSE_END = 320;

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

  const compactBalance = data?.computed_balance ?? 0;
  const compactIncome = data?.summary.total_income ?? 0;
  const compactExpense = data?.summary.total_expense ?? 0;

  // ─── Early returns AFTER all hooks ─────────────────────────────────

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? STRINGS.ERROR_LOADING_DASHBOARD}
        onRetry={refetch}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title={STRINGS.NO_TRANSACTIONS}
        description={STRINGS.NO_TRANSACTIONS_DESC}
      />
    );
  }

  // ─── Render items ────────────────────────────────────────────────

  const renderItem = ({ item }: ListRenderItemInfo<SectionType>): React.ReactElement | null => {
    switch (item.type) {
      case 'header':
        return (
          <View
            style={{
              paddingTop: insets.top + 16,
              paddingBottom: 4,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary }}>
                {STRINGS.DASHBOARD_TITLE}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {t('WELCOME_BACK')}{firstName ? `, ${firstName}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => { impactLight(); togglePrivacy(); }} style={{ padding: 8 }}>
              {hidden
                ? <EyeOff size={22} color={colors.textTertiary} strokeWidth={2} />
                : <Eye size={22} color={colors.textTertiary} strokeWidth={2} />
              }
            </Pressable>
          </View>
        );

      case 'month-picker':
        return (
          <MonthPicker month={selectedMonth} onMonthChange={setSelectedMonth} />
        );

      // ─── Hero Balance Card ─────────────────────────────────────
      case 'hero-balance': {
        const accts = (accounts ?? []).filter((a) => a.include_in_total);
        const totalBalance = data.computed_balance;
        const netWorth = totalBalance + (portfolio?.total_value ?? 0);
        const balancePrev = data.summary.total_income - data.summary.total_expense;
        const balanceChangePercent = totalBalance > 0 && balancePrev !== 0
          ? ((totalBalance / Math.abs(balancePrev)) * 100 - 100)
          : 0;
        const isPositiveChange = balanceChangePercent >= 0;

        return (
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
            <Pressable
              onPress={() => { impactLight(); router.push('/(tabs)/profile'); }}
            >
              <View
                style={{
                  marginHorizontal: 16,
                  marginTop: 8,
                  borderRadius: 24,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.glassBorder,
                  shadowColor: colors.isDark ? '#8B5CF6' : '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: colors.isDark ? 0.15 : 0.06,
                  shadowRadius: 16,
                  elevation: 5,
                }}
              >
                {/* Gradient background for the hero card */}
                <LinearGradient
                  colors={colors.isDark
                    ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                    : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
                  start={colors.isDark ? { x: 0, y: 0 } : { x: 0, y: 0 }}
                  end={colors.isDark ? { x: 1, y: 1 } : { x: 1, y: 1 }}
                  style={{ padding: 24 }}
                >
                  {/* Metallic sheen overlay */}
                  <LinearGradient
                    colors={colors.isDark
                      ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                      : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  {/* Subtle shimmer overlay from bottom-right */}
                  {colors.isDark ? (
                    <LinearGradient
                      colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    />
                  ) : null}

                  {/* Top row: wallet icon + label + trend pill */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12',
                        }}
                      >
                        <Wallet size={16} color={colors.primaryLight} strokeWidth={2} />
                      </View>
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('CURRENT_BALANCE')}</Text>
                    </View>
                  </View>

                  {/* Large balance amount */}
                  <View style={{ marginTop: 4 }}>
                    {hidden ? (
                      <Text style={{ fontSize: 36, fontWeight: '700', color: colors.isDark ? '#FFFFFF' : colors.textPrimary, letterSpacing: -0.5 }}>••••</Text>
                    ) : (
                      <CurrencyAmount value={totalBalance} color={colors.isDark ? '#FFFFFF' : colors.textPrimary} fontSize={36} fontWeight="700" />
                    )}
                  </View>

                  {/* Subtle divider */}
                  <LinearGradient
                    colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.3)' : 'rgba(203,213,225,0.5)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 1, marginVertical: 14 }}
                  />

                  {/* 3 compact metrics */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Pressable
                      style={{ flex: 1 }}
                      onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/transactions', params: { filter: 'expense' } }); }}
                    >
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 3 }}>{t('SPENDING')}</Text>
                      {hidden ? (
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.expense }}>••••</Text>
                      ) : (
                        <CurrencyAmount value={data.summary.total_expense} color={colors.expense} fontSize={15} />
                      )}
                    </Pressable>
                    <Pressable
                      style={{ flex: 1, alignItems: 'center' }}
                      onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/transactions', params: { filter: 'income' } }); }}
                    >
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 3 }}>{t('INCOME')}</Text>
                      {hidden ? (
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.income }}>••••</Text>
                      ) : (
                        <CurrencyAmount value={data.summary.total_income} color={colors.income} fontSize={15} />
                      )}
                    </Pressable>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 3 }}>{t('TOTAL_ASSETS')}</Text>
                      {hidden ? (
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>••••</Text>
                      ) : (
                        <CurrencyAmount value={portfolio?.total_value ?? 0} color={colors.isDark ? '#FFFFFF' : colors.textPrimary} fontSize={15} />
                      )}
                    </View>
                  </View>

                  {/* Account chips — grouped by type */}
                  {accts.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {(() => {
                        const grouped = new Map<string, { icon: string; label: string; total: number }>();
                        for (const acct of accts) {
                          const icon = acct.type === 'cash' ? '💵' : acct.type === 'bank' ? '🏦' : acct.type === 'savings' ? '🐖' : '💳';
                          const label = acct.type === 'cash' ? t('CASH') : acct.type === 'bank' ? t('BANK') : acct.type === 'savings' ? t('SAVINGS') : t('CREDIT');
                          const existing = grouped.get(acct.type);
                          if (existing) {
                            existing.total += acct.current_balance;
                          } else {
                            grouped.set(acct.type, { icon, label, total: acct.current_balance });
                          }
                        }
                        return Array.from(grouped.entries()).map(([type, { icon, label, total }]) => (
                          <View
                            key={type}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 10,
                              backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            }}
                          >
                            <Text style={{ fontSize: 12 }}>{icon}</Text>
                            <Text style={{ fontSize: 11, color: colors.textTertiary, fontWeight: '500' }}>{label}</Text>
                            {hidden ? (
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>••••</Text>
                            ) : (
                              <CurrencyAmount value={total} color={colors.textSecondary} fontSize={11} />
                            )}
                          </View>
                        ));
                      })()}
                    </View>
                  ) : null}
                </LinearGradient>
              </View>
            </Pressable>
          </Animated.View>
        );
      }

      case 'budget-status':
        return goalsSummary && goalsSummary.goals.length > 0 ? (
          <View style={{
            marginHorizontal: 16,
            marginTop: 14,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: colors.isDark ? 0.15 : 0.06,
            shadowRadius: 16,
            elevation: 5,
          }}>
            {/* Gradient background matching hero balance card */}
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              {/* Metallic sheen overlay */}
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {/* Subtle shimmer overlay from bottom-right */}
              {colors.isDark ? (
                <LinearGradient
                  colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              ) : null}
              {/* Budget Status Ribbon - all categories + detail panel */}
              <BudgetStatusRibbon goals={goalsSummary.goals} transactions={data.month_expense_transactions} />
            </LinearGradient>
          </View>
        ) : null;

      case 'habit-insight':
        return habitInsights && habitInsights.habits.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(350).delay(100)} style={{ marginTop: 14 }}>
            <HabitInsightCard
              habit={habitInsights.habits[0]}
              totalHabitSpend={habitInsights.totalHabitSpend}
              habitPercentage={habitInsights.habitPercentage}
            />
          </Animated.View>
        ) : null;

      case 'upcoming-block': {
        const subs = item.subscriptions;
        return (
          <View style={{
            marginHorizontal: 16,
            marginTop: 14,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: colors.isDark ? 0.15 : 0.06,
            shadowRadius: 16,
            elevation: 5,
          }}>
            {/* Gradient background matching hero balance card */}
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              {/* Metallic sheen overlay */}
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {/* Subtle shimmer overlay from bottom-right */}
              {colors.isDark ? (
                <LinearGradient
                  colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              ) : null}
              {/* Content */}
              <View>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12',
                      }}
                    >
                      <Repeat size={14} color={colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                      {t('UPCOMING_PAYMENTS')}
                    </Text>
                  </View>
                  <Pressable onPress={() => { impactLight(); router.push('/(tabs)/subscriptions'); }}>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: colors.primary }}>
                      {STRINGS.SEE_ALL}
                    </Text>
                  </Pressable>
                </View>
                <HorizonSelector selected={horizon} onChange={setHorizon} />
                {subs.length > 0 ? (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.expense, marginTop: 8 }}>
                    Total: {maskIfHidden(formatCompactNumber(upcomingTotal), hidden)}
                  </Text>
                ) : null}
              </View>

              {/* Subscription rows inside the same card */}
              {subs.length > 0 ? (
                <View style={{ paddingTop: 10, gap: 6 }}>
                  {subs.map((sub) => (
                    <UpcomingPaymentRow key={sub.id} sub={sub} />
                  ))}
                </View>
              ) : (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                    {t('NO_UPCOMING_SUBS')}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>
        );
      }

      case 'commitments-header': {
        const total = commitmentsDue?.total_due_this_month ?? 0;
        return (
          <View style={{
            marginHorizontal: 16,
            marginTop: 14,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: colors.isDark ? 0.15 : 0.06,
            shadowRadius: 16,
            elevation: 5,
          }}>
            {/* Gradient background matching hero balance card */}
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              {/* Metallic sheen overlay */}
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {/* Subtle shimmer overlay from bottom-right */}
              {colors.isDark ? (
                <LinearGradient
                  colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              ) : null}
              {/* Content */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)',
                      }}
                    >
                      <CalendarClock size={14} color={colors.warning} strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                      {t('COMMITMENTS_THIS_MONTH')}
                    </Text>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: colors.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)',
                  }}
                >
                  <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warning, marginLeft: 6 }}>
                    {maskIfHidden(formatCompactNumber(total), hidden)} {t('DUE_THIS_MONTH')}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        );
      }

      case 'commitment-item':
        return <CommitmentRow commitment={item.commitment} />;

      // ─── Transactions Block: each tx in its own gradient card ───
      case 'transactions-block': {
        // Cap at 10 — user can tap "See All" for the full list.
        // This avoids rendering 20+ items inside a non-virtualized ScrollView.
        const txns = item.transactions.slice(0, 10);
        const txBlockWidth = TX_BLOCK_WIDTH;
        return (
          <View style={{
            marginTop: 10,
            marginHorizontal: 16,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: colors.isDark ? 0.12 : 0.06,
            shadowRadius: 10,
            elevation: 3,
          }}>
            {/* GlassCard-like background gradient */}
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Static metallic sheen */}
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(255,255,255,0.03)', 'transparent', 'rgba(255,255,255,0.015)']
                : ['rgba(255,255,255,0.9)', 'rgba(215,220,230,0.2)', 'rgba(255,255,255,0.5)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Animated diagonal glass sheen — sweeps across */}
            <MetallicShine
              width={txBlockWidth}
              borderRadius={24}
              duration={5000}
              intensity={colors.isDark ? 0.25 : 0.4}
            />
            {/* Dark-mode purple shimmer overlay */}
            {colors.isDark ? (
              <LinearGradient
                colors={['transparent', 'rgba(217,70,239,0.02)', 'rgba(139,92,246,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
            ) : null}
            <View style={{ paddingTop: 14, paddingBottom: 8 }}>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
                {STRINGS.RECENT_TRANSACTIONS}
              </Text>
              <Pressable onPress={() => { impactLight(); router.push('/(tabs)/transactions'); }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary }}>
                  {STRINGS.SEE_ALL}
                </Text>
              </Pressable>
            </View>

            {txns.length > 0 ? (
              <ScrollView
                horizontal={false}
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ paddingHorizontal: 8, gap: 8 }}
              >
                {txns.map((tx) => (
                  <Pressable
                    key={tx.id}
                    onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/transactions', params: { edit_id: tx.id } }); }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <View
                      style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.glassBorder,
                        shadowColor: colors.isDark ? '#8B5CF6' : '#000',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: colors.isDark ? 0.10 : 0.04,
                        shadowRadius: 8,
                        elevation: 3,
                      }}
                    >
                      <LinearGradient
                        colors={colors.isDark
                          ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                          : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}
                      >
                        {/* Metallic sheen */}
                        <LinearGradient
                          colors={colors.isDark
                            ? ['rgba(255,255,255,0.03)', 'transparent', 'rgba(255,255,255,0.015)']
                            : ['rgba(255,255,255,0.9)', 'rgba(215,220,230,0.2)', 'rgba(255,255,255,0.5)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
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
                            height: 38,
                            width: 38,
                            borderRadius: 19,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12,
                            backgroundColor: (tx.category_color ?? colors.textTertiary) + '20',
                          }}
                        >
                          <Text style={{ fontSize: 17 }}>{tx.category_icon ?? '📱'}</Text>
                        </View>
                        {/* Description + category */}
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text
                            numberOfLines={1}
                            style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
                          >
                            {tx.description}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                            {tc(tx.category_name ?? '') || t('UNCATEGORIZED')} · {formatShortDate(parseISO(tx.date))}
                          </Text>
                        </View>
                        {/* Amount on the same line */}
                        {hidden ? (
                          <Text style={{ fontSize: 14, fontWeight: '600', color: tx.type === 'income' ? colors.income : tx.type === 'transfer' ? colors.info : colors.expense }}>{"\u2022\u2022\u2022\u2022"}</Text>
                        ) : (
                          <CurrencyAmount
                            value={Math.abs(tx.amount)}
                            color={tx.type === 'income' ? colors.income : tx.type === 'transfer' ? colors.info : colors.expense}
                            fontSize={14}
                            showSign={tx.type === 'income'}
                          />
                        )}
                      </LinearGradient>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                  {t('NO_TRANSACTIONS_MONTH')}
                </Text>
              </View>
            )}
            </View>
          </View>
        );
      }

      case 'bottom-spacer':
        return <View style={{ height: insets.bottom + 120 }} />;

      default:
        return null;
    }
  };

  const getItemType = (item: SectionType): string => item.type;

  const BgWrapper = colors.isDark ? LinearGradient : View;
  const bgProps = colors.isDark
    ? { colors: [...colors.gradientBg], style: { flex: 1 } }
    : { style: { flex: 1, backgroundColor: colors.background } };

  return (
    <BgWrapper {...(bgProps as any)}>
      {/* Compact sticky balance bar */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            paddingTop: insets.top + 4,
            paddingBottom: 8,
            paddingHorizontal: 20,
          },
          compactBarStyle,
        ]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(15,20,32,0.97)', 'rgba(15,20,32,0.92)', 'rgba(15,20,32,0)']
            : ['rgba(248,250,252,0.97)', 'rgba(248,250,252,0.92)', 'rgba(248,250,252,0)']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: -12,
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
              <Wallet size={14} color={colors.primaryLight} strokeWidth={2} />
            </View>
            {hidden ? (
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>••••</Text>
            ) : (
              <CurrencyAmount value={compactBalance} color={colors.textPrimary} fontSize={18} fontWeight="700" />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <ArrowDownRight size={11} color={colors.expense} strokeWidth={2.5} />
              {hidden ? (
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.expense }}>••••</Text>
              ) : (
                <CurrencyAmount value={compactExpense} color={colors.expense} fontSize={11} fontWeight="600" />
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <ArrowUpRight size={11} color={colors.income} strokeWidth={2.5} />
              {hidden ? (
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.income }}>••••</Text>
              ) : (
                <CurrencyAmount value={compactIncome} color={colors.income} fontSize={11} fontWeight="600" />
              )}
            </View>
            <Pressable onPress={() => { impactLight(); togglePrivacy(); }} style={{ padding: 6 }}>
              {hidden
                ? <EyeOff size={16} color={colors.textTertiary} strokeWidth={2} />
                : <Eye size={16} color={colors.textTertiary} strokeWidth={2} />
              }
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <FlashList<SectionType>
        data={sections}
        renderItem={renderItem}
        getItemType={getItemType}
        estimatedItemSize={100}
        drawDistance={300}
        showsVerticalScrollIndicator={false}
        refreshing={false}
        onRefresh={onRefresh}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      {unreviewed && unreviewed.length > 0 ? (
        <SMSReviewSheet
          visible={reviewVisible}
          transactions={unreviewed}
          onClose={() => setReviewVisible(false)}
        />
      ) : null}

      {/* Floating Unreviewed Transactions Badge */}
      {unreviewedCount > 0 ? (
        <Pressable
          onPress={() => { impactLight(); router.push('/(tabs)/review'); }}
          style={{
            position: 'absolute',
            left: 20,
            bottom: insets.bottom + 100,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 24,
            backgroundColor: colors.warning,
            shadowColor: colors.warning,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.30,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <MessageSquareWarning size={16} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginLeft: 6 }}>
            {unreviewedCount}
          </Text>
        </Pressable>
      ) : null}

      {/* Intelligent Input FAB — tap for full screen, long-press for radial mode select */}
      <SmartInputFAB
        style={{ right: 12, bottom: insets.bottom + 96 }}
        onPress={() => router.push('/(tabs)/smart-input')}
        onVoice={() => router.push('/(tabs)/smart-input?mode=voice')}
        onScan={() => router.push('/(tabs)/smart-input?mode=scan')}
        onManual={() => router.push('/(tabs)/smart-input?mode=manual')}
      />
    </BgWrapper>
  );
}

export default function DashboardScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
