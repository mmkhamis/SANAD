import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Mic,
  X,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  EyeOff,
  Users,
} from 'lucide-react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  parseISO,
} from 'date-fns';

import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { formatShortDate, formatShortMonthYear, formatMonthYear, formatLongDate, getDayLabels } from '../../utils/locale-format';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { SmartInputButton } from '../../components/ui/SmartInputButton';
import { DateRangeFilter, getDefaultRange, type DateRange, type DatePreset } from '../../components/ui/DateRangeFilter';
import { TransactionRow } from '../../components/finance/TransactionRow';
import { TransactionCard } from '../../components/finance/TransactionCard';
import { SwipeableTransactionRow } from '../../components/finance/SwipeableTransactionRow';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { AccountPicker } from '../../components/finance/AccountPicker';
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from '../../hooks/useTransactions';
import { fetchTransactionById } from '../../services/transaction-service';
import { useUnreviewedTransactions } from '../../hooks/useReviewTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useCommunities, useCreateCommunity } from '../../hooks/useCommunity';
import { formatAmount } from '../../utils/currency';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { useRTL } from '../../hooks/useRTL';
import { STRINGS } from '../../constants/strings';
import { useT } from '../../lib/i18n';
import type { Transaction, TransactionType, Category, Account } from '../../types/index';

// ─── Filter tabs ─────────────────────────────────────────────────────

type FilterTab = 'all' | TransactionType;

const FILTER_TAB_KEYS: { key: FilterTab; labelKey: 'FILTER_ALL' | 'FILTER_EXPENSES' | 'FILTER_INCOME' | 'FILTER_TRANSFERS' }[] = [
  { key: 'all', labelKey: 'FILTER_ALL' },
  { key: 'expense', labelKey: 'FILTER_EXPENSES' },
  { key: 'income', labelKey: 'FILTER_INCOME' },
  { key: 'transfer', labelKey: 'FILTER_TRANSFERS' },
];

import { COLORS } from '../../constants/colors';

// ─── Type toggle (matches smart-input) ───────────────────────────────

