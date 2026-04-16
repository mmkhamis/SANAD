import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Pause, Play, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatAmount } from '../../utils/currency';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { useT } from '../../lib/i18n';
import { SUBSCRIPTION_PRESETS, type Subscription } from '../../services/subscription-service';

interface SubscriptionCardProps {
  sub: Subscription;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onMarkPaid: (id: string) => void;
}

const CYCLE_SHORT: Record<string, string> = {
  monthly: '/mo',
  quarterly: '/3mo',
  yearly: '/yr',
};

export const SubscriptionCard = React.memo(function SubscriptionCard({
  sub,
  onDelete,
  onToggle,
  onMarkPaid,
}: SubscriptionCardProps): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);
  const t = useT();
  const cycleLabels: Record<string, string> = {
    monthly: t('SUBS_BILLING_MONTHLY_SHORT' as any),
    quarterly: t('SUBS_BILLING_QUARTERLY_SHORT' as any),
    yearly: t('SUBS_BILLING_YEARLY_SHORT' as any),
  };
  const cycleLabel = cycleLabels[sub.billing_cycle] ?? cycleLabels.monthly;
  const preset = SUBSCRIPTION_PRESETS.find((p) => p.name === sub.name);
  const logo = preset?.logo;

  const handleDelete = (): void => {
    Alert.alert(t('SUBS_DELETE_TITLE' as any), t('SUBS_DELETE_CONFIRM' as any), [
      { text: t('CANCEL'), style: 'cancel' },
      {
        text: t('DELETE'),
        style: 'destructive',
        onPress: async () => {
          impactMedium();
          try { await onDelete(sub.id); notifySuccess(); } catch {}
        },
      },
    ]);
  };

  const handleToggle = (): void => {
    impactLight();
    onToggle(sub.id, !sub.is_active);
  };

  const handleMarkPaid = (): void => {
    Alert.alert(t('SUBS_MARK_PAID_TITLE' as any), t('SUBS_MARK_PAID_CONFIRM' as any), [
      { text: t('CANCEL'), style: 'cancel' },
      {
        text: t('SUBS_PAID' as any),
        onPress: async () => {
          impactMedium();
          try { await onMarkPaid(sub.id); notifySuccess(); } catch {}
        },
      },
    ]);
  };

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
        opacity: sub.is_active ? 1 : 0.55,
        shadowColor: colors.isDark ? '#8B5CF6' : '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.08 : 0.03,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
          : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 16 }}
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Icon */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: sub.color + '18',
            }}
          >
            {logo ? (
              <Image source={{ uri: logo }} style={{ width: 26, height: 26, borderRadius: 6 }} contentFit="contain" />
            ) : (
              <Text style={{ fontSize: 22 }}>{sub.icon}</Text>
            )}
          </View>
          {/* Name + category + next date */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>
              {sub.name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              {sub.category} · Next: {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </Text>
          </View>
          {/* Amount */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.expense }}>
              {maskIfHidden(formatAmount(sub.amount), hidden)}
              <Text style={{ fontSize: 11, fontWeight: '500', color: colors.textTertiary }}>{cycleLabel}</Text>
            </Text>
          </View>
        </View>
        {/* Action buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
          {sub.is_active ? (
            <Pressable onPress={handleMarkPaid} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} color={colors.income} strokeWidth={2} />
              <Text style={{ fontSize: 11, fontWeight: '600', color: colors.income }}>{t('SUBS_PAID' as any)}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={handleToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {sub.is_active
              ? <><Pause size={14} color={colors.textTertiary} strokeWidth={2} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary }}>{t('SUBS_PAUSE' as any)}</Text></>
              : <><Play size={14} color={colors.income} strokeWidth={2} /><Text style={{ fontSize: 11, fontWeight: '600', color: colors.income }}>{t('SUBS_RESUME' as any)}</Text></>
            }
          </Pressable>
          <Pressable onPress={handleDelete} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Trash2 size={14} color={colors.expense} strokeWidth={2} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.expense }}>{t('DELETE')}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
});
