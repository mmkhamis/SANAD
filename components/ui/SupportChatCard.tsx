/**
 * SupportChatCard
 *
 * Bottom-of-profile WhatsApp hotline. Shows preset conversation topics; tapping
 * one opens WhatsApp (or wa.me fallback) to the SANAD support number with a
 * pre-filled message.
 *
 * Edit `SUPPORT_WHATSAPP_NUMBER` once the live number is ready. Must be in
 * international E.164 format WITHOUT the leading "+" — wa.me accepts digits
 * only (e.g. "966512345678").
 */

import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { MessageCircle, ChevronRight } from 'lucide-react-native';

import { Card } from './Card';
import { useT } from '../../lib/i18n';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { impactLight } from '../../utils/haptics';

// ─── Support number (E.164, no leading '+') ──────────────────────────
// TODO(support): replace with the live SANAD WhatsApp support number.
const SUPPORT_WHATSAPP_NUMBER = '966500000000';

interface SupportTopic {
  key: string;
  label: string;
}

function openWhatsApp(number: string, message: string): void {
  const encoded = encodeURIComponent(message);
  const app = `whatsapp://send?phone=${number}&text=${encoded}`;
  const web = `https://wa.me/${number}?text=${encoded}`;
  Linking.openURL(app).catch(() => {
    Linking.openURL(web).catch(() => {
      /* silent — device cannot open the link */
    });
  });
}

export function SupportChatCard(): React.ReactElement {
  const t = useT();
  const colors = useThemeColors();
  const { rowDir, textAlign, isRTL } = useRTL();

  const topics: readonly SupportTopic[] = [
    { key: 'categorize_sms',   label: t('SUPPORT_TOPIC_CATEGORIZE_SMS' as any) },
    { key: 'add_transactions', label: t('SUPPORT_TOPIC_ADD_TRANSACTIONS' as any) },
    { key: 'budget',           label: t('SUPPORT_TOPIC_BUDGET' as any) },
    { key: 'plan',             label: t('SUPPORT_TOPIC_PLAN' as any) },
    { key: 'other',            label: t('SUPPORT_TOPIC_OTHER' as any) },
  ];

  const onPickTopic = (topic: SupportTopic): void => {
    impactLight();
    openWhatsApp(SUPPORT_WHATSAPP_NUMBER, topic.label);
  };

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: 12,
            backgroundColor: '#25D36615',
          }}
        >
          <MessageCircle size={20} color="#25D366" strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '700',
              color: colors.textPrimary,
              textAlign,
              marginBottom: 2,
            }}
          >
            {t('SUPPORT_CHAT_TITLE' as any)}
          </Text>
          <Text
            style={{
              fontSize: 12.5,
              color: colors.textSecondary,
              textAlign,
              lineHeight: 17,
            }}
          >
            {t('SUPPORT_CHAT_SUBTITLE' as any)}
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colors.borderLight }} />

      {/* Topic list */}
      {topics.map((topic, idx) => (
        <Pressable
          key={topic.key}
          onPress={() => onPickTopic(topic)}
          style={({ pressed }) => ({
            flexDirection: rowDir,
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 13,
            backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
            borderBottomWidth: idx === topics.length - 1 ? 0 : 1,
            borderBottomColor: colors.borderLight,
          })}
        >
          <Text
            style={{
              flex: 1,
              fontSize: 14,
              fontWeight: '500',
              color: colors.textPrimary,
              textAlign,
            }}
          >
            {topic.label}
          </Text>
          <ChevronRight
            size={16}
            color={colors.textTertiary}
            strokeWidth={1.8}
            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
          />
        </Pressable>
      ))}
    </Card>
  );
}
