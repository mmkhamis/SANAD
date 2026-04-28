import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { deleteAsync } from 'expo-file-system/legacy';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  X,
  MessageSquare,
  Camera,
  Mic,
  Square,
} from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { QUERY_KEYS } from '../../lib/query-client';
import { suggestCategory } from '../../utils/sms-parser';
import { formatSmsPreview } from '../../utils/sms-display';
import { useUnreviewedTransactions, useReviewTransaction, useBulkReviewTransactions } from '../../hooks/useReviewTransactions';
import {
  useMerchantCategoryRules,
  useMerchantCategorizationSetting,
  useSaveMerchantCategoryRule,
} from '../../hooks/useMerchantCategorization';
import { useCategories } from '../../hooks/useCategories';
import { useAccounts } from '../../hooks/useAccounts';
import { deleteTransaction } from '../../services/transaction-service';
import { findMerchantCategoryRuleInList } from '../../services/merchant-category-service';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { ReviewBulkSaveBar } from '../../components/finance/ReviewBulkSaveBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { VoiceWaveform } from '../../components/ui/VoiceWaveform';
import { ScanAnimation } from '../../components/ui/ScanAnimation';
import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { useUsage, formatExhaustedMessage } from '../../hooks/useUsage';
import { transcribeVoiceNote, ocrReceiptImage, parseTransactionText, matchCategory, matchVoiceToReview, createSmartTransaction } from '../../services/smart-input-service';
import { COLORS } from '../../constants/colors';
import { useRTL } from '../../hooks/useRTL';
import type { Transaction, TransactionType, Category, Account } from '../../types/index';

// ─── Type selector chip ──────────────────────────────────────────────

const TYPE_OPTIONS: { value: TransactionType; labelKey: 'EXPENSE' | 'INCOME' | 'TRANSFER'; icon: typeof ArrowDownLeft; color: string }[] = [
  { value: 'expense', labelKey: 'EXPENSE', icon: ArrowUpRight, color: COLORS.expense },
  { value: 'income', labelKey: 'INCOME', icon: ArrowDownLeft, color: COLORS.income },
  { value: 'transfer', labelKey: 'TRANSFER', icon: ArrowLeftRight, color: COLORS.info },
];

function TypeChip({
  type,
  selected,
  onPress,
}: {
  type: (typeof TYPE_OPTIONS)[number];
  selected: boolean;
  onPress: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir } = useRTL();
  const Icon = type.icon;
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-3 py-2"
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        backgroundColor: selected ? type.color + '15' : colors.surfaceSecondary,
        borderWidth: 1.5,
        borderColor: selected ? type.color : colors.border,
        marginEnd: 8,
      }}
    >
      <Icon size={14} color={selected ? type.color : colors.textTertiary} strokeWidth={2} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: selected ? type.color : colors.textSecondary,
          marginStart: 4,
        }}
      >
        {t(type.labelKey)}
      </Text>
    </Pressable>
  );
}

function formatChannelLabel(channel: Transaction['channel']): string | null {
  if (!channel) return null;
  switch (channel) {
    case 'apple_pay': return 'Apple Pay';
    case 'google_pay': return 'Google Pay';
    case 'stc_pay': return 'STC Pay';
    case 'urpay': return 'urpay';
    case 'mada': return 'Mada';
    case 'iban': return 'IBAN';
    case 'card': return 'Card';
    default: return null;
  }
}

function resolveAccountName(last4: string, accounts: Account[]): string {
  const match = accounts.find(
    (a) => a.account_last4 === last4 || a.card_last4 === last4 || a.iban_last4 === last4,
  );
  return match ? match.name : `****${last4}`;
}

function buildParserMeta(transaction: Transaction, accounts: Account[] = []): string[] {
  const parts: string[] = [];
  const channel = formatChannelLabel(transaction.channel);
  if (channel) parts.push(channel);

  const isTransfer = (transaction.transaction_type ?? transaction.type) === 'transfer';

  if (transaction.from_last4 && transaction.to_last4) {
    const fromLabel = isTransfer ? resolveAccountName(transaction.from_last4, accounts) : `****${transaction.from_last4}`;
    const toLabel = isTransfer ? resolveAccountName(transaction.to_last4, accounts) : `****${transaction.to_last4}`;
    parts.push(`${fromLabel} → ${toLabel}`);
  } else if (transaction.from_last4) {
    parts.push(isTransfer ? resolveAccountName(transaction.from_last4, accounts) : `****${transaction.from_last4}`);
  } else if (transaction.to_last4) {
    parts.push(isTransfer ? resolveAccountName(transaction.to_last4, accounts) : `****${transaction.to_last4}`);
  }

  if (transaction.institution_name) parts.push(transaction.institution_name);
  return parts;
}

