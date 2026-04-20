import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react-native';

import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { formatAmount } from '../../utils/currency';
import { suggestCategory } from '../../utils/sms-parser';
import { CategoryPicker } from './CategoryPicker';
import { AccountPicker } from './AccountPicker';
import { useReviewTransaction } from '../../hooks/useReviewTransactions';
import { useCategories } from '../../hooks/useCategories';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT, tFormat } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import type { Transaction, Category, Account } from '../../types/index';

interface SMSReviewSheetProps {
  visible: boolean;
  transactions: Transaction[];
  onClose: () => void;
}

export function SMSReviewSheet({
  visible,
  transactions,
  onClose,
}: SMSReviewSheetProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL, textAlign, rowDir } = useRTL();
  const BackIcon = isRTL ? ChevronRight : ChevronLeft;
  const ForwardIcon = isRTL ? ChevronLeft : ChevronRight;
  const insets = useSafeAreaInsets();
  const { mutateAsync: reviewAsync, isPending } = useReviewTransaction();
  const { data: allCategories } = useCategories();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const tx = transactions[currentIndex];
  const total = transactions.length;

  // Auto-suggest category from the SMS notes text
  const suggestedCategoryName = useMemo(() => {
    if (!tx?.notes) return null;
    return suggestCategory(tx.notes);
  }, [tx?.notes]);

  // Auto-select suggested category when it changes
  React.useEffect(() => {
    if (suggestedCategoryName && allCategories?.length && !selectedCategory) {
      const match = allCategories.find(
        (c) =>
          c.name.toLowerCase() === suggestedCategoryName.toLowerCase() &&
          c.type === tx?.type,
      );
      if (match) setSelectedCategory(match);
    }
  }, [suggestedCategoryName, allCategories, tx?.type, selectedCategory]);

  if (!tx) return <></>;

  const isIncome = tx.type === 'income';

  const handleSave = (): void => {
    if (!selectedCategory) return;
    impactMedium();
    reviewAsync({
      id: tx.id,
      category_id: selectedCategory.id,
      category_name: selectedCategory.name,
      category_icon: selectedCategory.icon,
      category_color: selectedCategory.color,
      account_id: selectedAccount?.id ?? null,
    }).then(() => {
      notifySuccess();
      // Move to next or close if done
      if (currentIndex < total - 1) {
        setCurrentIndex((i) => i + 1);
        setSelectedCategory(null);
        setSelectedAccount(null);
      } else {
        onClose();
        setCurrentIndex(0);
        setSelectedCategory(null);
        setSelectedAccount(null);
      }
    }).catch(() => {
      // Error is handled by isPending/isError from the hook
    });
  };

  const goBack = (): void => {
    if (currentIndex > 0) {
      impactLight();
      setCurrentIndex((i) => i - 1);
      setSelectedCategory(null);
      setSelectedAccount(null);
    }
  };

  const skip = (): void => {
    if (currentIndex < total - 1) {
      impactLight();
      setCurrentIndex((i) => i + 1);
      setSelectedCategory(null);
      setSelectedAccount(null);
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 pb-3"
          style={{
            paddingTop: insets.top + 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, textAlign }}>
            {t('SMS_REVIEW_HEADER' as any)} ({currentIndex + 1} / {total})
          </Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 100,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Transaction card */}
          <View
            className="rounded-xl p-4 mb-5"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: isIncome ? colors.income : colors.expense,
                marginBottom: 4,
                textAlign,
              }}
            >
              {isIncome ? '+' : '-'}{formatAmount(tx.amount)}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textPrimary, marginBottom: 2, textAlign }}>
              {tx.description}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, textAlign }}>
              {tx.date}{tx.merchant ? ` · ${tx.merchant}` : ''}
            </Text>

            {/* Raw SMS */}
            {tx.notes ? (
              <View
                className="rounded-lg px-3 py-2"
                style={{ backgroundColor: colors.surfaceSecondary }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, marginBottom: 2 }}>
                  {t('SMS_ORIGINAL' as any)}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={4}>
                  {tx.notes}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Category picker */}
          <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, textAlign }}>
            {t('CATEGORY')}{suggestedCategoryName ? ' ' : ''}{suggestedCategoryName ? (
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                {tFormat('SMS_SUGGESTED_TEMPLATE', { name: suggestedCategoryName })}
              </Text>
            ) : null}
          </Text>
          <CategoryPicker
            type={tx.type}
            selectedId={selectedCategory?.id ?? null}
            onSelect={setSelectedCategory}
          />
          <View className="mb-4" />

          {/* Account picker */}
          <Text className="mb-2" style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, textAlign }}>
            {t('ACCOUNT')} <Text style={{ fontSize: 12, color: colors.textTertiary }}>{t('ACCOUNT_OPTIONAL')}</Text>
          </Text>
          <AccountPicker
            selectedId={selectedAccount?.id ?? null}
            onSelect={setSelectedAccount}
          />
          <View className="mb-6" />

          {/* Navigation + actions */}
          <View className="items-center justify-between mb-4" style={{ flexDirection: rowDir }}>
            <Pressable
              onPress={goBack}
              disabled={currentIndex === 0}
              className="items-center"
              style={{ opacity: currentIndex === 0 ? 0.3 : 1, flexDirection: rowDir }}
            >
              <BackIcon size={18} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('SMS_BACK' as any)}</Text>
            </Pressable>
            <Pressable onPress={skip} className="items-center" style={{ flexDirection: rowDir }}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('SMS_SKIP' as any)}</Text>
              <ForwardIcon size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Save button */}
          <Pressable
            onPress={handleSave}
            disabled={isPending || !selectedCategory}
            className="rounded-xl items-center justify-center flex-row"
            style={{
              backgroundColor: selectedCategory ? colors.primary : colors.border,
              height: 52,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Check size={18} color={colors.textInverse} strokeWidth={2.5} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.textInverse,
                    marginLeft: 6,
                  }}
                >
                  {currentIndex < total - 1 ? t('SMS_SAVE_NEXT' as any) : t('SMS_SAVE_DONE' as any)}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
