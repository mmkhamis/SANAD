import React from 'react';
import { View, Text } from 'react-native';
import { TrendingDown, Sparkles } from 'lucide-react-native';

import { Card } from '../ui/Card';
import { CurrencyAmount } from '../ui/CurrencyAmount';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { useLanguageStore } from '../../store/language-store';
import { useSubscriptionInsights } from '../../hooks/useSubscriptionInsights';
import { COLORS } from '../../constants/colors';
import { getSubscriptionDisplayName } from '../../services/subscription-service';

export function SubscriptionSavingsCard(): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL, rowDir, textAlign } = useRTL();
  const language = useLanguageStore((s) => s.language);
  const { data: insights, isLoading } = useSubscriptionInsights();

  if (isLoading || insights.length === 0) {
    if (insights.length === 0 && !isLoading) {
      return null;
    }
    return null;
  }

  return (
    <Card style={{ marginTop: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(126,212,168,0.12)',
          }}
        >
          <Sparkles size={16} color={COLORS.claude.green} strokeWidth={2} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary }}>
          {t('SUBSCRIPTION_SAVINGS_TITLE' as any)}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
          marginBottom: 14,
          textAlign,
        }}
      >
        {t('SUBSCRIPTION_SAVINGS_DESC' as any)}
      </Text>

      {/* Insight rows — top 3 */}
      <View style={{ gap: 10 }}>
        {insights.slice(0, 3).map((insight) => {
          const reason = language === 'ar' ? insight.reasonAr : insight.reasonEn;
          return (
            <View
              key={insight.subscription.id}
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: colors.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.025)',
                borderWidth: 1,
                borderColor: colors.isDark ? COLORS.claude.stroke : colors.glassBorder,
              }}
            >
              <View style={{ flexDirection: rowDir, alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{insight.subscription.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.isDark ? COLORS.claude.fg : colors.textPrimary }}>
                    {getSubscriptionDisplayName(insight.subscription, isRTL)}
                  </Text>
                </View>
                <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 4 }}>
                  <TrendingDown size={12} color={COLORS.claude.green} strokeWidth={2.5} />
                  <CurrencyAmount
                    value={insight.yearlySavings}
                    color={COLORS.claude.green}
                    fontSize={13}
                    fontWeight="700"
                  />
                  <Text style={{ fontSize: 11, color: COLORS.claude.green, fontWeight: '600' }}>
                    {t('SUBSCRIPTION_SAVINGS_PER_YEAR' as any)}
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
                  textAlign,
                  lineHeight: 17,
                }}
              >
                {reason}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
