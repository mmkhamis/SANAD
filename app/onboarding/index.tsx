import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, Check } from 'lucide-react-native';

import { notifySuccess, impactLight } from '../../utils/haptics';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useCompleteOnboarding } from '../../hooks/useCompleteOnboarding';
import { useThemeColors } from '../../hooks/useThemeColors';
import { STRINGS } from '../../constants/strings';

// ─── Currency options relevant for MENA users ────────────────────────

interface CurrencyOption {
  code: string;
  name: string;
  locale: string;
  flag: string;
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'SAR', name: 'Saudi Riyal', locale: 'en-SA', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', locale: 'en-AE', flag: '🇦🇪' },
  { code: 'EGP', name: 'Egyptian Pound', locale: 'en-EG', flag: '🇪🇬' },
  { code: 'KWD', name: 'Kuwaiti Dinar', locale: 'en-KW', flag: '🇰🇼' },
  { code: 'QAR', name: 'Qatari Riyal', locale: 'en-QA', flag: '🇶🇦' },
  { code: 'BHD', name: 'Bahraini Dinar', locale: 'en-BH', flag: '🇧🇭' },
  { code: 'OMR', name: 'Omani Rial', locale: 'en-OM', flag: '🇴🇲' },
  { code: 'JOD', name: 'Jordanian Dinar', locale: 'en-JO', flag: '🇯🇴' },
  { code: 'USD', name: 'US Dollar', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', locale: 'en-DE', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', locale: 'en-GB', flag: '🇬🇧' },
];

// ─── Screen ──────────────────────────────────────────────────────────

function OnboardingContent(): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { mutate: completeOnboarding, isPending, isError, error } = useCompleteOnboarding();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(CURRENCY_OPTIONS[0]);

  const handleContinue = (): void => {
    notifySuccess();
    completeOnboarding({
      currency: selectedCurrency.code,
      locale: selectedCurrency.locale,
    });
  };

  const handleSelectCurrency = (option: CurrencyOption): void => {
    impactLight();
    setSelectedCurrency(option);
  };

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: colors.background,
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 16,
      }}
    >
      {/* Header */}
      <View className="px-6 mb-6">
        <View
          className="h-14 w-14 rounded-2xl items-center justify-center mb-4"
          style={{ backgroundColor: colors.primaryLight + '20' }}
        >
          <Globe size={28} color={colors.primary} strokeWidth={1.8} />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary }}>
          {STRINGS.ONBOARDING_TITLE}
        </Text>
        <Text
          className="mt-2"
          style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 22 }}
        >
          {STRINGS.ONBOARDING_SUBTITLE}
        </Text>
      </View>

      {/* Error */}
      {isError && error ? (
        <View
          className="mx-6 rounded-xl p-3 mb-4"
          style={{ backgroundColor: colors.expenseBg }}
        >
          <Text style={{ fontSize: 14, color: colors.expense, textAlign: 'center' }}>
            {error.message}
          </Text>
        </View>
      ) : null}

      {/* Currency Label */}
      <Text
        className="px-6 mb-3"
        style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}
      >
        {STRINGS.ONBOARDING_CURRENCY_LABEL}
      </Text>

      {/* Currency List */}
      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
      >
        {CURRENCY_OPTIONS.map((option) => {
          const isSelected = option.code === selectedCurrency.code;

          return (
            <Pressable
              key={option.code}
              onPress={() => handleSelectCurrency(option)}
              className="flex-row items-center rounded-xl px-4 py-3 mb-2"
              style={{
                backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.primary : colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 24, marginRight: 12 }}>{option.flag}</Text>
              <View className="flex-1">
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: isSelected ? colors.primary : colors.textPrimary,
                  }}
                >
                  {option.name}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1 }}>
                  {option.code}
                </Text>
              </View>
              {isSelected ? (
                <View
                  className="h-6 w-6 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.primary }}
                >
                  <Check size={14} color={colors.textInverse} strokeWidth={3} />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Continue Button */}
      <View className="px-6 pt-4">
        <Pressable
          onPress={handleContinue}
          disabled={isPending}
          className="rounded-xl items-center justify-center"
          style={{
            backgroundColor: colors.primary,
            height: 52,
            opacity: isPending ? 0.7 : 1,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
            {isPending ? '...' : STRINGS.ONBOARDING_CONTINUE}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function OnboardingScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <OnboardingContent />
    </ErrorBoundary>
  );
}
