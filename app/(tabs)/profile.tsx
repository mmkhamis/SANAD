import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Linking, Alert, Share, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { LogOut, ChevronRight, Check, Globe, Plus, Wallet, Trash2, MessageSquare, ExternalLink, HelpCircle, Copy, Zap, CheckCircle2, CircleAlert, ArrowRight, Play, Smartphone, MessageCircle, Moon, Sun, Monitor, Languages, Mail } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { impactLight, impactMedium, notifyWarning, notifySuccess, notifyError } from '../../utils/haptics';
import { formatAmount } from '../../utils/currency';
import { SmartInputButton } from '../../components/ui/SmartInputButton';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { SMSShortcutPresets } from '../../components/finance/SMSShortcutPresets';
import { SupportChatCard } from '../../components/ui/SupportChatCard';
import { COLORS } from '../../constants/colors';
import { useT } from '../../lib/i18n';
import { useLanguageStore, type Language } from '../../store/language-store';
import { useAuthStore } from '../../store/auth-store';
import { useThemeStore } from '../../store/theme-store';
import { useDevPlanStore } from '../../store/dev-plan-store';
import { useDevPingStore, DEV_PING_INTERVALS, type DevPingInterval } from '../../services/dev-test-notifications';
import { useSmsWebhookUrl, useRotateSmsWebhookToken } from '../../hooks/useSmsWebhookUrl';
import type { UserPlan } from '../../types/index';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { useLogout } from '../../hooks/useLogout';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount } from '../../hooks/useAccounts';
import { ALL_BANK_PRESETS, type BankPreset } from '../../constants/bank-presets';
import { useRTL } from '../../hooks/useRTL';
import type { AccountType } from '../../types/index';

// ─── Deep link URL for SMS automation ────────────────────────────────

const SMS_DEEP_LINK_TEMPLATE = 'sanad://sms?text=';
const SAMPLE_SMS = 'تم إضافة تحويل لبطاقتكم بمبلغ 400.00 جم من محمد';

// ─── Twilio Sandbox config ───────────────────────────────────────────

const TWILIO_SANDBOX_NUMBER = '+14155238886';
const TWILIO_SANDBOX_KEYWORD = 'join <your-statement-zebra>'; // replace with actual keyword from Twilio console

// ─── WhatsApp Connect Component ──────────────────────────────────────

function WhatsAppConnect(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign, isRTL } = useRTL();
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
      {/* Header: RTL-aware row + logical margins so the green status pill lands
          at the trailing edge, not on top of the icon or title in Arabic. */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginEnd: 12, backgroundColor: '#25D366' + '15' }}>
          <MessageCircle size={20} color="#25D366" strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign }}>
            {t('WHATSAPP_TITLE' as any)}
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 1, textAlign }}>
            {isConnected ? t('WHATSAPP_CONNECTED' as any) : t('WHATSAPP_NOT_CONNECTED' as any)}
          </Text>
        </View>
        {isConnected ? (
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginStart: 8, backgroundColor: '#25D366' }}>
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

// ─── Silent webhook URL box ──────────────────────────────────────────
// Primary method: the user's personal HTTPS URL that iOS Shortcuts can
// call via "Get Contents of URL" — runs silently, never opens the app,
// pushes a notification when done.

