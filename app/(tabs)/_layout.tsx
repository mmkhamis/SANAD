import React from 'react';
import { View, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { LayoutGrid, BarChart3, Home, Coins, User } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useWidgetSync } from '../../hooks/useWidgetSync';
import { useT } from '../../lib/i18n';
import { COLORS } from '../../constants/colors';
import { RecordingOverlay } from '../../components/voice/RecordingOverlay';
import { ProcessingOverlay } from '../../components/voice/ProcessingOverlay';
import { MinimizedPill } from '../../components/voice/MinimizedPill';
import { LiquidGlassFab } from '../../components/ui/LiquidGlassFab';
import { useVoiceInputStore } from '../../store/voice-input-store';

const TAB_ICON_SIZE = 22;
const TAB_ICON_STROKE = 1.8;
const HOME_ICON_SIZE = 26;

export default function TabsLayout(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const router = useRouter();
  useWidgetSync();

  // Tab bar bottom offset (must match tabBarStyle below) + tab bar height + breathing room
  const fabBottom = (Platform.OS === 'ios' ? 24 : 14) + 72 + 14;

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.isDark ? COLORS.claude.p200 : colors.primary,
        tabBarInactiveTintColor: colors.isDark ? COLORS.claude.fg3 : colors.textTertiary,
        lazy: true,
        freezeOnBlur: true,
        tabBarBackground: () => (
          <View style={{ flex: 1, borderRadius: 28, overflow: 'hidden' }}>
            <BlurView
              intensity={colors.isDark ? 60 : 80}
              tint={colors.isDark ? 'dark' : 'light'}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.isDark
                    ? 'rgba(10,10,18,0.55)'
                    : 'rgba(255,255,255,0.88)',
                }}
              />
            </BlurView>
            {colors.isDark ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0,
                  height: 1,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderTopLeftRadius: 28,
                  borderTopRightRadius: 28,
                }}
              />
            ) : null}
          </View>
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 14,
          left: 14,
          right: 14,
          height: 72,
          borderRadius: 28,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.isDark ? COLORS.claude.strokeStrong : 'rgba(226,232,240,0.6)',
          paddingTop: 10,
          paddingBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: colors.isDark ? 0.50 : 0.10,
          shadowRadius: 24,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '500',
          letterSpacing: 0.2,
        },
      }}
    >
      {/* 1 — Features */}
      <Tabs.Screen
        name="features"
        options={{
          title: t('TAB_FEATURES'),
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <LayoutGrid size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
            </IconWrap>
          ),
        }}
      />

      {/* 2 — Analytics */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: t('TAB_ANALYTICS'),
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <BarChart3 size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
            </IconWrap>
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
                transform: [{ translateY: -8 }],
              }}
            >
              {/* Outer purple halo */}
              <View
                style={{
                  position: 'absolute',
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  backgroundColor: COLORS.claude.p500,
                  opacity: 0.28,
                }}
              />
              {/* Main button w/ gradient + rim + glow shadow */}
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  overflow: 'hidden',
                  borderWidth: 1,
                  borderColor: 'rgba(200,180,243,0.35)',
                  shadowColor: COLORS.claude.p500,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.55,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                <LinearGradient
                  colors={[COLORS.claude.p400, COLORS.claude.p700]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Home size={HOME_ICON_SIZE} color="#FFFFFF" strokeWidth={2} />
                </View>
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
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <Coins size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
            </IconWrap>
          ),
        }}
      />

      {/* 5 — Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('TAB_PROFILE'),
          tabBarIcon: ({ color, focused }) => (
            <IconWrap focused={focused}>
              <User size={TAB_ICON_SIZE} color={color} strokeWidth={TAB_ICON_STROKE} />
            </IconWrap>
          ),
        }}
      />

      {/* ── Hidden tabs — routes still accessible, just not in bottom bar ── */}
      <Tabs.Screen name="transactions" options={{ href: null }} />
      <Tabs.Screen name="subscriptions" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="community" options={{ href: null }} />
      <Tabs.Screen name="add" options={{ href: null }} />
      <Tabs.Screen name="smart-input" options={{ href: null }} />
      <Tabs.Screen name="review" options={{ href: null }} />
      <Tabs.Screen name="trash" options={{ href: null }} />
      <Tabs.Screen name="charity" options={{ href: null }} />
      <Tabs.Screen name="community-detail" options={{ href: null }} />
      <Tabs.Screen name="create-split-event" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="split-event" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
    <RecordingOverlay />
    <ProcessingOverlay />
    <MinimizedPill />
    <LiquidGlassFab
      right={14}
      bottom={fabBottom}
      onPress={() => router.push('/(tabs)/smart-input')}
      onVoice={() => { useVoiceInputStore.getState().startRecording(); }}
      onScan={() => router.push('/(tabs)/smart-input?mode=scan')}
      onManual={() => router.push('/(tabs)/smart-input?mode=manual')}
    />
    </>
  );
}

/**
 * Wraps an active icon with a subtle purple drop-shadow glow.
 */
function IconWrap({ focused, children }: { focused: boolean; children: React.ReactNode }): React.ReactElement {
  if (!focused) return <>{children}</> as React.ReactElement;
  return (
    <View
      style={{
        shadowColor: COLORS.claude.p500,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
      }}
    >
      {children}
    </View>
  );
}
