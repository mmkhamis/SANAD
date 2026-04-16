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
  Trash2,
  MessageSquare,
  Camera,
  Mic,
  Square,
} from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { QUERY_KEYS } from '../../lib/query-client';
import { formatAmount } from '../../utils/currency';
import { suggestCategory } from '../../utils/sms-parser';
import { useUnreviewedTransactions, useReviewTransaction } from '../../hooks/useReviewTransactions';
import { useCategories } from '../../hooks/useCategories';
import { deleteTransaction } from '../../services/transaction-service';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { VoiceWaveform } from '../../components/ui/VoiceWaveform';
import { ScanAnimation } from '../../components/ui/ScanAnimation';
import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { useUsage, formatExhaustedMessage } from '../../hooks/useUsage';
import { transcribeVoiceNote, ocrReceiptImage, parseTransactionText, matchCategory, matchVoiceToReview, createSmartTransaction } from '../../services/smart-input-service';
import { COLORS } from '../../constants/colors';
import type { Transaction, TransactionType, Category } from '../../types/index';

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
  const Icon = type.icon;
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-full px-3 py-2 mr-2"
      style={{
        backgroundColor: selected ? type.color + '15' : colors.surfaceSecondary,
        borderWidth: 1.5,
        borderColor: selected ? type.color : colors.border,
      }}
    >
      <Icon size={14} color={selected ? type.color : colors.textTertiary} strokeWidth={2} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: selected ? type.color : colors.textSecondary,
          marginLeft: 4,
        }}
      >
        {t(type.labelKey)}
      </Text>
    </Pressable>
  );
}

// ─── Review item card ────────────────────────────────────────────────

interface ReviewItemProps {
  transaction: Transaction;
  index: number;
  allCategories: Category[];
  onSave: (tx: Transaction, type: TransactionType, category: Category | null, editedAmount: number, editedDescription: string) => void;
  onDiscard: (tx: Transaction) => void;
  isSaving: boolean;
}

function ReviewItem({ transaction, index, allCategories, onSave, onDiscard, isSaving }: ReviewItemProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const [selectedType, setSelectedType] = useState<TransactionType>(
    transaction.transaction_type ?? transaction.type,
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editedAmount, setEditedAmount] = useState<string>(String(Math.abs(transaction.amount)));
  const [editedDescription, setEditedDescription] = useState<string>(transaction.description ?? '');

  // Reset local state when the underlying transaction changes (FlashList recycles views)
  useEffect(() => {
    setSelectedType(transaction.transaction_type ?? transaction.type);
    setSelectedCategory(null);
    setEditedAmount(String(Math.abs(transaction.amount)));
    setEditedDescription(transaction.description ?? '');
  }, [transaction.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-suggest category from SMS text
  const suggestedName = useMemo(() => {
    if (!transaction.notes) return null;
    return suggestCategory(transaction.notes);
  }, [transaction.notes]);

  // Auto-select when suggestion matches
  React.useEffect(() => {
    if (suggestedName && allCategories.length && !selectedCategory) {
      const match = allCategories.find(
        (c) =>
          c.name.toLowerCase() === suggestedName.toLowerCase() &&
          c.type === selectedType,
      );
      if (match) setSelectedCategory(match);
    }
  }, [suggestedName, allCategories, selectedType, selectedCategory]);

  // Reset category when type changes
  const handleTypeChange = (newType: TransactionType): void => {
    setSelectedType(newType);
    setSelectedCategory(null);
  };

  const isIncome = selectedType === 'income';
  const isTransfer = selectedType === 'transfer';
  const amountColor = isIncome ? colors.income : isTransfer ? colors.info : colors.expense;
  const sign = isIncome ? '+' : isTransfer ? '' : '-';

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
      <View className="flex-row items-start justify-between mb-2">
        <View
          className="h-7 w-7 rounded-full items-center justify-center mr-2 mt-0.5"
          style={{ backgroundColor: colors.primary + '15' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>#{index}</Text>
        </View>
        <View className="flex-1 mr-3">
          <View className="flex-row items-center">
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
            }}
            placeholder={t('DESCRIPTION')}
            placeholderTextColor={colors.textTertiary}
          />
          {transaction.merchant ? (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
              {transaction.merchant}
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
      {transaction.notes ? (
        <View
          className="rounded-lg px-3 py-2 mb-3"
          style={{ backgroundColor: colors.surfaceSecondary }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, marginBottom: 1 }}>
            SMS
          </Text>
          <Text numberOfLines={2} style={{ fontSize: 12, color: colors.textSecondary }}>
            {transaction.notes}
          </Text>
        </View>
      ) : null}

      {/* Review reason */}
      {transaction.review_reason ? (
        <Text style={{ fontSize: 12, color: colors.warning, marginBottom: 6 }}>
          ⚠ {transaction.review_reason}
        </Text>
      ) : null}

      {/* Type selector */}
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 }}>
        {t('REVIEW_TRANSACTION_TYPE' as any)}
      </Text>
      <View className="flex-row mb-3">
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
      <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 6 }}>
        {t('REVIEW_CATEGORY_OPTIONAL' as any)} {!selectedCategory ? <Text style={{ color: colors.textTertiary }}>({t('ACCOUNT_OPTIONAL')})</Text> : null}
      </Text>
      <CategoryPicker
        type={selectedType}
        selectedId={selectedCategory?.id ?? null}
        onSelect={setSelectedCategory}
      />

      {/* Action buttons */}
      <View className="flex-row mt-3" style={{ gap: 8 }}>
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
          className="rounded-xl items-center justify-center flex-row flex-1"
          style={{
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
                  marginLeft: 6,
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
  const insets = useSafeAreaInsets();
  const { data: transactions, isLoading, isError, error, refetch } = useUnreviewedTransactions();
  const { mutateAsync: reviewAsync, isPending } = useReviewTransaction();
  const { data: allCategories } = useCategories();
  const queryClient = useQueryClient();
  const [savingId, setSavingId] = useState<string | null>(null);

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
        await reviewAsync({
          id: tx.id,
          type,
          category_id: category?.id ?? '',
          category_name: category?.name ?? 'Uncategorized',
          category_icon: category?.icon ?? '📦',
          category_color: category?.color ?? '#6B7280',
          amount: editedAmount,
          description: editedDescription,
        });
        notifySuccess();
      } catch {
        // Error handled by mutation state
      } finally {
        setSavingId(null);
      }
    },
    [reviewAsync],
  );

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
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary }}>
          {t('REVIEW_TITLE' as any)}
        </Text>
        {items.length > 0 ? (
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
            {items.length} {t('REVIEW_NEEDS_ATTENTION' as any)}
          </Text>
        ) : null}
      </View>

      {/* Large Voice / OCR action cards — always visible */}
      <View className="flex-row px-4 pt-3 pb-1" style={{ gap: 10 }}>
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense, marginTop: 8 }}>
                {t('REVIEW_TAP_STOP' as any)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{t('REVIEW_RECORDING' as any)}</Text>
            </>
          ) : (
            <>
              <Mic size={28} color={colors.primary} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 8 }}>
                {t('REVIEW_VOICE' as any)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{t('REVIEW_VOICE_HINT' as any)}</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 8 }}>
                {t('REVIEW_SCAN_RECEIPT' as any)}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{t('REVIEW_CAMERA_OR_GALLERY' as any)}</Text>
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
              onSave={handleSave}
              onDiscard={handleDiscard}
              isSaving={savingId === item.id}
            />
          )}
        />
      )}
    </View>
    </ErrorBoundary>
  );
}
