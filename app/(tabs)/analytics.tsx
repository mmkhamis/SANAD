import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  ChevronRight,
  BarChart3,
  CreditCard,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Target,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { Image } from 'expo-image';

import { impactLight } from '../../utils/haptics';
import { SmartInputButton } from '../../components/ui/SmartInputButton';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { MonthPicker } from '../../components/ui/MonthPicker';
import { MetallicShine } from '../../components/ui/MetallicShine';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { SpendingBarChart } from '../../components/charts/SpendingBarChart';
import { ExpenseTrendChart } from '../../components/charts/ExpenseTrendChart';
import { AIInsightCard } from '../../components/finance/AIInsightCard';
import { HabitSection } from '../../components/finance/HabitSection';
import { BudgetStatusRibbon } from '../../components/finance/BudgetStatusRibbon';
import { BenchmarkUnlockCard, DemographicsEditor } from '../../components/finance/BenchmarkUnlockCard';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { useDashboard } from '../../hooks/useDashboard';
import { useBenchmarks } from '../../hooks/useBenchmarks';
import { useHabitInsights } from '../../hooks/useHabits';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useGoals } from '../../hooks/useGoals';
import { formatCompactNumber } from '../../utils/currency';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { SUBSCRIPTION_PRESETS } from '../../services/subscription-service';
import { STRINGS } from '../../constants/strings';
import { useT, useTranslateCategory } from '../../lib/i18n';
import type {
  DashboardData,
  HabitInsights,
  BenchmarkSummary,
  BenchmarkComparison,
  GoalsSummary,
} from '../../types/index';
import type { Subscription, BillingCycle } from '../../services/subscription-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ─── Types ────────────────────────────────────────────────────────────

type ActiveSheet = 'money' | 'subscriptions' | 'tips' | null;

// ─── Helpers ──────────────────────────────────────────────────────────

function toMonthly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
  }
}

function getPresetLogo(name: string): string | null {
  return SUBSCRIPTION_PRESETS.find((p) => p.name === name)?.logo ?? null;
}

function thisMonthEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

// ─── Home-style card gradient ──────────────────────────────────────────
// Re-uses the exact same gradient layers as the Home hero balance card.

interface HomeCardGradientProps {
  padding?: number;
  children: React.ReactNode;
}

