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
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  X,
} from 'lucide-react-native';

import { deleteAsync } from 'expo-file-system/legacy';
import * as ExpoClipboard from 'expo-clipboard';

import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { GlassCard } from '../../components/ui/GlassCard';
import { VoiceWaveform } from '../../components/ui/VoiceWaveform';
import { ScanAnimation } from '../../components/ui/ScanAnimation';
import { SmartInputAnimation } from '../../components/ui/SmartInputAnimation';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { AccountPicker } from '../../components/finance/AccountPicker';
import { useSmartInput, useCreateParsedTransaction, type TransactionDraft } from '../../hooks/useSmartInput';
import { useUsage, formatExhaustedMessage } from '../../hooks/useUsage';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { transcribeVoiceNote, ocrReceiptImage, type SmartTransactionInput } from '../../services/smart-input-service';
import { useVoiceInputStore } from '../../store/voice-input-store';
import { formatAmount } from '../../utils/currency';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
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
  const { isRTL } = useRTL();
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
        <ArrowLeft size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
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

// ─── Voice Recording View ───────────────────────────────────────────

function VoiceRecordingView({
  isRecording,
  onPress,
  onCancel,
}: {
  isRecording: boolean;
  onPress: () => void;
  onCancel: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRecording) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  const secondsStr = String(elapsed % 60).padStart(2, '0');
  const minutesStr = String(Math.floor(elapsed / 60)).padStart(2, '0');

  if (!isRecording) {
    // ── Idle state: big mic button to start recording ──────────────
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48 }}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 16,
            elevation: 10,
            marginBottom: 24,
          })}
        >
          <Mic size={40} color="#fff" strokeWidth={2} />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
          {t('SMART_INPUT_VOICE') as string}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: colors.textTertiary }}>
          {t('SMART_INPUT_VOICE_DESC') as string}
        </Text>
      </View>
    );
  }

  // ── Recording state: waveform + timer + stop & cancel buttons ─────
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48 }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <VoiceWaveform
          variant="full"
          label={`${minutesStr}:${secondsStr}`}
          sublabel={t('SMART_INPUT_VOICE') as string}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
        {/* Cancel (discard recording) */}
        <Pressable
          onPress={onCancel}
          accessibilityLabel={t('CANCEL') as string}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Trash2 size={22} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>

        {/* Stop (send for transcribing) */}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => ({
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.expense,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
            shadowColor: colors.expense,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 8,
          })}
        >
          <Square size={30} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>

      <Text style={{ marginTop: 20, fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
        {t('SMART_INPUT_STOP') as string}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 12, color: colors.textTertiary }}>
        {t('SMART_INPUT_VOICE_DESC') as string}
      </Text>
    </View>
  );
}

// ─── Manual Transaction Form ──────────────────────────────────────────

