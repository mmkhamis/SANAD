import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Linking, Alert, Share, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LogOut, ChevronRight, Check, Globe, Plus, Wallet, Trash2, MessageSquare, ExternalLink, HelpCircle, Copy, Zap, CheckCircle2, CircleAlert, ArrowRight, Play, Smartphone, MessageCircle, Moon, Sun, Monitor, Target, Users, Repeat, Languages } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';

import { impactLight, impactMedium, notifyWarning, notifySuccess, notifyError } from '../../utils/haptics';
import { formatAmount } from '../../utils/currency';
import { SmartInputButton } from '../../components/ui/SmartInputButton';
import { FeatureGate } from '../../components/ui/FeatureGate';

import { COLORS } from '../../constants/colors';
import { STRINGS } from '../../constants/strings';
import { useT } from '../../lib/i18n';
import { useLanguageStore, type Language } from '../../store/language-store';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useLogout } from '../../hooks/useLogout';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from '../../hooks/useAccounts';
import { useGoals } from '../../hooks/useGoals';
import { useCommunities } from '../../hooks/useCommunity';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import type { AccountType } from '../../types/index';

// ─── Deep link URL for SMS automation ────────────────────────────────

const SMS_DEEP_LINK_TEMPLATE = 'walletapp://sms?text=';
const SAMPLE_SMS = 'تم إضافة تحويل لبطاقتكم بمبلغ 400.00 جم من محمد';

// ─── Twilio Sandbox config ───────────────────────────────────────────

const TWILIO_SANDBOX_NUMBER = '+14155238886';
const TWILIO_SANDBOX_KEYWORD = 'join <your-statement-zebra>'; // replace with actual keyword from Twilio console

// ─── WhatsApp Connect Component ──────────────────────────────────────

