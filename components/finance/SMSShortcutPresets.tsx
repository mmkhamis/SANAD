import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, Linking, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { CheckCircle2, Copy, ExternalLink, Play, Zap } from 'lucide-react-native';

import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import {
  groupPresetsByCountry,
  type SmsShortcutPreset,
} from '../../constants/sms-shortcut-presets';

const SMS_DEEP_LINK_TEMPLATE = 'sanad://sms?text=';

const COUNTRY_LABELS: Record<SmsShortcutPreset['country'], { ar: string; en: string; flag: string }> = {
  SA: { ar: 'البنوك السعودية', en: 'Saudi Banks', flag: '🇸🇦' },
  EG: { ar: 'البنوك المصرية', en: 'Egyptian Banks', flag: '🇪🇬' },
  AE: { ar: 'بنوك الإمارات', en: 'UAE Banks', flag: '🇦🇪' },
  GLOBAL: { ar: 'عالمي', en: 'Global', flag: '🌍' },
};

interface PresetCardProps {
  preset: SmsShortcutPreset;
  onSetup: (p: SmsShortcutPreset) => void;
  onTest: (p: SmsShortcutPreset) => void;
  activeSetupId: string | null;
  activeTestId: string | null;
}

function PresetCard({
  preset,
  onSetup,
  onTest,
  activeSetupId,
  activeTestId,
}: PresetCardProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign } = useRTL();
  const t = useT();

  const isSettingUp = activeSetupId === preset.id;
  const isTesting = activeTestId === preset.id;

  return (
    <View
      className="rounded-2xl p-3.5 mb-2.5"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      {/* Header: brand chip + name + sender */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: 12,
            backgroundColor: preset.color + '18',
          }}
        >
          {preset.logo ? (
            <View style={{ width: 24, height: 24, overflow: 'hidden' }}>
              <Image
                source={{ uri: preset.logo }}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
                transition={150}
              />
            </View>
          ) : (
            <Text style={{ fontSize: 18, fontWeight: '700', color: preset.color }}>
              {preset.nameEn.charAt(0)}
            </Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign }}
            numberOfLines={1}
          >
            {preset.nameAr}
          </Text>
          <Text
            style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 1, textAlign }}
            numberOfLines={1}
          >
            {t('SMS_PRESET_SENDER' as any)}:{' '}
            <Text
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                color: preset.color,
                fontWeight: '600',
              }}
            >
              {preset.sender}
            </Text>
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={() => onSetup(preset)}
          className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
          style={{
            backgroundColor: isSettingUp ? preset.color : preset.color + 'E6',
          }}
        >
          {isSettingUp ? (
            <>
              <CheckCircle2 size={14} color="#fff" strokeWidth={2.5} />
              <Text
                style={{ fontSize: 12.5, fontWeight: '700', color: '#fff', marginLeft: 6 }}
              >
                {t('SMS_PRESET_READY' as any)}
              </Text>
            </>
          ) : (
            <>
              <Zap size={13} color="#fff" strokeWidth={2.5} />
              <Text
                style={{ fontSize: 12.5, fontWeight: '700', color: '#fff', marginLeft: 6 }}
              >
                {t('SMS_PRESET_SETUP' as any)}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => onTest(preset)}
          className="flex-row items-center justify-center rounded-xl px-3 py-2.5"
          style={{
            backgroundColor: isTesting ? colors.incomeBg : colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: isTesting ? colors.income + '40' : colors.borderLight,
          }}
        >
          {isTesting ? (
            <>
              <CheckCircle2 size={13} color={colors.income} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.income,
                  marginLeft: 5,
                }}
              >
                {t('SMS_SENT' as any)}
              </Text>
            </>
          ) : (
            <>
              <Play size={12} color={colors.textSecondary} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  marginLeft: 5,
                }}
              >
                {t('SMS_PRESET_TEST' as any)}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function SMSShortcutPresets(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign } = useRTL();
  const [activeSetupId, setActiveSetupId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);

  /**
   * Run the guided setup for a bank:
   * 1. Copy the ready-to-paste deep link (sanad://sms?text= + sender header)
   * 2. Copy the sender filter string to clipboard as a fallback
   * 3. Open Shortcuts app with haptic confirmation
   */
  const handleSetup = useCallback(
    async (preset: SmsShortcutPreset): Promise<void> => {
      impactMedium();
      const deepLink = `${SMS_DEEP_LINK_TEMPLATE}\${MESSAGE}`;
      const bundle = [
        `Sender: ${preset.sender}`,
        `Open URL: ${deepLink}`,
      ].join('\n');

      try {
        await Clipboard.setStringAsync(bundle);
        setActiveSetupId(preset.id);
        notifySuccess();

        Alert.alert(
          t('SMS_PRESET_COPIED_TITLE' as any),
          t('SMS_PRESET_COPIED_MSG' as any).replace('{sender}', preset.sender),
          [
            { text: t('CANCEL' as any), style: 'cancel' },
            {
              text: t('SMS_OPEN_SHORTCUTS' as any),
              onPress: () => {
                if (Platform.OS !== 'ios') return;
                Linking.openURL('shortcuts://').catch(() => {
                  Linking.openURL(
                    'https://support.apple.com/guide/shortcuts/welcome/ios',
                  ).catch(() => {});
                });
              },
            },
          ],
        );

        setTimeout(() => setActiveSetupId(null), 3000);
      } catch {
        notifyError();
      }
    },
    [t],
  );

  /**
   * Fire the sample deep link to verify the pipeline end-to-end.
   * Triggers the same path a real SMS shortcut would.
   */
  const handleTest = useCallback(
    async (preset: SmsShortcutPreset): Promise<void> => {
      impactLight();
      const testUrl = `${SMS_DEEP_LINK_TEMPLATE}${encodeURIComponent(preset.sampleSms)}`;
      try {
        await Linking.openURL(testUrl);
        setActiveTestId(preset.id);
        notifySuccess();
        setTimeout(() => setActiveTestId(null), 2500);
      } catch {
        notifyError();
        Alert.alert(t('ALERT_TEST_FAILED' as any), t('ALERT_TEST_FAILED_MSG' as any));
      }
    },
    [t],
  );

  const groups = groupPresetsByCountry();

  return (
    <View className="rounded-2xl p-4 mb-6" style={{ backgroundColor: colors.surface }}>
      {/* Header */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', marginBottom: 6 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: 12,
            backgroundColor: colors.primary + '15',
          }}
        >
          <ExternalLink size={17} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign }}
          >
            {t('SMS_PRESETS_TITLE' as any)}
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              color: colors.textSecondary,
              marginTop: 1,
              textAlign,
            }}
          >
            {t('SMS_PRESETS_SUBTITLE' as any)}
          </Text>
        </View>
      </View>

      {/* Info banner */}
      <View
        className="rounded-xl p-3 mt-3 mb-3"
        style={{
          backgroundColor: colors.infoBg,
          borderWidth: 1,
          borderColor: colors.info + '20',
        }}
      >
        <Text style={{ fontSize: 12, color: colors.info, lineHeight: 17 }}>
          {t('SMS_PRESETS_HINT' as any)}
        </Text>
      </View>

      {/* Grouped list */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        style={{ maxHeight: 520 }}
      >
        {groups.map((group) => (
          <View key={group.country} style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: colors.textTertiary,
                letterSpacing: 0.8,
                marginBottom: 8,
                textAlign,
              }}
            >
              {COUNTRY_LABELS[group.country].flag}{' '}
              {t(`SMS_PRESETS_GROUP_${group.country}` as any) ||
                COUNTRY_LABELS[group.country].en.toUpperCase()}
            </Text>
            {group.presets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                onSetup={handleSetup}
                onTest={handleTest}
                activeSetupId={activeSetupId}
                activeTestId={activeTestId}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