interface ManualFormProps {
  amount: string; onAmountChange: (v: string) => void;
  type: TransactionType; onTypeChange: (v: TransactionType) => void;
  description: string; onDescriptionChange: (v: string) => void;
  merchant: string; onMerchantChange: (v: string) => void;
  categoryId: string | null; onCategorySelect: (cat: Category) => void;
  accountId: string | null; onAccountSelect: (acc: Account) => void;
  date: string; onDateChange: (v: string) => void;
  notes: string; onNotesChange: (v: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

function ManualTransactionForm({
  amount, onAmountChange, type, onTypeChange,
  description, onDescriptionChange, merchant, onMerchantChange,
  categoryId, onCategorySelect, accountId, onAccountSelect,
  date, onDateChange, notes, onNotesChange,
  isSaving, onSave,
}: ManualFormProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const canSave = !isSaving && description.trim().length > 0 && parseFloat(amount) > 0 && categoryId !== null;

  const fieldLabel = (label: string, required?: boolean) => (
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
      {label}{required ? <Text style={{ color: colors.expense }}> *</Text> : null}
    </Text>
  );

  return (
    <View>
      <GlassCard marginBottom={12} style={{ marginHorizontal: 0 }}>
        {/* Amount */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('AMOUNT'), true)}
          <TextInput
            style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary, paddingVertical: 4 }}
            placeholder={t('SMART_INPUT_AMOUNT_PLACEHOLDER')}
            placeholderTextColor={colors.textTertiary}
            value={amount}
            onChangeText={onAmountChange}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Type */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('TYPE'))}
          <TypeToggle value={type} onChange={onTypeChange} />
        </View>

        {/* Description */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('DESCRIPTION'), true)}
          <TextInput
            style={{ fontSize: 15, color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}
            placeholder={t('DESCRIPTION')}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={onDescriptionChange}
          />
        </View>

        {/* Merchant */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('MERCHANT'))}
          <TextInput
            style={{ fontSize: 15, color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}
            placeholder={t('SMART_INPUT_MERCHANT_PLACEHOLDER')}
            placeholderTextColor={colors.textTertiary}
            value={merchant}
            onChangeText={onMerchantChange}
          />
        </View>

        {/* Category */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('CATEGORY'), true)}
          <CategoryPicker
            type={type}
            selectedId={categoryId}
            onSelect={onCategorySelect}
          />
        </View>

        {/* Account */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('ACCOUNT'))}
          <AccountPicker
            selectedId={accountId}
            onSelect={onAccountSelect}
          />
        </View>

        {/* Date */}
        <View style={{ marginBottom: 16 }}>
          {fieldLabel(t('DATE'))}
          <TextInput
            style={{ fontSize: 15, color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}
            placeholder={t('SMART_INPUT_DATE_PLACEHOLDER')}
            placeholderTextColor={colors.textTertiary}
            value={date}
            onChangeText={onDateChange}
          />
        </View>

        {/* Notes */}
        <View style={{ marginBottom: 20 }}>
          {fieldLabel(t('NOTES'))}
          <TextInput
            style={{ fontSize: 15, color: colors.textPrimary, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border, minHeight: 60, textAlignVertical: 'top' }}
            placeholder={t('NOTES')}
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={onNotesChange}
            multiline
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={onSave}
          disabled={!canSave}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 52,
            borderRadius: 14,
            backgroundColor: canSave ? colors.primary : colors.surfaceSecondary,
            opacity: isSaving ? 0.7 : 1,
          }}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Check size={18} color={canSave ? '#fff' : colors.textTertiary} strokeWidth={2.5} />
              <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: canSave ? '#fff' : colors.textTertiary }}>
                {t('SAVE')}
              </Text>
            </>
          )}
        </Pressable>
      </GlassCard>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────