function WhatsAppConnect(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const [phoneInput, setPhoneInput] = useState(user?.whatsapp_number ?? '');
  const [saved, setSaved] = useState(!!user?.whatsapp_number);

  const isConnected = !!user?.whatsapp_number;

  const handleSaveNumber = useCallback(() => {
    const cleaned = phoneInput.replace(/[^+\d]/g, '');
    if (cleaned.length < 10) {
      Alert.alert(t('ALERT_INVALID_NUMBER' as any), t('ALERT_INVALID_NUMBER_MSG' as any));
      return;
    }
    impactLight();
    updateProfile(
      { whatsapp_number: cleaned },
      {
        onSuccess: () => {
          notifySuccess();
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
        onError: (err) => {
          notifyError();
          Alert.alert(t('ERROR_TITLE'), err.message);
        },
      },
    );
  }, [phoneInput, updateProfile]);

  const handleDisconnect = useCallback(() => {
    impactLight();
    updateProfile(
      { whatsapp_number: null },
      {
        onSuccess: () => {
          notifySuccess();
          setPhoneInput('');
        },
      },
    );
  }, [updateProfile]);

  const handleJoinSandbox = useCallback(() => {
    impactLight();
    const msg = encodeURIComponent(TWILIO_SANDBOX_KEYWORD);
    Linking.openURL(`whatsapp://send?phone=${TWILIO_SANDBOX_NUMBER}&text=${msg}`).catch(() => {
      Linking.openURL(`https://wa.me/${TWILIO_SANDBOX_NUMBER}?text=${msg}`).catch(() => {
        Alert.alert(t('ALERT_WHATSAPP_NOT_FOUND' as any), t('ALERT_WHATSAPP_NOT_FOUND_MSG' as any));
      });
    });
  }, []);

  return (
    <View className="rounded-2xl p-4 mb-6" style={{ backgroundColor: colors.surface }}>
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <View className="h-9 w-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#25D366' + '15' }}>
          <MessageCircle size={20} color="#25D366" strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
            {t('WHATSAPP_TITLE' as any)}
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 1 }}>
            {isConnected ? t('WHATSAPP_CONNECTED' as any) : t('WHATSAPP_NOT_CONNECTED' as any)}
          </Text>
        </View>
        {isConnected ? (
          <View className="h-6 w-6 rounded-full items-center justify-center" style={{ backgroundColor: '#25D366' }}>
            <Check size={14} color="#fff" strokeWidth={3} />
          </View>
        ) : null}
      </View>

      {/* Phone input */}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
        {t('WHATSAPP_NUMBER_LABEL' as any)}
      </Text>
      <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
        <TextInput
          value={phoneInput}
          onChangeText={setPhoneInput}
          placeholder="+201234567890"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          autoComplete="tel"
          className="flex-1 rounded-xl px-3.5 py-3"
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.borderLight,
            fontSize: 14,
            color: colors.textPrimary,
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          }}
          editable={!isConnected}
        />
        {isConnected ? (
          <Pressable
            onPress={handleDisconnect}
            disabled={isPending}
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: colors.expenseBg }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.expense }}>
              {t('WHATSAPP_DISCONNECT' as any)}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSaveNumber}
            disabled={isPending || !phoneInput.trim()}
            className="rounded-xl px-4 py-3"
            style={{
              backgroundColor: saved ? '#25D366' : colors.primary,
              opacity: isPending || !phoneInput.trim() ? 0.5 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : saved ? (
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{t('WHATSAPP_SAVED' as any)}</Text>
            ) : (
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>{t('WHATSAPP_CONNECT' as any)}</Text>
            )}
          </Pressable>
        )}
      </View>

      {/* Step 2: Join Twilio Sandbox */}
      {!isConnected ? null : (
        <View className="rounded-xl p-3.5 mb-3" style={{ backgroundColor: '#25D366' + '08', borderWidth: 1, borderColor: '#25D366' + '20' }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#25D366', marginBottom: 4 }}>
            {t('WHATSAPP_SANDBOX_TITLE' as any)}
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 }}>
            {t('WHATSAPP_SANDBOX_DESC' as any)}
          </Text>
          <Pressable
            onPress={handleJoinSandbox}
            className="flex-row items-center justify-center rounded-xl py-2.5"
            style={{ backgroundColor: '#25D366' }}
          >
            <MessageCircle size={15} color="#fff" strokeWidth={2} />
            <Text className="ml-2" style={{ fontSize: 13, fontWeight: '600', color: '#fff' }}>
              {t('WHATSAPP_OPEN_JOIN' as any)}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Usage instructions */}
      {isConnected ? (
        <View className="rounded-xl p-3" style={{ backgroundColor: colors.infoBg }}>
          <HelpCircle size={14} color={colors.info} strokeWidth={2} style={{ marginBottom: 4 }} />
          <Text style={{ fontSize: 12, color: colors.info, lineHeight: 17 }}>
            {t('WHATSAPP_USAGE_HINT' as any)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── SMS Automation Setup Component ──────────────────────────────────

function SetupStep({
  number,
  title,
  description,
  highlight,
}: {
  number: number;
  title: string;
  description: string;
  highlight?: boolean;
}): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View className="flex-row mb-4">
      <View
        className="h-7 w-7 rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ backgroundColor: highlight ? colors.primary : colors.surfaceSecondary }}
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: highlight ? '#fff' : colors.textSecondary }}>
          {number}
        </Text>
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}

