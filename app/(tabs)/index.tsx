import React, { useCallback, useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, differenceInDays, parseISO, addMonths } from 'date-fns';
import { Image } from 'expo-image';
import {
  Eye, EyeOff, AlertTriangle,
  Wallet, ArrowUpRight, ArrowDownRight, MessageSquareWarning,
  Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { formatShortDate } from '../../utils/locale-format';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SmartInputFAB } from '../../components/ui/SmartInputFAB';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { HorizonSelector, type HorizonMonths } from '../../components/ui/HorizonSelector';
import { HeroCard } from '../../components/ui/HeroCard';
import { ChipIcon, chipIconColor } from '../../components/ui/ChipIcon';
import { GradientDivider } from '../../components/ui/GradientDivider';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { AccountChip } from '../../components/ui/AccountChip';
import { PillBadge } from '../../components/ui/PillBadge';
import { SMSReviewSheet } from '../../components/finance/SMSReviewSheet';
import { BudgetStatusRibbon } from '../../components/finance/BudgetStatusRibbon';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { CategoryIcon } from '../../components/ui/CategoryIcon';
import { useDashboard } from '../../hooks/useDashboard';
import { useUnreviewedTransactions } from '../../hooks/useReviewTransactions';
import { usePortfolioSummary } from '../../hooks/useAssets';
import { useAccounts } from '../../hooks/useAccounts';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useCommitmentsDue } from '../../hooks/useCommitments';
import { useGoals } from '../../hooks/useGoals';
import { useHabitInsights } from '../../hooks/useHabits';
import { formatCompactNumberLocale } from '../../utils/currency';
import { useLanguageStore } from '../../store/language-store';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { COLORS } from '../../constants/colors';
import { useRTL } from '../../hooks/useRTL';
import { STRINGS } from '../../constants/strings';
import { useT } from '../../lib/i18n';
import { useTranslateCategory } from '../../lib/i18n';
import type { Transaction, Commitment } from '../../types/index';
import { type Subscription, SUBSCRIPTION_PRESETS } from '../../services/subscription-service';
import { ALL_BANK_PRESETS } from '../../constants/bank-presets';
import { findBrand } from '../../constants/brand-presets';
import { useAuthStore } from '../../store/auth-store';
import { TransactionsPageContent } from './transactions';

// ─── Constants ───────────────────────────────────────────────────────
// TX_BLOCK_WIDTH is computed inside DashboardContent using useWindowDimensions
// so it responds correctly to orientation changes and large-screen layouts.

// ─── Section item types for FlashList ────────────────────────────────

type SectionType =
  | { type: 'header' }
  | { type: 'month-picker' }
  | { type: 'hero-balance' }
  | { type: 'budget-status' }
  | { type: 'habit-insight' }
  | { type: 'commitments-block'; commitments: Commitment[]; total: number }
  | { type: 'upcoming-block'; subscriptions: Subscription[] }
  | { type: 'transactions-block'; transactions: Transaction[] }
  | { type: 'bottom-spacer' };

// ─── Commitment Row ──────────────────────────────────────────────────

const CommitmentRow = React.memo(function CommitmentRow({ commitment }: { commitment: Commitment }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL, rowDir } = useRTL();
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
        flexDirection: rowDir,
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
      }}
    >
      <View
        style={{
          height: 36,
          width: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: (commitment.category_color ?? colors.textTertiary) + '18',
        }}
      >
        <Text style={{ fontSize: 16 }}>{commitment.category_icon ?? '📋'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }}>{commitment.name}</Text>
        <Text style={{ fontSize: 11.5, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }}>
          {recurrenceLabel} · {t('DUE')} {formatShortDate(dueDate)}
        </Text>
      </View>
      {hidden ? (
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
      ) : (
        <CurrencyAmount value={commitment.amount} color={colors.expense} fontSize={14} />
      )}
    </View>
  );
});

// ─── Upcoming Subscription Row ───────────────────────────────────────

