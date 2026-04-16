import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  Sparkles,
  Send,
  Check,
  ChevronDown,
  ChevronUp,
  Camera,
  Mic,
  RotateCcw,
  AlertTriangle,
  Clipboard,
  Square,
  Trash2,
  CheckCheck,
  CircleCheck,
  Plus,
  ArrowLeft,
  List,
} from 'lucide-react-native';

import { deleteAsync } from 'expo-file-system/legacy';
import * as ExpoClipboard from 'expo-clipboard';

import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { GlassCard } from '../../components/ui/GlassCard';
import { VoiceWaveform } from '../../components/ui/VoiceWaveform';
import { ScanAnimation } from '../../components/ui/ScanAnimation';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { AccountPicker } from '../../components/finance/AccountPicker';
import { useSmartInput, type TransactionDraft } from '../../hooks/useSmartInput';
import { useCategories } from '../../hooks/useCategories';
import { useUsage, formatExhaustedMessage } from '../../hooks/useUsage';
import { useAccounts } from '../../hooks/useAccounts';
import { transcribeVoiceNote, ocrReceiptImage } from '../../services/smart-input-service';
import { formatAmount } from '../../utils/currency';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { COLORS } from '../../constants/colors';
import type { Category, TransactionType, Account } from '../../types/index';

// ─── Confidence badge ────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? colors.income : confidence >= 0.6 ? colors.warning : colors.expense;
  const bg = confidence >= 0.8 ? colors.incomeBg : confidence >= 0.6 ? colors.warningBg : colors.expenseBg;
  const label = confidence >= 0.8 ? t('SMART_INPUT_CONFIDENCE_HIGH' as any) : confidence >= 0.6 ? t('SMART_INPUT_CONFIDENCE_MEDIUM' as any) : t('SMART_INPUT_CONFIDENCE_LOW' as any);

  return (
    <View className="flex-row items-center rounded-full px-3 py-1" style={{ backgroundColor: bg }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label} · {pct}%</Text>
    </View>
  );
}

// ─── Type toggle ─────────────────────────────────────────────────────