function SMSAutomationSetup(): React.ReactElement {
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [expandedGuide, setExpandedGuide] = useState(false);

  const deepLinkURL = `${SMS_DEEP_LINK_TEMPLATE}\${MESSAGE}`;

  const handleCopyDeepLink = useCallback(async () => {
    impactLight();
    await Clipboard.setStringAsync(SMS_DEEP_LINK_TEMPLATE);
    setCopied(true);
    notifySuccess();
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const handleTestDeepLink = useCallback(async () => {
    impactMedium();
    const testUrl = `${SMS_DEEP_LINK_TEMPLATE}${encodeURIComponent(SAMPLE_SMS)}`;
    try {
      await Linking.openURL(testUrl);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch {
      notifyError();
      Alert.alert(t('ALERT_TEST_FAILED' as any), t('ALERT_TEST_FAILED_MSG' as any));
    }
  }, []);

  const handleOpenShortcuts = useCallback(() => {
    impactLight();
    if (Platform.OS === 'ios') {
      Linking.openURL('shortcuts://').catch(() => {
        Linking.openURL('https://support.apple.com/guide/shortcuts/welcome/ios').catch(() => {});
      });
    } else {
      Alert.alert(t('ALERT_IOS_ONLY' as any), t('ALERT_IOS_ONLY_MSG' as any));
    }
  }, []);

  const handleShareDeepLink = useCallback(async () => {
    impactLight();
    await Share.share({
      message: `Wallet SMS Deep Link:\n${SMS_DEEP_LINK_TEMPLATE}\n\nPaste this into your iOS Shortcuts "Open URL" action, and append the SMS message text.`,
    });
  }, []);

  return (
    <View className="rounded-2xl p-4 mb-6" style={{ backgroundColor: colors.surface }}>

      {/* Header */}
      <View className="flex-row items-center mb-1">
        <View className="h-9 w-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: colors.primary + '15' }}>
          <Zap size={20} color={colors.primary} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
            {t('SMS_AUTO_IMPORT' as any)}
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 1 }}>
            {t('SMS_SUBTITLE' as any)}
          </Text>
        </View>
      </View>

      {/* Status / method cards */}
      <View className="mt-4 mb-4">

        {/* Primary method: Shortcuts */}
        <View className="rounded-xl p-3.5 mb-2.5" style={{ backgroundColor: colors.primary + '08', borderWidth: 1, borderColor: colors.primary + '20' }}>
          <View className="flex-row items-center mb-2">
            <Smartphone size={15} color={colors.primary} strokeWidth={2} />
            <Text className="ml-2" style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
              {t('SMS_RECOMMENDED' as any)}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, lineHeight: 18 }}>
            {t('SMS_SHORTCUTS_DESC' as any)}
          </Text>
        </View>

        {/* Fallback method: Paste */}
        <View className="rounded-xl p-3.5" style={{ backgroundColor: colors.surfaceSecondary }}>
          <View className="flex-row items-center mb-1">
            <MessageSquare size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text className="ml-2" style={{ fontSize: 12.5, fontWeight: '600', color: colors.textSecondary }}>
              {t('SMS_ALTERNATIVE' as any)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: colors.textTertiary, lineHeight: 17 }}>
            {t('SMS_PASTE_DESC' as any)}
          </Text>
        </View>
      </View>

      {/* Deep Link URL (copyable) */}
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
        {t('SMS_DEEP_LINK_LABEL' as any)}
      </Text>
      <Pressable
        onPress={handleCopyDeepLink}
        className="flex-row items-center rounded-xl px-3.5 py-3 mb-4"
        style={{ backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight }}
      >
        <Text className="flex-1 mr-2" numberOfLines={1} style={{ fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: colors.textPrimary }}>
          {SMS_DEEP_LINK_TEMPLATE}
        </Text>
        {copied ? (
          <View className="flex-row items-center">
            <CheckCircle2 size={14} color={colors.income} strokeWidth={2.5} />
            <Text className="ml-1" style={{ fontSize: 12, fontWeight: '600', color: colors.income }}>{t('SMS_COPIED' as any)}</Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <Copy size={14} color={colors.primary} strokeWidth={2} />
            <Text className="ml-1" style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{t('SMS_COPY' as any)}</Text>
          </View>
        )}
      </Pressable>

      {/* Step-by-step guide (expandable) */}
      <Pressable
        onPress={() => {
          impactLight();
          setExpandedGuide(!expandedGuide);
        }}
        className="flex-row items-center justify-between mb-3"
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
          {t('SMS_SETUP_GUIDE' as any)}
        </Text>
        <View className="flex-row items-center">
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '500' }}>
            {expandedGuide ? t('SHOW_LESS' as any) : t('SMS_SHOW_STEPS' as any)}
          </Text>
          <ChevronRight
            size={14}
            color={colors.primary}
            strokeWidth={2}
            style={{ transform: [{ rotate: expandedGuide ? '90deg' : '0deg' }], marginLeft: 2 }}
          />
        </View>
      </Pressable>

      {expandedGuide ? (
        <View className="mb-3">
          <SetupStep
            number={1}
            title={t('SMS_STEP_1_TITLE' as any)}
            description={t('SMS_STEP_1_DESC' as any)}
            highlight
          />
          <SetupStep
            number={2}
            title={t('SMS_STEP_2_TITLE' as any)}
            description={t('SMS_STEP_2_DESC' as any)}
          />
          <SetupStep
            number={3}
            title={t('SMS_STEP_3_TITLE' as any)}
            description={t('SMS_STEP_3_DESC' as any)}
          />
          <SetupStep
            number={4}
            title={t('SMS_STEP_4_TITLE' as any)}
            description={t('SMS_STEP_4_DESC' as any)}
            highlight
          />
          <SetupStep
            number={5}
            title={t('SMS_STEP_5_TITLE' as any)}
            description={t('SMS_STEP_5_DESC' as any)}
          />
          <SetupStep
            number={6}
            title={t('SMS_STEP_6_TITLE' as any)}
            description={t('SMS_STEP_6_DESC' as any)}
          />

          {/* Pro tip */}
          <View className="rounded-xl p-3 mt-1" style={{ backgroundColor: colors.warningBg }}>
            <View className="flex-row items-center mb-1">
              <CircleAlert size={14} color={colors.warning} strokeWidth={2} />
              <Text className="ml-1.5" style={{ fontSize: 12, fontWeight: '600', color: colors.warning }}>{t('SMS_PRO_TIP' as any)}</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
              {t('SMS_PRO_TIP_DESC' as any)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={{ gap: 8 }}>
        {/* Open Shortcuts */}
        <Pressable
          onPress={handleOpenShortcuts}
          className="flex-row items-center justify-center rounded-xl py-3"
          style={{ backgroundColor: colors.primary, height: 48 }}
        >
          <ExternalLink size={16} color="#fff" strokeWidth={2} />
          <Text className="ml-2" style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
            {t('SMS_OPEN_SHORTCUTS' as any)}
          </Text>
        </Pressable>

        {/* Row: Test + Paste SMS */}
        <View className="flex-row" style={{ gap: 8 }}>
          {/* Test deep link */}
          <Pressable
            onPress={handleTestDeepLink}
            className="flex-1 flex-row items-center justify-center rounded-xl py-3"
            style={{ backgroundColor: testSent ? colors.incomeBg : colors.surfaceSecondary, borderWidth: 1, borderColor: testSent ? colors.income + '40' : colors.borderLight }}
          >
            {testSent ? (
              <>
                <CheckCircle2 size={15} color={colors.income} strokeWidth={2} />
                <Text className="ml-1.5" style={{ fontSize: 13, fontWeight: '600', color: colors.income }}>{t('SMS_SENT' as any)}</Text>
              </>
            ) : (
              <>
                <Play size={14} color={colors.textSecondary} strokeWidth={2.5} />
                <Text className="ml-1.5" style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{t('SMS_TEST_LINK' as any)}</Text>
              </>
            )}
          </Pressable>

          {/* Go to Smart Input */}
          <Pressable
            onPress={() => {
              impactLight();
              router.push('/(tabs)/smart-input');
            }}
            className="flex-1 flex-row items-center justify-center rounded-xl py-3"
            style={{ backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight }}
          >
            <MessageSquare size={14} color={colors.textSecondary} strokeWidth={2} />
            <Text className="ml-1.5" style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary }}>{t('SMS_PASTE' as any)}</Text>
          </Pressable>
        </View>
      </View>

      {/* Future: native Shortcuts integration note */}
      <View className="flex-row items-start rounded-xl p-3 mt-4" style={{ backgroundColor: colors.infoBg }}>
        <HelpCircle size={14} color={colors.info} strokeWidth={2} style={{ marginTop: 1 }} />
        <Text className="ml-2 flex-1" style={{ fontSize: 11.5, color: colors.info, lineHeight: 16 }}>
          {t('SMS_FUTURE_NOTE' as any)}
        </Text>
      </View>
    </View>
  );
}

