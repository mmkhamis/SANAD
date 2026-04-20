import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import {
  CreditCard,
  Target,
  Users,
  ChevronRight,
  ChevronLeft,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react-native';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { SmartInputFAB } from '../../components/ui/SmartInputFAB';
import { AppScreen } from '../../components/ui/AppScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { HeroCard } from '../../components/ui/HeroCard';
import { ChipIcon, chipIconColor } from '../../components/ui/ChipIcon';
import { GradientDivider } from '../../components/ui/GradientDivider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { useGoals } from '../../hooks/useGoals';
import { useCommunities } from '../../hooks/useCommunity';
import { useCharity } from '../../hooks/useCharity';
import { formatAmount } from '../../utils/currency';
import { COLORS } from '../../constants/colors';
import type { BillingCycle } from '../../services/subscription-service';

function toMonthly(amount: number, cycle: BillingCycle): number {
  if (cycle === 'yearly') return amount / 12;
  if (cycle === 'quarterly') return amount / 3;
  return amount;
}

function FeatureCard({
  children,
  onPress,
  delay = 0,
}: {
  children: React.ReactNode;
  onPress: () => void;
  delay?: number;
}): React.ReactElement {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay)} style={{ marginTop: 12 }}>
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        <HeroCard>{children}</HeroCard>
      </Pressable>
    </Animated.View>
  );
}

function CardHeader({
  chipVariant,
  icon: Icon,
  title,
}: {
  chipVariant: 'purple' | 'green' | 'blue' | 'amber' | 'red';
  icon: React.ElementType;
  title: string;
}): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, isRTL } = useRTL();
  const Chevron = isRTL ? ChevronLeft : ChevronRight;
  return (
    <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
        <ChipIcon variant={chipVariant}>
          <Icon size={17} color={chipIconColor(chipVariant)} strokeWidth={2} />
        </ChipIcon>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{title}</Text>
      </View>
      <Chevron size={17} color={colors.isDark ? COLORS.claude.fg4 : colors.textTertiary} strokeWidth={2} />
    </View>
  );
}

function StatTile({ value, label, valueColor }: { value: string; label: string; valueColor?: string }): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 14,
        backgroundColor: colors.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: valueColor ?? (colors.isDark ? COLORS.claude.fg : colors.textPrimary), letterSpacing: -0.5 }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary, textAlign: 'center', fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function StatusPill({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }): React.ReactElement {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 9999,
        backgroundColor: `${color}20`,
        borderWidth: 1,
        borderColor: `${color}35`,
        gap: 5,
      }}
    >
      <Icon size={11} color={color} strokeWidth={2.5} />
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
    </View>
  );
}