// ─── Review item card ────────────────────────────────────────────────

interface ReviewItemProps {
  transaction: Transaction;
  index: number;
  allCategories: Category[];
  allAccounts: Account[];
  selectedCategory: Category | null;
  onCategoryChange: (id: string, category: Category | null) => void;
  onSave: (tx: Transaction, type: TransactionType, category: Category | null, editedAmount: number, editedDescription: string) => void;
  onDiscard: (tx: Transaction) => void;
  isSaving: boolean;
}

function ReviewItem({ transaction, index, allCategories, allAccounts, selectedCategory, onCategoryChange, onSave, onDiscard, isSaving }: ReviewItemProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { textAlign, rowDir, isRTL } = useRTL();
  const [selectedType, setSelectedType] = useState<TransactionType>(
    transaction.transaction_type ?? transaction.type,
  );
  const [editedAmount, setEditedAmount] = useState<string>(String(Math.abs(transaction.amount)));
  const [editedDescription, setEditedDescription] = useState<string>(transaction.description ?? '');

  // Reset local state when the underlying transaction changes (FlashList recycles views)
  useEffect(() => {
    setSelectedType(transaction.transaction_type ?? transaction.type);
    setEditedAmount(String(Math.abs(transaction.amount)));
    setEditedDescription(transaction.description ?? '');
  }, [transaction.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-suggest category from merchant + SMS text (+description fallback)
  const suggestedName = useMemo(() => {
    const haystack = [
      transaction.merchant ?? '',
      transaction.notes ?? '',
      transaction.description ?? '',
    ].join(' ');
    if (!haystack.trim()) return null;
    return suggestCategory(haystack);
  }, [transaction.merchant, transaction.notes, transaction.description]);

  // Auto-select when suggestion matches
  React.useEffect(() => {
    if (suggestedName && allCategories.length && !selectedCategory) {
      const match = matchCategory(suggestedName, allCategories, selectedType);
      if (match) onCategoryChange(transaction.id, match);
    }
  }, [suggestedName, allCategories, selectedType, selectedCategory, transaction.id, onCategoryChange]);

  // Reset category when type changes
  const handleTypeChange = (newType: TransactionType): void => {
    setSelectedType(newType);
    onCategoryChange(transaction.id, null);
  };

  const isIncome = selectedType === 'income';
  const isTransfer = selectedType === 'transfer';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const parserMeta = buildParserMeta(transaction, allAccounts);
  const smsPreview = useMemo(
    () => (transaction.notes ? formatSmsPreview(transaction.notes) : null),
    [transaction.notes],
  );

  return (
    <View
      className="rounded-xl p-4 mb-3 mx-4"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Number badge & Amount */}
      <View style={{ flexDirection: rowDir, alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View
          style={{
            height: 28,
            width: 28,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: 8,
            marginTop: 2,
            backgroundColor: colors.primary + '15',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>#{index}</Text>
        </View>
        <View style={{ flex: 1, marginEnd: 10 }}>
          <View style={{ flexDirection: rowDir, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: amountColor }}>{sign}</Text>
            <TextInput
              value={editedAmount}
              onChangeText={setEditedAmount}
              keyboardType="decimal-pad"
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: amountColor,
                flex: 1,
                padding: 0,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                textAlign,
              }}
            />
          </View>
          <TextInput
            value={editedDescription}
            onChangeText={setEditedDescription}
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: colors.textPrimary,
              marginTop: 4,
              padding: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              textAlign,
            }}
            placeholder={t('DESCRIPTION')}
            placeholderTextColor={colors.textTertiary}
          />
          {transaction.merchant ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
              {transaction.merchant}
            </Text>
          ) : null}
          {parserMeta.length > 0 ? (
            <Text style={{ fontSize: 11.5, color: colors.textTertiary, marginTop: 2, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
              {parserMeta.join(' · ')}
            </Text>
          ) : null}
        </View>
        {transaction.parse_confidence != null ? (
          <View
            className="rounded-full px-2 py-1"
            style={{
              backgroundColor: transaction.parse_confidence >= 0.7
                ? colors.incomeBg
                : colors.warningBg,
            }}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: '600',
              color: transaction.parse_confidence >= 0.7
                ? colors.income
                : colors.warning,
            }}>
              {Math.round(transaction.parse_confidence * 100)}%
            </Text>
          </View>
        ) : null}
      </View>

      {/* SMS preview */}
      {smsPreview ? (
        <View
          className="rounded-lg px-3 py-2 mb-3"
          style={{ backgroundColor: colors.surfaceSecondary }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, marginBottom: 1, textAlign }}>
            SMS
          </Text>
          <Text
            numberOfLines={6}
            style={{
              fontSize: 12,
              lineHeight: 17,
              color: colors.textSecondary,
              textAlign,
              writingDirection: isRTL ? 'rtl' : 'ltr',
            }}
          >
            {smsPreview}
          </Text>
        </View>
      ) : null}

      {/* Review reason — hide confusing reasons for transfers */}
      {(() => {
        if (!transaction.review_reason) return null;
        const filteredReason = isTransfer
          ? transaction.review_reason
              .split(';')
              .map((s) => s.trim())
              .filter((s) => !/missing_category|unknown merchant|transaction type unclear/i.test(s))
              .join('; ')
          : transaction.review_reason;
        if (!filteredReason) return null;
        return (
          <Text style={{ fontSize: 12, color: colors.warning, marginBottom: 6, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
            ⚠ {filteredReason}
          </Text>
        );
      })()}

      {/* Type selector */}
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, textAlign }}>
        {t('REVIEW_TRANSACTION_TYPE' as any)}
      </Text>
      <View style={{ flexDirection: rowDir, marginBottom: 12 }}>
        {TYPE_OPTIONS.map((opt) => (
          <TypeChip
            key={opt.value}
            type={opt}
            selected={selectedType === opt.value}
            onPress={() => handleTypeChange(opt.value)}
          />
        ))}
      </View>

      {/* Category picker */}
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6, textAlign }}>
        {t('REVIEW_CATEGORY_OPTIONAL' as any)} {!selectedCategory ? <Text style={{ color: colors.textTertiary }}>({t('ACCOUNT_OPTIONAL')})</Text> : null}
      </Text>
      <CategoryPicker
        type={selectedType}
        selectedId={selectedCategory?.id ?? null}
        onSelect={(cat) => onCategoryChange(transaction.id, cat)}
      />

      {/* Action buttons */}
      <View style={{ flexDirection: rowDir, marginTop: 12, gap: 8 }}>
        {/* Discard button */}
        <Pressable
          onPress={() => {
            impactLight();
            onDiscard(transaction);
          }}
          disabled={isSaving}
          className="rounded-xl items-center justify-center"
          style={{
            backgroundColor: colors.expense + '12',
            borderWidth: 1,
            borderColor: colors.expense + '30',
            height: 44,
            width: 44,
          }}
        >
          <X size={18} color={colors.expense} strokeWidth={2.5} />
        </Pressable>

        {/* Confirm button — works with or without category */}
        <Pressable
          onPress={() => {
            const parsedAmount = parseFloat(editedAmount);
            if (isNaN(parsedAmount) || parsedAmount <= 0) return;
            onSave(transaction, selectedType, selectedCategory, parsedAmount, editedDescription.trim());
          }}
          disabled={isSaving}
          className="rounded-xl items-center justify-center flex-1"
          style={{
            flexDirection: rowDir,
            backgroundColor: colors.primary,
            height: 44,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Check size={16} color={colors.textInverse} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: colors.textInverse,
                  marginStart: 6,
                }}
              >
                {selectedCategory ? t('REVIEW_CONFIRM' as any) : t('REVIEW_SAVE_UNCATEGORIZED' as any)}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Review Screen ───────────────────────────────────────────────────