function HomeCardGradient({ padding = 24, children }: HomeCardGradientProps): React.ReactElement {
  const colors = useThemeColors();
  return (
    <LinearGradient
      colors={colors.isDark
        ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
        : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ padding }}
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
      {/* Violet shimmer on dark */}
      {colors.isDark ? (
        <LinearGradient
          colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {children}
    </LinearGradient>
  );
}

// ─── Sheet Wrapper ─────────────────────────────────────────────────────

function AnalyticsSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const scrollOffset = useRef(0);
  const isScrollAtTop = useRef(true);

  const dismiss = (): void => {
    onClose();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        // Only capture vertical downward drags when scroll is at top
        return isScrollAtTop.current && gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx);
      },
      onPanResponderMove: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (gs.dy > 0) {
          translateY.value = gs.dy;
        }
      },
      onPanResponderRelease: (_e: GestureResponderEvent, gs: PanResponderGestureState) => {
        if (gs.dy > 100 || gs.vy > 0.5) {
          translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(dismiss)();
          });
        } else {
          translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
      },
    }),
  ).current;

  // Reset translateY when sheet opens
  React.useEffect(() => {
    if (visible) {
      translateY.value = 0;
      scrollOffset.current = 0;
      isScrollAtTop.current = true;
    }
  }, [visible, translateY]);

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            maxHeight: SCREEN_HEIGHT * 0.9,
            backgroundColor: colors.isDark ? '#1a1f2e' : '#FFFFFF',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }, sheetAnimStyle]}
          {...panResponder.panHandlers}
        >
          {/* Top gradient accent */}
          <LinearGradient
            colors={colors.isDark
              ? ['rgba(139,92,246,0.08)', 'transparent']
              : ['rgba(139,92,246,0.04)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }}
          />

          {/* Drag handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)',
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}
            >
              <X size={16} color={colors.textSecondary} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={{ height: 1, backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => {
              scrollOffset.current = e.nativeEvent.contentOffset.y;
              isScrollAtTop.current = e.nativeEvent.contentOffset.y <= 0;
            }}
            scrollEventThrottle={16}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Analytics Card Shell ──────────────────────────────────────────────
// Matches Home hero card: borderRadius 24, padding 24, MetallicShine sweep.

function AnalyticsCard({
  onPress,
  accentColor,
  children,
  delay = 0,
}: {
  onPress: () => void;
  accentColor: string;
  children: React.ReactNode;
  delay?: number;
}): React.ReactElement {
  const colors = useThemeColors();
  const [cardW, setCardW] = useState(CARD_WIDTH);

  const onLayout = (e: LayoutChangeEvent): void => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setCardW(w);
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay)}>
      <Pressable
        onPress={onPress}
        onLayout={onLayout}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
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
          <HomeCardGradient padding={24}>
            {/* Accent tint */}
            <LinearGradient
              colors={[`${accentColor}0A`, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />

            {/* Animated metallic sweep */}
            <MetallicShine
              width={cardW}
              borderRadius={24}
              duration={4500}
              intensity={colors.isDark ? 0.28 : 0.38}
            />

            {children}
          </HomeCardGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Card Header ───────────────────────────────────────────────────────

function CardHeader({
  icon: Icon,
  title,
  iconColor,
}: {
  icon: React.ElementType;
  title: string;
  iconColor: string;
}): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${iconColor}1A`,
          }}
        >
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
      </View>
      <ChevronRight size={17} color={colors.textTertiary} strokeWidth={2} />
    </View>
  );
}

// ─── Stat Tile ─────────────────────────────────────────────────────────

function StatTile({
  value,
  label,
  valueColor,
}: {
  value: string | React.ReactNode;
  label: string;
  valueColor?: string;
}): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
      }}
    >
      {typeof value === 'string' ? (
        <Text style={{ fontSize: 20, fontWeight: '700', color: valueColor ?? colors.textPrimary }}>{value}</Text>
      ) : (
        value
      )}
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{label}</Text>
    </View>
  );
}

// ─── Section divider in sheet ─────────────────────────────────────────

function SectionLabel({ children }: { children: string }): React.ReactElement {
  const colors = useThemeColors();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

// ─── Thin card wrapper for sheet list items ────────────────────────────

function ThinCard({ children }: { children: React.ReactNode }): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      style={{
        marginHorizontal: 16,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(139,92,246,0.10)' : colors.glassBorder,
      }}
    >
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)']
          : ['#FFFFFF', '#F8F9FB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingVertical: 4 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}

// ─── Comparison bar row (Saving Tips) ─────────────────────────────────
// Two thin horizontal bars: you vs. typical people your age in your area.

function ComparisonRow({
  item,
  hidden,
}: {
  item: BenchmarkComparison;
  hidden: boolean;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const maxVal = Math.max(item.user_spend, item.benchmark_median, 1) * 1.15;
  const userRatio = Math.min(item.user_spend / maxVal, 1);
  const avgRatio = Math.min(item.benchmark_median / maxVal, 1);
  const isOver = item.diff_percent > 5;
  const isUnder = item.diff_percent < -5;
  const diffAbs = Math.abs(Math.round(item.diff_percent));

  const userBarColor = isOver ? colors.expense : isUnder ? colors.income : colors.primary;

  return (
    <View style={{ paddingVertical: 14 }}>
      {/* Category + badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18 }}>{item.category_icon}</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
            {tc(item.category_name)}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: isOver ? `${colors.expense}15` : isUnder ? `${colors.income}15` : `${colors.primary}12`,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: isOver ? colors.expense : isUnder ? colors.income : colors.primary,
            }}
          >
            {isOver ? `+${diffAbs}${t('MORE_PERCENT')}` : isUnder ? `-${diffAbs}${t('LESS_PERCENT')}` : t('ON_TRACK')}
          </Text>
        </View>
      </View>

      {/* You bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ width: 52, fontSize: 11, fontWeight: '500', color: colors.textSecondary }}>{t('YOU')}</Text>
        <View
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${userRatio * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: userBarColor,
            }}
          />
        </View>
        <View style={{ marginLeft: 10, minWidth: 60, alignItems: 'flex-end' }}>
          {hidden ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>••••</Text>
          ) : (
            <CurrencyAmount value={item.user_spend} color={colors.textSecondary} fontSize={11} fontWeight="600" />
          )}
        </View>
      </View>

      {/* Typical bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ width: 52, fontSize: 11, fontWeight: '500', color: colors.textTertiary }}>{t('TYPICAL')}</Text>
        <View
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${avgRatio * 100}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.35)',
            }}
          />
        </View>
        <View style={{ marginLeft: 10, minWidth: 60, alignItems: 'flex-end' }}>
          {hidden ? (
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary }}>••••</Text>
          ) : (
            <CurrencyAmount value={item.benchmark_median} color={colors.textTertiary} fontSize={11} fontWeight="600" />
          )}
        </View>
      </View>
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD 1 — MONEY ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface MoneyAnalysisCardProps {
  dashboard: DashboardData;
  habitInsights: HabitInsights | undefined;
  goalsSummary: GoalsSummary | undefined;
  hidden: boolean;
  onPress: () => void;
}

function MoneyAnalysisCard({
  dashboard,
  habitInsights,
  goalsSummary,
  hidden,
  onPress,
}: MoneyAnalysisCardProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const topCat = dashboard.category_spending[0] ?? null;
  const onTrack = goalsSummary?.on_track_count ?? 0;
  const atRisk = (goalsSummary?.near_limit_count ?? 0) + (goalsSummary?.exceeded_count ?? 0);

  return (
    <AnalyticsCard onPress={onPress} accentColor={colors.primary} delay={60}>
      <CardHeader icon={BarChart3} title={t('MONEY_ANALYSIS')} iconColor={colors.primary} />

      {/* Stat tiles */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <StatTile
          value={String(dashboard.summary.transaction_count)}
          label={t('TRANSACTIONS_LABEL')}
        />
        <StatTile
          value={String(habitInsights?.habits.length ?? 0)}
          label={t('HABITS_LABEL')}
          valueColor={colors.primary}
        />
      </View>

      {/* Top category */}
      {topCat ? (
        <>
          <LinearGradient
            colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 1, marginBottom: 14 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: goalsSummary ? 14 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>{topCat.category_icon}</Text>
              <View>
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>{t('TOP_CATEGORY')}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  {tc(topCat.category_name)}
                </Text>
              </View>
            </View>
            {hidden ? (
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.expense }}>••••</Text>
            ) : (
              <CurrencyAmount value={topCat.total} color={colors.expense} fontSize={17} fontWeight="700" />
            )}
          </View>
        </>
      ) : null}

      {/* Budget status pill */}
      {goalsSummary && goalsSummary.goals.length > 0 ? (
        <>
          <LinearGradient
            colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 1, marginBottom: 12 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Target size={13} color={colors.textTertiary} strokeWidth={2} />
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>{t('BUDGETS')}:</Text>
            {onTrack > 0 ? (
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: `${colors.income}15` }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.income }}>{onTrack} {t('ON_TRACK')}</Text>
              </View>
            ) : null}
            {atRisk > 0 ? (
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: `${colors.warning}15` }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning }}>{atRisk} {t('AT_RISK')}</Text>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </AnalyticsCard>
  );
}

// ─── Money Analysis Sheet Content ─────────────────────────────────────

function MoneyAnalysisSheetContent({
  dashboard,
  habitInsights,
  goalsSummary,
  selectedMonth,
  hidden,
}: {
  dashboard: DashboardData;
  habitInsights: HabitInsights | undefined;
  goalsSummary: GoalsSummary | undefined;
  selectedMonth: string;
  hidden: boolean;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();

  return (
    <View style={{ paddingTop: 12 }}>
      {/* Summary stats */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 6 }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary }}>
            {dashboard.summary.transaction_count}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('TRANSACTIONS_LABEL')}</Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }}
        >
          {hidden ? (
            <Text style={{ fontSize: 22, fontWeight: '700', color: dashboard.summary.net_balance >= 0 ? colors.income : colors.expense }}>••••</Text>
          ) : (
            <CurrencyAmount
              value={Math.abs(dashboard.summary.net_balance)}
              color={dashboard.summary.net_balance >= 0 ? colors.income : colors.expense}
              fontSize={22}
              fontWeight="700"
            />
          )}
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>
            {dashboard.summary.net_balance >= 0 ? t('SAVED') : t('DEFICIT')}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.primary }}>
            {habitInsights?.habits.length ?? 0}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{t('HABITS_LABEL')}</Text>
        </View>
      </View>

      {/* Budget status */}
      {goalsSummary && goalsSummary.goals.length > 0 ? (
        <>
          <SectionLabel>{t('BUDGET_STATUS')}</SectionLabel>
          <View
            style={{
              marginHorizontal: 16,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
              shadowColor: colors.isDark ? '#8B5CF6' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: colors.isDark ? 0.12 : 0.05,
              shadowRadius: 12,
              elevation: 4,
            }}
          >
            <HomeCardGradient padding={20}>
              <BudgetStatusRibbon
                goals={goalsSummary.goals}
                transactions={dashboard.month_expense_transactions}
              />
            </HomeCardGradient>
          </View>
        </>
      ) : null}

      {/* Spending by category */}
      {dashboard.category_spending.length > 0 ? (
        <>
          <SectionLabel>{t('SPENDING_BY_CATEGORY')}</SectionLabel>
          <SpendingBarChart
            data={dashboard.category_spending}
            totalExpense={dashboard.summary.total_expense}
            barWidth={24}
          />
        </>
      ) : null}

      {/* Expense trend */}
      <SectionLabel>{t('EXPENSE_TREND')}</SectionLabel>
      <ExpenseTrendChart month={selectedMonth} />

      {/* Spending habits */}
      {habitInsights && habitInsights.habits.length > 0 ? (
        <>
          <SectionLabel>{t('SPENDING_HABITS')}</SectionLabel>
          <FeatureGate feature="advancedHabits">
            <HabitSection insights={habitInsights} />
          </FeatureGate>
        </>
      ) : null}

      {/* AI insight */}
      {dashboard.ai_insight ? (
        <View style={{ paddingVertical: 8 }}>
          <AIInsightCard insight={dashboard.ai_insight} />
        </View>
      ) : null}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD 2 — SAVING TIPS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SavingTipsCardProps {
  benchmarkSummary: BenchmarkSummary | undefined;
  dashboard: DashboardData | undefined;
  hidden: boolean;
  onPress: () => void;
}

function SavingTipsCard({
  benchmarkSummary,
  dashboard,
  hidden,
  onPress,
}: SavingTipsCardProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();
  const topOverspend = useMemo(() => {
    if (!benchmarkSummary?.has_data || !benchmarkSummary.comparisons.length) return null;
    return (
      [...benchmarkSummary.comparisons]
        .filter((c) => c.diff_percent > 5)
        .sort((a, b) => b.diff_percent - a.diff_percent)[0] ?? null
    );
  }, [benchmarkSummary]);

  const topCat = dashboard?.category_spending[0] ?? null;

  // Potential saving: difference from peer median, or 5% of top category
  const savingAmount = topOverspend
    ? Math.max(0, topOverspend.user_spend - topOverspend.benchmark_median) * 0.05
    : topCat
    ? topCat.total * 0.05
    : 0;

  return (
    <AnalyticsCard onPress={onPress} accentColor="#34D399" delay={120}>
      <CardHeader icon={Lightbulb} title={t('SAVING_TIPS')} iconColor="#34D399" />

      {topOverspend ? (
        <>
          {/* Main message */}
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 }}>
            {t('PEERS_SPEND_LESS')}{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{tc(topOverspend.category_name)}</Text>
            {' '}{t('PEERS_THAN_YOU')}
          </Text>

          <LinearGradient
            colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 1, marginBottom: 14 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('IF_REDUCED_5')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingDown size={14} color="#34D399" strokeWidth={2.5} />
              {hidden ? (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#34D399' }}>••••</Text>
              ) : (
                <CurrencyAmount value={savingAmount} color="#34D399" fontSize={16} fontWeight="700" />
              )}
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('PER_MONTH')}</Text>
            </View>
          </View>
        </>
      ) : topCat ? (
        <>
          <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 14 }}>
            {t('BIGGEST_SPEND')}{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{topCat.category_icon} {tc(topCat.category_name)}</Text>
            {t('SMALL_CUT')}
          </Text>

          <LinearGradient
            colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 1, marginBottom: 14 }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('IF_REDUCED_5')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingDown size={14} color="#34D399" strokeWidth={2.5} />
              {hidden ? (
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#34D399' }}>••••</Text>
              ) : (
                <CurrencyAmount value={savingAmount} color="#34D399" fontSize={16} fontWeight="700" />
              )}
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('PER_MONTH')}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={{ fontSize: 14, color: colors.textTertiary }}>
          {t('ADD_TXN_TIPS')}
        </Text>
      )}
    </AnalyticsCard>
  );
}

// ─── Saving Tips Sheet Content ─────────────────────────────────────────

function SavingTipsSheetContent({
  benchmarkSummary,
  dashboard,
  habitInsights,
  hidden,
  onShowDemographics,
}: {
  benchmarkSummary: BenchmarkSummary | undefined;
  dashboard: DashboardData | undefined;
  habitInsights: HabitInsights | undefined;
  hidden: boolean;
  onShowDemographics: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const tc = useTranslateCategory();

  // Categories where user spends more than peers by >5%
  const overspending = useMemo(() => {
    if (!benchmarkSummary?.has_data) return [];
    return [...benchmarkSummary.comparisons]
      .filter((c) => c.diff_percent > 5)
      .sort((a, b) => b.diff_percent - a.diff_percent)
      .slice(0, 5);
  }, [benchmarkSummary]);

  // All comparisons for the "how you compare" section
  const allComparisons = benchmarkSummary?.has_data ? benchmarkSummary.comparisons.slice(0, 6) : [];

  if (!benchmarkSummary?.has_profile) {
    return (
      <View style={{ paddingTop: 12 }}>
        {/* Unlock peer comparison */}
        <BenchmarkUnlockCard onUnlock={onShowDemographics} />

        {/* Generic tips from top categories */}
        {dashboard && dashboard.category_spending.length > 0 ? (
          <>
            <SectionLabel>{t('WHERE_CUT')}</SectionLabel>
            <ThinCard>
              {dashboard.category_spending.slice(0, 5).map((cat, i) => {
                const saving5pct = cat.total * 0.05;
                const isLast = i === Math.min(dashboard.category_spending.length, 5) - 1;
                return (
                  <View
                    key={cat.category_id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 13,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    }}
                  >
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{cat.category_icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                        {cat.category_name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: colors.textTertiary }}>{t('FIVE_PCT_CUT')}</Text>
                        {hidden ? (
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#34D399' }}>••••/mo</Text>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <CurrencyAmount value={saving5pct} color="#34D399" fontSize={11} fontWeight="600" />
                            <Text style={{ fontSize: 11, color: colors.textTertiary }}>/mo</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {hidden ? (
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.expense }}>••••</Text>
                    ) : (
                      <CurrencyAmount value={cat.total} color={colors.expense} fontSize={15} fontWeight="700" />
                    )}
                  </View>
                );
              })}
            </ThinCard>
          </>
        ) : null}

        {/* Habits as context */}
        {habitInsights && habitInsights.habits.length > 0 ? (
          <>
            <SectionLabel>{t('SPENDING_PATTERNS')}</SectionLabel>
            <FeatureGate feature="advancedHabits">
              <HabitSection insights={habitInsights} />
            </FeatureGate>
          </>
        ) : null}
      </View>
    );
  }

  if (!benchmarkSummary.has_data) {
    return (
      <View style={{ padding: 48, alignItems: 'center' }}>
        <Text style={{ fontSize: 15, color: colors.textTertiary, textAlign: 'center', lineHeight: 22 }}>
          {t('NOT_ENOUGH_DATA')}
        </Text>
      </View>
    );
  }

  const totalPotentialSaving = overspending.reduce((sum, c) => {
    return sum + Math.max(0, c.user_spend - c.benchmark_median) * 0.05;
  }, 0);

  return (
    <View style={{ paddingTop: 16 }}>
      {/* Summary saving potential */}
      {totalPotentialSaving > 0 ? (
        <View
          style={{
            marginHorizontal: 16,
            borderRadius: 18,
            overflow: 'hidden',
            padding: 20,
            backgroundColor: colors.isDark ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.07)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.2)',
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 12, color: '#34D399', fontWeight: '600', marginBottom: 4 }}>
            {t('SAVING_OPPORTUNITY')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TrendingDown size={18} color="#34D399" strokeWidth={2.5} />
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              {t('CUT_OVERSPENDING')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
            {hidden ? (
              <Text style={{ fontSize: 26, fontWeight: '700', color: '#34D399' }}>••••</Text>
            ) : (
              <CurrencyAmount value={totalPotentialSaving} color="#34D399" fontSize={26} fontWeight="700" />
            )}
            <Text style={{ fontSize: 14, color: colors.textTertiary, alignSelf: 'flex-end', marginBottom: 2 }}>
              {t('PER_MONTH')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Where you can save */}
      {overspending.length > 0 ? (
        <>
          <SectionLabel>{t('WHERE_SAVE')}</SectionLabel>
          <ThinCard>
            {overspending.map((item, i) => {
              const potentialSaving = Math.max(0, item.user_spend - item.benchmark_median) * 0.05;
              const isLast = i === overspending.length - 1;
              return (
                <View
                  key={item.category_name}
                  style={{
                    paddingVertical: 14,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>{item.category_icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                        {item.category_name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <TrendingDown size={12} color="#34D399" strokeWidth={2.5} />
                      {hidden ? (
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#34D399' }}>••••</Text>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <CurrencyAmount value={potentialSaving} color="#34D399" fontSize={13} fontWeight="700" />
                          <Text style={{ fontSize: 11, color: colors.textTertiary }}>/mo</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textTertiary, paddingLeft: 26 }}>
                    {t('COMPARED_MORE')}{' '}
                    <Text style={{ fontWeight: '600', color: colors.expense }}>
                      +{Math.round(item.diff_percent)}{t('MORE_PERCENT')}
                    </Text>
                    {' '}{t('MORE_ON_THIS')}
                  </Text>
                </View>
              );
            })}
          </ThinCard>
        </>
      ) : (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 18,
            padding: 24,
            alignItems: 'center',
            backgroundColor: colors.isDark ? 'rgba(52,211,153,0.06)' : 'rgba(52,211,153,0.07)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.2)',
          }}
        >
          <Text style={{ fontSize: 24 }}>🎉</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#34D399', marginTop: 8, textAlign: 'center' }}>
            {t('GREAT_JOB')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textTertiary, marginTop: 4, textAlign: 'center', lineHeight: 20 }}>
            {t('SPENDING_BELOW')}
          </Text>
        </View>
      )}

      {/* How you compare — comparison bars */}
      {allComparisons.length > 0 ? (
        <>
          <SectionLabel>{t('HOW_COMPARE')}</SectionLabel>
          <Text style={{ fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 10, lineHeight: 18 }}>
            {t('HOW_COMPARE_DESC')}
          </Text>
          <ThinCard>
            {allComparisons.map((item, i) => {
              const isLast = i === allComparisons.length - 1;
              return (
                <View
                  key={item.category_name}
                  style={{
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <ComparisonRow item={item} hidden={hidden} />
                </View>
              );
            })}
          </ThinCard>
        </>
      ) : null}

      {/* Habits — spending patterns context */}
      {habitInsights && habitInsights.habits.length > 0 ? (
        <>
          <SectionLabel>{t('SPENDING_PATTERNS')}</SectionLabel>
          <Text style={{ fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, marginBottom: 8, lineHeight: 18 }}>
            {t('SPENDING_PATTERNS_DESC')}
          </Text>
          <FeatureGate feature="advancedHabits">
            <HabitSection insights={habitInsights} />
          </FeatureGate>
        </>
      ) : null}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CARD 3 — SUBSCRIPTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface SubscriptionsCardProps {
  subs: Subscription[];
  hidden: boolean;
  onPress: () => void;
}

function SubscriptionsCard({ subs, hidden, onPress }: SubscriptionsCardProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const active = subs.filter((s) => s.is_active);
  const endOfMonth = thisMonthEnd();

  const thisMonth = active.filter((s) => new Date(s.next_billing_date) <= endOfMonth);
  const thisMonthTotal = thisMonth.reduce((sum, s) => sum + s.amount, 0);

  const previews = active.slice(0, 4);

  return (
    <AnalyticsCard onPress={onPress} accentColor="#38BDF8" delay={180}>
      <CardHeader icon={CreditCard} title={t('SUBSCRIPTIONS')} iconColor="#38BDF8" />

      {/* This month total + count */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 4 }}>{t('THIS_MONTH')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            {hidden ? (
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.expense }}>••••</Text>
            ) : (
              <CurrencyAmount value={thisMonthTotal} color={colors.expense} fontSize={24} fontWeight="700" />
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
            {active.length} {t('ACTIVE')}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
            {thisMonth.length} {t('DUE_THIS_MONTH_SUBS')}
          </Text>
        </View>
      </View>

      {/* Logo previews */}
      {previews.length > 0 ? (
        <>
          <LinearGradient
            colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 1, marginBottom: 14 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {previews.map((sub) => {
              const logo = getPresetLogo(sub.name);
              return (
                <View
                  key={sub.id}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: `${sub.color}18`,
                  }}
                >
                  {logo ? (
                    <Image source={{ uri: logo }} style={{ width: 24, height: 24 }} contentFit="contain" />
                  ) : (
                    <Text style={{ fontSize: 16 }}>{sub.icon}</Text>
                  )}
                </View>
              );
            })}
            {active.length > 4 ? (
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>+{active.length - 4}</Text>
            ) : null}
          </View>
        </>
      ) : subs.length === 0 ? (
        <>
          <LinearGradient
            colors={['transparent', colors.isDark ? 'rgba(100,116,139,0.2)' : 'rgba(203,213,225,0.4)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 1, marginBottom: 12 }}
          />
          <Text style={{ fontSize: 13, color: colors.textTertiary }}>{t('NO_SUBS_YET')}</Text>
        </>
      ) : null}
    </AnalyticsCard>
  );
}

// ─── Subscriptions Sheet Content ──────────────────────────────────────

function SubscriptionsSheetContent({
  subs,
  hidden,
}: {
  subs: Subscription[];
  hidden: boolean;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const active = subs.filter((s) => s.is_active);
  const paused = subs.filter((s) => !s.is_active);
  const endOfMonth = thisMonthEnd();

  const thisMonth = active.filter((s) => new Date(s.next_billing_date) <= endOfMonth);
  const thisMonthTotal = thisMonth.reduce((sum, s) => sum + s.amount, 0);

  const monthlyEquiv = active.reduce((sum, s) => sum + toMonthly(s.amount, s.billing_cycle as BillingCycle), 0);
  const yearlyEquiv = monthlyEquiv * 12;

  const monthly = active.filter((s) => s.billing_cycle === 'monthly');
  const quarterly = active.filter((s) => s.billing_cycle === 'quarterly');
  const yearly = active.filter((s) => s.billing_cycle === 'yearly');

  const sortedActive = useMemo(
    () =>
      subs
        .filter((s) => s.is_active)
        .sort((a, b) => new Date(a.next_billing_date).getTime() - new Date(b.next_billing_date).getTime()),
    [subs],
  );

  if (subs.length === 0) {
    return (
      <View style={{ padding: 48, alignItems: 'center' }}>
        <Text style={{ fontSize: 15, color: colors.textTertiary, textAlign: 'center', lineHeight: 22 }}>
          {t('NO_SUBS_ADDED')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 20 }}>
      {/* This month + yearly stats */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 24 }}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 4 }}>{t('THIS_MONTH')}</Text>
          {hidden ? (
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.expense }}>••••</Text>
          ) : (
            <CurrencyAmount value={thisMonthTotal} color={colors.expense} fontSize={18} fontWeight="700" />
          )}
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 4 }}>{t('PER_YEAR')}</Text>
          {hidden ? (
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.expense }}>••••</Text>
          ) : (
            <CurrencyAmount value={yearlyEquiv} color={colors.expense} fontSize={18} fontWeight="700" />
          )}
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: colors.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 4 }}>Active</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>{active.length}</Text>
        </View>
      </View>

      {/* Billing split */}
      {active.length > 0 ? (
        <>
          <SectionLabel>{t('BILLING_SPLIT')}</SectionLabel>
          <ThinCard>
            {monthly.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: quarterly.length > 0 || yearly.length > 0 ? 1 : 0,
                  borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>{t('MONTHLY_LABEL')} ({monthly.length})</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {hidden ? (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
                  ) : (
                    <CurrencyAmount value={monthly.reduce((s, x) => s + x.amount, 0)} color={colors.expense} fontSize={14} fontWeight="600" />
                  )}
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>/mo</Text>
                </View>
              </View>
            ) : null}
            {quarterly.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: yearly.length > 0 ? 1 : 0,
                  borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                }}
              >
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>{t('QUARTERLY_LABEL')} ({quarterly.length})</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {hidden ? (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
                  ) : (
                    <CurrencyAmount value={quarterly.reduce((s, x) => s + x.amount, 0)} color={colors.expense} fontSize={14} fontWeight="600" />
                  )}
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>/3mo</Text>
                </View>
              </View>
            ) : null}
            {yearly.length > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 12,
                }}
              >
                <Text style={{ fontSize: 14, color: colors.textPrimary }}>{t('YEARLY_LABEL')} ({yearly.length})</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  {hidden ? (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
                  ) : (
                    <CurrencyAmount value={yearly.reduce((s, x) => s + x.amount, 0)} color={colors.expense} fontSize={14} fontWeight="600" />
                  )}
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>/yr</Text>
                </View>
              </View>
            ) : null}
          </ThinCard>
        </>
      ) : null}

      {/* Upcoming billing */}
      {sortedActive.length > 0 ? (
        <>
          <SectionLabel>{t('UPCOMING_BILLING')}</SectionLabel>
          <ThinCard>
            {sortedActive.slice(0, 8).map((sub, i) => {
              const logo = getPresetLogo(sub.name);
              const daysUntil = Math.ceil((new Date(sub.next_billing_date).getTime() - Date.now()) / 86400000);
              const isUrgent = daysUntil <= 7;
              const isLast = i === Math.min(sortedActive.length, 8) - 1;
              const dueDateLabel = daysUntil <= 0 ? t('TODAY') : daysUntil === 1 ? t('TOMORROW') : `${t('IN_DAYS')} ${daysUntil}d`;
              return (
                <View
                  key={sub.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 11,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${sub.color}18`,
                      marginRight: 12,
                    }}
                  >
                    {logo ? (
                      <Image source={{ uri: logo }} style={{ width: 24, height: 24 }} contentFit="contain" />
                    ) : (
                      <Text style={{ fontSize: 17 }}>{sub.icon}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                      {sub.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: isUrgent ? colors.warning : colors.textTertiary, marginTop: 1 }}>
                      {dueDateLabel}
                    </Text>
                  </View>
                  {hidden ? (
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.expense }}>••••</Text>
                  ) : (
                    <CurrencyAmount value={sub.amount} color={colors.expense} fontSize={14} fontWeight="600" />
                  )}
                </View>
              );
            })}
          </ThinCard>
        </>
      ) : null}

      {/* Paused */}
      {paused.length > 0 ? (
        <>
          <SectionLabel>{`${t('PAUSED')} (${paused.length})`}</SectionLabel>
          <ThinCard>
            {paused.map((sub, i) => {
              const logo = getPresetLogo(sub.name);
              const isLast = i === paused.length - 1;
              return (
                <View
                  key={sub.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 11,
                    opacity: 0.55,
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${sub.color}18`,
                      marginRight: 12,
                    }}
                  >
                    {logo ? (
                      <Image source={{ uri: logo }} style={{ width: 24, height: 24 }} contentFit="contain" />
                    ) : (
                      <Text style={{ fontSize: 17 }}>{sub.icon}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>
                      {sub.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1 }}>{t('PAUSED')}</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textTertiary }}>
                    {maskIfHidden(formatCompactNumber(sub.amount), hidden)}
                  </Text>
                </View>
              );
            })}
          </ThinCard>
        </>
      ) : null}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnalyticsContent(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [showDemographics, setShowDemographics] = useState(false);

  // ── Data hooks — ALL unconditional ───────────────────────────────
  const { data: dashboard, isLoading, isError, error, refetch: dashRefetch } = useDashboard(selectedMonth);
  const { data: benchmarkSummary, refetch: benchmarkRefetch } = useBenchmarks(selectedMonth);
  const { data: habitInsights } = useHabitInsights(selectedMonth);
  const { data: rawSubs } = useSubscriptions();
  const { data: goalsSummary } = useGoals(selectedMonth);
  const hidden = usePrivacyStore((s) => s.hidden);

  const subscriptions: Subscription[] = rawSubs ?? [];

  // ── Handlers ─────────────────────────────────────────────────────
  const refetchAll = (): void => {
    impactLight();
    dashRefetch();
    benchmarkRefetch();
  };

  const openSheet = (sheet: ActiveSheet): void => {
    impactLight();
    setActiveSheet(sheet);
  };

  const closeSheet = (): void => setActiveSheet(null);

  const handleShowDemographics = (): void => {
    setActiveSheet(null);
    setShowDemographics(true);
  };

  // ── Early returns (safe: all hooks above) ────────────────────────
  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return <ErrorState message={error?.message ?? STRINGS.ERROR_GENERIC} onRetry={refetchAll} />;
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetchAll} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: colors.textPrimary,
            paddingHorizontal: 16,
            marginBottom: 4,
          }}
        >
          {t('ANALYTICS_TITLE')}
        </Text>

        {/* Month picker */}
        <MonthPicker month={selectedMonth} onMonthChange={setSelectedMonth} />

        {/* ─── Card 1: Money Analysis ─── */}
        {dashboard ? (
          <MoneyAnalysisCard
            dashboard={dashboard}
            habitInsights={habitInsights}
            goalsSummary={goalsSummary}
            hidden={hidden}
            onPress={() => openSheet('money')}
          />
        ) : (
          <AnalyticsCard onPress={() => openSheet('money')} accentColor={colors.primary} delay={60}>
            <CardHeader icon={BarChart3} title={t('MONEY_ANALYSIS')} iconColor={colors.primary} />
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>
              {t('ADD_TXN_ANALYSIS')}
            </Text>
          </AnalyticsCard>
        )}

        {/* ─── Card 2: Saving Tips — gated: Pro / Max ─── */}
        <FeatureGate feature="savingTipsPersonalized" overlayBorderRadius={24}>
          <SavingTipsCard
            benchmarkSummary={benchmarkSummary}
            dashboard={dashboard}
            hidden={hidden}
            onPress={() => openSheet('tips')}
          />
        </FeatureGate>

        {/* ─── Card 3: Subscriptions ─── */}
        <SubscriptionsCard
          subs={subscriptions}
          hidden={hidden}
          onPress={() => openSheet('subscriptions')}
        />
      </ScrollView>

      {/* ─── Money Analysis Sheet ─── */}
      <AnalyticsSheet visible={activeSheet === 'money'} onClose={closeSheet} title={t('MONEY_ANALYSIS')}>
        {activeSheet === 'money' && dashboard ? (
          <MoneyAnalysisSheetContent
            dashboard={dashboard}
            habitInsights={habitInsights}
            goalsSummary={goalsSummary}
            selectedMonth={selectedMonth}
            hidden={hidden}
          />
        ) : activeSheet === 'money' ? (
          <View style={{ padding: 48, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: colors.textTertiary, textAlign: 'center' }}>
              {t('NO_DATA_MONTH')}
            </Text>
          </View>
        ) : null}
      </AnalyticsSheet>

      {/* ─── Saving Tips Sheet ─── */}
      <AnalyticsSheet visible={activeSheet === 'tips'} onClose={closeSheet} title={t('SAVING_TIPS')}>
        {activeSheet === 'tips' ? (
          <SavingTipsSheetContent
            benchmarkSummary={benchmarkSummary}
            dashboard={dashboard}
            habitInsights={habitInsights}
            hidden={hidden}
            onShowDemographics={handleShowDemographics}
          />
        ) : null}
      </AnalyticsSheet>

      {/* ─── Subscriptions Sheet ─── */}
      <AnalyticsSheet visible={activeSheet === 'subscriptions'} onClose={closeSheet} title={t('SUBSCRIPTIONS')}>
        {activeSheet === 'subscriptions' ? (
          <SubscriptionsSheetContent subs={subscriptions} hidden={hidden} />
        ) : null}
      </AnalyticsSheet>

      {/* Demographics editor — outside sheets (no nested Modal issues) */}
      <DemographicsEditor
        visible={showDemographics}
        onClose={() => {
          setShowDemographics(false);
          benchmarkRefetch();
        }}
      />

      {/* Smart Input FAB */}
      <View style={{ position: 'absolute', right: 12, bottom: insets.bottom + 96 }}>
        <SmartInputButton
          onPress={() => {
            impactLight();
            router.push('/(tabs)/smart-input');
          }}
        />
      </View>
    </>
  );
}

export default function AnalyticsScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <AnalyticsContent />
    </ErrorBoundary>
  );
}