function SmsWebhookUrlBox(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { data, isLoading } = useSmsWebhookUrl();
  const { mutate: rotate, isPending: rotating } = useRotateSmsWebhookToken();
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  const url = data?.urlTemplate ?? '';
  const sampleUrl = data?.sampleUrl ?? '';

  const handleCopy = useCallback(async () => {
    if (!url) return;
    impactLight();
    await Clipboard.setStringAsync(url);
    setCopied(true);
    notifySuccess();
    setTimeout(() => setCopied(false), 2500);
  }, [url]);

  const handleTest = useCallback(async () => {
    if (!sampleUrl) return;
    impactMedium();
    setTesting(true);
    try {
      const res = await fetch(sampleUrl);
      if (res.ok) notifySuccess();
      else notifyError();
    } catch {
      notifyError();
    } finally {
      setTimeout(() => setTesting(false), 1500);
    }
  }, [sampleUrl]);

  const handleRotate = useCallback(() => {
    Alert.alert(
      'Rotate webhook token?',
      'Any existing Shortcuts using the old URL will stop working. You will need to re-paste the new URL into Shortcuts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rotate',
          style: 'destructive',
          onPress: () => {
            impactMedium();
            rotate();
          },
        },
      ],
    );
  }, [rotate]);

  return (
    <View
      className="rounded-xl p-3.5 mb-4"
      style={{ backgroundColor: colors.income + '0C', borderWidth: 1, borderColor: colors.income + '33' }}
    >
      <View className="flex-row items-center mb-1.5">
        <Zap size={13} color={colors.income} strokeWidth={2.5} />
        <Text className="ml-1.5" style={{ fontSize: 12, fontWeight: '700', color: colors.income }}>
          Silent URL · no app open
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 10 }}>
        In Shortcuts use the <Text style={{ fontWeight: '700' }}>Get Contents of URL</Text> action (not Open URL). Wallet will stay in the background and only send you a notification.
      </Text>

      <Pressable
        onPress={handleCopy}
        disabled={!url || isLoading}
        className="flex-row items-center rounded-lg px-3 py-2.5 mb-2"
        style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
      >
        <Text
          className="flex-1 mr-2"
          numberOfLines={1}
          style={{ fontSize: 11.5, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: colors.textPrimary }}
        >
          {isLoading ? 'Loading…' : url || 'Sign in to generate'}
        </Text>
        {copied ? (
          <View className="flex-row items-center">
            <CheckCircle2 size={13} color={colors.income} strokeWidth={2.5} />
            <Text className="ml-1" style={{ fontSize: 11.5, fontWeight: '700', color: colors.income }}>Copied</Text>
          </View>
        ) : (
          <View className="flex-row items-center">
            <Copy size={13} color={colors.primary} strokeWidth={2} />
            <Text className="ml-1" style={{ fontSize: 11.5, fontWeight: '700', color: colors.primary }}>Copy</Text>
          </View>
        )}
      </Pressable>

      <View className="flex-row" style={{ gap: 8 }}>
        <Pressable
          onPress={handleTest}
          disabled={!sampleUrl || testing}
          className="flex-1 rounded-lg items-center justify-center py-2.5"
          style={{ backgroundColor: colors.primary + '14', borderWidth: 1, borderColor: colors.primary + '33' }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
            {testing ? 'Testing…' : 'Test now'}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleRotate}
          disabled={rotating}
          className="rounded-lg items-center justify-center px-3 py-2.5"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>
            {rotating ? '…' : 'Rotate'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SMSAutomationSetup(): React.ReactElement {
  const colors = useThemeColors();
  const router = useRouter();
  const t = useT();
  const { rowDir, textAlign } = useRTL();
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
      message: `SANAD SMS Deep Link:\n${SMS_DEEP_LINK_TEMPLATE}\n\nPaste this into your iOS Shortcuts "Open URL" action, and append the SMS message text.`,
    });
  }, []);

  return (
    <View className="rounded-2xl p-4 mb-6" style={{ backgroundColor: colors.surface }}>

      {/* Header: RTL-aware. Icon sits on the reading-start edge, title reads
          from the same edge — never overlaps the icon or spills across. */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 4 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginEnd: 12, backgroundColor: colors.primary + '15' }}>
          <Zap size={20} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign }}>
            {t('SMS_AUTO_IMPORT' as any)}
          </Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginTop: 1, textAlign }}>
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

      {/* Silent webhook URL (RECOMMENDED — no app foreground) */}
      <SmsWebhookUrlBox />

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

