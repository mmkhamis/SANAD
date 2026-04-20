import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { impactLight, impactMedium, notifyError, notifySuccess } from '../../utils/haptics';
import { useT } from '../../lib/i18n';
import { CalendarDays, StickyNote } from 'lucide-react-native';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { CategoryPicker } from '../../components/finance/CategoryPicker';
import { AccountPicker } from '../../components/finance/AccountPicker';
import { CreateGroupSheet } from '../../components/finance/CreateGroupSheet';
import { useCreateTransaction } from '../../hooks/useTransactions';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import type { Category, TransactionType, Account } from '../../types/index';

// ─── Types ───────────────────────────────────────────────────────────

type TabType = Exclude<TransactionType, 'transfer'>;

interface FieldErrors {
  amount?: string;
  category?: string;
  description?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function validateForm(
  amount: string,
  categoryId: string | null,
  description: string,
  t: (key: any) => string,
): FieldErrors | null {
  const errors: FieldErrors = {};

  const parsed = parseFloat(amount);
  if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
    errors.amount = t('ERROR_VALID_AMOUNT');
  }

  if (!categoryId) {
    errors.category = t('ERROR_SELECT_CATEGORY');
  }

  if (!description.trim()) {
    errors.description = t('ERROR_ENTER_DESCRIPTION');
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// ─── Screen ──────────────────────────────────────────────────────────

function AddTransactionContent(): React.ReactElement {
  const colors = useThemeColors();
  const { hPad } = useResponsive();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { mutate: create, isPending, isError, error, reset } = useCreateTransaction();

  const [activeTab, setActiveTab] = useState<TabType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const handleTabSwitch = (tab: TabType): void => {
    if (tab === activeTab) return;
    impactLight();
    setActiveTab(tab);
    setSelectedCategory(null);
    setSelectedAccount(null);
    setFieldErrors({});
    reset();
  };

  const handleCategorySelect = (category: Category): void => {
    setSelectedCategory(category);
    if (fieldErrors.category) {
      setFieldErrors((prev) => ({ ...prev, category: undefined }));
    }
  };

  const handleGroupCreated = (firstCategory: Category | null): void => {
    if (firstCategory) {
      handleCategorySelect(firstCategory);
    }
  };

  const handleSubmit = (): void => {
    const errors = validateForm(amount, selectedCategory?.id ?? null, description, t);

    if (errors) {
      setFieldErrors(errors);
      notifyError();
      return;
    }

    setFieldErrors({});
    reset();
    impactMedium();

    create(
      {
        amount: parseFloat(amount),
        type: activeTab,
        category_id: selectedCategory!.id,
        category_name: selectedCategory!.name,
        category_icon: selectedCategory!.icon,
        category_color: selectedCategory!.color,
        description: description.trim(),
        date,
        notes: notes.trim() || null,
        account_id: selectedAccount?.id ?? null,
      },
      {
        onSuccess: () => {
          notifySuccess();
          setAmount('');
          setDescription('');
          setNotes('');
          setDate(format(new Date(), 'yyyy-MM-dd'));
          setSelectedCategory(null);
          setSelectedAccount(null);
        },
      },
    );
  };

  const tabColor = activeTab === 'income' ? colors.income : colors.expense;

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: hPad,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: 20,
          }}
        >
          {t('ADD_TRANSACTION')}
        </Text>