// ─── Currency options ────────────────────────────────────────────────

interface CurrencyOption {
  code: string;
  nameKey: string;
  locale: string;
  flag: string;
}

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'SAR', nameKey: 'CURRENCY_SAR', locale: 'en-SA', flag: '🇸🇦' },
  { code: 'AED', nameKey: 'CURRENCY_AED', locale: 'en-AE', flag: '🇦🇪' },
  { code: 'EGP', nameKey: 'CURRENCY_EGP', locale: 'en-EG', flag: '🇪🇬' },
  { code: 'KWD', nameKey: 'CURRENCY_KWD', locale: 'en-KW', flag: '🇰🇼' },
  { code: 'QAR', nameKey: 'CURRENCY_QAR', locale: 'en-QA', flag: '🇶🇦' },
  { code: 'BHD', nameKey: 'CURRENCY_BHD', locale: 'en-BH', flag: '🇧🇭' },
  { code: 'OMR', nameKey: 'CURRENCY_OMR', locale: 'en-OM', flag: '🇴🇲' },
  { code: 'JOD', nameKey: 'CURRENCY_JOD', locale: 'en-JO', flag: '🇯🇴' },
  { code: 'USD', nameKey: 'CURRENCY_USD', locale: 'en-US', flag: '🇺🇸' },
  { code: 'EUR', nameKey: 'CURRENCY_EUR', locale: 'en-DE', flag: '🇪🇺' },
  { code: 'GBP', nameKey: 'CURRENCY_GBP', locale: 'en-GB', flag: '🇬🇧' },
];

