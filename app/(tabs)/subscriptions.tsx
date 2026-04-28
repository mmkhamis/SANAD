import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X, Trash2, CreditCard, Pause, Play, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { SmartInputButton } from '../../components/ui/SmartInputButton';
import { formatAmount } from '../../utils/currency';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { HorizonSelector, type HorizonMonths } from '../../components/ui/HorizonSelector';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import {
  useSubscriptions,
  useCreateSubscription,
  useDeleteSubscription,
  useToggleSubscription,
  useMarkSubscriptionPaid,
} from '../../hooks/useSubscriptions';
import {
  SUBSCRIPTION_PRESETS,
  SUBSCRIPTION_CATEGORIES,
  getSubscriptionDisplayName,
  getSubscriptionPreset,
  getSubscriptionPresetByKey,
  resolveSubscriptionProviderKey,
  type Subscription,
  type BillingCycle,
  type SubscriptionPreset,
  type CreateSubscriptionInput,
} from '../../services/subscription-service';
import { SubscriptionCard } from '../../components/finance/SubscriptionCard';
import { format, setDate, addMonths, parseISO } from 'date-fns';

// ─── Billing cycle labels ────────────────────────────────────────────

const CYCLE_OPTIONS: { key: BillingCycle; labelKey: string; shortKey: string }[] = [
  { key: 'monthly', labelKey: 'SUBS_BILLING_MONTHLY', shortKey: 'SUBS_BILLING_MONTHLY_SHORT' },
  { key: 'quarterly', labelKey: 'SUBS_BILLING_QUARTERLY', shortKey: 'SUBS_BILLING_QUARTERLY_SHORT' },
  { key: 'yearly', labelKey: 'SUBS_BILLING_YEARLY', shortKey: 'SUBS_BILLING_YEARLY_SHORT' },
];

function cycleMultiplier(cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly': return 1;
    case 'quarterly': return 4;
    case 'yearly': return 12;
  }
}

function normalizeArabicDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function parseLocalizedInt(text: string): number {
  return parseInt(normalizeArabicDigits(text), 10);
}

function getInitialBillingDate(now: Date = new Date()): { day: string; month: string; year: string } {
  let nextDate = setDate(now, 1);
  if (nextDate <= now) {
    nextDate = setDate(new Date(now.getFullYear(), now.getMonth() + 1, 1), 1);
  }

  return {
    day: String(nextDate.getDate()),
    month: String(nextDate.getMonth() + 1),
    year: String(nextDate.getFullYear()),
  };
}

// ─── Add Subscription Modal ──────────────────────────────────────────

function AddSubscriptionModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const { hPad } = useResponsive();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL, rowDir, textAlign } = useRTL();
  const { mutateAsync, isPending } = useCreateSubscription();
  const initialBillingDate = useMemo(() => getInitialBillingDate(), []);

  const [step, setStep] = useState<'preset' | 'form'>('preset');
  const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📱');
  const [color, setColor] = useState('#6B7280');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [billingDay, setBillingDay] = useState(initialBillingDate.day);
  const [billingMonth, setBillingMonth] = useState(initialBillingDate.month);
  const [billingYear, setBillingYear] = useState(initialBillingDate.year);
  const [category, setCategory] = useState('Other');
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const reset = (): void => {
    setStep('preset');
    setSelectedProviderKey(null);
    setName('');
    setIcon('📱');
    setColor('#6B7280');
    setAmount('');
    setCycle('monthly');
    setBillingDay(initialBillingDate.day);
    setBillingMonth(initialBillingDate.month);
    setBillingYear(initialBillingDate.year);
    setCategory('Other');
    setFilterCat(null);
  };

  const handlePresetSelect = (preset: SubscriptionPreset): void => {
    impactLight();
    setSelectedProviderKey(preset.key);
    setName(isRTL ? preset.nameAr : preset.name);
    setIcon(preset.icon);
    setColor(preset.color);
    setCategory(preset.category);
    setStep('form');
  };

  const handleCustom = (): void => {
    impactLight();
    setSelectedProviderKey(null);
    setStep('form');
  };

  const previewPreset = useMemo(() => (
    getSubscriptionPreset({ provider_key: selectedProviderKey, name })
  ), [name, selectedProviderKey]);

  const handleSave = async (): Promise<void> => {
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt <= 0) return;
    const day = parseLocalizedInt(billingDay);
    const month = parseLocalizedInt(billingMonth);
    const year = parseLocalizedInt(billingYear);
    if (
      Number.isNaN(day) || day < 1 || day > 31 ||
      Number.isNaN(month) || month < 1 || month > 12 ||
      Number.isNaN(year) || year < 2000 || year > 2100
    ) {
      Alert.alert(t('ERROR_TITLE'), t('SUBS_INVALID_DATE' as any));
      return;
    }

    impactMedium();
    const nextDate = new Date(year, month - 1, day);
    const isExactDate = nextDate.getFullYear() === year
      && nextDate.getMonth() === month - 1
      && nextDate.getDate() === day;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isExactDate || nextDate < today) {
      Alert.alert(t('ERROR_TITLE'), t('SUBS_INVALID_DATE' as any));
      return;
    }

    const trimmedName = name.trim();
    const providerKey = selectedProviderKey ?? resolveSubscriptionProviderKey(trimmedName);
    const matchedPreset = getSubscriptionPresetByKey(providerKey);

    const input: CreateSubscriptionInput = {
      name: matchedPreset?.name ?? trimmedName,
      provider_key: providerKey,
      icon: matchedPreset?.icon ?? icon,
      color: matchedPreset?.color ?? color,
      amount: amt,
      billing_cycle: cycle,
      next_billing_date: format(nextDate, 'yyyy-MM-dd'),
      category: matchedPreset?.category ?? category,
    };

    try {
      await mutateAsync(input);
      notifySuccess();
      reset();
      onClose();
    } catch {
      // handled by hook
    }
  };

  const filteredPresets = filterCat
    ? SUBSCRIPTION_PRESETS.filter((p) => p.category === filterCat)
    : SUBSCRIPTION_PRESETS;

  const catLabel = (cat: string): string => {
    const key = `SUB_CAT_${cat.toUpperCase()}` as const;
    const translated = t(key as any);
    // t() returns the key itself when missing; fall back to original category
    return translated === key ? cat : translated;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 pb-3"
          style={{ paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <Pressable onPress={() => { reset(); onClose(); }} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {step === 'preset' ? t('SUBS_CHOOSE' as any) : t('SUBS_DETAILS' as any)}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {step === 'preset' ? (
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}>
            {/* Category filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() => setFilterCat(null)}
                className="rounded-lg px-3 py-2 mr-2"
                style={{ backgroundColor: !filterCat ? colors.primary : colors.surfaceSecondary }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: !filterCat ? '#fff' : colors.textSecondary }}>{t('ALL_FILTER' as any)}</Text>
              </Pressable>
              {SUBSCRIPTION_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setFilterCat(cat === filterCat ? null : cat)}
                  className="rounded-lg px-3 py-2 mr-2"
                  style={{ backgroundColor: filterCat === cat ? colors.primary : colors.surfaceSecondary }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: filterCat === cat ? '#fff' : colors.textSecondary }}>{catLabel(cat)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Preset grid */}
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {filteredPresets.map((preset) => (
                <Pressable
                  key={preset.key}
                  onPress={() => handlePresetSelect(preset)}
                  className="items-center rounded-xl px-3 py-3"
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, width: '31%' }}
                >
                  {preset.logo ? (
                    <Image
                      source={{ uri: preset.logo }}
                      style={{ width: 32, height: 32, marginBottom: 4, borderRadius: 4 }}
                      contentFit="contain"
                    />
                  ) : (
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>{preset.icon}</Text>
                  )}
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' }}>
                    {isRTL ? preset.nameAr : preset.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Custom button */}
            <Pressable
              onPress={handleCustom}
              className="flex-row items-center justify-center rounded-xl py-4 mt-4"
              style={{ backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '30' }}
            >
              <Plus size={18} color={colors.primary} strokeWidth={2.5} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.primary, marginLeft: 8 }}>
                {t('SUBS_CUSTOM' as any)}
              </Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: 20, paddingBottom: insets.bottom + 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Preview */}
            <View className="items-center mb-6">
              <View className="h-16 w-16 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: color + '20' }}>
                {previewPreset?.logo ? (
                  <Image source={{ uri: previewPreset.logo }} style={{ width: 36, height: 36, borderRadius: 6 }} contentFit="contain" />
                ) : (
                  <Text style={{ fontSize: 32 }}>{icon}</Text>
                )}
              </View>
              {name ? (
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
                  {previewPreset ? getSubscriptionDisplayName(previewPreset, isRTL) : name}
                </Text>
              ) : null}
            </View>

            {/* Name */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>{t('SUBS_FORM_NAME' as any)}</Text>
            <TextInput
              value={name}
              onChangeText={(next) => {
                setName(next);
                setSelectedProviderKey(resolveSubscriptionProviderKey(next));
              }}
              placeholder={t('SUBS_PLACEHOLDER_NAME' as any)}
              placeholderTextColor={colors.textTertiary}
              className="rounded-xl px-4 mb-5"
              style={{ height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.textPrimary }}
            />

            {/* Amount */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>{t('SUBS_FORM_AMOUNT' as any)}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={t('SUBS_PLACEHOLDER_AMOUNT' as any)}
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              className="rounded-xl px-4 mb-5"
              style={{ height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.textPrimary }}
            />

            {/* Billing cycle */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>{t('SUBS_FORM_CYCLE' as any)}</Text>
            <View className="flex-row mb-5" style={{ gap: 8 }}>
              {CYCLE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setCycle(opt.key)}
                  className="flex-1 items-center rounded-xl py-3"
                  style={{
                    backgroundColor: cycle === opt.key ? colors.primary + '15' : colors.surface,
                    borderWidth: 1.5,
                    borderColor: cycle === opt.key ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: cycle === opt.key ? colors.primary : colors.textSecondary }}>
                    {t(opt.labelKey as any)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>{t('SUBS_FORM_NEXT_BILLING' as any)}</Text>
            <View style={{ flexDirection: rowDir, gap: 8, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, textAlign }}>{t('SUBS_FORM_DAY' as any)}</Text>
                <TextInput
                  value={billingDay}
                  onChangeText={setBillingDay}
                  placeholder={t('SUBS_PLACEHOLDER_DAY' as any)}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  className="rounded-xl px-4"
                  style={{ height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.textPrimary, textAlign }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, textAlign }}>{t('SUBS_FORM_MONTH' as any)}</Text>
                <TextInput
                  value={billingMonth}
                  onChangeText={setBillingMonth}
                  placeholder={t('SUBS_PLACEHOLDER_MONTH' as any)}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  className="rounded-xl px-4"
                  style={{ height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.textPrimary, textAlign }}
                />
              </View>
              <View style={{ flex: 1.2 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, textAlign }}>{t('SUBS_FORM_YEAR' as any)}</Text>
                <TextInput
                  value={billingYear}
                  onChangeText={setBillingYear}
                  placeholder={t('SUBS_PLACEHOLDER_YEAR' as any)}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  className="rounded-xl px-4"
                  style={{ height: 48, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.textPrimary, textAlign }}
                />
              </View>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>{t('SUBS_FORM_CATEGORY' as any)}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
              {SUBSCRIPTION_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className="rounded-lg px-3 py-2 mr-2"
                  style={{ backgroundColor: category === cat ? colors.primary : colors.surfaceSecondary }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: category === cat ? '#fff' : colors.textSecondary }}>{catLabel(cat)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Save */}
            <Pressable
              onPress={handleSave}
              disabled={isPending || !name.trim() || !amount}
              className="rounded-xl items-center justify-center"
              style={{ backgroundColor: name.trim() && amount ? colors.primary : colors.border, height: 52, opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>{t('SUBS_ADD_SUB' as any)}</Text>
              )}
            </Pressable>

            {/* Back to presets */}
            <Pressable onPress={() => setStep('preset')} className="items-center mt-4">
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '500' }}>{t('SUBS_BACK_PRESETS' as any)}</Text>
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────

function SubscriptionsContent(): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { textAlign, rowDir } = useRTL();
  const { data: subs, isLoading, isError, error, refetch } = useSubscriptions();
  const { mutateAsync: deleteSub } = useDeleteSubscription();
  const { mutateAsync: toggleSub } = useToggleSubscription();
  const { mutateAsync: markPaidAsync } = useMarkSubscriptionPaid();
  const [showAdd, setShowAdd] = useState(false);
  const [horizon, setHorizon] = useState<HorizonMonths>(1);
  const [customHorizonMonth, setCustomHorizonMonth] = useState<string | null>(null);
  const hidden = usePrivacyStore((s) => s.hidden);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(t('SUBS_DELETE_TITLE' as any), t('SUBS_DELETE_CONFIRM' as any), [
      { text: t('CANCEL'), style: 'cancel' },
      {
        text: t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          impactMedium();
          try { await deleteSub(id); notifySuccess(); } catch {}
        },
      },
    ]);
  }, [deleteSub]);

  const handleToggle = useCallback(async (id: string, active: boolean) => {
    impactLight();
    try { await toggleSub({ id, isActive: active }); } catch {}
  }, [toggleSub]);

  const handleMarkPaid = useCallback((id: string) => {
    Alert.alert(t('SUBS_MARK_PAID_TITLE' as any), t('SUBS_MARK_PAID_CONFIRM' as any), [
      { text: t('CANCEL'), style: 'cancel' },
      {
        text: t('SUBS_PAID' as any),
        onPress: async () => {
          impactMedium();
          try { await markPaidAsync(id); notifySuccess(); } catch {}
        },
      },
    ]);
  }, [markPaidAsync]);

  const items = subs ?? [];
  const active = items.filter((s) => s.is_active);
  const paused = items.filter((s) => !s.is_active);
  const totalMonthly = active.reduce((sum, s) => sum + s.amount / cycleMultiplier(s.billing_cycle as BillingCycle), 0);

  // Split active subs into "billing this month" vs "upcoming" (horizon-filtered)
  const now = new Date();
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const horizonEnd = useMemo(() => {
    if (horizon === 'custom' && customHorizonMonth) {
      // End of the picked month so subs billing on the last day are included.
      const d = new Date(`${customHorizonMonth}-01`);
      return new Date(d.getFullYear(), d.getMonth() + 1, 0);
    }
    return addMonths(new Date(), horizon === 'custom' ? 1 : horizon);
  }, [horizon, customHorizonMonth]);
  const thisMonth = active.filter((s) => {
    const d = new Date(s.next_billing_date);
    return d <= currentMonthEnd;
  });
  const upcoming = useMemo(() => active.filter((s) => {
    const d = new Date(s.next_billing_date);
    return d > currentMonthEnd && d <= horizonEnd;
  }), [active, currentMonthEnd, horizonEnd]);
  const thisMonthTotal = thisMonth.reduce((sum, s) => sum + s.amount, 0);
  const upcomingTotal = upcoming.reduce((sum, s) => sum + s.amount, 0);

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorState message={error?.message ?? 'Failed to load'} onRetry={refetch} />;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 mb-1" style={{ flexDirection: rowDir }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary, textAlign }}>
            {t('SUBS_HEADER' as any)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable onPress={() => { impactLight(); setShowAdd(true); }} style={{ padding: 6 }}>
              <Plus size={22} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
            <Pressable onPress={() => { impactLight(); togglePrivacy(); }} style={{ padding: 6 }}>
              {hidden
                ? <EyeOff size={22} color={colors.textTertiary} strokeWidth={2} />
                : <Eye size={22} color={colors.textTertiary} strokeWidth={2} />
              }
            </Pressable>
          </View>
        </View>
        <Text className="px-4 mb-4" style={{ fontSize: 14, color: colors.textSecondary }}>
          {t('SUBS_TRACK_DESC' as any)}
        </Text>

        {/* Monthly total */}
        <View className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ borderWidth: 1, borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)', shadowColor: colors.isDark ? '#8B5CF6' : '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: colors.isDark ? 0.15 : 0.06, shadowRadius: 16, elevation: 5 }}>
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
            <View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 }}>{t('SUBS_MONTHLY_TOTAL_LABEL' as any)}</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: colors.expense }}>
                {maskIfHidden(formatAmount(totalMonthly), hidden)}<Text style={{ fontSize: 14, fontWeight: '500', color: colors.textTertiary }}>/mo</Text>
              </Text>
              <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 4 }}>
                {active.length} {t('SUBS_ACTIVE_PAUSED' as any)} · {paused.length} {t('SUBS_PAUSED_LABEL' as any)}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Add button */}
        <Pressable
          onPress={() => { impactLight(); setShowAdd(true); }}
          className="mx-4 mb-4 rounded-xl items-center justify-center flex-row"
          style={{ height: 44, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '30' }}
        >
          <Plus size={16} color={colors.primary} strokeWidth={2.5} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginLeft: 6 }}>
            {t('SUBS_ADD_SUB' as any)}
          </Text>
        </Pressable>

        {items.length === 0 ? (
          <EmptyState
            title={t('SUBS_NO_YET' as any)}
            description={t('SUBS_NO_YET_DESC' as any)}
            icon={<CreditCard size={48} color={colors.textTertiary} strokeWidth={1.5} />}
          />
        ) : (
          <>
            {/* This Month */}
            {thisMonth.length > 0 ? (
              <>
                <View className="flex-row items-center justify-between px-4 mb-2 mt-2">
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {t('SUBS_DUE_THIS_MONTH' as any)} ({thisMonth.length})
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.expense }}>
                    {maskIfHidden(formatAmount(thisMonthTotal), hidden)}
                  </Text>
                </View>
                {thisMonth.map((sub) => (
                  <SubscriptionCard key={sub.id} sub={sub} onDelete={handleDelete} onToggle={handleToggle} onMarkPaid={handleMarkPaid} />
                ))}
              </>
            ) : null}

            {/* Upcoming — with horizon selector */}
            {active.length > 0 ? (
              <>
                <View className="px-4 mt-4 mb-2">
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    {t('SUBS_UPCOMING' as any)}
                  </Text>
                  <HorizonSelector
                    selected={horizon}
                    onChange={setHorizon}
                    customMonth={customHorizonMonth}
                    onCustomMonthChange={setCustomHorizonMonth}
                  />
                </View>
                {upcoming.length > 0 ? (
                  <>
                    <View className="flex-row items-center justify-between px-4 mb-2 mt-1">
                      <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                        {upcoming.length} {t('PAYMENTS_IN_NEXT' as any)} {horizon} {horizon !== 1 ? t('MONTHS_PLURAL' as any) : t('MONTH_SINGULAR' as any)}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.expense }}>
                        {maskIfHidden(formatAmount(upcomingTotal), hidden)}
                      </Text>
                    </View>
                    {upcoming.map((sub) => (
                      <SubscriptionCard key={sub.id} sub={sub} onDelete={handleDelete} onToggle={handleToggle} onMarkPaid={handleMarkPaid} />
                    ))}
                  </>
                ) : (
                  <View className="mx-4 mt-1 rounded-xl p-4 items-center" style={{ backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder }}>
                    <Text style={{ fontSize: 13, color: colors.textTertiary }}>
                      {t('SUBS_NO_UPCOMING' as any)}
                    </Text>
                  </View>
                )}
              </>
            ) : null}

            {/* Paused */}
            {paused.length > 0 ? (
              <>
                <Text className="px-4 mb-2 mt-4" style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t('SUBS_PAUSED_SECTION' as any)} ({paused.length})
                </Text>
                {paused.map((sub) => (
                  <SubscriptionCard key={sub.id} sub={sub} onDelete={handleDelete} onToggle={handleToggle} onMarkPaid={handleMarkPaid} />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <AddSubscriptionModal visible={showAdd} onClose={() => setShowAdd(false)} />

      {/* Smart Input Button */}
      <View style={{ position: 'absolute', right: 12, bottom: insets.bottom + 96 }}>
        <SmartInputButton
          onPress={() => {
            impactLight();
            router.push('/(tabs)/smart-input');
          }}
        />
      </View>
    </View>
  );
}

export default function SubscriptionsScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <SubscriptionsContent />
    </ErrorBoundary>
  );
}