function SmartInputContent(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL, rowDir, textAlign } = useRTL();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: accountsData } = useAccounts();
  const accounts = accountsData ?? [];
  const defaultAccountId = accounts.find((a) => a.include_in_total)?.id ?? null;
  const { data: categoriesData } = useCategories();
  const categories = categoriesData ?? [];

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

  // ─── Manual form state ──────────────────────────────────────────
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<TransactionType>('expense');
  const [manualDescription, setManualDescription] = useState('');
  const [manualMerchant, setManualMerchant] = useState('');
  const [manualCategory, setManualCategory] = useState<Category | null>(null);
  const [manualAccountId, setManualAccountId] = useState<string | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualSaving, setManualSaving] = useState(false);
  // Whether to expand the full manual form panel (in manual/text modes)
  const [showManualForm, setShowManualForm] = useState(false);
  const createMutation = useCreateParsedTransaction();

  // ─── FAB radial mode auto-trigger ───────────────────────────────
  const { mode, source } = useLocalSearchParams<{ mode?: 'voice' | 'scan' | 'manual'; source?: string }>();
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    if (!mode || autoTriggeredRef.current) return;
    autoTriggeredRef.current = true;
    // Call directly (no setTimeout) — a timer would be killed by React StrictMode
    // double-invoke cleanup before it fires, meaning recording never starts.
    if (mode === 'voice') handleVoice();
    else if (mode === 'scan') handleOCRDirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — mode is stable, handlers are useCallbacks

  // ─── Voice handoff from global store ────────────────────────────
  // When the user lands here via the voice processing pill (source=voice),
  // pick up the transcribed text from the global store, kick the parser,
  // then clear the store so the pill goes away.
  const voiceText = useVoiceInputStore((s) => s.transcribedText);
  const voiceState = useVoiceInputStore((s) => s.state);
  const dismissVoiceStore = useVoiceInputStore((s) => s.dismiss);
  const voiceHandoffRef = useRef(false);
  useEffect(() => {
    if (source !== 'voice') return;
    if (voiceHandoffRef.current) return;
    if (voiceState !== 'done' || !voiceText) return;
    voiceHandoffRef.current = true;
    setInputSource('voice');
    setInputText(voiceText);
    parseText(voiceText).finally(() => {
      dismissVoiceStore();
    });
  }, [source, voiceState, voiceText, parseText, setInputSource, dismissVoiceStore]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      // Restore iOS audio session so music/notifications still play after leaving the screen mid-record.
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      }).catch(() => {});
    };
  }, []);

  // ─── Usage tracking ─────────────────────────────────────────────
  const { canUse, recordAndCheck, getStatus } = useUsage();

  // ─── Cancel recording (discard without transcribing) ────────────
  const handleCancelRecording = useCallback(async () => {
    impactLight();
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (rec) {
      try {
        const uri = rec.getURI();
        await rec.stopAndUnloadAsync().catch(() => {});
        if (uri) {
          try { await deleteAsync(uri, { idempotent: true }); } catch {}
        }
      } catch {
        // already torn down
      }
    }
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    }).catch(() => {});
  }, []);

  // ─── Voice handler ──────────────────────────────────────────────
  const handleVoice = useCallback(async () => {
    if (isRecording) {
      // Stop recording
      if (!recordingRef.current) return;
      setIsRecording(false);

      // ⚠️ Capture URI BEFORE stopAndUnloadAsync — getURI() returns null after on many devices
      const uri = recordingRef.current.getURI();

      try {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;

        if (!uri) {
          notifyError();
          Alert.alert(t('ERROR_TITLE'), t('REVIEW_VOICE_FAILED' as any));
          return;
        }

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
        recordingRef.current = null;
        notifyError();
        const msg = err instanceof Error ? err.message : t('REVIEW_VOICE_FAILED' as any);
        Alert.alert(t('ERROR_TITLE'), msg);
      } finally {
        setIsTranscribing(false);
        // Restore default iOS audio session so playback apps work after recording.
        Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        }).catch(() => {});
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

  // Direct camera launch — used when navigated with mode=scan.
  const handleOCRDirect = useCallback(async () => {
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
  }, [processReceiptImage, t]);

  // Full OCR handler with camera/gallery choice — used from the action card on the text screen.
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
  }, [processReceiptImage, processMultipleReceiptImages, t]);

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

  // ─── Manual form save ───────────────────────────────────────────
  const handleManualSave = useCallback(async () => {
    if (!manualCategory) return;
    const amount = parseFloat(manualAmount.replace(',', '.'));
    if (!manualDescription.trim() || !amount || amount <= 0) return;

    try {
      setManualSaving(true);
      impactMedium();
      await createMutation.mutateAsync({
        amount,
        type: manualType,
        category_id: manualCategory.id,
        category_name: manualCategory.name,
        category_icon: manualCategory.icon ?? '',
        category_color: manualCategory.color ?? '',
        description: manualDescription.trim(),
        merchant: manualMerchant.trim() || null,
        date: manualDate.trim() || new Date().toISOString().split('T')[0],
        notes: manualNotes.trim() || null,
        account_id: manualAccountId ?? defaultAccountId,
        input_source: 'smart-text',
      });
      notifySuccess();
      setSuccessCount(1);
      setShowSuccess(true);
    } catch (err) {
      notifyError();
      const msg = err instanceof Error ? err.message : t('ERROR_TITLE');
      Alert.alert(t('ERROR_TITLE'), msg);
    } finally {
      setManualSaving(false);
    }
  }, [manualAmount, manualType, manualDescription, manualMerchant, manualCategory, manualAccountId, manualDate, manualNotes, defaultAccountId, createMutation, t]);

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
    setManualAmount('');
    setManualType('expense');
    setManualDescription('');
    setManualMerchant('');
    setManualCategory(null);
    setManualAccountId(null);
    setManualDate('');
    setManualNotes('');
    setManualSaving(false);
    setShowManualForm(false);
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
        <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <View style={{ flexDirection: rowDir, alignItems: 'center' }}>
            {/* Close button: only when a mode is active — gives users a way out
                of voice / scan / manual without relying on the tab bar. */}
            {mode ? (
              <Pressable
                onPress={async () => {
                  if (isRecording) await handleCancelRecording();
                  handleReset();
                  router.push('/(tabs)');
                }}
                accessibilityLabel={t('CANCEL') as string}
                hitSlop={10}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: colors.surfaceSecondary,
                  marginEnd: 10,
                }}
              >
                <X size={18} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            ) : null}
            <Sparkles size={24} color={colors.primary} strokeWidth={2} />
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginStart: 8, textAlign }}>
              {t('SMART_INPUT_TITLE')}
            </Text>
          </View>
          {showResult ? (
            <Pressable
              onPress={handleReset}
              style={{
                flexDirection: rowDir, alignItems: 'center',
                paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <RotateCcw size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text style={{ marginStart: 4, fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>
                {t('SMART_INPUT_RESET')}
              </Text>
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

        ) : /* ─── VOICE MODE ─────────────────────────────────────────────── */
        mode === 'voice' && !showResult ? (
          isTranscribing || isParsing ? (
            <SmartInputAnimation
              mode="voice"
              label={isTranscribing ? t('SMART_INPUT_TRANSCRIBING') : t('SMART_INPUT_PARSING' as any)}
              sublabel={isTranscribing ? t('SMART_INPUT_TRANSCRIBING_DESC') : t('SMART_INPUT_PARSING_DESC' as any)}
            />
          ) : inputText && !isRecording ? (
            /* Transcription succeeded but parse failed — show transcribed text + retry */
            <>
              <GlassCard marginBottom={12} style={{ marginHorizontal: 0 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: colors.textTertiary, marginBottom: 6 }}>
                  {t('SMART_INPUT_TRANSCRIBING')}
                </Text>
                <TextInput
                  style={{ fontSize: 16, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top' }}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                />
                <View className="flex-row items-center justify-end mt-2">
                  <Pressable
                    onPress={handleParse}
                    disabled={isParsing || !inputText.trim()}
                    className="flex-row items-center px-5 py-3 rounded-xl"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Send size={18} color="#fff" strokeWidth={2} />
                    <Text className="ml-2" style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                      {t('SMART_INPUT_PARSE')}
                    </Text>
                  </Pressable>
                </View>
              </GlassCard>
              {parseError ? (
                <View className="rounded-xl p-3 mb-3" style={{ backgroundColor: colors.expenseBg }}>
                  <Text style={{ fontSize: 13, color: colors.expense }}>{parseError.message}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <VoiceRecordingView
              isRecording={isRecording}
              onPress={handleVoice}
              onCancel={async () => {
                await handleCancelRecording();
                handleReset();
                router.push('/(tabs)');
              }}
            />
          )

        ) : /* ─── OCR MODE ───────────────────────────────────────────────── */
        mode === 'scan' && !showResult ? (
          isScanning || isParsing ? (
            <SmartInputAnimation
              mode="ocr"
              label={isScanning && scanProgress
                ? `${t('SMART_INPUT_SCAN_PROGRESS' as any)} ${scanProgress.current} ${t('SMART_INPUT_SCAN_OF' as any)} ${scanProgress.total}…`
                : t('SMART_INPUT_PARSING' as any)}
              sublabel={isScanning ? t('SMART_INPUT_SCANNING_DESC') : t('SMART_INPUT_PARSING_DESC' as any)}
            />
          ) : (
            /* Camera closed / cancelled before scanning → show a retry */
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <View
                style={{
                  width: 72, height: 72, borderRadius: 36,
                  backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }}
              >
                <Camera size={32} color="#10B981" strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                {t('REVIEW_SCAN_RECEIPT' as any)}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
                {t('SMART_INPUT_SCAN_DESC')}
              </Text>
              <Pressable
                onPress={handleOCRDirect}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  height: 52, paddingHorizontal: 28, borderRadius: 16,
                  backgroundColor: '#10B981', opacity: pressed ? 0.8 : 1,
                  shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
                })}
              >
                <Camera size={20} color="#fff" strokeWidth={2} />
                <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#fff' }}>
                  {t('SMART_INPUT_CAMERA' as any)}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleOCR()} className="flex-row items-center mt-4 py-3 px-6">
                <Text style={{ fontSize: 14, color: colors.textTertiary }}>
                  {t('SMART_INPUT_GALLERY' as any)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { impactLight(); handleReset(); router.push('/(tabs)'); }}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingVertical: 10, paddingHorizontal: 18 }}
              >
                <X size={16} color={colors.textTertiary} strokeWidth={2} />
                <Text style={{ marginStart: 6, fontSize: 14, fontWeight: '500', color: colors.textTertiary }}>
                  {t('CANCEL')}
                </Text>
              </Pressable>
            </View>
          )

        ) : /* ─── RESULTS (all modes after parse) ──────────────────────── */
        showResult ? (
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
                onRemove={() => { impactLight(); removeDraft(index); }}
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
                style={{ backgroundColor: colors.primary, height: 52, opacity: isSaving ? 0.7 : 1 }}
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

        ) : /* ─── MANUAL / TEXT MODE (default) ──────────────────────────── */
        (
          isTranscribing || isScanning || isParsing ? (
            isTranscribing ? (
              <SmartInputAnimation
                mode="voice"
                label={t('SMART_INPUT_TRANSCRIBING')}
                sublabel={t('SMART_INPUT_TRANSCRIBING_DESC')}
              />
            ) : isScanning ? (
              <SmartInputAnimation
                mode="ocr"
                label={scanProgress ? `${t('SMART_INPUT_SCAN_PROGRESS' as any)} ${scanProgress.current} ${t('SMART_INPUT_SCAN_OF' as any)} ${scanProgress.total}…` : undefined}
                sublabel={t('SMART_INPUT_SCANNING_DESC')}
              />
            ) : (
              <SmartInputAnimation
                mode={state.inputSource === 'voice' ? 'loading' : state.inputSource === 'ocr' ? 'loading' : 'text'}
                label={t('SMART_INPUT_PARSING' as any)}
                sublabel={t('SMART_INPUT_PARSING_DESC' as any)}
              />
            )
          ) : (
            <>
              {/* Text Input Card */}
              <GlassCard marginBottom={12} style={{ marginHorizontal: 0 }}>
                <TextInput
                  style={{ fontSize: 16, color: colors.textPrimary, minHeight: 110, textAlignVertical: 'top' }}
                  placeholder={t('SMART_INPUT_PLACEHOLDER_FULL')}
                  placeholderTextColor={colors.textTertiary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  autoFocus={mode === 'manual' || !mode}
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

              {/* Action Cards Row (paste / voice / scan) — hidden in manual mode */}
              {mode !== 'manual' ? (
                <View className="flex-row" style={{ gap: 10 }}>
                  {/* Paste Card */}
                  <GlassCard marginBottom={0} style={{ marginHorizontal: 0, flex: 1 }}>
                    <Pressable onPress={handlePaste} className="items-center py-2">
                      <View
                        className="items-center justify-center mb-2"
                        style={{
                          width: 44, height: 44, borderRadius: 14,
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
                      <Pressable onPress={handleVoice} className="items-center py-2">
                        <View
                          className="items-center justify-center mb-2"
                          style={{
                            width: 44, height: 44, borderRadius: 14,
                            backgroundColor: isRecording ? colors.expenseBg : (colors.isDark ? 'rgba(139,92,246,0.15)' : colors.primary + '12'),
                          }}
                        >
                          {isRecording ? <Square size={20} color={colors.expense} strokeWidth={2} /> : <Mic size={22} color={colors.primaryLight ?? colors.primary} strokeWidth={2} />}
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
                      <Pressable onPress={handleOCR} className="items-center py-2">
                        <View
                          className="items-center justify-center mb-2"
                          style={{
                            width: 44, height: 44, borderRadius: 14,
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
              ) : null}

              {/* ─── Manual entry toggle ─────────────────────────────── */}
              <Pressable
                onPress={() => { impactLight(); setShowManualForm((v) => !v); }}
                className="flex-row items-center justify-center mt-5 mb-2 py-3"
              >
                <View
                  style={{
                    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
                    borderColor: showManualForm ? colors.primary : colors.textTertiary,
                    alignItems: 'center', justifyContent: 'center', marginRight: 8,
                    backgroundColor: showManualForm ? colors.primary + '18' : 'transparent',
                  }}
                >
                  {showManualForm
                    ? <ChevronUp size={13} color={colors.primary} strokeWidth={2.5} />
                    : <ChevronDown size={13} color={colors.textTertiary} strokeWidth={2.5} />}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: showManualForm ? colors.primary : colors.textSecondary }}>
                  {showManualForm ? t('SMART_INPUT_LESS_DETAILS' as any) : 'Enter transaction manually'}
                </Text>
              </Pressable>

              {showManualForm ? (
                <ManualTransactionForm
                  amount={manualAmount}
                  onAmountChange={setManualAmount}
                  type={manualType}
                  onTypeChange={setManualType}
                  description={manualDescription}
                  onDescriptionChange={setManualDescription}
                  merchant={manualMerchant}
                  onMerchantChange={setManualMerchant}
                  categoryId={manualCategory?.id ?? null}
                  onCategorySelect={setManualCategory}
                  accountId={manualAccountId}
                  onAccountSelect={(acc: Account) => setManualAccountId(acc.id)}
                  date={manualDate}
                  onDateChange={setManualDate}
                  notes={manualNotes}
                  onNotesChange={setManualNotes}
                  isSaving={manualSaving}
                  onSave={handleManualSave}
                />
              ) : null}
            </>
          )
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
