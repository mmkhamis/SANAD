import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, Check } from 'lucide-react-native';

import { notifySuccess, impactLight } from '../../utils/haptics';

import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { useCompleteOnboarding } from '../../hooks/useCompleteOnboarding';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { STRINGS } from '../../constants/strings';
import { useT } from '../../lib/i18n';
import type { StringKey } from '../../constants/strings';

// ─── Country options relevant for MENA users ─────────────────────────

interface CountryOption {
  code: string;       // ISO 3166-1 alpha-2
  nameKey: StringKey;
  flag: string;
  currency: string;   // default currency code
  locale: string;     // default locale
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'SA', nameKey: 'COUNTRY_SA', flag: '🇸🇦', currency: 'SAR', locale: 'en-SA' },
  { code: 'AE', nameKey: 'COUNTRY_AE', flag: '🇦🇪', currency: 'AED', locale: 'en-AE' },
  { code: 'EG', nameKey: 'COUNTRY_EG', flag: '🇪🇬', currency: 'EGP', locale: 'en-EG' },
  { code: 'KW', nameKey: 'COUNTRY_KW', flag: '🇰🇼', currency: 'KWD', locale: 'en-KW' },
  { code: 'QA', nameKey: 'COUNTRY_QA', flag: '🇶🇦', currency: 'QAR', locale: 'en-QA' },
  { code: 'BH', nameKey: 'COUNTRY_BH', flag: '🇧🇭', currency: 'BHD', locale: 'en-BH' },
  { code: 'OM', nameKey: 'COUNTRY_OM', flag: '🇴🇲', currency: 'OMR', locale: 'en-OM' },
  { code: 'JO', nameKey: 'COUNTRY_JO', flag: '🇯🇴', currency: 'JOD', locale: 'en-JO' },
];

// Extra currencies available after country is selected
interface CurrencyOption {
  code: string;
  nameKey: StringKey;
  locale: string;
  flag: string;
}

const EXTRA_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', nameKey: 'CURRENCY_USD', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', nameKey: 'CURRENCY_EUR', locale: 'en-DE', flag: '🇪🇺' },
  { code: 'GBP', nameKey: 'CURRENCY_GBP', locale: 'en-GB', flag: '🇬🇧' },
];

// ─── Screen ──────────────────────────────────────────────────────────

function OnboardingContent(): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isRTL, textAlign } = useRTL();
  const t = useT();
  const { mutate: completeOnboarding, isPending, isError, error } = useCompleteOnboarding();

  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRY_OPTIONS[0]);
  const [overrideCurrency, setOverrideCurrency] = useState<CurrencyOption | null>(null);

  const activeCurrency = overrideCurrency ?? {
    code: selectedCountry.currency,
    nameKey: selectedCountry.nameKey,
    locale: selectedCountry.locale,
    flag: selectedCountry.flag,
  };

  const handleContinue = (): void => {
    notifySuccess();
    completeOnboarding({
      currency: activeCurrency.code,
      locale: activeCurrency.locale,
      country_code: selectedCountry.code,
    });
  };

  const handleSelectCountry = (option: CountryOption): void => {
    impactLight();
    setSelectedCountry(option);
    setOverrideCurrency(null); // reset currency override when country changes
  };

  const handleSelectExtraCurrency = (option: CurrencyOption): void => {
    impactLight();
    setOverrideCurrency(option);
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
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.textPrimary, textAlign }}>
          {STRINGS.ONBOARDING_TITLE}
        </Text>
        <Text
          className="mt-2"
          style={{ fontSize: 15, color: colors.textSecondary, lineHeight: 22, textAlign }}
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

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Country Label */}
        <Text
          className="mb-3"
          style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}
        >
          {STRINGS.ONBOARDING_COUNTRY_LABEL}
        </Text>

        {/* Country Grid */}
        <View className="flex-row flex-wrap gap-2 mb-6">
          {COUNTRY_OPTIONS.map((option) => {
            const isSelected = option.code === selectedCountry.code;
            return (
              <Pressable
                key={option.code}
                onPress={() => handleSelectCountry(option)}
                className="items-center rounded-xl px-3 py-3"
                style={{
                  width: '23%',
                  backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.primary : colors.borderLight,
                }}
              >
                <Text style={{ fontSize: 28 }}>{option.flag}</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: isSelected ? colors.primary : colors.textPrimary,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  {t(option.nameKey)}
                </Text>
                {isSelected ? (
                  <View
                    className="absolute top-1 h-4 w-4 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.primary, [isRTL ? 'left' : 'right']: 4 }}
                  >
                    <Check size={10} color={colors.textInverse} strokeWidth={3} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Currency Label */}
        <Text
          className="mb-3"
          style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}
        >
          {STRINGS.ONBOARDING_CURRENCY_LABEL}
        </Text>

        {/* Default currency from country (pre-selected) */}
        <Pressable
          onPress={() => setOverrideCurrency(null)}
          className="flex-row items-center rounded-xl px-4 py-3 mb-2"
          style={{
            backgroundColor: !overrideCurrency ? colors.primary + '10' : colors.surface,
            borderWidth: 1.5,
            borderColor: !overrideCurrency ? colors.primary : colors.borderLight,
          }}
        >
          <Text style={{ fontSize: 24, marginEnd: 12 }}>{selectedCountry.flag}</Text>
          <View className="flex-1">
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: !overrideCurrency ? colors.primary : colors.textPrimary,
              }}
            >
              {selectedCountry.currency}
            </Text>
          </View>
          {!overrideCurrency ? (
            <View
              className="h-6 w-6 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Check size={14} color={colors.textInverse} strokeWidth={3} />
            </View>
          ) : null}
        </Pressable>

        {/* Extra currencies */}
        {EXTRA_CURRENCIES.map((option) => {
          const isSelected = overrideCurrency?.code === option.code;
          return (
            <Pressable
              key={option.code}
              onPress={() => handleSelectExtraCurrency(option)}
              className="flex-row items-center rounded-xl px-4 py-3 mb-2"
              style={{
                backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                borderWidth: 1.5,
                borderColor: isSelected ? colors.primary : colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 24, marginEnd: 12 }}>{option.flag}</Text>
              <View className="flex-1">
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: isSelected ? colors.primary : colors.textPrimary,
                  }}
                >
                  {t(option.nameKey)}
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
            flexDirection: 'row',
            backgroundColor: colors.primary,
            height: 52,
            opacity: isPending ? 0.8 : 1,
          }}
        >
          {isPending ? (
            <>
              <ActivityIndicator size="small" color={colors.textInverse} />
              <Text style={{ marginStart: 10, fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
                {STRINGS.ONBOARDING_LOADING}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
              {STRINGS.ONBOARDING_CONTINUE}
            </Text>
          )}
        </Pressable>
      </View>

      {/* Blocking overlay while onboarding completes — prevents tap-spam and
          tells the user the app is setting up their account. */}
      {isPending ? (
        <View
          pointerEvents="auto"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.35)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              paddingHorizontal: 32, paddingVertical: 24,
              borderRadius: 18,
              backgroundColor: colors.surface,
              alignItems: 'center',
              minWidth: 220,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 14, fontSize: 15, fontWeight: '600', color: colors.textPrimary, textAlign }}>
              {STRINGS.ONBOARDING_LOADING_TITLE}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: colors.textSecondary, textAlign: 'center' }}>
              {STRINGS.ONBOARDING_LOADING_SUBTITLE}
            </Text>
          </View>
        </View>
      ) : null}
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