const UpcomingPaymentRow = React.memo(function UpcomingPaymentRow({ sub }: { sub: Subscription }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL, rowDir } = useRTL();
  const hidden = usePrivacyStore((s) => s.hidden);
  const daysUntil = differenceInDays(parseISO(sub.next_billing_date), new Date());
  const isUrgent = daysUntil <= 3;
  const isDueSoon = daysUntil <= 7;
  const dateLabel = daysUntil <= 0 ? t('TODAY') : daysUntil === 1 ? t('TOMORROW') : `${daysUntil}d`;

  // Use the subscription's own icon/color — fall back to a default if empty
  const subIcon = sub.icon || '💳';
  const subColor = sub.color || colors.primary;
  const iconBg = colors.isDark ? subColor + '30' : subColor + '18';
  const preset = SUBSCRIPTION_PRESETS.find((p) => p.name === sub.name || p.nameAr === sub.name);
  const logo = preset?.logo ?? null;

  return (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 12,
      }}
    >
      <View
        style={{
          height: 36,
          width: 36,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBg,
        }}
      >
        {logo ? (
          <Image
            source={{ uri: logo }}
            style={{ width: 20, height: 20, borderRadius: 4 }}
            contentFit="contain"
          />
        ) : (
          <Text style={{ fontSize: 16 }}>{subIcon}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }}>{sub.name}</Text>
        <Text style={{ fontSize: 11.5, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }}>
          {sub.billing_cycle} · {formatShortDate(parseISO(sub.next_billing_date))}
        </Text>
      </View>
      {hidden ? (
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>••••</Text>
      ) : (
        <CurrencyAmount value={sub.amount} color={colors.textPrimary} fontSize={14} />
      )}
    </View>
  );
});
// ─── Dashboard ───────────────────────────────────────────────────────