function FeaturesContent(): React.ReactElement {
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const { textAlign, rowDir } = useRTL();

  const { data: subs } = useSubscriptions();
  const { data: goals } = useGoals(format(new Date(), 'yyyy-MM'));
  const { data: communities } = useCommunities();
  const { data: charity } = useCharity();

  const activeSubs = (subs ?? []).filter((s) => s.is_active);
  const pausedSubs = (subs ?? []).filter((s) => !s.is_active);
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + toMonthly(s.amount, s.billing_cycle as BillingCycle), 0);
  const nextSub = [...activeSubs].sort((a, b) => a.next_billing_date.localeCompare(b.next_billing_date))[0];

  const onTrack = goals?.on_track_count ?? 0;
  const exceeded = goals?.exceeded_count ?? 0;
  const nearLimit = goals?.near_limit_count ?? 0;
  const totalGoals = (goals?.goals ?? []).length;

  const communityCount = (communities ?? []).length;
  const totalMembers = (communities ?? []).reduce((sum, c) => sum + (c.members?.length ?? 0), 0);

  return (
    <AppScreen backplate="hero" horizontalPadding={0} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t('FEATURES_HEADER')} subtitle={t('SUBS_TRACK_DESC' as any)} />

        {/* ── Subscriptions ── */}
        <FeatureCard onPress={() => router.push('/(tabs)/subscriptions')} delay={60}>
          <CardHeader chipVariant="purple" icon={CreditCard} title={t('PROFILE_SUBSCRIPTIONS')} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile value={String(activeSubs.length)} label={t('SUBS_ACTIVE')} valueColor={COLORS.claude.p200} />
            <StatTile value={formatAmount(monthlyTotal)} label={t('PER_MONTH_SHORT' as any)} valueColor={colors.expense} />
            <StatTile value={String(pausedSubs.length)} label={t('SUBS_PAUSED_LABEL' as any)} />
          </View>

          {nextSub ? (
            <>
              <GradientDivider style={{ marginVertical: 14 }} />
              <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>{nextSub.icon}</Text>
                  <View>
                    <Text style={{ fontSize: 11, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary, fontWeight: '500' }}>{t('FEATURES_SUBS_NEXT_UP')}</Text>
                    <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary }}>{nextSub.name}</Text>
                  </View>
                </View>
                <View style={{ alignItems: rowDir === 'row-reverse' ? 'flex-start' : 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>{formatAmount(nextSub.amount)}</Text>
                  <Text style={{ fontSize: 11, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}>{nextSub.next_billing_date.slice(0, 10)}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <GradientDivider style={{ marginVertical: 14 }} />
              <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary, textAlign }}>{t('FEATURES_SUBS_NO_ACTIVE')}</Text>
            </>
          )}
        </FeatureCard>

        {/* ── Budget Goals ── */}
        <FeatureCard onPress={() => router.push('/(tabs)/goals')} delay={120}>
          <CardHeader chipVariant="green" icon={Target} title={t('PROFILE_GOALS')} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile value={String(totalGoals)} label={t('GOALS_TOTAL' as any)} />
            <StatTile value={String(onTrack)} label={t('FEATURES_GOALS_ON_TRACK')} valueColor={COLORS.claude.green} />
            <StatTile value={String(exceeded + nearLimit)} label={t('AT_RISK')} valueColor={exceeded + nearLimit > 0 ? COLORS.claude.amber : undefined} />
          </View>

          <GradientDivider style={{ marginVertical: 14 }} />
          {totalGoals > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {onTrack > 0 ? <StatusPill icon={CheckCircle2} label={`${onTrack} ${t('ON_TRACK')}`} color={COLORS.claude.green} /> : null}
              {nearLimit > 0 ? <StatusPill icon={AlertTriangle} label={`${nearLimit} ${t('NEAR_LIMIT' as any)}`} color={COLORS.claude.amber} /> : null}
              {exceeded > 0 ? <StatusPill icon={TrendingDown} label={`${exceeded} ${t('FEATURES_GOALS_EXCEEDED')}`} color={COLORS.claude.red} /> : null}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary, textAlign }}>{t('FEATURES_GOALS_NO_GOALS')}</Text>
          )}
        </FeatureCard>

        {/* ── Charity & Giving ── */}
        <FeatureCard onPress={() => router.push('/(tabs)/charity')} delay={180}>
          <CardHeader chipVariant="green" icon={HeartHandshake} title={t('FEATURES_CHARITY_TITLE')} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile
              value={formatAmount(charity?.given_this_month ?? 0, { compact: true })}
              label={t('FEATURES_CHARITY_THIS_MONTH')}
              valueColor={COLORS.claude.green}
            />
            <StatTile
              value={formatAmount(charity?.given_this_year ?? 0, { compact: true })}
              label={t('FEATURES_CHARITY_THIS_YEAR')}
            />
            <StatTile
              value={String(charity?.donation_count_this_month ?? 0)}
              label={t('FEATURES_CHARITY_DONATIONS')}
            />
          </View>

          <GradientDivider style={{ marginVertical: 14 }} />

          {charity?.goal ? (
            (() => {
              const pct = Math.max(0, Math.min(100, charity.goal.percent_used));
              const barColor =
                charity.goal.status === 'exceeded'
                  ? COLORS.claude.red
                  : charity.goal.status === 'near_limit'
                  ? COLORS.claude.amber
                  : COLORS.claude.green;
              const isOver = charity.goal.status === 'exceeded';
              const remainingValue = isOver ? Math.abs(charity.goal.remaining) : charity.goal.remaining;
              return (
                <View>
                  <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary }}>
                      {t('FEATURES_CHARITY_TARGET')}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary }}>
                      {formatAmount(charity.goal.given)} / {formatAmount(charity.goal.budget_amount)}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: barColor,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 11, color: barColor, fontWeight: '600', marginTop: 6, textAlign }}>
                    {isOver
                      ? `${t('FEATURES_CHARITY_OVER_BY')} ${formatAmount(remainingValue)}`
                      : `${formatAmount(remainingValue)} ${t('FEATURES_CHARITY_REMAINING')}`}
                  </Text>
                </View>
              );
            })()
          ) : (charity?.donation_count_this_month ?? 0) === 0 ? (
            <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary, textAlign }}>
              {t('FEATURES_CHARITY_NO_GIVING')}
            </Text>
          ) : charity?.top_category ? (
            <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{charity.top_category.icon}</Text>
                <View>
                  <Text style={{ fontSize: 11, color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary, fontWeight: '500', textAlign }}>
                    {t('FEATURES_CHARITY_TOP')}
                  </Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '600', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary, textAlign }}>
                    {charity.top_category.category_name}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.claude.green }}>
                {formatAmount(charity.top_category.amount)}
              </Text>
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary, textAlign }}>
              {t('FEATURES_CHARITY_NO_TARGET')}
            </Text>
          )}
        </FeatureCard>

        {/* ── Bill Split ── */}
        <FeatureCard onPress={() => router.push('/(tabs)/community')} delay={240}>
          <CardHeader chipVariant="purple" icon={Users} title={t('PROFILE_BILL_SPLIT')} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile value={String(communityCount)} label={communityCount === 1 ? t('SPLIT_GROUP') : t('SPLIT_GROUPS')} valueColor={COLORS.claude.p200} />
            <StatTile value={String(totalMembers)} label={t('FEATURES_SPLIT_MEMBERS' as any)} />
          </View>

          <GradientDivider style={{ marginVertical: 14 }} />
          <Text style={{ fontSize: 13, color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary, textAlign }}>
            {communityCount === 0
              ? t('FEATURES_SPLIT_NO_GROUPS')
              : `${communityCount} ${communityCount === 1 ? t('SPLIT_GROUP') : t('SPLIT_GROUPS')} · ${totalMembers} ${t('FEATURES_SPLIT_MEMBERS' as any)}`}
          </Text>
        </FeatureCard>

      </ScrollView>

      <SmartInputFAB
        style={{ right: 12, bottom: 96 }}
        onPress={() => router.push('/(tabs)/smart-input')}
        onVoice={() => router.push('/(tabs)/smart-input?mode=voice')}
        onScan={() => router.push('/(tabs)/smart-input?mode=scan')}
        onManual={() => router.push('/(tabs)/smart-input?mode=manual')}
      />
    </AppScreen>
  );
}

export default function FeaturesScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <FeaturesContent />
    </ErrorBoundary>
  );
}