// ─── Settings Row ─────────────────────────────────────────────────────

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  isLast = false,
  danger = false,
  rightElement,
}: {
  icon: React.ReactElement;
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  danger?: boolean;
  rightElement?: React.ReactElement;
}): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL, rowDir, textAlign } = useRTL();
  return (
    <>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: rowDir,
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: 12,
            backgroundColor: danger ? colors.expenseBg : colors.surfaceSecondary,
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 15,
            color: danger ? colors.expense : colors.textPrimary,
            textAlign,
          }}
        >
          {label}
        </Text>
        {rightElement ?? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {value ? (
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>{value}</Text>
            ) : null}
            {onPress ? (
              <ChevronRight
                size={16}
                color={colors.textTertiary}
                strokeWidth={2}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            ) : null}
          </View>
        )}
      </Pressable>
      {!isLast ? (
        <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: 62 }} />
      ) : null}
    </>
  );
}

// ─── Settings Card (grouped) ──────────────────────────────────────────

function SettingsCard({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: 8,
      }}
    >
      {children}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }): React.ReactElement {
  const colors = useThemeColors();
  const { textAlign } = useRTL();
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 4,
        textAlign,
      }}
    >
      {label}
    </Text>
  );
}

// ─── Developer Tools (dev builds only) ───────────────────────────────

function DevToolsCard(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign } = useRTL();
  const override = useDevPlanStore((s) => s.override);
  const setOverride = useDevPlanStore((s) => s.setOverride);

  const PlanPill = ({
    value,
    label,
    tint,
  }: {
    value: UserPlan | null;
    label: string;
    tint: string;
  }): React.ReactElement => {
    const active = override === value;
    return (
      <Pressable
        onPress={() => {
          impactLight();
          setOverride(value);
        }}
        style={{
          flex: 1,
          paddingVertical: 9,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: active ? tint + '22' : colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: active ? tint + '66' : colors.borderLight,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: active ? '700' : '500',
            color: active ? tint : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <>
      <SectionHeader label={t('DEV_TOOLS_SECTION')} />
      <SettingsCard>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign }}>
            {t('DEV_PLAN_LABEL')}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign }}>
            {t('DEV_PLAN_HINT')}
          </Text>
        </View>
        <View style={{ flexDirection: rowDir, gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
          <PlanPill value={null} label="Real" tint={colors.textSecondary} />
          <PlanPill value="free" label="Free" tint="#94A3B8" />
          <PlanPill value="pro" label="Pro" tint="#F59E0B" />
          <PlanPill value="max" label="Max" tint="#A855F7" />
        </View>
        <DevPingRow />
      </SettingsCard>
    </>
  );
}

// ─── Dev ping toggle (1-minute random notifications) ─────────────────

