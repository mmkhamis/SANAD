import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Receipt, BarChart3, Home, Coins, User } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useWidgetSync } from '../../hooks/useWidgetSync';
import { useT } from '../../lib/i18n';

const TAB_ICON_SIZE = 22;
const TAB_ICON_STROKE = 1.8;
const HOME_ICON_SIZE = 28;

export default function TabsLayout(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  useWidgetSync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.isDark ? 'rgba(255,255,255,0.40)' : colors.textTertiary,
        lazy: true,
        freezeOnBlur: true,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 12,
          left: 24,
          right: 24,
          height: 68,
          borderRadius: 34,
          backgroundColor: colors.isDark ? 'rgba(26,31,46,0.75)' : 'rgba(255,255,255,0.78)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.isDark ? 'rgba(51,65,85,0.20)' : 'rgba(226,232,240,0.6)',
          paddingTop: 6,
          paddingBottom: 6,
          shadowColor: colors.isDark ? '#8B5CF6' : '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: colors.isDark ? 0.15 : 0.10,
          shadowRadius: 24,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      {/* 1 — Transactions */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: t('TAB_TRANSACTIONS'),
          tabBarIcon: ({ color }) => (
            <Receipt size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
          ),
        }}
      />

      {/* 2 — Analytics */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('TAB_ANALYTICS'),
          tabBarIcon: ({ color }) => (
            <BarChart3 size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
          ),
        }}
      />

      {/* 3 — Home (center elevated) */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('TAB_HOME'),
          tabBarIcon: () => (
            <View
              style={{
                width: 72,
                height: 72,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 28,
              }}
            >
              {/* Outer glow ring */}
              <View
                style={{
                  position: 'absolute',
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: '#8B5CF6',
                  opacity: 0.2,
                }}
              />
              {/* Shadow halo */}
              <View
                style={{
                  position: 'absolute',
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 14,
                  elevation: 10,
                }}
              />
              {/* Main button */}
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: '#8B5CF6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#8B5CF6',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              >
                <Home size={HOME_ICON_SIZE} color="#FFFFFF" strokeWidth={2} />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />

      {/* 4 — Assets */}
      <Tabs.Screen
        name="assets"
        options={{
          title: t('TAB_COINS'),
          tabBarIcon: ({ color }) => (
            <Coins size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
          ),
        }}
      />

      {/* 5 — You (profile / settings / goals / bill split hub) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('TAB_PROFILE'),
          tabBarIcon: ({ color }) => (
            <User size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
          ),
        }}
      />

      {/* ── Hidden tabs — routes still accessible, just not in bottom bar ── */}
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="add" options={{ href: null }} />
      <Tabs.Screen name="smart-input" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen name="trash" options={{ href: null }} />
      <Tabs.Screen name="community-detail" options={{ href: null }} />
      <Tabs.Screen name="create-split-event" options={{ href: null }} />
      <Tabs.Screen name="split-event" options={{ href: null }} />
    </Tabs>
  );
}