function DashboardContent(): React.ReactElement {
  const { width: screenWidth } = useWindowDimensions();
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const { isRTL, textAlign, rowDir } = useRTL();
  const language = useLanguageStore((s) => s.language);
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
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [horizon, setHorizon] = useState<HorizonMonths>(1);
  const hidden = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const userNameEn = useAuthStore((s) => s.user?.full_name ?? '');
  const userNameAr = useAuthStore((s) => s.user?.name_ar ?? '');
  const userName = isRTL && userNameAr ? userNameAr : userNameEn;
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
      s.push({ type: 'commitments-block', commitments: dueItems, total: commitmentsDue?.total_due_this_month ?? 0 });
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
              paddingTop: insets.top + 12,
              paddingBottom: 4,
              paddingHorizontal: 20,
              flexDirection: rowDir,
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, textAlign }}>
                {t('WELCOME_BACK')}
              </Text>
              {firstName ? (
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3, marginTop: 2, textAlign }}>
                  {firstName} <Text style={{ color: colors.isDark ? COLORS.claude.p200 : colors.primary }}>{userName.split(' ').slice(1).join(' ')}</Text>
                </Text>
              ) : (
                <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3, marginTop: 2, textAlign }}>
                  {t('DASHBOARD_TITLE')}
                </Text>
              )}
            </View>
            <Pressable
              onPress={() => { impactLight(); togglePrivacy(); }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderWidth: 1,
                borderColor: colors.isDark ? COLORS.claude.stroke : 'rgba(0,0,0,0.08)',
              }}
            >
              {hidden
                ? <EyeOff size={18} color={colors.isDark ? COLORS.claude.fg2 : colors.textTertiary} strokeWidth={2} />
                : <Eye size={18} color={colors.isDark ? COLORS.claude.fg2 : colors.textTertiary} strokeWidth={2} />
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

        return (
          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
              <HeroCard style={{ marginTop: 8 }}>
                  {/* Label row — just the "Current Balance" caption.
                      Wallet chip icon, change pill, and View-Profile link all
                      removed per user request. */}
                  <View style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, fontWeight: '500' }}>{t('CURRENT_BALANCE')}</Text>
                  </View>

                  {/* Large balance amount */}
                  <View style={{ marginBottom: 18, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    {hidden ? (
                      <Text style={{ fontSize: 46, fontWeight: '700', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary, letterSpacing: -1 }}>••••</Text>
                    ) : (
                      <CurrencyAmount value={totalBalance} color={colors.isDark ? COLORS.claude.fg : colors.textPrimary} fontSize={46} fontWeight="700" />
                    )}
                  </View>

                  {/* Stats row: assets / income / expenses */}
                  <View style={{ flexDirection: rowDir, justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={{ fontSize: 11.5, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary, marginBottom: 4, fontWeight: '500' }}>{t('TOTAL_ASSETS')}</Text>
                      {hidden ? (
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>••••</Text>
                      ) : (
                        <CurrencyAmount value={portfolio?.total_value ?? 0} color={colors.isDark ? COLORS.claude.fg : colors.textPrimary} fontSize={16} />
                      )}
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11.5, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary, marginBottom: 4, fontWeight: '500' }}>{t('INCOME')}</Text>
                      {hidden ? (
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.income }}>••••</Text>
                      ) : (
                        <CurrencyAmount value={data.summary.total_income} color={colors.isDark ? COLORS.claude.greenText : colors.income} fontSize={16} />
                      )}
                    </View>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                      <Text style={{ fontSize: 11.5, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary, marginBottom: 4, fontWeight: '500' }}>{t('SPENDING')}</Text>
                      {hidden ? (
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.expense }}>••••</Text>
                      ) : (
                        <CurrencyAmount value={data.summary.total_expense} color={colors.isDark ? COLORS.claude.redText : colors.expense} fontSize={16} showSign />
                      )}
                    </View>
                  </View>

                  {/* Account chips — horizontal scroll so long lists don't wrap
                      and break the card height. Uses native RTL content inversion
                      so the order reads correctly in Arabic. */}
                  {accts.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled
                      directionalLockEnabled
                      style={{ marginTop: 16, marginHorizontal: -22 }}
                      contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}
                    >
                      {accts.map((acct) => {
                        const preset = ALL_BANK_PRESETS.find(
                          (b) => b.nameEn === acct.name || b.nameAr === acct.name
                        );
                        return (
                          <AccountChip
                            key={acct.id}
                            bankName={acct.name}
                            amount={hidden ? 0 : acct.current_balance}
                            logo={preset?.logo ?? null}
                            color={
                              preset?.color ??
                              (acct.type === 'bank' ? '#4A7AE8'
                              : acct.type === 'cash' ? COLORS.claude.green
                              : acct.type === 'savings' ? COLORS.claude.amber
                              : COLORS.claude.p500)
                            }
                          />
                        );
                      })}
                    </ScrollView>
                  ) : null}
              </HeroCard>
          </Animated.View>
        );
      }

      case 'budget-status':
        return goalsSummary && goalsSummary.goals.length > 0 ? (
          <Card style={{ marginHorizontal: 16, marginTop: 14 }}>
            <BudgetStatusRibbon goals={goalsSummary.goals} transactions={data.month_expense_transactions} />
          </Card>
        ) : null;

      case 'habit-insight': {
        if (!habitInsights || habitInsights.habits.length === 0) return null;
        const topHabit = habitInsights.habits[0];
        return (
          <Pressable
            onPress={() => { impactLight(); router.push('/(tabs)/analytics'); }}
            style={{ marginHorizontal: 16, marginTop: 14 }}
          >
            <Card noPadding>
              {/* Purple accent gradient overlay */}
              {colors.isDark ? (
                <LinearGradient
                  colors={['rgba(122,71,235,0.14)', 'rgba(255,255,255,0.02)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 0.6, y: 0.5 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 }}
                />
              ) : null}
              <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
                <ChipIcon variant="purple" size={40}>
                  <Sparkles size={18} color={chipIconColor('purple')} strokeWidth={2} />
                </ChipIcon>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 }}>
                    {topHabit.name} — {topHabit.frequency}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, lineHeight: 17 }}>
                    {t('HABIT_SPEND')}: {maskIfHidden(formatCompactNumberLocale(habitInsights.totalHabitSpend, language), hidden)}
                  </Text>
                </View>
                {isRTL
                  ? <ChevronLeft size={16} color={colors.isDark ? COLORS.claude.fg4 : colors.textTertiary} strokeWidth={2} />
                  : <ChevronRight size={16} color={colors.isDark ? COLORS.claude.fg4 : colors.textTertiary} strokeWidth={2} />
                }
              </View>
            </Card>
          </Pressable>
        );
      }

      case 'upcoming-block': {
        const subs = item.subscriptions;
        return (
          <View style={{ marginHorizontal: 16, marginTop: 14 }}>
            <SectionHeader
              title={t('UPCOMING_PAYMENTS')}
              action={t('SEE_ALL')}
              onAction={() => { impactLight(); router.push('/(tabs)/subscriptions'); }}
            />
            <Card noPadding>
              <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
                <HorizonSelector selected={horizon} onChange={setHorizon} />
                {subs.length > 0 ? (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.expense, marginTop: 8 }}>
                    {t('SUBS_MONTHLY_TOTAL')}: {maskIfHidden(formatCompactNumberLocale(upcomingTotal, language), hidden)}
                  </Text>
                ) : null}
              </View>

              {/* Subscription rows */}
              {subs.length > 0 ? (
                <View>
                  {subs.map((sub, i) => (
                    <React.Fragment key={sub.id}>
                      {i > 0 ? <GradientDivider /> : null}
                      <UpcomingPaymentRow sub={sub} />
                    </React.Fragment>
                  ))}
                </View>
              ) : (
                <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                    {t('NO_UPCOMING_SUBS')}
                  </Text>
                </View>
              )}
            </Card>
          </View>
        );
      }

      case 'commitments-block': {
        const total = item.total;
        const commitments = item.commitments;
        return (
          <View style={{ marginHorizontal: 16, marginTop: 14 }}>
            <SectionHeader title={t('COMMITMENTS_THIS_MONTH')} />
            <Card noPadding>
              {/* Total due banner */}
              <View
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginHorizontal: 14,
                  marginTop: 14,
                  marginBottom: 4,
                  backgroundColor: colors.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)',
                }}
              >
                <AlertTriangle size={14} color={colors.warning} strokeWidth={2} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.warning, marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }}>
                  {maskIfHidden(formatCompactNumberLocale(total, language), hidden)} {t('DUE_THIS_MONTH')}
                </Text>
              </View>
              {/* Commitment rows */}
              {commitments.map((c, i) => (
                <React.Fragment key={c.id}>
                  {i > 0 ? <GradientDivider /> : null}
                  <CommitmentRow commitment={c} />
                </React.Fragment>
              ))}
            </Card>
          </View>
        );
      }

      // ─── Transactions Block: clean rows with dividers ───
      case 'transactions-block': {
        const txns = item.transactions.slice(0, 10);
        return (
          <View style={{ marginTop: 18, marginHorizontal: 16 }}>
            <SectionHeader
              title={t('RECENT_TRANSACTIONS')}
              action={t('SEE_ALL')}
              onAction={() => { impactLight(); router.push('/(tabs)/transactions'); }}
            />
            <Card noPadding>
              {txns.length > 0 ? (
                <View>
                  {txns.map((tx, i) => (
                    <React.Fragment key={tx.id}>
                      {i > 0 ? <GradientDivider /> : null}
                      <Pressable
                        onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/transactions', params: { edit_id: tx.id } }); }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                      >
                        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                          {(() => {
                            const brand = findBrand(tx.merchant) ?? findBrand(tx.description);
                            if (brand?.logo) {
                              return (
                                <View
                                  style={{
                                    height: 36,
                                    width: 36,
                                    borderRadius: 10,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <Image
                                    source={{ uri: brand.logo }}
                                    style={{ width: 22, height: 22, borderRadius: 4 }}
                                    contentFit="contain"
                                  />
                                </View>
                              );
                            }
                            return (
                              <View
                                style={{
                                  height: 36,
                                  width: 36,
                                  borderRadius: 10,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  backgroundColor: (tx.category_color ?? colors.textTertiary) + '18',
                                }}
                              >
                                <CategoryIcon
                                  name={tx.category_icon ?? 'smartphone'}
                                  size={18}
                                  color={tx.category_color ?? colors.textSecondary}
                                />
                              </View>
                            );
                          })()}
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: '600', color: colors.textPrimary, textAlign }}>
                              {(() => {
                                const brand = findBrand(tx.merchant) ?? findBrand(tx.description);
                                if (brand) return isRTL ? brand.nameAr : brand.nameEn;
                                return tx.description;
                              })()}
                            </Text>
                            <Text style={{ fontSize: 11.5, color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary, marginTop: 1, textAlign }}>
                              {tc(tx.category_name ?? '') || t('UNCATEGORIZED')} · {formatShortDate(parseISO(tx.date))}
                            </Text>
                          </View>
                          {hidden ? (
                            <Text style={{ fontSize: 14, fontWeight: '600', color: tx.type === 'income' ? colors.income : tx.type === 'transfer' ? colors.info : colors.expense }}>{"\u2022\u2022\u2022\u2022"}</Text>
                          ) : (
                            <CurrencyAmount
                              value={Math.abs(tx.amount)}
                              color={tx.type === 'income' ? (colors.isDark ? COLORS.claude.greenText : colors.income) : tx.type === 'transfer' ? colors.info : colors.expense}
                              fontSize={14}
                              showSign={tx.type === 'income'}
                            />
                          )}
                        </View>
                      </Pressable>
                    </React.Fragment>
                  ))}
                </View>
              ) : (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                    {t('NO_TRANSACTIONS_MONTH')}
                  </Text>
                </View>
              )}
            </Card>
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.isDark ? COLORS.claude.bg0 : colors.background }}>
      {/* Ambient purple glow — top-left */}
      {colors.isDark ? (
        <LinearGradient
          colors={['rgba(91,47,199,0.28)', 'transparent']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 0.5 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '60%' }}
        />
      ) : null}
      {/* Ambient blue glow — bottom-right */}
      {colors.isDark ? (
        <LinearGradient
          colors={['transparent', 'rgba(60,120,190,0.18)']}
          start={{ x: 0, y: 0.4 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' }}
        />
      ) : null}
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
            ? ['rgba(7,8,15,0.97)', 'rgba(7,8,15,0.92)', 'rgba(7,8,15,0)']
            : ['rgba(248,250,252,0.97)', 'rgba(248,250,252,0.92)', 'rgba(248,250,252,0)']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: -12,
          }}
        />
        <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.isDark ? COLORS.claude.chip.purpleBgStart : colors.primary + '12',
                borderWidth: 1,
                borderColor: colors.isDark ? COLORS.claude.chip.purpleBorder : 'transparent',
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
          <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
              <ArrowDownRight size={11} color={colors.expense} strokeWidth={2.5} />
              {hidden ? (
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.expense }}>••••</Text>
              ) : (
                <CurrencyAmount value={compactExpense} color={colors.expense} fontSize={11} fontWeight="600" />
              )}
            </View>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 3 }}>
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

      {/* Transactions modal — slides up from "See All" in recent transactions */}
      <Modal
        visible={showTxnModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTxnModal(false)}
        statusBarTranslucent
      >
        <TransactionsPageContent
          onClose={() => setShowTxnModal(false)}
          isModal
        />
      </Modal>
    </View>
  );
}

export default function DashboardScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