export default function ReviewScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { textAlign, rowDir, isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const { data: transactions, isLoading, isError, error, refetch } = useUnreviewedTransactions();
  const { mutateAsync: reviewAsync } = useReviewTransaction();
  const { saveAll: bulkSaveAll, isSaving: isBulkSaving, progress: bulkProgress } = useBulkReviewTransactions();
  const { enabled: categorizeByMerchantEnabled } = useMerchantCategorizationSetting();
  const { data: merchantCategoryRules } = useMerchantCategoryRules(categorizeByMerchantEnabled);
  const { mutateAsync: saveMerchantCategoryRuleAsync } = useSaveMerchantCategoryRule();
  const { data: allCategories } = useCategories();
  const { data: allAccounts } = useAccounts();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);
  // Screen-level map: txId → chosen Category. Lifted out of ReviewItem so
  // the bulk "Save all" bars can see which rows are ready, and so FlashList
  // recycling does not lose selections.
  const [selectionMap, setSelectionMap] = useState<Map<string, Category>>(new Map());

  useEffect(() => {
    if (!transactions?.length || !allCategories?.length) return;

    setSelectionMap((prev) => {
      const next = new Map(prev);
      let changed = false;
      const validIds = new Set(transactions.map((tx) => tx.id));

      for (const id of next.keys()) {
        if (!validIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }

      for (const tx of transactions) {
        if (next.has(tx.id)) continue;
        const txType = tx.transaction_type ?? tx.type;
        let matchedCategory: Category | null = null;

        if (categorizeByMerchantEnabled) {
          const rule = findMerchantCategoryRuleInList(
            merchantCategoryRules,
            tx.merchant,
            txType,
          );
          if (rule) {
            matchedCategory =
              allCategories.find((cat) => cat.id === rule.category_id && cat.type === txType)
              ?? matchCategory(rule.category_name, allCategories, txType);
          }
        }

        if (!matchedCategory) {
          const haystack = [tx.merchant ?? '', tx.notes ?? '', tx.description ?? ''].join(' ');
          const suggestedName = suggestCategory(haystack);
          if (suggestedName) {
            matchedCategory = matchCategory(suggestedName, allCategories, txType);
          }
        }

        if (matchedCategory) {
          next.set(tx.id, matchedCategory);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [transactions, allCategories, merchantCategoryRules, categorizeByMerchantEnabled]);

  const handleCategoryChange = useCallback(
    (id: string, category: Category | null): void => {
      setSelectionMap((prev) => {
        const next = new Map(prev);
        if (category) {
          next.set(id, category);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [],
  );

  // ─── Voice state ──────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // ─── OCR state ────────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  const handleSave = useCallback(
    async (tx: Transaction, type: TransactionType, category: Category | null, editedAmount: number, editedDescription: string) => {
      setSavingId(tx.id);
      impactMedium();
      try {
        // Auto-resolve account from last4 digits found in the transaction
        // Prefer the account_id already set by server ingest
        let accountId: string | null = tx.account_id ?? null;
        let toAccountId: string | null = null;
        const accounts = allAccounts ?? [];

        const resolveAccount = (last4: string | null): string | null => {
          if (!last4 || accounts.length === 0) return null;
          const match = accounts.find(
            (a) => a.account_last4 === last4 || a.card_last4 === last4 || a.iban_last4 === last4,
          );
          return match?.id ?? null;
        };

        if (type === 'transfer') {
          // Transfer: debit from_last4 account, credit to_last4 account
          accountId = resolveAccount(tx.from_last4 ?? null) ?? accountId;
          toAccountId = resolveAccount(tx.to_last4 ?? null);
        } else if (!accountId) {
          // Expense/income: resolve from from_last4, or fall back to any
          // masked card/account last4 in the SMS notes text
          accountId = resolveAccount(tx.from_last4 ?? null);
          if (!accountId && tx.notes && accounts.length > 0) {
            const masked = tx.notes.match(/\*+\s*(\d{4})(?!\d)|(\d{4})\s*\*+|(?:رقم|no\.?)\s+(\d{4})(?!\d)/gi);
            if (masked) {
              for (const m of masked) {
                const digits = m.replace(/[^\d]/g, '');
                accountId = resolveAccount(digits);
                if (accountId) break;
              }
            }
          }
        }

        await reviewAsync({
          id: tx.id,
          type,
          category_id: category?.id ?? '',
          category_name: category?.name ?? 'Uncategorized',
          category_icon: category?.icon ?? '📦',
          category_color: category?.color ?? '#6B7280',
          amount: editedAmount,
          description: editedDescription,
          account_id: accountId,
          to_account_id: toAccountId,
        });
        if (categorizeByMerchantEnabled && category && tx.merchant?.trim()) {
          await saveMerchantCategoryRuleAsync({
            merchant: tx.merchant,
            type,
            category_id: category.id,
            category_name: category.name,
            category_icon: category.icon,
            category_color: category.color,
          }).catch(() => {});
        }
        notifySuccess();
      } catch {
        // Error handled by mutation state
      } finally {
        setSavingId(null);
      }
    },
    [reviewAsync, categorizeByMerchantEnabled, saveMerchantCategoryRuleAsync, allAccounts],
  );

  const handleSaveAll = useCallback(async () => {
    if (!transactions || selectionMap.size === 0) return;
    impactMedium();
    const accounts = allAccounts ?? [];
    const resolveAccount = (last4: string | null): string | null => {
      if (!last4 || accounts.length === 0) return null;
      const match = accounts.find(
        (a) => a.account_last4 === last4 || a.card_last4 === last4 || a.iban_last4 === last4,
      );
      return match?.id ?? null;
    };

    const inputs = transactions
      .filter((tx) => selectionMap.has(tx.id))
      .map((tx) => {
        const cat = selectionMap.get(tx.id)!;
        const txType = tx.transaction_type ?? tx.type;
        let accountId: string | null = null;
        let toAccountId: string | null = null;

        if (txType === 'transfer') {
          accountId = resolveAccount(tx.from_last4 ?? null);
          toAccountId = resolveAccount(tx.to_last4 ?? null);
        } else {
          accountId = resolveAccount(tx.from_last4 ?? null);
          if (!accountId && tx.notes) {
            const masked = tx.notes.match(/\*+\s*(\d{4})(?!\d)|(\d{4})\s*\*+/g);
            if (masked) {
              for (const m of masked) {
                const digits = m.replace(/[^\d]/g, '');
                accountId = resolveAccount(digits);
                if (accountId) break;
              }
            }
          }
        }

        return {
          id: tx.id,
          type: txType,
          category_id: cat.id,
          category_name: cat.name,
          category_icon: cat.icon,
          category_color: cat.color,
          amount: Math.abs(tx.amount),
          description: tx.description ?? '',
          account_id: accountId,
          to_account_id: toAccountId,
        };
      });
    const result = await bulkSaveAll(inputs);
    if (categorizeByMerchantEnabled && result.saved.length > 0) {
      const txById = new Map(transactions.map((tx) => [tx.id, tx]));
      await Promise.allSettled(
        result.saved.map(async (id) => {
          const tx = txById.get(id);
          const cat = selectionMap.get(id);
          if (!tx?.merchant?.trim() || !cat) return;
          await saveMerchantCategoryRuleAsync({
            merchant: tx.merchant,
            type: tx.transaction_type ?? tx.type,
            category_id: cat.id,
            category_name: cat.name,
            category_icon: cat.icon,
            category_color: cat.color,
          });
        }),
      );
    }
    if (result.failed.length === 0) {
      notifySuccess();
    } else {
      notifyError();
      Alert.alert(
        t('REVIEW_SAVE_ALL_FAILED' as any),
        `${result.saved.length} ${t('REVIEW_SAVE_ALL_DONE' as any)} \u00b7 ${result.failed.length}`,
      );
    }
    setSelectionMap((prev) => {
      const next = new Map(prev);
      for (const id of result.saved) next.delete(id);
      return next;
    });
  }, [transactions, selectionMap, bulkSaveAll, t, categorizeByMerchantEnabled, saveMerchantCategoryRuleAsync, allAccounts]);

  const handleDiscard = useCallback(
    (tx: Transaction) => {
      Alert.alert(
        t('REVIEW_DISCARD_TITLE' as any),
        `${t('REVIEW_DISCARD_MSG_PREFIX' as any)}${tx.description}${t('REVIEW_DISCARD_MSG_SUFFIX' as any)}`,
        [
          { text: t('CANCEL'), style: 'cancel' },
          {
            text: t('DELETE'),
            style: 'destructive',
            onPress: async () => {
              setSavingId(tx.id);
              impactMedium();
              // Optimistic removal from cache to avoid white gap
              queryClient.setQueryData<Transaction[]>(
                QUERY_KEYS.unreviewedTransactions,
                (old) => old?.filter((t) => t.id !== tx.id) ?? [],
              );
              try {
                await deleteTransaction(tx.id);
                notifySuccess();
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trashedTransactions });
              } catch {
                notifyError();
                refetch(); // Revert on failure
              } finally {
                setSavingId(null);
              }
            },
          },
        ],
      );
    },
    [refetch, queryClient],
  );

  // ─── Usage tracking ─────────────────────────────────────────────
  const { recordAndCheck, getStatus, canUse } = useUsage();

  // ─── Voice handler ──────────────────────────────────────────────
  // Voice in review: transcribe → match existing items by #/amount/description
  // AND also parse for new transactions mentioned in the same voice note.
  const handleVoice = useCallback(async () => {
    if (isRecording) {
      if (!recordingRef.current) return;
      setIsRecording(false);
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;
        if (!uri) return;

        setIsTranscribing(true);
        impactLight();
        try {
          const text = await transcribeVoiceNote(uri);
          if (text.trim()) {
            const cats = allCategories ?? [];
            const reviewItems = transactions ?? [];
            const categoryNames = [...new Set(cats.map((c) => c.name))];
            let matched = 0;
            let created = 0;

            // Phase 1: Match against existing pending items (if any)
            if (reviewItems.length > 0) {
              const pendingItems = reviewItems.map((tx, i) => ({
                index: i + 1,
                amount: tx.amount,
                description: tx.description ?? '',
                merchant: tx.merchant ?? null,
              }));
              const matches = await matchVoiceToReview(text.trim(), pendingItems, categoryNames);
              for (const match of matches) {
                const itemIdx = match.index - 1;
                if (itemIdx < 0 || itemIdx >= reviewItems.length) continue;
                const matchItem = reviewItems[itemIdx];
                const cat = matchCategory(match.category_name, cats, match.transaction_type);
                if (matchItem && cat) {
                  setSavingId(matchItem.id);
                  try {
                    await reviewAsync({
                      id: matchItem.id,
                      type: match.transaction_type,
                      category_id: cat.id,
                      category_name: cat.name,
                      category_icon: cat.icon,
                      category_color: cat.color,
                      amount: matchItem.amount,
                      description: matchItem.description,
                    });
                    matched++;
                  } catch { /* skip */ }
                  setSavingId(null);
                }
              }
            }

            // Phase 2: Also parse voice for NEW transactions (multi-tx support)
            // e.g. "دفعت ١٥٠ جنيه أوبر و ٨٠ كارفور"
            try {
              const parsed = await parseTransactionText(text.trim());
              const validNew = (parsed ?? []).filter((p) => p.amount && p.amount > 0);
              for (const tx of validNew) {
                const cat = matchCategory(tx.category, cats, tx.transaction_type);
                await createSmartTransaction({
                  amount: tx.amount!,
                  type: tx.transaction_type,
                  description: tx.description || text.trim().slice(0, 80),
                  merchant: tx.merchant ?? undefined,
                  counterparty: tx.counterparty ?? undefined,
                  category_id: cat?.id ?? '',
                  category_name: cat?.name ?? tx.category ?? 'Uncategorized',
                  category_icon: cat?.icon ?? '📝',
                  category_color: cat?.color ?? '#6B7280',
                  date: tx.date || new Date().toISOString().split('T')[0],
                  input_source: 'voice',
                  needs_review: true,
                  parse_confidence: tx.confidence,
                });
                created++;
              }
            } catch (parseErr) {
              console.warn('Phase 2 parse failed:', parseErr);
            }

            if (matched > 0 || created > 0) {
              notifySuccess();
              const parts: string[] = [];
              if (matched > 0) parts.push(`${t('REVIEW_CATEGORIZED' as any)} ${matched} ${t('REVIEW_EXISTING' as any)}`);
              if (created > 0) parts.push(`${t('REVIEW_CREATED' as any)} ${created} ${t('REVIEW_NEW' as any)}`);
              Alert.alert(t('DONE'), parts.join(' & ') + ` ${t('REVIEW_DONE_VOICE' as any)}`);
            } else {
              Alert.alert(
                t('REVIEW_NO_MATCH' as any),
                `"${text.trim()}"`,
              );
            }
            refetch();
          }
        } finally {
          try { await deleteAsync(uri, { idempotent: true }); } catch {}
        }
      } catch (err) {
        notifyError();
        Alert.alert(t('ERROR_TITLE'), err instanceof Error ? err.message : t('REVIEW_VOICE_FAILED' as any));
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording — check quota FIRST
      if (!canUse('voiceTrackingPerDay')) {
        const status = getStatus('voiceTrackingPerDay');
        notifyError();
        Alert.alert(t('ALERT_LIMIT_REACHED' as any), formatExhaustedMessage(status));
        return;
      }

      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('ALERT_PERMISSION_REQUIRED' as any), t('ALERT_PERMISSION_MIC' as any));
          return;
        }

        // Record usage BEFORE starting (prevents wasted recording)
        const usageResult = await recordAndCheck('voiceTrackingPerDay');
        if (!usageResult.allowed) {
          const usageStatus = getStatus('voiceTrackingPerDay');
          notifyError();
          Alert.alert(t('ALERT_LIMIT_REACHED' as any), formatExhaustedMessage(usageStatus));
          return;
        }

        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync({
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          ios: {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
            extension: '.m4a',
            outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          },
        });
        recordingRef.current = recording;
        setIsRecording(true);
        impactMedium();
      } catch {
        notifyError();
        Alert.alert(t('ERROR_TITLE'), t('ALERT_FAILED_RECORDING' as any));
      }
    }
  }, [isRecording, allCategories, transactions, refetch, reviewAsync, savingId, recordAndCheck, getStatus]);

  // ─── OCR handler ────────────────────────────────────────────────
  // OCR in review: scan receipt(s) → match each to pending transactions by
  // amount (relaxed tolerance), or create new if no match.
  const handleOCR = useCallback(async () => {
    const matchedIds = new Set<string>(); // track already-matched to avoid double-match

    const processImage = async (asset: { uri: string; base64?: string | null }): Promise<{ matched: boolean; created: boolean }> => {
      const result = await ocrReceiptImage(asset.base64 ?? '');
      const ocrAmount = result.amount ?? 0;
      if (ocrAmount <= 0) return { matched: false, created: false };

      const cats = allCategories ?? [];
      const cat = matchCategory(result.category, cats, result.transaction_type ?? 'expense');
      const reviewItems = transactions ?? [];

      // Match by amount with relaxed tolerance (2% or 1 unit), skip already-matched
      const matchItem = reviewItems.find((tx) => {
        if (matchedIds.has(tx.id)) return false;
        const diff = Math.abs(tx.amount - ocrAmount);
        const pct = ocrAmount > 0 ? diff / ocrAmount : diff;
        return diff < 1 || pct < 0.02;
      });

      if (matchItem) {
        matchedIds.add(matchItem.id);
        setSavingId(matchItem.id);
        try {
          await reviewAsync({
            id: matchItem.id,
            type: (result.transaction_type as TransactionType) ?? 'expense',
            category_id: cat?.id ?? '',
            category_name: cat?.name ?? 'Uncategorized',
            category_icon: cat?.icon ?? '🧾',
            category_color: cat?.color ?? '#6B7280',
            amount: ocrAmount,
            description: result.merchant ?? matchItem.description,
          });
        } catch { /* skip */ }
        setSavingId(null);
        return { matched: true, created: false };
      } else {
        // No match → create new transaction from receipt
        try {
          await createSmartTransaction({
            amount: ocrAmount,
            type: (result.transaction_type as TransactionType) ?? 'expense',
            description: result.merchant ? `Receipt — ${result.merchant}` : 'Receipt scan',
            merchant: result.merchant ?? undefined,
            category_id: cat?.id ?? '',
            category_name: cat?.name ?? result.category ?? 'Uncategorized',
            category_icon: cat?.icon ?? '🧾',
            category_color: cat?.color ?? '#6B7280',
            date: result.date || new Date().toISOString().split('T')[0],
            input_source: 'ocr',
            needs_review: true,
            parse_confidence: 0.7,
          });
          return { matched: false, created: true };
        } catch { return { matched: false, created: false }; }
      }
    };

    const processAssets = async (assets: { uri: string; base64?: string | null }[]): Promise<void> => {
      setIsScanning(true);
      try {
        let totalMatched = 0;
        let totalCreated = 0;
        for (const asset of assets) {
          try {
            const { matched, created } = await processImage(asset);
            if (matched) totalMatched++;
            if (created) totalCreated++;
          } catch { /* skip failed */ }
        }
        if (totalMatched > 0 || totalCreated > 0) {
          notifySuccess();
          const parts: string[] = [];
          if (totalMatched > 0) parts.push(`${t('REVIEW_MATCHED' as any)} ${totalMatched}`);
          if (totalCreated > 0) parts.push(`${t('REVIEW_CREATED' as any)} ${totalCreated}`);
          Alert.alert(t('DONE'), parts.join(' & ') + ` ${t('REVIEW_DONE_RECEIPTS' as any)}`);
        } else {
          Alert.alert(t('REVIEW_NO_RESULTS' as any), t('REVIEW_NO_RESULTS_MSG' as any));
        }
        refetch();
      } catch (err) {
        notifyError();
        Alert.alert(t('ERROR_TITLE'), err instanceof Error ? err.message : t('REVIEW_RECEIPT_FAILED' as any));
      } finally {
        setIsScanning(false);
        for (const a of assets) { try { await deleteAsync(a.uri, { idempotent: true }); } catch {} }
      }
    };

    Alert.alert(t('REVIEW_SCAN_RECEIPT' as any), t('REVIEW_CHOOSE_SOURCE' as any), [
      {
        text: t('SMART_INPUT_CAMERA' as any),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert(t('ALERT_PERMISSION_REQUIRED' as any), t('REVIEW_CAMERA_NEEDED' as any)); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5, base64: true, allowsEditing: false, exif: false });
          if (!result.canceled && result.assets[0]) await processAssets([result.assets[0]]);
        },
      },
      {
        text: t('SMART_INPUT_GALLERY' as any),
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert(t('ALERT_PERMISSION_REQUIRED' as any), t('REVIEW_GALLERY_NEEDED' as any)); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true, exif: false, allowsMultipleSelection: true });
          if (!result.canceled && result.assets.length > 0) await processAssets(result.assets);
        },
      },
      { text: t('CANCEL'), style: 'cancel' },
    ]);
  }, [allCategories, transactions, refetch, reviewAsync]);

  const isBusy = isTranscribing || isScanning;

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? 'Failed to load transactions'}
        onRetry={refetch}
      />
    );
  }

  const items = transactions ?? [];

  return (
    <ErrorBoundary>
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="px-5 pb-3"
        style={{
          paddingTop: insets.top + 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
          {t('REVIEW_TITLE' as any)}
        </Text>
        {items.length > 0 ? (
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2, textAlign, writingDirection: isRTL ? 'rtl' : 'ltr' }}>
            {items.length} {t('REVIEW_NEEDS_ATTENTION' as any)}
          </Text>
        ) : null}
      </View>

      {/* Large Voice / OCR action cards — always visible */}
      <View className="px-4 pt-3 pb-1" style={{ flexDirection: rowDir, gap: 10 }}>
        {/* Voice card */}
        <Pressable
          onPress={handleVoice}
          disabled={isScanning}
          className="flex-1 rounded-2xl items-center justify-center py-5"
          style={{
            backgroundColor: isRecording ? colors.expense + '12' : colors.primary + '08',
            borderWidth: 1.5,
            borderColor: isRecording ? colors.expense + '40' : colors.primary + '25',
            opacity: isScanning ? 0.5 : 1,
          }}
        >
          {isTranscribing ? (
            <VoiceWaveform variant="compact" />
          ) : isRecording ? (
            <>
              <Square size={28} color={colors.expense} strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense, marginTop: 8, textAlign: 'center' }}>
                {t('REVIEW_TAP_STOP' as any)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign: 'center' }}>{t('REVIEW_RECORDING' as any)}</Text>
            </>
          ) : (
            <>
              <Mic size={28} color={colors.primary} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 8, textAlign: 'center' }}>
                {t('REVIEW_VOICE' as any)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign: 'center' }}>{t('REVIEW_VOICE_HINT' as any)}</Text>
            </>
          )}
        </Pressable>

        {/* OCR scan card */}
        <Pressable
          onPress={handleOCR}
          disabled={isBusy}
          className="flex-1 rounded-2xl items-center justify-center py-5"
          style={{
            backgroundColor: colors.primary + '08',
            borderWidth: 1.5,
            borderColor: colors.primary + '25',
            opacity: isBusy ? 0.5 : 1,
          }}
        >
          {isScanning ? (
            <ScanAnimation variant="compact" />
          ) : (
            <>
              <Camera size={28} color={colors.primary} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 8, textAlign: 'center' }}>
                {t('REVIEW_SCAN_RECEIPT' as any)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign: 'center' }}>{t('REVIEW_CAMERA_OR_GALLERY' as any)}</Text>
            </>
          )}
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title={t('REVIEW_ALL_CAUGHT_UP' as any)}
          description={t('REVIEW_NO_REVIEW_DESC' as any)}
          icon={<MessageSquare size={48} color={colors.textTertiary} strokeWidth={1.5} />}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          style={{ paddingTop: 12, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item, index: idx }) => (
            <ReviewItem
              transaction={item}
              index={idx + 1}
              allCategories={allCategories ?? []}
              allAccounts={allAccounts ?? []}
              selectedCategory={selectionMap.get(item.id) ?? null}
              onCategoryChange={handleCategoryChange}
              onSave={handleSave}
              onDiscard={handleDiscard}
              isSaving={savingId === item.id || isBulkSaving}
            />
          )}
          ListHeaderComponent={
            <ReviewBulkSaveBar
              position="top"
              readyCount={selectionMap.size}
              totalCount={items.length}
              isSaving={isBulkSaving}
              progress={{ done: bulkProgress.done, total: bulkProgress.total }}
              onSaveAll={handleSaveAll}
            />
          }
          ListFooterComponent={
            <ReviewBulkSaveBar
              position="bottom"
              readyCount={selectionMap.size}
              totalCount={items.length}
              isSaving={isBulkSaving}
              progress={{ done: bulkProgress.done, total: bulkProgress.total }}
              onSaveAll={handleSaveAll}
            />
          }
        />
      )}
    </View>
    </ErrorBoundary>
  );
}