// ─── Account type labels ─────────────────────────────────────────────

const ACCOUNT_TYPE_META: Record<AccountType, { labelKey: string; icon: string }> = {
  cash: { labelKey: 'ACCOUNT_CASH', icon: '💵' },
  bank: { labelKey: 'ACCOUNT_BANK', icon: '🏦' },
  savings: { labelKey: 'ACCOUNT_SAVINGS', icon: '🐖' },
  credit_card: { labelKey: 'ACCOUNT_CREDIT_CARD', icon: '💳' },
};

const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'savings', 'credit_card'];

// ─── Screen ──────────────────────────────────────────────────────────

export default function ProfileScreen(): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { mutate: handleLogout, isPending: logoutPending } = useLogout();
  const { mutate: updateProfile, isPending: updatePending } = useUpdateProfile();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { mutate: addAccount, isPending: addingAccount } = useCreateAccount();
  const { mutate: removeAccount } = useDeleteAccount();
  const { mutate: editAccount, isPending: settlingAccount } = useUpdateAccount();
  const { data: goalsSummary } = useGoals(format(new Date(), 'yyyy-MM'));
  const { data: communities } = useCommunities();
  const { data: subscriptions } = useSubscriptions();
  const activeSubsCount = (subscriptions ?? []).filter((s) => s.is_active).length;

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [settleAccountId, setSettleAccountId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('bank');
  const [newAccountBalance, setNewAccountBalance] = useState('');

  const currentCurrency =
    CURRENCY_OPTIONS.find((c) => c.code === user?.currency) ?? CURRENCY_OPTIONS[0];

  const totalBalance = (accounts ?? [])
    .filter((a) => a.include_in_total)
    .reduce((sum, a) => sum + a.current_balance, 0);

  const onLogout = (): void => {
    notifyWarning();
    handleLogout();
  };

  const onCurrencySelect = (option: CurrencyOption): void => {
    impactLight();
    setShowCurrencyPicker(false); // Close immediately for instant feedback
    updateProfile(
      { currency: option.code, locale: option.locale },
      {
        onSuccess: () => {
          notifySuccess();
        },
      },
    );
  };

  const onAddAccount = (): void => {
    if (!newAccountName.trim()) return;
    impactLight();
    addAccount(
      {
        name: newAccountName.trim(),
        type: newAccountType,
        opening_balance: parseFloat(newAccountBalance) || 0,
      },
      {
        onSuccess: () => {
          notifySuccess();
          setNewAccountName('');
          setNewAccountBalance('');
          setShowAddAccount(false);
        },
      },
    );
  };

  const onDeleteAccount = (id: string): void => {
    notifyWarning();
    removeAccount(id);
  };

  return (
    <ErrorBoundary>
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: 24,
        }}
      >
        You
      </Text>

      {/* Profile card */}
      {user ? (
        <View
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: colors.isDark ? 0.15 : 0.06,
            shadowRadius: 16,
            elevation: 5,
          }}
        >
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
          <View
            className="h-14 w-14 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primary + '18' }}
          >
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
              {user.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            style={{ fontSize: 18, fontWeight: '600', color: colors.textPrimary }}
          >
            {user.full_name}
          </Text>
          <Text
            className="mt-1"
            style={{ fontSize: 14, color: colors.textSecondary }}
          >
            {user.email}
          </Text>
            </View>
          </LinearGradient>
        </View>
      ) : null}

      {/* ─── Primary feature entry cards ─────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>

        {/* Goals & Budgets */}
        <Pressable
          onPress={() => { impactLight(); router.push('/(tabs)/goals'); }}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 20,
            overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.18)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: colors.isDark ? 0.12 : 0.05,
            shadowRadius: 12,
            elevation: 4,
            paddingVertical: 16,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: 130,
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${colors.primary}18`,
              marginBottom: 10,
            }}
          >
            <Target size={24} color={colors.primary} strokeWidth={2} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6, textAlign: 'center' }}>
            {t('PROFILE_GOALS')}
          </Text>
          {goalsSummary && goalsSummary.goals.length > 0 ? (
            <View style={{ flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {(goalsSummary.on_track_count ?? 0) > 0 ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${colors.income}15` }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.income, textAlign: 'center' }}>
                    {goalsSummary.on_track_count} {t('GOALS_ON_TRACK')}
                  </Text>
                </View>
              ) : null}
              {((goalsSummary.near_limit_count ?? 0) + (goalsSummary.exceeded_count ?? 0)) > 0 ? (
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: `${colors.warning}15` }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: colors.warning, textAlign: 'center' }}>
                    {(goalsSummary.near_limit_count ?? 0) + (goalsSummary.exceeded_count ?? 0)} {t('GOALS_AT_RISK')}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>{t('GOALS_TRACK_BUDGETS')}</Text>
          )}
        </Pressable>

        {/* Subscriptions */}
        <Pressable
          onPress={() => { impactLight(); router.push('/(tabs)/subscriptions'); }}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 20,
            overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.18)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: colors.isDark ? 0.12 : 0.05,
            shadowRadius: 12,
            elevation: 4,
            paddingVertical: 16,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: 130,
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(236,72,153,0.12)',
              marginBottom: 10,
            }}
          >
            <Repeat size={24} color="#EC4899" strokeWidth={2} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6, textAlign: 'center' }}>
            {t('PROFILE_SUBSCRIPTIONS')}
          </Text>
          {activeSubsCount > 0 ? (
            <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>
              {activeSubsCount} {t('SUBS_ACTIVE')}
            </Text>
          ) : (
            <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>{t('SUBS_TRACK_RECURRING')}</Text>
          )}
        </Pressable>

        {/* Bill Split */}
        <Pressable
          onPress={() => { impactLight(); router.push('/(tabs)/community'); }}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: 20,
            overflow: 'hidden',
            opacity: pressed ? 0.9 : 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.isDark ? 'rgba(139,92,246,0.18)' : 'rgba(203,213,225,0.5)',
            shadowColor: colors.isDark ? '#8B5CF6' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: colors.isDark ? 0.12 : 0.05,
            shadowRadius: 12,
            elevation: 4,
            paddingVertical: 16,
            paddingHorizontal: 10,
            alignItems: 'center',
            justifyContent: 'flex-start',
            minHeight: 130,
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(56,189,248,0.12)',
              marginBottom: 10,
            }}
          >
            <Users size={24} color="#38BDF8" strokeWidth={2} />
          </View>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6, textAlign: 'center' }}>
            {t('PROFILE_BILL_SPLIT')}
          </Text>
          {communities && communities.length > 0 ? (
            <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>
              {communities.length} {communities.length === 1 ? t('SPLIT_GROUP') : t('SPLIT_GROUPS')}
            </Text>
          ) : (
            <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center' }}>{t('SPLIT_WITH_FRIENDS')}</Text>
          )}
        </Pressable>
      </View>

      {/* Preferences section */}
      <Text
        className="mb-3"
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {t('SETTINGS_PREFERENCES')}
      </Text>

      <View
        className="rounded-2xl mb-6 overflow-hidden"
        style={{
          backgroundColor: colors.glassBg,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        }}
      >
        {/* Currency row */}
        <Pressable
          onPress={() => {
            impactLight();
            setShowCurrencyPicker(!showCurrencyPicker);
          }}
          className="flex-row items-center justify-between px-4 py-4"
          style={{
            borderBottomWidth: showCurrencyPicker ? 1 : 0,
            borderBottomColor: colors.borderLight,
          }}
        >
          <View className="flex-row items-center gap-3">
            <Globe size={20} color={colors.textSecondary} strokeWidth={1.8} />
            <Text style={{ fontSize: 15, color: colors.textPrimary }}>Currency</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 15, color: colors.textSecondary }}>
              {currentCurrency.flag} {currentCurrency.code}
            </Text>
            <ChevronRight
              size={16}
              color={colors.textTertiary}
              strokeWidth={2}
              style={{
                transform: [{ rotate: showCurrencyPicker ? '90deg' : '0deg' }],
              }}
            />
          </View>
        </Pressable>

        {/* Currency picker (expandable) */}
        {showCurrencyPicker ? (
          <View className="px-2 py-2">
            {CURRENCY_OPTIONS.map((option) => {
              const isSelected = option.code === user?.currency;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => onCurrencySelect(option)}
                  disabled={updatePending}
                  className="flex-row items-center px-3 py-3 rounded-xl"
                  style={{
                    backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                    opacity: updatePending ? 0.6 : 1,
                  }}
                >
                  <Text style={{ fontSize: 20, marginRight: 10 }}>{option.flag}</Text>
                  <View className="flex-1">
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {t(option.nameKey as any)}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                      {option.code}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Check size={18} color={colors.primary} strokeWidth={3} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* Theme / Night mode row */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Moon size={20} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={{ fontSize: 15, color: colors.textPrimary }}>{t('SETTINGS_APPEARANCE')}</Text>
            </View>
          </View>
          <View className="flex-row px-4 pb-4 gap-2">
            {([
              { key: 'light' as const, label: t('APPEARANCE_LIGHT' as any), Icon: Sun },
              { key: 'dark' as const, label: t('APPEARANCE_DARK' as any), Icon: Moon },
              { key: 'system' as const, label: t('APPEARANCE_SYSTEM' as any), Icon: Monitor },
            ]).map(({ key, label, Icon }) => {
              const isActive = themeMode === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => { impactLight(); setThemeMode(key); }}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                  style={{
                    backgroundColor: isActive ? colors.primary + '18' : colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.borderLight,
                  }}
                >
                  <Icon size={15} color={isActive ? colors.primary : colors.textSecondary} strokeWidth={2} />
                  <Text
                    className="ml-1.5"
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Language row */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Languages size={20} color={colors.textSecondary} strokeWidth={1.8} />
              <Text style={{ fontSize: 15, color: colors.textPrimary }}>{t('SETTINGS_LANGUAGE')}</Text>
            </View>
          </View>
          <View className="flex-row px-4 pb-4 gap-2">
            {([
              { key: 'en' as Language, label: 'English', flag: '🇺🇸' },
              { key: 'ar' as Language, label: 'عربي', flag: '🇸🇦' },
            ]).map(({ key, label, flag }) => {
              const isActive = language === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    impactLight();
                    setLanguage(key);
                    Alert.alert(
                      key === 'ar' ? 'تم تغيير اللغة' : 'Language Changed',
                      key === 'ar' ? 'أعد تشغيل التطبيق لتفعيل العربية بالكامل' : 'Restart the app to fully apply English layout',
                    );
                  }}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl"
                  style={{
                    backgroundColor: isActive ? colors.primary + '18' : colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 16, marginRight: 6 }}>{flag}</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* ─── Accounts section ───────────────────────────────────────── */}
      <Text
        className="mb-3"
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        Accounts
      </Text>

      {/* Total balance */}
      <View
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: colors.surface }}
      >
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>
          Total Balance
        </Text>
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary }}>
          {formatAmount(totalBalance)}
        </Text>
      </View>

      {/* Account list */}
      {accountsLoading ? (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        (accounts ?? []).map((account) => {
          const meta = ACCOUNT_TYPE_META[account.type] ?? ACCOUNT_TYPE_META.bank;
          const isSettling = settleAccountId === account.id;
          return (
            <View
              key={account.id}
              className="rounded-2xl p-4 mb-2"
              style={{ backgroundColor: colors.surface }}
            >
              <View className="flex-row items-center">
                <Text style={{ fontSize: 24, marginRight: 12 }}>{meta.icon}</Text>
                <View className="flex-1">
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
                    {account.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                    {t(meta.labelKey as any)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    impactLight();
                    if (isSettling) {
                      setSettleAccountId(null);
                      setSettleAmount('');
                    } else {
                      setSettleAccountId(account.id);
                      setSettleAmount(String(account.current_balance));
                    }
                  }}
                  hitSlop={8}
                  style={{ marginRight: 8 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: isSettling ? colors.primary : colors.textPrimary }}>
                    {formatAmount(account.current_balance)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => onDeleteAccount(account.id)}
                  hitSlop={8}
                >
                  <Trash2 size={16} color={colors.textTertiary} strokeWidth={1.8} />
                </Pressable>
              </View>

              {/* Settle (adjust) balance inline */}
              {isSettling ? (
                <View className="flex-row items-center mt-3 gap-2" style={{ paddingLeft: 36 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 15,
                      fontWeight: '600',
                      color: colors.textPrimary,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.primary,
                      paddingBottom: 4,
                    }}
                    keyboardType="decimal-pad"
                    value={settleAmount}
                    onChangeText={setSettleAmount}
                    autoFocus
                    selectTextOnFocus
                    placeholder="New balance"
                    placeholderTextColor={colors.textTertiary}
                  />
                  <Pressable
                    onPress={() => {
                      const parsed = parseFloat(settleAmount);
                      if (isNaN(parsed)) {
                        notifyError();
                        return;
                      }
                      impactMedium();
                      editAccount(
                        { id: account.id, input: { current_balance: Math.round(parsed * 100) / 100 } },
                        {
                          onSuccess: () => {
                            notifySuccess();
                            setSettleAccountId(null);
                            setSettleAmount('');
                          },
                        },
                      );
                    }}
                    disabled={settlingAccount}
                    className="rounded-lg px-4 py-2"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                      {settlingAccount ? '...' : 'Set'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      {/* Add account button / form */}
      {showAddAccount ? (
        <View
          className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: colors.surface }}
        >
          <TextInput
            style={{ fontSize: 15, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 12 }}
            placeholder="Account name"
            placeholderTextColor={colors.textTertiary}
            value={newAccountName}
            onChangeText={setNewAccountName}
          />

          {/* Account type selector */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {ACCOUNT_TYPES.map((type) => {
              const meta = ACCOUNT_TYPE_META[type];
              const isActive = newAccountType === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => setNewAccountType(type)}
                  className="flex-row items-center rounded-lg px-3 py-2"
                  style={{
                    backgroundColor: isActive ? colors.primary + '18' : colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.borderLight,
                  }}
                >
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{meta.icon}</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? colors.primary : colors.textSecondary,
                    }}
                  >
                    {t(meta.labelKey as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={{ fontSize: 15, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 12 }}
            placeholder="Opening balance (0.00)"
            placeholderTextColor={colors.textTertiary}
            value={newAccountBalance}
            onChangeText={setNewAccountBalance}
            keyboardType="decimal-pad"
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={() => setShowAddAccount(false)}
              className="flex-1 items-center py-3 rounded-xl"
              style={{ backgroundColor: colors.surfaceSecondary }}
            >
              <Text style={{ fontSize: 15, fontWeight: '500', color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onAddAccount}
              disabled={addingAccount || !newAccountName.trim()}
              className="flex-1 items-center py-3 rounded-xl"
              style={{ backgroundColor: colors.primary, opacity: addingAccount ? 0.6 : 1 }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textInverse }}>
                {addingAccount ? '...' : 'Add'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            impactLight();
            setShowAddAccount(true);
          }}
          className="flex-row items-center justify-center gap-2 rounded-2xl p-4 mb-6"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed' }}
        >
          <Plus size={18} color={colors.primary} strokeWidth={2} />
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.primary }}>
            Add Account
          </Text>
        </Pressable>
      )}

      {/* ─── SMS Automation section ──────────────────────────────────── */}
      <Text
        className="mb-3"
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        WhatsApp
      </Text>

      <FeatureGate feature="whatsappUsage">
        <WhatsAppConnect />
      </FeatureGate>

      <Text
        className="mb-3"
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        SMS Automation
      </Text>

      <SMSAutomationSetup />

      {/* Trash */}
      <Pressable
        onPress={() => { impactLight(); router.push('/(tabs)/trash'); }}
        className="flex-row items-center gap-3 rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
        }}
      >
        <Trash2 size={20} color={colors.textSecondary} strokeWidth={2} />
        <View className="flex-1">
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
            Trash
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>
            Recover recently deleted items (7 days)
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textTertiary} strokeWidth={2} />
      </Pressable>

      {/* Sign out */}
      <Pressable
        onPress={onLogout}
        disabled={logoutPending}
        className="flex-row items-center gap-3 rounded-2xl p-4"
        style={{
          backgroundColor: colors.expenseBg,
          opacity: logoutPending ? 0.6 : 1,
        }}
      >
        <LogOut size={20} color={colors.expense} strokeWidth={2} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.expense }}>
          {STRINGS.LOGOUT_BUTTON}
        </Text>
      </Pressable>
    </ScrollView>

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
    </ErrorBoundary>
  );
}