function DevPingRow(): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign } = useRTL();
  const interval = useDevPingStore((s) => s.interval);
  const setInterval = useDevPingStore((s) => s.setInterval);

  const Pill = ({
    value,
    label,
    tint,
  }: {
    value: DevPingInterval;
    label: string;
    tint: string;
  }): React.ReactElement => {
    const active = interval === value;
    return (
      <Pressable
        onPress={() => {
          impactLight();
          setInterval(value);
        }}
        style={{
          flex: 1,
          paddingVertical: 9,
          borderRadius: 10,
          alignItems: 'center',
          backgroundColor: active ? tint + '22' : colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: active ? tint + '66' : colors.borderLight,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: active ? '700' : '500',
            color: active ? tint : colors.textSecondary,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.borderLight,
      }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign }}>
          Test notifications
        </Text>
        <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2, textAlign }}>
          Fires a random insight/tip at the chosen interval. Dev only.
        </Text>
      </View>
      <View style={{ flexDirection: rowDir, gap: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
        {DEV_PING_INTERVALS.map((p) => (
          <Pill key={p.key} value={p.key} label={p.label} tint={p.tint} />
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen(): React.ReactElement {
  const colors = useThemeColors();
  const { hPad } = useResponsive();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const t = useT();
  const { isRTL, textAlign, rowDir } = useRTL();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const { mutate: handleLogout, isPending: logoutPending } = useLogout();
  const { mutate: updateProfile, isPending: updatePending } = useUpdateProfile();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { mutate: addAccount, isPending: addingAccount } = useCreateAccount();
  const { mutate: removeAccount } = useDeleteAccount();
  const { mutate: editAccount, isPending: settlingAccount } = useUpdateAccount();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNameAr, setEditNameAr] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showSMS, setShowSMS] = useState(false);
  const [settleAccountId, setSettleAccountId] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>('bank');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountColor, setNewAccountColor] = useState('#4A7AE8');
  const [newAccountLogo, setNewAccountLogo] = useState<string | null>(null);
  const [addAccountStep, setAddAccountStep] = useState<'pick' | 'form'>('pick');

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
      { onSuccess: () => { notifySuccess(); } },
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
          setNewAccountColor('#4A7AE8');
          setNewAccountLogo(null);
          setAddAccountStep('pick');
          setShowAddAccount(false);
        },
      },
    );
  };

  const onBankPresetSelect = (preset: BankPreset): void => {
    impactLight();
    setNewAccountName(isRTL ? preset.nameAr : preset.nameEn);
    setNewAccountType(preset.type);
    setNewAccountColor(preset.color);
    setNewAccountLogo(preset.logo);
    setAddAccountStep('form');
  };

  const onDeleteAccount = (id: string): void => {
    notifyWarning();
    removeAccount(id);
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <ErrorBoundary>
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: hPad,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={t('YOU_PAGE_TITLE' as any)} subtitle={t('PROFILE_SUBTITLE' as any)} />


      {/* PROFILE HERO CARD */}
      {user ? (
        <Card style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: rowDir, alignItems: 'center' }}>
              <LinearGradient
                colors={[COLORS.claude.p400, COLORS.claude.p700]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginEnd: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}
              >
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 }}>{initials}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 1, textAlign }}>{user.full_name}</Text>
                {user.name_ar ? (
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 2, textAlign }}>{user.name_ar}</Text>
                ) : null}
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign }}>{user.email}</Text>
              </View>
              <Pressable
                onPress={() => { impactLight(); setEditName(user.full_name ?? ''); setEditNameAr(user.name_ar ?? ''); setEditBirthdate(user.date_of_birth ?? ''); setShowEditProfile((v) => !v); }}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: showEditProfile ? colors.primary + '18' : colors.surfaceSecondary, borderWidth: 1, borderColor: showEditProfile ? colors.primary + '40' : colors.borderLight }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: showEditProfile ? colors.primary : colors.textSecondary }}>
                  {showEditProfile ? t('SAVE_PROFILE' as any) : t('EDIT_PROFILE' as any)}
                </Text>
              </Pressable>
            </View>

            {showEditProfile ? (
              <View style={{ marginTop: 16, gap: 12 }}>
                <View style={{ height: 1, backgroundColor: colors.borderLight }} />
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>{t('FULL_NAME_LABEL' as any)}</Text>
                  <View style={{ borderRadius: 10, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, height: 44, justifyContent: 'center' }}>
                    <TextInput value={editName} onChangeText={setEditName} style={{ fontSize: 15, color: colors.textPrimary, textAlign }} placeholderTextColor={colors.textTertiary} placeholder={t('FULL_NAME_LABEL' as any)} />
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>{t('NAME_AR_LABEL' as any)}</Text>
                  <View style={{ borderRadius: 10, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, height: 44, justifyContent: 'center' }}>
                    <TextInput value={editNameAr} onChangeText={setEditNameAr} style={{ fontSize: 15, color: colors.textPrimary, textAlign: 'right' }} placeholderTextColor={colors.textTertiary} placeholder={t('NAME_AR_PLACEHOLDER' as any)} />
                  </View>
                </View>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>{t('BIRTHDATE' as any)}</Text>
                  <View style={{ borderRadius: 10, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 12, height: 44, justifyContent: 'center' }}>
                    <TextInput value={editBirthdate} onChangeText={setEditBirthdate} style={{ fontSize: 15, color: colors.textPrimary, textAlign }} placeholderTextColor={colors.textTertiary} placeholder={t('SMART_INPUT_DATE_PLACEHOLDER')} />
                  </View>
                </View>
                <Pressable
                  onPress={() => { updateProfile({ full_name: editName.trim(), name_ar: editNameAr.trim() || null, date_of_birth: editBirthdate || null }, { onSuccess: () => { notifySuccess(); setShowEditProfile(false); } }); }}
                  disabled={updatePending}
                  style={{ borderRadius: 12, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: updatePending ? 0.7 : 1 }}
                >
                  {updatePending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>{t('SAVE_PROFILE' as any)}</Text>}
                </Pressable>
              </View>
            ) : null}
        </Card>
      ) : null}

      {/* PREFERENCES */}
      <SectionHeader label={t('SETTINGS_PREFERENCES')} />
      <SettingsCard>
        <SettingsRow
          icon={<Globe size={17} color={colors.textSecondary} strokeWidth={1.8} />}
          label={t('SETTINGS_CURRENCY' as any)}
          value={`${currentCurrency.flag} ${currentCurrency.code}`}
          onPress={() => { impactLight(); setShowCurrencyPicker((v) => !v); }}
        />
        {showCurrencyPicker ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
            {CURRENCY_OPTIONS.map((option) => {
              const isSelected = option.code === user?.currency;
              return (
                <Pressable key={option.code} onPress={() => onCurrencySelect(option)} disabled={updatePending}
                  style={{ flexDirection: rowDir, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: isSelected ? colors.primary + '10' : 'transparent', opacity: updatePending ? 0.6 : 1 }}
                >
                  <Text style={{ fontSize: 20, marginEnd: 10 }}>{option.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: isSelected ? '600' : '400', color: isSelected ? colors.primary : colors.textPrimary }}>{t(option.nameKey as any)}</Text>
                    <Text style={{ fontSize: 12, color: colors.textTertiary }}>{option.code}</Text>
                  </View>
                  {isSelected ? <Check size={17} color={colors.primary} strokeWidth={3} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View>
          <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: 62 }} />
          <View style={{ flexDirection: rowDir, alignItems: 'center', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginEnd: 12, backgroundColor: colors.surfaceSecondary }}>
              <Moon size={17} color={colors.textSecondary} strokeWidth={1.8} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary, textAlign }}>{t('SETTINGS_APPEARANCE')}</Text>
          </View>
          <View style={{ flexDirection: rowDir, paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
            {([
              { key: 'light' as const, label: t('APPEARANCE_LIGHT' as any), Icon: Sun },
              { key: 'dark' as const, label: t('APPEARANCE_DARK' as any), Icon: Moon },
              { key: 'system' as const, label: t('APPEARANCE_SYSTEM' as any), Icon: Monitor },
            ]).map(({ key, label, Icon }) => {
              const isActive = themeMode === key;
              return (
                <Pressable key={key} onPress={() => { impactLight(); setThemeMode(key); }}
                  style={{ flex: 1, flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: isActive ? colors.primary + '15' : colors.surfaceSecondary, borderWidth: 1, borderColor: isActive ? colors.primary + '50' : colors.borderLight }}
                >
                  <Icon size={14} color={isActive ? colors.primary : colors.textSecondary} strokeWidth={2} />
                  <Text style={{ marginStart: 5, fontSize: 13, fontWeight: isActive ? '600' : '400', color: isActive ? colors.primary : colors.textSecondary }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: 62 }} />
          <View style={{ flexDirection: rowDir, alignItems: 'center', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 8 }}>
            <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginEnd: 12, backgroundColor: colors.surfaceSecondary }}>
              <Languages size={17} color={colors.textSecondary} strokeWidth={1.8} />
            </View>
            <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary, textAlign }}>{t('SETTINGS_LANGUAGE')}</Text>
          </View>
          <View style={{ flexDirection: rowDir, paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
            {([
              { key: 'en' as Language, label: 'English', flag: '🇺🇸' },
              { key: 'ar' as Language, label: 'عربي', flag: '🇸🇦' },
            ]).map(({ key, label, flag }) => {
              const isActive = language === key;
              return (
                <Pressable key={key}
                  onPress={() => { impactLight(); setLanguage(key); Alert.alert(t('LANG_CHANGED_TITLE'), t('LANG_CHANGED_DESC')); }}
                  style={{ flex: 1, flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: isActive ? colors.primary + '15' : colors.surfaceSecondary, borderWidth: 1, borderColor: isActive ? colors.primary + '50' : colors.borderLight }}
                >
                  <Text style={{ fontSize: 16, marginEnd: 6 }}>{flag}</Text>
                  <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '400', color: isActive ? colors.primary : colors.textSecondary }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </SettingsCard>

      {/* ACCOUNTS */}
      <SectionHeader label={t('SETTINGS_ACCOUNTS' as any)} />
      <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, marginBottom: 8, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '25' }}>
        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
          <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '18' }}>
            <Wallet size={17} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>{t('SETTINGS_TOTAL_BALANCE' as any)}</Text>
        </View>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>{formatAmount(totalBalance)}</Text>
      </View>

      <SettingsCard>
        <Pressable onPress={() => { impactLight(); setShowAccounts((v) => !v); }} style={{ flexDirection: rowDir, alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginEnd: 12, backgroundColor: colors.surfaceSecondary }}>
            <Wallet size={17} color={colors.textSecondary} strokeWidth={1.8} />
          </View>
          <Text style={{ flex: 1, fontSize: 15, color: colors.textPrimary, textAlign }}>{t('PROFILE_MANAGE_ACCOUNTS' as any)}</Text>
          <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, color: colors.textTertiary }}>{(accounts ?? []).length}</Text>
            <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: showAccounts ? '90deg' : '0deg' }, { scaleX: isRTL ? -1 : 1 }] }} />
          </View>
        </Pressable>

        {showAccounts ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            <View style={{ height: 1, backgroundColor: colors.borderLight, marginBottom: 8 }} />
            {accountsLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 12 }} />
            ) : (
              (accounts ?? []).map((account) => {
                const meta = ACCOUNT_TYPE_META[account.type] ?? ACCOUNT_TYPE_META.bank;
                const isSettling = settleAccountId === account.id;
                return (
                  <View key={account.id} style={{ marginBottom: 6 }}>
                    <View style={{ flexDirection: rowDir, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.surfaceSecondary }}>
                      <Text style={{ fontSize: 20, marginEnd: 10 }}>{meta.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign }}>{account.name}</Text>
                        <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign }}>{t(meta.labelKey as any)}</Text>
                      </View>
                      <Pressable onPress={() => { impactLight(); if (isSettling) { setSettleAccountId(null); setSettleAmount(''); } else { setSettleAccountId(account.id); setSettleAmount(String(account.current_balance)); } }} hitSlop={8} style={{ marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: isSettling ? colors.primary : colors.textPrimary }}>{formatAmount(account.current_balance)}</Text>
                      </Pressable>
                      <Pressable onPress={() => onDeleteAccount(account.id)} hitSlop={8}>
                        <Trash2 size={15} color={colors.textTertiary} strokeWidth={1.8} />
                      </Pressable>
                    </View>
                    {isSettling ? (
                      <View style={{ flexDirection: rowDir, alignItems: 'center', marginTop: 6, marginStart: 12, gap: 8 }}>
                        <TextInput style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary, borderBottomWidth: 1.5, borderBottomColor: colors.primary, paddingBottom: 4 }} keyboardType="decimal-pad" value={settleAmount} onChangeText={setSettleAmount} autoFocus selectTextOnFocus placeholder="New balance" placeholderTextColor={colors.textTertiary} />
                        <Pressable onPress={() => { const parsed = parseFloat(settleAmount); if (isNaN(parsed)) { notifyError(); return; } impactMedium(); editAccount({ id: account.id, input: { current_balance: Math.round(parsed * 100) / 100 } }, { onSuccess: () => { notifySuccess(); setSettleAccountId(null); setSettleAmount(''); } }); }} disabled={settlingAccount} style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.primary }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>{settlingAccount ? '...' : 'Set'}</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}

            {showAddAccount ? (
              <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.surfaceSecondary, marginTop: 4 }}>
                {addAccountStep === 'pick' ? (
                  <>
                    {/* Bank preset grid */}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 10, textAlign }}>{t('SUBS_CHOOSE' as any)}</Text>
                    <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                      <View style={{ flexDirection: rowDir, flexWrap: 'wrap', gap: 8 }}>
                        {ALL_BANK_PRESETS.map((preset) => (
                          <Pressable
                            key={preset.id}
                            onPress={() => onBankPresetSelect(preset)}
                            style={{
                              width: '31%',
                              alignItems: 'center',
                              borderRadius: 12,
                              paddingHorizontal: 4,
                              paddingVertical: 10,
                              backgroundColor: colors.surface,
                              borderWidth: 1,
                              borderColor: colors.borderLight,
                            }}
                          >
                            {preset.logo ? (
                              <Image
                                source={{ uri: preset.logo }}
                                style={{ width: 32, height: 32, marginBottom: 6, borderRadius: 8 }}
                                contentFit="contain"
                              />
                            ) : (
                              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: preset.color, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>{(isRTL ? preset.nameAr : preset.nameEn).slice(0, 1)}</Text>
                              </View>
                            )}
                            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' }}>
                              {isRTL ? preset.nameAr : preset.nameEn}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                    {/* Custom account button */}
                    <Pressable
                      onPress={() => { impactLight(); setAddAccountStep('form'); }}
                      style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: colors.primary + '30', backgroundColor: colors.primary + '10' }}
                    >
                      <Plus size={16} color={colors.primary} strokeWidth={2} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary }}>{t('SUBS_CUSTOM' as any)}</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowAddAccount(false)} style={{ alignItems: 'center', paddingVertical: 8, marginTop: 6 }}>
                      <Text style={{ fontSize: 13, color: colors.textTertiary }}>{t('CANCEL' as any)}</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    {/* Form step — name / type / balance */}
                    {newAccountLogo ? (
                      <View style={{ alignItems: 'center', marginBottom: 10 }}>
                        <Image source={{ uri: newAccountLogo }} style={{ width: 40, height: 40, borderRadius: 10 }} contentFit="contain" />
                      </View>
                    ) : null}
                    <TextInput style={{ fontSize: 14, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 10, textAlign }} placeholder={t('ACCOUNT_NAME_PLACEHOLDER' as any)} placeholderTextColor={colors.textTertiary} value={newAccountName} onChangeText={setNewAccountName} />
                    <View style={{ flexDirection: rowDir, flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {ACCOUNT_TYPES.map((type) => { const meta = ACCOUNT_TYPE_META[type]; const isActive = newAccountType === type; return (
                        <Pressable key={type} onPress={() => setNewAccountType(type)} style={{ flexDirection: rowDir, alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isActive ? colors.primary + '18' : colors.surface, borderWidth: 1, borderColor: isActive ? colors.primary : colors.borderLight }}>
                          <Text style={{ fontSize: 13, marginEnd: 4 }}>{meta.icon}</Text>
                          <Text style={{ fontSize: 13, fontWeight: isActive ? '600' : '400', color: isActive ? colors.primary : colors.textSecondary }}>{t(meta.labelKey as any)}</Text>
                        </Pressable>
                      ); })}
                    </View>
                    <TextInput style={{ fontSize: 14, color: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, marginBottom: 12, textAlign }} placeholder={t('ACCOUNT_BALANCE_PLACEHOLDER' as any)} placeholderTextColor={colors.textTertiary} value={newAccountBalance} onChangeText={setNewAccountBalance} keyboardType="decimal-pad" />
                    <View style={{ flexDirection: rowDir, gap: 8 }}>
                      <Pressable onPress={() => setAddAccountStep('pick')} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: colors.surface }}><Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>{t('BACK' as any)}</Text></Pressable>
                      <Pressable onPress={onAddAccount} disabled={addingAccount || !newAccountName.trim()} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: colors.primary, opacity: addingAccount ? 0.6 : 1 }}><Text style={{ fontSize: 14, fontWeight: '600', color: '#FFF' }}>{addingAccount ? '...' : t('ADD' as any)}</Text></Pressable>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <Pressable onPress={() => { impactLight(); setShowAddAccount(true); }} style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: colors.borderLight, borderStyle: 'dashed' }}>
                <Plus size={16} color={colors.primary} strokeWidth={2} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{t('SETTINGS_ADD_ACCOUNT' as any)}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </SettingsCard>

      {/* AUTOMATION */}
      <SectionHeader label={t('PROFILE_SECTION_AUTOMATION' as any)} />
      <SettingsCard>
        <SettingsRow
          icon={<MessageCircle size={17} color="#25D366" strokeWidth={1.8} />}
          label={t('PROFILE_WHATSAPP_ROW' as any)}
          onPress={() => { impactLight(); setShowWhatsApp((v) => !v); setShowSMS(false); }}
          rightElement={
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 6 }}>
              <ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: showWhatsApp ? '90deg' : '0deg' }] }} />
            </View>
          }
        />
        {showWhatsApp ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            <View style={{ height: 1, backgroundColor: colors.borderLight, marginBottom: 12 }} />
            <FeatureGate feature="whatsappUsage"><WhatsAppConnect /></FeatureGate>
          </View>
        ) : null}

        <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: 62 }} />
        <SettingsRow
          icon={<Zap size={17} color={colors.primary} strokeWidth={1.8} />}
          label={t('PROFILE_SMS_ROW' as any)}
          onPress={() => { impactLight(); setShowSMS((v) => !v); setShowWhatsApp(false); }}
          isLast
          rightElement={<ChevronRight size={16} color={colors.textTertiary} strokeWidth={2} style={{ transform: [{ rotate: showSMS ? '90deg' : '0deg' }] }} />}
        />
        {showSMS ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            <View style={{ height: 1, backgroundColor: colors.borderLight, marginBottom: 12 }} />
            <SMSShortcutPresets />
            <SMSAutomationSetup />
          </View>
        ) : null}
      </SettingsCard>

      {/* DATA & PRIVACY */}
      <SectionHeader label={t('PROFILE_SECTION_DATA' as any)} />
      <SettingsCard>
        <SettingsRow
          icon={<Trash2 size={17} color={colors.textSecondary} strokeWidth={1.8} />}
          label={t('PROFILE_DELETED' as any)}
          isLast
          onPress={() => { impactLight(); router.push('/(tabs)/trash'); }}
        />
      </SettingsCard>

      {/* DEVELOPER TOOLS — only in dev builds */}
      {__DEV__ ? <DevToolsCard /> : null}

      {/* ABOUT */}
      <SectionHeader label={t('PROFILE_SECTION_ABOUT' as any)} />
      <SettingsCard>
        <SettingsRow
          icon={<MessageSquare size={17} color={colors.textSecondary} strokeWidth={1.8} />}
          label={t('PROFILE_CONTACT_US' as any)}
          isLast
          onPress={() => { impactLight(); Linking.openURL('mailto:support@wallet-app.com').catch(() => {}); }}
        />
      </SettingsCard>

      {/* SUPPORT CHAT — WhatsApp hotline with preset topics */}
      <View style={{ marginTop: 8 }}>
        <SupportChatCard />
      </View>

      {/* SIGN OUT — presented as a dedicated card with a destructive accent
          so it matches every other grouped section on the screen. */}
      <SectionHeader label={t('PROFILE_SECTION_ACCOUNT' as any) || ''} />
      <SettingsCard>
        <Pressable
          onPress={onLogout}
          disabled={logoutPending}
          style={({ pressed }) => ({
            flexDirection: rowDir,
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            opacity: logoutPending ? 0.6 : pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              alignItems: 'center',
              justifyContent: 'center',
              marginEnd: 12,
              backgroundColor: colors.expenseBg,
            }}
          >
            {logoutPending ? (
              <ActivityIndicator size="small" color={colors.expense} />
            ) : (
              <LogOut
                size={17}
                color={colors.expense}
                strokeWidth={1.8}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            )}
          </View>
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              fontWeight: '600',
              color: colors.expense,
              textAlign,
            }}
          >
            {t('LOGOUT_BUTTON')}
          </Text>
        </Pressable>
      </SettingsCard>
    </ScrollView>

      <View style={{ position: 'absolute', right: 12, bottom: insets.bottom + 96 }}>
        <SmartInputButton onPress={() => { impactLight(); router.push('/(tabs)/smart-input'); }} />
      </View>
    </View>
    </ErrorBoundary>
  );
}