const TYPE_KEYS: { key: TransactionType; labelKey: 'EXPENSE' | 'INCOME' | 'TRANSFER'; color: string }[] = [
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
      {TYPE_KEYS.map((opt) => {
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

// ─── Parsed Result Card (per-draft) ──────────────────────────────────

function SuccessView({
  savedCount,
  onAddAnother,
  onViewTransactions,
  onBackToDashboard,
}: {
  savedCount: number;
  onAddAnother: () => void;
  onViewTransactions: () => void;
  onBackToDashboard: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const message = savedCount === 1
    ? t('SMART_INPUT_SUCCESS_ONE')
    : `${savedCount} ${t('SMART_INPUT_SUCCESS_MANY')}`;

  return (
    <View className="items-center py-12">
      <View className="w-16 h-16 rounded-full items-center justify-center mb-5" style={{ backgroundColor: colors.incomeBg }}>
        <CircleCheck size={36} color={colors.income} strokeWidth={2} />
      </View>

      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>
        {message}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
        {t('SMART_INPUT_RECORDS_UPDATED')}
      </Text>

      {/* Primary: Add another */}
      <Pressable
        onPress={onAddAnother}
        className="flex-row items-center justify-center rounded-xl w-full mb-3"
        style={{ backgroundColor: colors.primary, height: 52 }}
      >
        <Plus size={20} color="#fff" strokeWidth={2.5} />
        <Text className="ml-2" style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
          {t('SMART_INPUT_ADD_ANOTHER')}
        </Text>
      </Pressable>

      {/* Secondary: View transactions */}
      <Pressable
        onPress={onViewTransactions}
        className="flex-row items-center justify-center rounded-xl w-full mb-3"
        style={{ backgroundColor: colors.surface, height: 48, borderWidth: 1, borderColor: colors.border }}
      >
        <List size={18} color={colors.textSecondary} strokeWidth={2} />
        <Text className="ml-2" style={{ fontSize: 15, fontWeight: '500', color: colors.textPrimary }}>
          {t('SMART_INPUT_VIEW_TRANSACTIONS')}
        </Text>
      </Pressable>

      {/* Tertiary: Back to dashboard */}
      <Pressable
        onPress={onBackToDashboard}
        className="flex-row items-center justify-center py-3"
      >
        <ArrowLeft size={16} color={colors.textTertiary} strokeWidth={2} />
        <Text className="ml-1.5" style={{ fontSize: 14, fontWeight: '500', color: colors.textTertiary }}>
          {t('SMART_INPUT_BACK_DASHBOARD')}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Parsed Result Card ──────────────────────────────────────────────

function ParsedResultCard({
  draft,
  draftIndex,
  onUpdateField,
  onCategorySelect,
  onAccountSelect,
  onRemove,
  onConfirm,
  isSaving,
  expanded,
  onToggleExpand,
}: {
  draft: TransactionDraft;
  draftIndex: number;
  onUpdateField: <K extends keyof TransactionDraft>(key: K, value: TransactionDraft[K]) => void;
  onCategorySelect: (cat: Category) => void;
  onAccountSelect: (acc: Account) => void;
  onRemove: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const typeColor = draft.transactionType === 'income' ? colors.income
    : draft.transactionType === 'transfer' ? colors.info : colors.expense;

  if (draft.saved) {
    return (
      <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.incomeBg, borderWidth: 1, borderColor: colors.income + '30' }}>
        <View className="flex-row items-center">
          <Check size={18} color={colors.income} strokeWidth={2.5} />
          <Text className="ml-2 flex-1" style={{ fontSize: 15, fontWeight: '600', color: colors.income }}>
            {t('SMART_INPUT_SAVED' as any)}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.income }}>
            {formatAmount(parseFloat(draft.amount) || 0)}
          </Text>
        </View>
        <Text className="mt-1" style={{ fontSize: 13, color: colors.textSecondary }}>
          {draft.description}
          {draft.counterparty ? ` · ${draft.counterparty}` : draft.merchant ? ` · ${draft.merchant}` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      {/* Header with confidence + remove */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Sparkles size={16} color={colors.primary} strokeWidth={2} />
          <Text className="ml-2" style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
            {t('SMART_INPUT_TRANSACTION_N' as any)} {draftIndex + 1}
          </Text>
        </View>
        <View className="flex-row items-center">
          {draft.parseResult ? (
            <ConfidenceBadge confidence={draft.parseResult.confidence} />
          ) : null}
          <Pressable onPress={onRemove} className="ml-2 p-1.5 rounded-lg" style={{ backgroundColor: colors.expenseBg }} hitSlop={8}>
            <Trash2 size={14} color={colors.expense} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Needs review warning */}
      {draft.parseResult?.needs_review ? (
        <View className="flex-row items-center rounded-xl p-3 mb-4" style={{ backgroundColor: colors.warningBg }}>
          <AlertTriangle size={16} color={colors.warning} strokeWidth={2} />
          <Text className="ml-2 flex-1" style={{ fontSize: 13, color: colors.warning, fontWeight: '500' }}>
            {t('SMART_INPUT_LOW_CONFIDENCE' as any)}
          </Text>
        </View>
      ) : null}

      {/* Amount */}
      <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('AMOUNT')}</Text>
      <View className="rounded-xl px-4 mb-3" style={{ backgroundColor: colors.surfaceSecondary, height: 52, justifyContent: 'center' }}>
        <TextInput
          style={{ fontSize: 22, fontWeight: '700', color: typeColor }}
          placeholder={t('SMART_INPUT_AMOUNT_PLACEHOLDER' as any)}
          placeholderTextColor={colors.textTertiary}
          value={draft.amount}
          onChangeText={(v) => onUpdateField('amount', v)}
          keyboardType="decimal-pad"
        />
      </View>

      {/* Type toggle */}
      <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('REVIEW_TRANSACTION_TYPE' as any)}</Text>
      <View className="mb-3">
        <TypeToggle value={draft.transactionType} onChange={(v) => onUpdateField('transactionType', v)} />
      </View>

      {/* Description */}
      <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('DESCRIPTION')}</Text>
      <View className="rounded-xl px-4 mb-3" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
        <TextInput
          style={{ fontSize: 15, color: colors.textPrimary }}
          placeholder={t('SMART_INPUT_DESC_PLACEHOLDER' as any)}
          placeholderTextColor={colors.textTertiary}
          value={draft.description}
          onChangeText={(v) => onUpdateField('description', v)}
        />
      </View>

      {/* Merchant — hide when this is clearly a P2P transaction (counterparty set, no merchant) */}
      {draft.counterparty && !draft.merchant ? null : (
        <>
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('SMART_INPUT_MERCHANT_PLACEHOLDER' as any)}</Text>
          <View className="rounded-xl px-4 mb-3" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 15, color: colors.textPrimary }}
              placeholder={t('SMART_INPUT_MERCHANT_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={draft.merchant}
              onChangeText={(v) => onUpdateField('merchant', v)}
            />
          </View>
        </>
      )}

      {/* Counterparty (person in P2P transactions) */}
      {draft.counterparty || draft.transactionType === 'transfer' ? (
        <>
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('SMART_INPUT_PERSON_PLACEHOLDER' as any)}</Text>
          <View className="rounded-xl px-4 mb-3" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 15, color: colors.textPrimary }}
              placeholder={t('SMART_INPUT_PERSON_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={draft.counterparty}
              onChangeText={(v) => onUpdateField('counterparty', v)}
            />
          </View>
        </>
      ) : null}

      {/* Toggle more fields */}
      <Pressable onPress={onToggleExpand} className="flex-row items-center justify-center py-2 mb-1">
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.primary }}>
          {expanded ? t('SMART_INPUT_LESS_DETAILS' as any) : t('SMART_INPUT_MORE_DETAILS' as any)}
        </Text>
        {expanded
          ? <ChevronUp size={16} color={colors.primary} className="ml-1" />
          : <ChevronDown size={16} color={colors.primary} className="ml-1" />}
      </Pressable>

      {expanded ? (
        <>
          {/* Category */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('CATEGORY')}</Text>
          <View className="mb-3">
            <CategoryPicker
              type={draft.transactionType === 'transfer' ? 'expense' : draft.transactionType}
              selectedId={draft.category?.id ?? null}
              onSelect={onCategorySelect}
            />
          </View>

          {/* Account */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('ACCOUNT')} <Text style={{ fontSize: 11, color: colors.textTertiary }}>({t('ACCOUNT_OPTIONAL')})</Text></Text>
          <View className="mb-3">
            <AccountPicker
              selectedId={draft.accountId ?? null}
              onSelect={onAccountSelect}
            />
          </View>

          {/* Date */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('DATE')}</Text>
          <View className="rounded-xl px-4 mb-3" style={{ backgroundColor: colors.surfaceSecondary, height: 48, justifyContent: 'center' }}>
            <TextInput
              style={{ fontSize: 15, color: colors.textPrimary }}
              placeholder={t('SMART_INPUT_DATE_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={draft.date}
              onChangeText={(v) => onUpdateField('date', v)}
            />
          </View>

          {/* Notes */}
          <Text className="mb-1" style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary }}>{t('NOTES_OPTIONAL')}</Text>
          <View className="rounded-xl px-4 py-3" style={{ backgroundColor: colors.surfaceSecondary, minHeight: 64 }}>
            <TextInput
              style={{ fontSize: 14, color: colors.textPrimary, textAlignVertical: 'top' }}
              placeholder={t('SMART_INPUT_NOTE_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              value={draft.notes}
              onChangeText={(v) => onUpdateField('notes', v)}
              multiline
            />
          </View>
        </>
      ) : null}

      {/* Per-draft confirm button */}
      <Pressable
        onPress={onConfirm}
        disabled={isSaving || !draft.amount || !draft.category}
        className="flex-row items-center justify-center rounded-xl mt-3"
        style={{
          backgroundColor: draft.category ? colors.primary : colors.surfaceSecondary,
          height: 44,
          opacity: isSaving ? 0.7 : 1,
        }}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Check size={18} color={draft.category ? '#fff' : colors.textTertiary} strokeWidth={2.5} />
            <Text className="ml-1.5" style={{ fontSize: 14, fontWeight: '600', color: draft.category ? '#fff' : colors.textTertiary }}>
              {t('SAVE')}
            </Text>
          </>
        )}
      </Pressable>

      {/* Per-draft error */}
      {draft.error ? (
        <View className="flex-row items-center rounded-lg p-2.5 mt-2" style={{ backgroundColor: colors.expenseBg }}>
          <AlertTriangle size={14} color={colors.expense} strokeWidth={2} />
          <Text className="ml-2 flex-1" style={{ fontSize: 12, color: colors.expense, fontWeight: '500' }}>
            {draft.error}
          </Text>
        </View>
      ) : !draft.category ? (
        <Text className="text-center mt-1.5" style={{ fontSize: 11, color: colors.textTertiary }}>
          {t('SMART_INPUT_SELECT_CATEGORY' as any)}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

function SmartInputContent(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: categoriesData } = useCategories();
  const { data: accountsData } = useAccounts();
  const categories = categoriesData ?? [];
  const accounts = accountsData ?? [];
  const defaultAccountId = accounts.find((a) => a.include_in_total)?.id ?? null;

  const {
    state,
    savedCount,
    unsavedCount,
    allSaved,
    updateDraftField,
    setInputSource,
    removeDraft,
    parseText,
    processOCRResult,
    processMultipleOCRResults,
    confirmDraft,
    confirmAllDrafts,
    resetState,
    isParsing,
    parseError,
    isSaving,
    saveError,
  } = useSmartInput(categories, accounts, defaultAccountId);

  const [inputText, setInputText] = useState('');
  const [expandedDrafts, setExpandedDrafts] = useState<Record<number, boolean>>({});
  /** Tracks which draft is actively being saved for loading indicator */
  const [savingDraftIndex, setSavingDraftIndex] = useState<number | null>(null);
  /** Whether to show the full-page success view */
  const [showSuccess, setShowSuccess] = useState(false);
  /** How many were saved when success was triggered */
  const [successCount, setSuccessCount] = useState(0);

  // ─── Voice recording state ──────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // ─── OCR state ──────────────────────────────────────────────────
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ current: number; total: number } | null>(null);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  // ─── Usage tracking ─────────────────────────────────────────────
  const { canUse, recordAndCheck, getStatus } = useUsage();

  // ─── Voice handler ──────────────────────────────────────────────
  const handleVoice = useCallback(async () => {
    if (isRecording) {
      // Stop recording
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
          const transcribedText = await transcribeVoiceNote(uri);
          setInputText(transcribedText);

          // Auto-parse the transcribed text
          if (transcribedText.trim()) {
            setInputSource('voice');
            await parseText(transcribedText.trim());
          }
        } finally {
          try { await deleteAsync(uri, { idempotent: true }); } catch {}
        }
      } catch (err) {
        notifyError();
        const msg = err instanceof Error ? err.message : t('REVIEW_VOICE_FAILED' as any);
        Alert.alert(t('ERROR_TITLE'), msg);
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

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

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
  }, [isRecording, parseText, setInputSource, recordAndCheck, getStatus]);

  // ─── OCR handler ────────────────────────────────────────────────

  /** Downscale image to max 1024px and compress for fast OCR upload. */
  const compressForOCR = useCallback(async (uri: string): Promise<string> => {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    // Clean up temp file
    if (result.uri) deleteAsync(result.uri, { idempotent: true }).catch(() => {});
    if (!result.base64) throw new Error('Failed to compress image');
    return result.base64;
  }, []);

  const processReceiptImage = useCallback(async (imageUri: string, _base64: string | null) => {
    try {
      setIsScanning(true);
      impactLight();

      const compressed = await compressForOCR(imageUri);
      const ocrResult = await ocrReceiptImage(compressed);
      processOCRResult(ocrResult);
      notifySuccess();
    } catch (err) {
      notifyError();
      const msg = err instanceof Error ? err.message : t('REVIEW_RECEIPT_FAILED' as any);
      Alert.alert(t('ERROR_TITLE'), msg);
    } finally {
      setIsScanning(false);
    }
  }, [processOCRResult, compressForOCR]);

  const processMultipleReceiptImages = useCallback(async (
    assets: ImagePicker.ImagePickerAsset[],
  ) => {
    setIsScanning(true);
    setScanProgress({ current: 0, total: assets.length });
    impactLight();

    const results: Awaited<ReturnType<typeof ocrReceiptImage>>[] = [];
    let failCount = 0;

    for (let i = 0; i < assets.length; i++) {
      setScanProgress({ current: i + 1, total: assets.length });
      const asset = assets[i];
      try {
        const compressed = await compressForOCR(asset.uri);
        const ocrResult = await ocrReceiptImage(compressed);
        results.push(ocrResult);
      } catch {
        failCount++;
      } finally {
        deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
      }
    }

    setIsScanning(false);
    setScanProgress(null);

    if (results.length > 0) {
      processMultipleOCRResults(results);
      notifySuccess();
    }
    if (failCount > 0) {
      Alert.alert(
        t('SMART_INPUT_SCAN_COMPLETE' as any),
        `${results.length} ${t('SMART_INPUT_SCANNED_OK' as any)}` +
          (failCount > 0 ? `, ${failCount} ${t('SMART_INPUT_SCANNED_FAILED' as any)}` : ''),
      );
    }
  }, [processMultipleOCRResults, compressForOCR]);

  const handleOCR = useCallback(async () => {
    Alert.alert(
      t('REVIEW_SCAN_RECEIPT' as any),
      t('REVIEW_CHOOSE_SOURCE' as any),
      [
        {
          text: t('SMART_INPUT_CAMERA' as any),
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('ALERT_PERMISSION_REQUIRED' as any), t('ALERT_PERMISSION_CAMERA' as any));
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                base64: false,
                allowsEditing: false,
                exif: false,
              });
              if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                await processReceiptImage(asset.uri, asset.base64 ?? null);
                deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
              }
            } catch {
              Alert.alert(t('ERROR_TITLE'), t('ALERT_FAILED_CAPTURE' as any));
            }
          },
        },
        {
          text: t('SMART_INPUT_GALLERY' as any),
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert(t('ALERT_PERMISSION_REQUIRED' as any), t('ALERT_PERMISSION_GALLERY' as any));
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                base64: false,
                exif: false,
                allowsMultipleSelection: true,
                selectionLimit: 10,
              });
              if (!result.canceled && result.assets.length > 0) {
                if (result.assets.length === 1) {
                  const asset = result.assets[0];
                  await processReceiptImage(asset.uri, asset.base64 ?? null);
                  deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
                } else {
                  await processMultipleReceiptImages(result.assets);
                }
              }
            } catch {
              Alert.alert(t('ERROR_TITLE'), t('ALERT_FAILED_SELECT' as any));
            }
          },
        },
        { text: t('CANCEL'), style: 'cancel' },
      ],
    );
  }, [processReceiptImage, processMultipleReceiptImages]);

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) return;
    impactLight();
    await parseText(inputText.trim());
  }, [inputText, parseText]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await ExpoClipboard.getStringAsync();
      if (text) {
        setInputText(text);
        impactLight();
      }
    } catch {
      // Clipboard not available
    }
  }, []);

  const handleConfirm = useCallback(async (draftIndex: number) => {
    try {
      impactMedium();
      setSavingDraftIndex(draftIndex);
      await confirmDraft(draftIndex);
      notifySuccess();
    } catch {
      notifyError();
      // Error is stored on the draft itself — no Alert needed
    } finally {
      setSavingDraftIndex(null);
    }
  }, [confirmDraft]);

  // After individual save, check if all done
  useEffect(() => {
    if (allSaved && state.drafts.length > 0 && !showSuccess) {
      setSuccessCount(state.drafts.length);
      setShowSuccess(true);
    }
  }, [allSaved, state.drafts.length, showSuccess]);

  const handleConfirmAll = useCallback(async () => {
    try {
      impactMedium();
      const { saved, failed } = await confirmAllDrafts();
      if (failed === 0) {
        notifySuccess();
        setSuccessCount(saved);
        setShowSuccess(true);
      } else {
        notifyError();
        // Per-draft errors are shown inline
      }
    } catch {
      notifyError();
    }
  }, [confirmAllDrafts]);

  const handleReset = useCallback(() => {
    impactLight();
    resetState();
    setInputText('');
    setExpandedDrafts({});
    setIsRecording(false);
    setIsTranscribing(false);
    setIsScanning(false);
    setSavingDraftIndex(null);
    setShowSuccess(false);
    setSuccessCount(0);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
  }, [resetState]);

  const handleAddAnother = useCallback(() => {
    handleReset();
  }, [handleReset]);

  const handleViewTransactions = useCallback(() => {
    handleReset();
    router.push('/(tabs)/transactions');
  }, [handleReset, router]);

  const handleBackToDashboard = useCallback(() => {
    handleReset();
    router.push('/(tabs)');
  }, [handleReset, router]);

  const showResult = state.drafts.length > 0 && !showSuccess;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <Sparkles size={24} color={colors.primary} strokeWidth={2} />
            <Text className="ml-2" style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary }}>
              {t('SMART_INPUT_TITLE')}
            </Text>
          </View>
          {showResult ? (
            <Pressable onPress={handleReset} className="flex-row items-center px-3 py-2 rounded-lg" style={{ backgroundColor: colors.surfaceSecondary }}>
              <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text className="ml-1" style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>{t('SMART_INPUT_RESET')}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Success state */}
        {showSuccess ? (
          <SuccessView
            savedCount={successCount}
            onAddAnother={handleAddAnother}
            onViewTransactions={handleViewTransactions}
            onBackToDashboard={handleBackToDashboard}
          />
        ) : !showResult ? (
          isTranscribing || isScanning ? (
            isTranscribing ? (
              <VoiceWaveform
                variant="full"
                label={t('SMART_INPUT_TRANSCRIBING')}
                sublabel={t('SMART_INPUT_TRANSCRIBING_DESC')}
              />
            ) : (
              <ScanAnimation
                variant="full"
                progress={scanProgress ?? undefined}
                label={scanProgress ? `${t('SMART_INPUT_SCAN_PROGRESS' as any)} ${scanProgress.current} ${t('SMART_INPUT_SCAN_OF' as any)} ${scanProgress.total}…` : undefined}
                sublabel={t('SMART_INPUT_SCANNING_DESC')}
              />
            )
          ) : (
          <>
            {/* Text Input Card */}
            <GlassCard marginBottom={12} style={{ marginHorizontal: 0 }}>
              <TextInput
                style={{
                  fontSize: 16,
                  color: colors.textPrimary,
                  minHeight: 110,
                  textAlignVertical: 'top',
                }}
                placeholder={t('SMART_INPUT_PLACEHOLDER_FULL')}
                placeholderTextColor={colors.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                autoFocus
              />

              {/* Parse button row */}
              <View className="flex-row items-center justify-end mt-2">
                <Pressable
                  onPress={handleParse}
                  disabled={isParsing || !inputText.trim()}
                  className="flex-row items-center px-5 py-3 rounded-xl"
                  style={{
                    backgroundColor: inputText.trim() ? colors.primary : colors.surfaceSecondary,
                    opacity: isParsing ? 0.7 : 1,
                  }}
                >
                  {isParsing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Send size={18} color={inputText.trim() ? '#fff' : colors.textTertiary} strokeWidth={2} />
                      <Text className="ml-2" style={{ fontSize: 15, fontWeight: '600', color: inputText.trim() ? '#fff' : colors.textTertiary }}>
                        {t('SMART_INPUT_PARSE')}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </GlassCard>

            {/* Parse error */}
            {parseError ? (
              <View className="rounded-xl p-3 mb-3" style={{ backgroundColor: colors.expenseBg }}>
                <Text style={{ fontSize: 13, color: colors.expense }}>{parseError.message}</Text>
              </View>
            ) : null}

            {/* Action Cards Row */}
            <View className="flex-row" style={{ gap: 10 }}>
              {/* Paste Card */}
              <GlassCard marginBottom={0} style={{ marginHorizontal: 0, flex: 1 }}>
                <Pressable
                  onPress={handlePaste}
                  className="items-center py-2"
                >
                  <View
                    className="items-center justify-center mb-2"
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      backgroundColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12',
                    }}
                  >
                    <Clipboard size={22} color={colors.primaryLight ?? colors.primary} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{t('SMART_INPUT_PASTE')}</Text>
                  <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{t('SMART_INPUT_PASTE_DESC')}</Text>
                </Pressable>
              </GlassCard>

              {/* Voice Card */}
              <FeatureGate feature="voiceInput" mode="button" style={{ flex: 1 }}>
                <GlassCard marginBottom={0} style={{ marginHorizontal: 0 }}>
                  <Pressable
                    onPress={handleVoice}
                    className="items-center py-2"
                  >
                    <View
                      className="items-center justify-center mb-2"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: isRecording
                          ? colors.expenseBg
                          : (colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12'),
                      }}
                    >
                      {isRecording ? (
                        <Square size={20} color={colors.expense} strokeWidth={2} />
                      ) : (
                        <Mic size={22} color={colors.primaryLight ?? colors.primary} strokeWidth={2} />
                      )}
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: isRecording ? colors.expense : colors.textPrimary }}>
                      {isRecording ? t('SMART_INPUT_STOP') : t('SMART_INPUT_VOICE')}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{t('SMART_INPUT_VOICE_DESC')}</Text>
                  </Pressable>
                </GlassCard>
              </FeatureGate>

              {/* OCR Card */}
              <FeatureGate feature="receiptOcr" mode="button" style={{ flex: 1 }}>
                <GlassCard marginBottom={0} style={{ marginHorizontal: 0 }}>
                  <Pressable
                    onPress={handleOCR}
                    className="items-center py-2"
                  >
                    <View
                      className="items-center justify-center mb-2"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        backgroundColor: colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12',
                      }}
                    >
                      <Camera size={22} color={colors.primaryLight ?? colors.primary} strokeWidth={2} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{t('SMART_INPUT_SCAN')}</Text>
                    <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>{t('SMART_INPUT_SCAN_DESC')}</Text>
                  </Pressable>
                </GlassCard>
              </FeatureGate>
            </View>
          </>
          )
        ) : (
          <>
            {/* Raw input preview */}
            <View className="rounded-xl p-3 mb-4" style={{ backgroundColor: colors.surfaceSecondary }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, marginBottom: 4 }}>{t('SMART_INPUT_INPUT_LABEL' as any)}</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{state.rawText}</Text>
            </View>

            {/* Multi-draft count badge */}
            {state.drafts.length > 1 ? (
              <View className="flex-row items-center mb-4">
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.infoBg }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                    {state.drafts.length} {t('SMART_INPUT_TXN_DETECTED' as any)}
                  </Text>
                </View>
                {unsavedCount > 0 && unsavedCount < state.drafts.length ? (
                  <View className="rounded-full px-3 py-1 ml-2" style={{ backgroundColor: colors.incomeBg }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.income }}>
                      {state.drafts.length - unsavedCount} {t('SMART_INPUT_X_SAVED' as any)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Draft cards */}
            {state.drafts.map((draft, index) => (
              <ParsedResultCard
                key={draft.id}
                draft={draft}
                draftIndex={index}
                onUpdateField={(key, value) => updateDraftField(index, key, value)}
                onCategorySelect={(cat) => updateDraftField(index, 'category', cat)}
                onAccountSelect={(acc) => updateDraftField(index, 'accountId', acc.id)}
                onRemove={() => {
                  impactLight();
                  removeDraft(index);
                }}
                onConfirm={() => handleConfirm(index)}
                isSaving={savingDraftIndex === index}
                expanded={expandedDrafts[index] ?? false}
                onToggleExpand={() => setExpandedDrafts((prev) => ({ ...prev, [index]: !prev[index] }))}
              />
            ))}

            {/* Save error */}
            {saveError ? (
              <View className="rounded-xl p-3 mt-1" style={{ backgroundColor: colors.expenseBg }}>
                <Text style={{ fontSize: 13, color: colors.expense }}>{saveError.message}</Text>
              </View>
            ) : null}

            {/* Confirm All button (only when multiple unsaved drafts) */}
            {unsavedCount > 1 ? (
              <Pressable
                onPress={handleConfirmAll}
                disabled={isSaving || state.drafts.some((d) => !d.saved && !d.category)}
                className="flex-row items-center justify-center rounded-xl mt-3"
                style={{
                  backgroundColor: colors.primary,
                  height: 52,
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCheck size={20} color="#fff" strokeWidth={2.5} />
                    <Text className="ml-2" style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                      {t('SMART_INPUT_SAVE_ALL' as any)} ({unsavedCount})
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function SmartInputScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <SmartInputContent />
    </ErrorBoundary>
  );
}
