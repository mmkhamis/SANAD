import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';

interface GoalInsightsProps {
  insights: string[];
}

export function GoalInsights({ insights }: GoalInsightsProps): React.ReactElement | null {
  const colors = useThemeColors();
  if (insights.length === 0) return null;

  return (
    <View
      className="mx-5 mb-3 rounded-2xl overflow-hidden"
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
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 8, letterSpacing: 0.3 }}>
            💡 Quick Insights
          </Text>
          {insights.map((insight) => (
            <Text
              key={insight}
              style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 20, marginBottom: 2 }}
            >
              • {insight}
            </Text>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
}
