import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { HeartHandshake, Plus, Target } from 'lucide-react-native';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { AppScreen } from '../../components/ui/AppScreen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { ChipIcon, chipIconColor } from '../../components/ui/ChipIcon';
import { GradientDivider } from '../../components/ui/GradientDivider';
import { EmptyState } from '../../components/ui/EmptyState';
import { TransactionCard } from '../../components/finance/TransactionCard';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { useT } from '../../lib/i18n';
import { useCharity } from '../../hooks/useCharity';
import { useDeleteTransaction } from '../../hooks/useTransactions';
import { formatAmount, formatCompactAmount } from '../../utils/currency';
import { impactLight, impactMedium } from '../../utils/haptics';
import { COLORS } from '../../constants/colors';
import type { Transaction } from '../../types/index';

function StatTile({
  value,
  label,
  valueColor,
}: {
  value: string;
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
        paddingHorizontal: 8,
        borderRadius: 14,
        backgroundColor: colors.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        gap: 4,
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: valueColor ?? (colors.isDark ? COLORS.claude.fg : colors.textPrimary),
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 11,
          color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
          textAlign: 'center',
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function CharityContent(): React.ReactElement {
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const { textAlign, rowDir } = useRTL();
  const { data: charity, isLoading, refetch } = useCharity();
  const { mutate: deleteTransactionMutate } = useDeleteTransaction();

  const handleAddDonation = useCallback((): void => {
    impactMedium();
    router.push('/(tabs)/smart-input?mode=manual');
  }, [router]);

  const handleEditTx = useCallback((_tx: Transaction): void => {
    impactLight();
    router.push('/(tabs)/transactions');
  }, [router]);

  const handleDeleteTx = useCallback((id: string): void => {
    deleteTransactionMutate(id);
  }, [deleteTransactionMutate]);

  const handleSplitTx = useCallback((tx: Transaction): void => {
    router.push(`/(tabs)/create-split-event?prefillTitle=${encodeURIComponent(tx.description)}&prefillAmount=${tx.amount}`);
  }, [router]);

  const dailyTrend = charity?.daily_trend ?? [];
  const maxVal = Math.max(...dailyTrend.map((p) => p.value), 1);
  const lineData = dailyTrend.map((pt) => ({
    value: pt.value,
    label: pt.label,
    dataPointText: pt.value > 0 ? formatCompactAmount(pt.value) : '',
  }));
  const lineColor = COLORS.claude.green;
  const pointColor = colors.isDark ? '#FFFFFF' : COLORS.claude.green;

  const hasGiving = (charity?.donation_count_this_month ?? 0) > 0;

  return (
    <AppScreen backplate="hero" horizontalPadding={0} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title={t('CHARITY_SCREEN_TITLE')} backable onBack={() => router.back()} />

        {/* ── Stats hero card ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 4 }}>
          <Card style={{ marginHorizontal: 16 }}>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <ChipIcon variant="green">
                <HeartHandshake size={17} color={chipIconColor('green')} strokeWidth={2} />
              </ChipIcon>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign }}>
                {t('FEATURES_CHARITY_TITLE')}
              </Text>
            </View>

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

            {/* ── Goal / progress ── */}
            <GradientDivider style={{ marginVertical: 14 }} />
            {charity?.goal ? (() => {
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
                  <View
                    style={{
                      flexDirection: rowDir,
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
                      }}
                    >
                      {t('FEATURES_CHARITY_TARGET')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: colors.isDark ? COLORS.claude.fg : colors.textPrimary,
                      }}
                    >
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
                  <Text
                    style={{
                      fontSize: 11,
                      color: barColor,
                      fontWeight: '600',
                      marginTop: 6,
                      textAlign,
                    }}
                  >
                    {isOver
                      ? `${t('FEATURES_CHARITY_OVER_BY')} ${formatAmount(remainingValue)}`
                      : `${formatAmount(remainingValue)} ${t('FEATURES_CHARITY_REMAINING')}`}
                  </Text>
                </View>
              );
            })() : (
              <Pressable
                onPress={() => {
                  impactLight();
                  router.push('/(tabs)/goals');
                }}
                style={({ pressed }) => ({
                  flexDirection: rowDir,
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: colors.isDark
                    ? 'rgba(78,203,151,0.12)'
                    : 'rgba(22,163,74,0.08)',
                  borderWidth: 1,
                  borderColor: colors.isDark
                    ? 'rgba(78,203,151,0.25)'
                    : 'rgba(22,163,74,0.18)',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Target size={16} color={COLORS.claude.green} strokeWidth={2.2} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: COLORS.claude.green,
                      textAlign,
                    }}
                  >
                    {t('CHARITY_SET_TARGET_CTA')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary,
                      marginTop: 2,
                      textAlign,
                    }}
                  >
                    {t('CHARITY_TARGET_HINT')}
                  </Text>
                </View>
              </Pressable>
            )}
          </Card>
        </Animated.View>

        {/* ── Daily trend chart ── */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={{ marginTop: 12 }}>
          <View
            style={{
              marginHorizontal: 16,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.isDark ? COLORS.claude.stroke : colors.glassBorder,
            }}
          >
            <LinearGradient
              colors={
                colors.isDark
                  ? [COLORS.claude.glass1, COLORS.claude.glass2, COLORS.claude.glass1]
                  : ['#FFFFFF', '#F4F6F8', '#FFFFFF']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20 }}
            >
              <View
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: colors.isDark
                        ? 'rgba(78,203,151,0.15)'
                        : 'rgba(22,163,74,0.12)',
                    }}
                  >
                    <HeartHandshake size={16} color={COLORS.claude.green} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign }}>
                      {t('CHARITY_DAILY_TREND')}
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: colors.isDark ? '#FFFFFF' : colors.textPrimary,
                        textAlign,
                      }}
                    >
                      {formatCompactAmount(charity?.given_this_month ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {isLoading ? (
                <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator color={COLORS.claude.green} />
                </View>
              ) : lineData.length === 0 ? (
                <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                    {t('FEATURES_CHARITY_NO_GIVING')}
                  </Text>
                </View>
              ) : (
                <View style={{ marginLeft: -8 }}>
                  <LineChart
                    data={lineData}
                    color={lineColor}
                    thickness={2.5}
                    spacing={16}
                    noOfSections={4}
                    maxValue={maxVal * 1.2}
                    areaChart
                    startFillColor={lineColor + '25'}
                    endFillColor={lineColor + '05'}
                    startOpacity={0.3}
                    endOpacity={0.05}
                    dataPointsColor={pointColor}
                    dataPointsRadius={4}
                    textColor={colors.textTertiary}
                    textFontSize={8}
                    textShiftY={-10}
                    textShiftX={-8}
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={colors.isDark ? COLORS.claude.stroke : colors.borderLight}
                    yAxisTextStyle={{
                      fontSize: 9,
                      color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
                    }}
                    xAxisLabelTextStyle={{
                      fontSize: 8,
                      color: colors.isDark ? COLORS.claude.fg4 : colors.textTertiary,
                    }}
                    rulesType="dashed"
                    rulesColor={colors.isDark ? COLORS.claude.stroke : 'rgba(0,0,0,0.04)'}
                    dashWidth={4}
                    dashGap={4}
                    height={140}
                    curved
                    curvature={0.2}
                    animationDuration={0}
                    isAnimated={false}
                    initialSpacing={14}
                    endSpacing={14}
                    hideDataPoints={false}
                    formatYLabel={(val: string) => formatCompactAmount(Number(val))}
                  />
                </View>
              )}
            </LinearGradient>
          </View>
        </Animated.View>

        {/* ── Recent donations ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              textAlign,
            }}
          >
            {t('CHARITY_RECENT')}
          </Text>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !hasGiving ? (
          <View style={{ paddingHorizontal: 16 }}>
            <EmptyState
              icon={<HeartHandshake size={40} color={COLORS.claude.green} strokeWidth={1.5} />}
              title={t('CHARITY_EMPTY_HEADLINE')}
              description={t('CHARITY_EMPTY_DESC')}
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            {(charity?.transactions ?? []).map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                onEdit={handleEditTx}
                onDelete={handleDeleteTx}
                onSplit={handleSplitTx}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Add donation FAB ── */}
      <Pressable
        onPress={handleAddDonation}
        style={({ pressed }) => ({
          position: 'absolute',
          bottom: 24,
          end: 20,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: 9999,
          backgroundColor: COLORS.claude.green,
          flexDirection: rowDir,
          alignItems: 'center',
          gap: 8,
          shadowColor: COLORS.claude.green,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
          {t('CHARITY_ADD_DONATION')}
        </Text>
      </Pressable>
    </AppScreen>
  );
}

export default function CharityScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <CharityContent />
    </ErrorBoundary>
  );
}