const TYPE_OPTION_KEYS: { key: TransactionType; labelKey: 'EXPENSE' | 'INCOME' | 'TRANSFER'; color: string }[] = [
  { key: 'expense', labelKey: 'EXPENSE', color: COLORS.expense },
  { key: 'income', labelKey: 'INCOME', color: COLORS.income },
  { key: 'transfer', labelKey: 'TRANSFER', color: COLORS.info },
];

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (v: TransactionType) => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  return (
    <View className="flex-row rounded-xl p-1" style={{ backgroundColor: colors.surfaceSecondary }}>
      {TYPE_OPTION_KEYS.map((opt) => {
        const active = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => { impactLight(); onChange(opt.key); }}
            className="flex-1 items-center justify-center rounded-lg py-2.5"
            style={{ backgroundColor: active ? colors.surface : 'transparent' }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: active ? opt.color : colors.textTertiary }}>
              {t(opt.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Edit Transaction Modal (smart-input style) ─────────────────────

function EditTransactionModal({
  visible,
  transaction,
  onClose,
}: {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const { hPad } = useResponsive();
  const t = useT();
  const { textAlign, rowDir } = useRTL();
  const insets = useSafeAreaInsets();
  const { mutateAsync, isPending } = useUpdateTransaction();
  const { data: categories } = useCategories();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [excludeFromInsights, setExcludeFromInsights] = useState(false);

  // Sync form when transaction changes
  React.useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(Math.abs(transaction.amount)));
      setType(transaction.type);
      const cat = categories?.find((c) => c.id === transaction.category_id) ?? null;
      setSelectedCategory(cat);
      setSelectedAccountId(transaction.account_id);
      setMerchant(transaction.merchant ?? '');
      setDate(transaction.date ? transaction.date.slice(0, 10) : '');
      setNotes(transaction.notes ?? '');
      setExcludeFromInsights(transaction.exclude_from_insights ?? false);
    }
  }, [transaction, categories]);

  const typeColor = type === 'income' ? colors.income : type === 'transfer' ? colors.info : colors.expense;

  const handleSave = async (): Promise<void> => {
    if (!transaction) return;
    const amt = parseFloat(amount);
    if (!description.trim() || isNaN(amt) || amt <= 0) return;

    impactMedium();
    try {
      await mutateAsync({
        id: transaction.id,
        description: description.trim(),
        amount: amt,
        type,
        account_id: selectedAccountId,
        category_id: selectedCategory?.id ?? null,
        category_name: selectedCategory?.name ?? null,
        category_icon: selectedCategory?.icon ?? null,
        category_color: selectedCategory?.color ?? null,
        merchant: merchant.trim() || null,
        date: date || undefined,
        notes: notes.trim() || null,
        exclude_from_insights: excludeFromInsights,
      });
      notifySuccess();
      onClose();
    } catch {
      // handled by hook
    }
  };

  const handleAccountSelect = useCallback((acc: Account): void => {
    setSelectedAccountId(acc.id);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: colors.background }}
      >
        {/* Header */}
        <View
          style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 8 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {t('EDIT_TRANSACTION' as any)}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: hPad, paddingTop: 20, paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Amount */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>{t('AMOUNT')}</Text>
          <View className="rounded-xl px-4 mb-4" style={{ backgroundColor: colors.surfaceSecondary, height: 52, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 22, fontWeight: '700', color: typeColor, textAlign }}
              placeholder={t('SMART_INPUT_AMOUNT_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Type toggle */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>{t('REVIEW_TRANSACTION_TYPE' as any)}</Text>
          <View className="mb-4">
            <TypeToggle value={type} onChange={setType} />
          </View>

          {/* Description */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>{t('DESCRIPTION')}</Text>
          <View className="rounded-xl px-4 mb-4" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 15, color: colors.textPrimary, textAlign }}
              placeholder={t('SMART_INPUT_DESC_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          {/* Merchant */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>{t('SMART_INPUT_MERCHANT_PLACEHOLDER' as any)}</Text>
          <View className="rounded-xl px-4 mb-4" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 15, color: colors.textPrimary, textAlign }}
              placeholder={t('SMART_INPUT_MERCHANT_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={merchant}
              onChangeText={setMerchant}
            />
          </View>

          {/* Category */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>{t('CATEGORY')}</Text>
          <View className="mb-4">
            <CategoryPicker
              type={type === 'transfer' ? 'expense' : type}
              selectedId={selectedCategory?.id ?? null}
              onSelect={setSelectedCategory}
            />
          </View>

          {/* Account */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>
            {t('ACCOUNT')} <Text style={{ fontSize: 11, color: colors.textTertiary }}>({t('ACCOUNT_OPTIONAL')})</Text>
          </Text>
          <View className="mb-4">
            <AccountPicker
              selectedId={selectedAccountId}
              onSelect={handleAccountSelect}
            />
          </View>

          {/* Date */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>{t('DATE')}</Text>
          <View className="rounded-xl px-4 mb-4" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 15, color: colors.textPrimary, textAlign }}
              placeholder={t('SMART_INPUT_DATE_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* Notes */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, textAlign }}>
            {t('NOTES_OPTIONAL')}
          </Text>
          <View className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: colors.surfaceSecondary, minHeight: 64 }}>
            <TextInput
              style={{ fontSize: 14, color: colors.textPrimary, textAlignVertical: 'top', textAlign }}
              placeholder={t('SMART_INPUT_NOTE_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>

          {/* Exclude from Insights */}
          <View
            style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, marginBottom: 20, backgroundColor: colors.surfaceSecondary, height: 52 }}
          >
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
              <EyeOff size={18} color={colors.textTertiary} />
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
                {t('EXCLUDE_INSIGHTS' as any)}
              </Text>
            </View>
            <Switch
              value={excludeFromInsights}
              onValueChange={(v) => { impactLight(); setExcludeFromInsights(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {/* Save */}
          <Pressable
            onPress={handleSave}
            disabled={isPending || !description.trim() || !amount}
            className="rounded-xl items-center justify-center"
            style={{
              backgroundColor: description.trim() && amount ? colors.primary : colors.border,
              height: 52,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
                {t('SAVE_CHANGES')}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Uncategorized Banner ────────────────────────────────────────────

function UncategorizedBanner({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  if (count === 0) return null;

  return (
    <Pressable
      onPress={() => { impactLight(); onPress(); }}
      className="mx-4 mb-3 rounded-xl px-4 py-3 flex-row items-center"
      style={{
        backgroundColor: colors.isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.10)',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.20)',
      }}
    >
      <AlertCircle size={18} color={colors.warning} strokeWidth={2} />
      <View className="flex-1 mx-3">
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
          {count} {t('UNCATEGORIZED_COUNT_SUFFIX' as any)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
          {t('TAP_TO_REVIEW' as any)}
        </Text>
      </View>
      <Check size={16} color={colors.warning} strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Mini Calendar Grid ──────────────────────────────────────────────

function MiniCalendar({
  month,
  selectedDay,
  onSelectDay,
  transactions,
}: {
  month: Date;
  selectedDay: Date | null;
  onSelectDay: (day: Date | null) => void;
  transactions: Transaction[];
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });

  const today = new Date();

  // Pre-compute which days have income/expense
  const dayFlags = useMemo(() => {
    const map = new Map<string, { income: boolean; expense: boolean }>();
    for (const tx of transactions) {
      const key = tx.date.slice(0, 10);
      const prev = map.get(key) ?? { income: false, expense: false };
      if (tx.type === 'income') prev.income = true;
      else if (tx.type === 'expense') prev.expense = true;
      map.set(key, prev);
    }
    return map;
  }, [transactions]);

  // Leading spacer cells to align first day of month
  const offset = getDay(days[0]);

  return (
    <View className="px-4 pb-2">
      {/* Weekday headers */}
      <View className="flex-row mb-1">
        {([t('DAY_SUN' as any), t('DAY_MON' as any), t('DAY_TUE' as any), t('DAY_WED' as any), t('DAY_THU' as any), t('DAY_FRI' as any), t('DAY_SAT' as any)]).map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textTertiary }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {/* Empty cells for offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <View key={`empty-${i}`} style={{ width: '14.28%', height: 36 }} />
        ))}

        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const flags = dayFlags.get(key);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isToday = isSameDay(day, today);

          return (
            <Pressable
              key={key}
              onPress={() => {
                impactLight();
                onSelectDay(isSelected ? null : day);
              }}
              style={{
                width: '14.28%',
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected
                    ? colors.primary
                    : isToday
                      ? colors.primary + '15'
                      : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected || isToday ? '700' : '400',
                    color: isSelected
                      ? '#fff'
                      : isToday
                        ? colors.primary
                        : colors.textPrimary,
                  }}
                >
                  {day.getDate()}
                </Text>
              </View>
              {/* Dots for income/expense */}
              {flags ? (
                <View className="flex-row" style={{ gap: 2, marginTop: 1 }}>
                  {flags.income ? (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.income }} />
                  ) : null}
                  {flags.expense ? (
                    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.expense }} />
                  ) : null}
                </View>
              ) : (
                <View style={{ height: 5 }} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────

function TransactionsContent({ onClose, isModal = false }: { onClose?: () => void; isModal?: boolean } = {}): React.ReactElement {
  const colors = useThemeColors();
  const { hPad } = useResponsive();
  const t = useT();
  const { textAlign, rowDir, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; category_id?: string; edit_id?: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterTab>(() => {
    const f = params.filter;
    if (f === 'income' || f === 'expense' || f === 'transfer') return f;
    return 'all';
  });
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(() => params.category_id ?? undefined);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const handledEditIdRef = useRef<string | null>(null);
  const [splitTarget, setSplitTarget] = useState<Transaction | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [quickRange, setQuickRange] = useState<DateRange>(getDefaultRange());

  // Sync filter when navigating from dashboard with a new filter param
  useEffect(() => {
    const f = params.filter;
    if (f === 'income' || f === 'expense' || f === 'transfer') {
      setActiveFilter(f);
    }
  }, [params.filter]);

  // Sync category filter from params
  useEffect(() => {
    if (params.category_id) {
      setCategoryFilter(params.category_id);
    }
  }, [params.category_id]);

  // When quickRange changes (from DateRangeFilter), sync month/day
  const handleQuickRangeChange = useCallback((range: DateRange): void => {
    setQuickRange(range);
    setSelectedDay(null);
    if (range.preset !== 'custom') {
      setSelectedMonth(parseISO(range.start));
    }
  }, []);

  // When day is selected, use that day's range; otherwise use quickRange
  const dateFilters = useMemo(() => {
    if (selectedDay) {
      const dayStr = format(selectedDay, 'yyyy-MM-dd');
      return { start_date: dayStr, end_date: dayStr };
    }
    return { start_date: quickRange.start, end_date: quickRange.end };
  }, [selectedDay, quickRange]);

  const filters = useMemo(() => {
    const f: { type?: TransactionType; category_id?: string; start_date?: string; end_date?: string } = {
      ...dateFilters,
    };
    if (activeFilter !== 'all') f.type = activeFilter as TransactionType;
    if (categoryFilter) f.category_id = categoryFilter;
    return f;
  }, [activeFilter, categoryFilter, dateFilters]);

  // Full-month query for calendar dots (unfiltered by day or type)
  const monthFilters = useMemo(() => ({
    start_date: format(startOfMonth(selectedMonth), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(selectedMonth), 'yyyy-MM-dd'),
  }), [selectedMonth]);

  const {
    data: allMonthTransactions,
  } = useTransactions(monthFilters);

  const {
    data: transactions,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useTransactions(filters);

  // Auto-open edit modal when navigating with edit_id (only once per param)
  useEffect(() => {
    if (params.edit_id && params.edit_id !== handledEditIdRef.current) {
      handledEditIdRef.current = params.edit_id;
      // Fetch the specific transaction directly — it may not be in the current filtered list
      fetchTransactionById(params.edit_id)
        .then((tx) => setEditTarget(tx))
        .catch(() => { /* transaction not found or deleted */ });
    }
  }, [params.edit_id]);

  // Compute summary totals from loaded data
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    }
    return { income, expense };
  }, [transactions]);

  const { data: unreviewed } = useUnreviewedTransactions();
  const unreviewedCount = unreviewed?.length ?? 0;

  const onRefresh = useCallback((): void => {
    impactLight();
    refetch();
  }, [refetch]);

  const handleFilterChange = (tab: FilterTab): void => {
    if (tab === activeFilter) return;
    impactLight();
    setActiveFilter(tab);
  };

  const handleLoadMore = (): void => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleTransactionPress = useCallback((transaction: Transaction): void => {
    impactLight();
    setEditTarget(transaction);
  }, []);

  const { mutate: deleteTransactionMutate } = useDeleteTransaction();

  const handleDelete = useCallback((id: string): void => {
    deleteTransactionMutate(id);
  }, [deleteTransactionMutate]);

  const handleDaySelect = useCallback((day: Date | null): void => {
    setSelectedDay(day);
    if (day) {
      // Reset quick range preset since user chose a specific day
      const dayStr = format(day, 'yyyy-MM-dd');
      setQuickRange({ start: dayStr, end: dayStr, preset: 'custom', label: formatShortDate(day) });
    }
  }, []);

  const handleMonthBack = useCallback((): void => {
    impactLight();
    setSelectedDay(null);
    setSelectedMonth((m) => {
      const prev = subMonths(m, 1);
      setQuickRange({
        start: format(startOfMonth(prev), 'yyyy-MM-dd'),
        end: format(endOfMonth(prev), 'yyyy-MM-dd'),
        preset: 'custom',
        label: formatShortMonthYear(prev),
      });
      return prev;
    });
  }, []);

  const handleMonthForward = useCallback((): void => {
    impactLight();
    setSelectedDay(null);
    setSelectedMonth((m) => {
      const next = addMonths(m, 1);
      setQuickRange({
        start: format(startOfMonth(next), 'yyyy-MM-dd'),
        end: format(endOfMonth(next), 'yyyy-MM-dd'),
        preset: 'custom',
        label: formatShortMonthYear(next),
      });
      return next;
    });
  }, []);

  const handleMonthReset = useCallback((): void => {
    impactLight();
    setSelectedDay(null);
    setSelectedMonth(new Date());
    setQuickRange(getDefaultRange());
  }, []);

  // ─── Split from transaction ────────────────────────────────────────
  const { data: communities } = useCommunities();
  const { mutateAsync: createCommunityAsync, isPending: isCreatingCommunity } = useCreateCommunity();
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const handleSplit = useCallback((transaction: Transaction): void => {
    impactLight();
    setSplitTarget(transaction);
  }, []);

  const handlePickCommunity = useCallback((communityId: string): void => {
    if (!splitTarget) return;
    setSplitTarget(null);
    router.push({
      pathname: '/(tabs)/create-split-event',
      params: {
        communityId,
        prefillTitle: splitTarget.description,
        prefillAmount: String(Math.abs(splitTarget.amount)),
      },
    });
  }, [splitTarget, router]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Transaction>): React.ReactElement => (
    <TransactionCard
      transaction={item}
      onEdit={handleTransactionPress}
      onDelete={handleDelete}
      onSplit={handleSplit}
    />
  ), [handleTransactionPress, handleDelete, handleSplit]);

  const keyExtractor = useCallback((item: Transaction): string => item.id, []);

  // ─── Early returns AFTER all hooks ───────────────────────────────

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? STRINGS.ERROR_GENERIC}
        onRetry={onRefresh}
      />
    );
  }

  // ─── Fixed header (title + calendar + filters) ─────────────────────

  const FixedHeader = (
    <View
      style={{
        paddingTop: isModal ? 8 : insets.top + 12,
        paddingBottom: 8,
        backgroundColor: colors.isDark ? 'rgba(26,31,46,0.92)' : 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: colors.glassBorder,
      }}
    >
      {/* Drag handle — shown only in modal mode */}
      {isModal ? (
        <View style={{ alignItems: 'center', paddingTop: 6, paddingBottom: 8 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
            }}
          />
        </View>
      ) : null}

      {/* Title + calendar toggle (+ close button in modal) */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: hPad, marginBottom: 8 }}>
        <Text style={{ fontSize: isModal ? 24 : 28, fontWeight: '700', color: colors.textPrimary, textAlign }}>
          {t('TAB_TRANSACTIONS')}
        </Text>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => { impactLight(); setShowCalendar((prev) => !prev); }}
            style={{
              width: 36, height: 36, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: showCalendar ? colors.primary + '15' : colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: showCalendar ? colors.primary + '30' : colors.borderLight,
            }}
          >
            <CalendarIcon size={18} color={showCalendar ? colors.primary : colors.textSecondary} strokeWidth={2} />
          </Pressable>
          {isModal ? (
            <Pressable
              onPress={() => { impactLight(); onClose?.(); }}
              hitSlop={12}
              style={{
                width: 36, height: 36, borderRadius: 10,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.borderLight,
              }}
            >
              <ChevronDown size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Uncategorized banner */}
      <UncategorizedBanner
        count={unreviewedCount}
        onPress={() => router.push('/(tabs)/review')}
      />

      {/* Quick date range filter */}
      <View className="px-4 mb-2">
        <DateRangeFilter value={quickRange} onChange={handleQuickRangeChange} />
      </View>

      {/* Month navigator */}
      <View className="flex-row items-center justify-between px-4 mb-2">
        <Pressable onPress={isRTL ? handleMonthForward : handleMonthBack} style={{ padding: 6 }}>
          <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
        <Pressable onPress={handleMonthReset}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
            {formatMonthYear(selectedMonth)}
          </Text>
        </Pressable>
        <Pressable onPress={isRTL ? handleMonthBack : handleMonthForward} style={{ padding: 6 }}>
          <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      {/* Calendar grid (collapsible) */}
      {showCalendar ? (
        <MiniCalendar
          month={selectedMonth}
          selectedDay={selectedDay}
          onSelectDay={handleDaySelect}
          transactions={allMonthTransactions}
        />
      ) : null}

      {/* Day selection indicator */}
      {selectedDay ? (
        <Pressable
          onPress={() => { impactLight(); setSelectedDay(null); }}
          className="flex-row items-center mx-4 mb-2 rounded-lg px-3 py-2"
          style={{ backgroundColor: colors.primary + '12', borderWidth: 1, borderColor: colors.primary + '25' }}
        >
          <CalendarIcon size={14} color={colors.primary} strokeWidth={2} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginLeft: 6, flex: 1 }}>
            {formatLongDate(selectedDay)}
          </Text>
          <X size={14} color={colors.primary} strokeWidth={2} />
        </Pressable>
      ) : null}

      {/* Income / Expense summary */}
      <View className="px-4 mb-2" style={{ gap: 8, flexDirection: rowDir }}>
        <View className="flex-1 flex-row items-center rounded-xl px-3 py-2.5" style={{
          backgroundColor: colors.isDark ? 'rgba(15,23,42,0.60)' : 'rgba(241,245,249,0.8)',
          borderWidth: 1,
          borderColor: colors.isDark ? 'rgba(52,199,89,0.20)' : 'rgba(52,199,89,0.15)',
        }}>
          <TrendingUp size={14} color={colors.income} strokeWidth={2} />
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 13, fontWeight: '600', color: colors.income, marginLeft: 4 }}>
            {formatAmount(summary.income)}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center rounded-xl px-3 py-2.5" style={{
          backgroundColor: colors.isDark ? 'rgba(15,23,42,0.60)' : 'rgba(241,245,249,0.8)',
          borderWidth: 1,
          borderColor: colors.isDark ? 'rgba(255,59,48,0.20)' : 'rgba(255,59,48,0.15)',
        }}>
          <TrendingDown size={14} color={colors.expense} strokeWidth={2} />
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 13, fontWeight: '600', color: colors.expense, marginLeft: 4 }}>
            {formatAmount(summary.expense)}
          </Text>
        </View>
      </View>

      {/* Filter row */}
      <View className="gap-2 px-4 pb-1" style={{ flexDirection: rowDir }}>
        {FILTER_TAB_KEYS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleFilterChange(tab.key)}
              className="rounded-lg px-3 py-2"
              style={{
                backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? colors.textInverse : colors.textSecondary,
                }}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const BgWrapper = colors.isDark ? LinearGradient : View;
  const bgProps = colors.isDark
    ? { colors: [...colors.gradientBg], style: { flex: 1 } }
    : { style: { flex: 1, backgroundColor: colors.background } };

  if (transactions.length === 0) {
    return (
      <BgWrapper {...(bgProps as any)}>
        {FixedHeader}
        <EmptyState
          title={STRINGS.NO_TRANSACTIONS}
          description={STRINGS.NO_TRANSACTIONS_DESC}
        />
      </BgWrapper>
    );
  }

  return (
    <BgWrapper {...(bgProps as any)}>
      {FixedHeader}
      <FlashList<Transaction>
        data={transactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        drawDistance={500}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 120 }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshing={false}
        onRefresh={onRefresh}
      />

      {/* Smart Input Button */}
      <View style={{ position: 'absolute', right: 12, bottom: insets.bottom + 96 }}>
        <SmartInputButton
          onPress={() => {
            impactLight();
            router.push('/(tabs)/smart-input');
          }}
        />
      </View>

      {/* Edit modal */}
      <EditTransactionModal
        visible={editTarget !== null}
        transaction={editTarget}
        onClose={() => {
          setEditTarget(null);
          // Clear the edit_id param so back-navigation doesn't reopen
          if (params.edit_id) {
            router.setParams({ edit_id: '' });
          }
        }}
      />

      {/* Community picker for split */}
      <Modal visible={splitTarget !== null} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1" style={{ backgroundColor: colors.background, paddingTop: insets.top }}>
          <View className="flex-row items-center justify-between px-4 pb-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Pressable onPress={() => { setSplitTarget(null); setShowNewGroup(false); setNewGroupName(''); }} style={{ padding: 4 }}>
              <X size={22} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
              {t('CHOOSE_GROUP_SPLIT' as any)}
            </Text>
            <View style={{ width: 30 }} />
          </View>

          {splitTarget && (
            <View className="px-4 py-3" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>{t('SPLITTING' as any)}</Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginTop: 2 }}>
                {splitTarget.description} — {formatAmount(Math.abs(splitTarget.amount))}
              </Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Create new group inline */}
            {showNewGroup ? (
              <View className="rounded-xl px-4 py-3 mb-3" style={{ backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 }}>{t('NEW_GROUP_NAME' as any)}</Text>
                <TextInput
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  placeholder={t('NEW_GROUP_PLACEHOLDER' as any)}
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.textPrimary, marginBottom: 10 }}
                />
                <View className="flex-row" style={{ gap: 8 }}>
                  <Pressable
                    onPress={() => { setShowNewGroup(false); setNewGroupName(''); }}
                    className="flex-1 rounded-lg py-2.5 items-center"
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>{t('CANCEL')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      if (!newGroupName.trim()) return;
                      try {
                        const created = await createCommunityAsync({ name: newGroupName.trim(), icon: '👥' });
                        notifySuccess();
                        setShowNewGroup(false);
                        setNewGroupName('');
                        handlePickCommunity(created.id);
                      } catch { /* handled */ }
                    }}
                    disabled={!newGroupName.trim() || isCreatingCommunity}
                    className="flex-1 rounded-lg py-2.5 items-center"
                    style={{ backgroundColor: newGroupName.trim() ? '#8B5CF6' : colors.surfaceTertiary }}
                  >
                    {isCreatingCommunity ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{t('CREATE_AND_SPLIT' as any)}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowNewGroup(true)}
                className="flex-row items-center rounded-xl px-4 py-3.5 mb-3"
                style={{ backgroundColor: '#8B5CF6' + '15', borderWidth: 1, borderColor: '#8B5CF6' + '40' }}
              >
                <View className="h-9 w-9 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: '#8B5CF6' + '20' }}>
                  <Users size={18} color="#8B5CF6" strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#8B5CF6', flex: 1 }}>+ Create New Group</Text>
              </Pressable>
            )}

            {(communities ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => handlePickCommunity(c.id)}
                className="flex-row items-center rounded-xl px-4 py-3.5 mb-2"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? colors.surfaceTertiary : colors.surfaceSecondary,
                })}
              >
                <Text style={{ fontSize: 28, marginRight: 12 }}>{c.icon}</Text>
                <View className="flex-1">
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>{c.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
                    {c.members.length} member{c.members.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Users size={18} color={colors.textTertiary} />
              </Pressable>
            ))}

            {(!communities || communities.length === 0) && !showNewGroup ? (
              <View style={{ alignItems: 'center', paddingTop: 20 }}>
                <Text style={{ fontSize: 14, color: colors.textTertiary, textAlign: 'center' }}>
                  No groups yet. Create one above to start splitting.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </BgWrapper>
  );
}

export function TransactionsPageContent({
  onClose,
  isModal = false,
}: {
  onClose?: () => void;
  isModal?: boolean;
} = {}): React.ReactElement {
  return (
    <ErrorBoundary>
      <TransactionsContent onClose={onClose} isModal={isModal} />
    </ErrorBoundary>
  );
}

export default function TransactionsScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <TransactionsContent />
    </ErrorBoundary>
  );
}