        {/* Income / Expense toggle */}
        <View
          className="flex-row rounded-xl p-1 mb-6"
          style={{ backgroundColor: colors.surfaceSecondary }}
        >
          {(['expense', 'income'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const color = tab === 'income' ? colors.income : colors.expense;
            return (
              <Pressable
                key={tab}
                onPress={() => handleTabSwitch(tab)}
                className="flex-1 items-center justify-center rounded-lg py-3"
                style={{
                  backgroundColor: isActive ? colors.surface : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: isActive ? color : colors.textTertiary,
                  }}
                >
                  {tab === 'expense' ? t('EXPENSE') : t('INCOME')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amount */}
        <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
          {t('AMOUNT')}
        </Text>
        <View
          className="rounded-xl px-4 mb-1"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: fieldErrors.amount ? colors.expense : colors.border,
            height: 56,
            justifyContent: 'center',
          }}
        >
          <TextInput
            style={{ fontSize: 24, fontWeight: '700', color: tabColor }}
            placeholder={t('SMART_INPUT_AMOUNT_PLACEHOLDER' as any)}
            placeholderTextColor={colors.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!isPending}
          />
        </View>
        {fieldErrors.amount ? (
          <Text className="mb-3" style={{ fontSize: 12, color: colors.expense }}>
            {fieldErrors.amount}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Description */}
        <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
          {t('DESCRIPTION')}
        </Text>
        <View
          className="flex-row items-center rounded-xl px-4 mb-1"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: fieldErrors.description ? colors.expense : colors.border,
            height: 52,
          }}
        >
          <TextInput
            className="flex-1"
            style={{ fontSize: 16, color: colors.textPrimary }}
            placeholder={t('DESCRIPTION_PLACEHOLDER')}
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            editable={!isPending}
          />
        </View>
        {fieldErrors.description ? (
          <Text className="mb-3" style={{ fontSize: 12, color: colors.expense }}>
            {fieldErrors.description}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Category */}
        <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
          {t('CATEGORY')}
        </Text>
        <CategoryPicker
          type={activeTab}
          selectedId={selectedCategory?.id ?? null}
          onSelect={handleCategorySelect}
          onRequestCreateGroup={() => setShowCreateGroup(true)}
        />
        {fieldErrors.category ? (
          <Text className="mt-1 mb-3" style={{ fontSize: 12, color: colors.expense }}>
            {fieldErrors.category}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

        {/* Account (optional) */}
        <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
          {t('ACCOUNT')} <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('ACCOUNT_OPTIONAL')}</Text>
        </Text>
        <AccountPicker
          selectedId={selectedAccount?.id ?? null}
          onSelect={setSelectedAccount}
        />
        <View className="mb-4" />

        {/* Date */}
        <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
          {t('DATE')}
        </Text>
        <View
          className="flex-row items-center rounded-xl px-4 mb-4"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            height: 52,
          }}
        >
          <CalendarDays size={18} color={colors.textTertiary} strokeWidth={1.8} />
          <TextInput
            className="flex-1 ml-3"
            style={{ fontSize: 16, color: colors.textPrimary }}
            placeholder={t('SMART_INPUT_DATE_PLACEHOLDER' as any)}
            placeholderTextColor={colors.textTertiary}
            value={date}
            onChangeText={setDate}
            editable={!isPending}
          />
        </View>

        {/* Notes (optional) */}
        <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
          {t('NOTES_OPTIONAL')}
        </Text>
        <View
          className="flex-row items-start rounded-xl px-4 py-3 mb-6"
          style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            minHeight: 80,
          }}
        >
          <StickyNote size={18} color={colors.textTertiary} strokeWidth={1.8} style={{ marginTop: 2 }} />
          <TextInput
            className="flex-1 ml-3"
            style={{ fontSize: 15, color: colors.textPrimary, textAlignVertical: 'top' }}
            placeholder={t('NOTE_PLACEHOLDER')}
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            editable={!isPending}
          />
        </View>

        {/* Server error */}
        {isError && error ? (
          <View
            className="rounded-xl p-3 mb-4"
            style={{ backgroundColor: colors.expenseBg }}
          >
            <Text style={{ fontSize: 14, color: colors.expense, textAlign: 'center' }}>
              {error.message}
            </Text>
          </View>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={isPending}
          className="rounded-xl items-center justify-center"
          style={{
            backgroundColor: tabColor,
            height: 52,
            opacity: isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
            {isPending ? t('SAVING') : activeTab === 'expense' ? t('ADD_EXPENSE') : t('ADD_INCOME')}
          </Text>
        </Pressable>
      </ScrollView>

      <CreateGroupSheet
        visible={showCreateGroup}
        type={activeTab}
        onClose={() => setShowCreateGroup(false)}
        onCreated={handleGroupCreated}
      />
    </KeyboardAvoidingView>
  );
}

export default function AddTransactionScreen(): React.ReactElement {
  const colors = useThemeColors();
  return (
    <ErrorBoundary>
      <AddTransactionContent />
    </ErrorBoundary>
  );
}
