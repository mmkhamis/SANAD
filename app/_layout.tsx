import React, { useEffect } from 'react';
import { I18nManager, InteractionManager, LogBox } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { queryClient, persistOptions } from '../lib/query-client';
import { useAuthBootstrap } from '../hooks/useAuthBootstrap';
import { useOAuthRedirect } from '../hooks/useOAuthRedirect';
import { useSMSDeepLink } from '../hooks/useSMSDeepLink';
import { useAuthStore } from '../store/auth-store';
import { useThemeColors } from '../hooks/useThemeColors';
import { useLanguageStore } from '../store/language-store';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { setupNotificationChannel, requestNotificationPermission, registerPushToken } from '../services/notification-service';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { useUncategorizedReminder } from '../hooks/useUncategorizedReminder';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { startNativeSessionBridge } from '../services/native-session-bridge';

// Import global CSS for NativeWind
import '../global.css';

// ─── Ensure layout stays LTR ─────────────────────────────────────────
// Arabic text renders RTL naturally inside Text components.
// We intentionally keep the layout LTR so flex, margins, and icons stay
// in their designed positions. Only individual Text nodes get writingDirection.
if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

// ─── Suppress Expo Go deep-link bundle-reload red error box ──────────
// When a deep link opens Expo Go, Metro may try to re-load the JS bundle.
// This causes an unhandled promise rejection ("LoadBundleFrom...") that
// shows a RED error overlay (not a yellow warning) blocking all touches.
//
// LogBox.ignoreLogs() only suppresses YELLOW warnings — NOT red errors.
// Red error boxes for promise rejections go through LogBox.addException(),
// so we must patch that function directly.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LB = LogBox as any;
if (__DEV__ && typeof LB.addException === 'function') {
  const origAddException = LB.addException.bind(LB);
  LB.addException = (error: { message?: string; originalMessage?: string }) => {
    const msg = String(error?.message ?? error?.originalMessage ?? '').toLowerCase();
    if (msg.includes('loadbundle')) {
      // Swallow — this is an Expo Go internal error, not from app code
      return;
    }
    origAddException(error);
  };
}

// ─── Route Protection ────────────────────────────────────────────────

function useProtectedRoute(): void {
  const router = useRouter();
  const segments = useSegments();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  useEffect(() => {
    // Don't redirect while we're still checking the session
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    // The /sms deep-link route handles its own auth checks and redirect.
    // Do not interfere with it — it navigates to /(tabs) when finished.
    const inSmsRoute = segments[0] === 'sms';
    if (inSmsRoute) return;

    if (!isAuthenticated) {
      // Not signed in → force to auth screens
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    // Signed in but hasn't completed onboarding → send to onboarding
    if (!hasCompletedOnboarding) {
      if (!inOnboarding) {
        router.replace('/onboarding');
      }
      return;
    }

    // Signed in + onboarded → shouldn't be in auth or onboarding
    if (inAuthGroup || inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, hasCompletedOnboarding, segments, router]);
}

// ─── Inner Layout (needs to be inside QueryClientProvider) ───────────

function RootLayoutInner(): React.ReactElement {
  useOAuthRedirect();
  useAuthBootstrap();
  useProtectedRoute();
  useSMSDeepLink();
  // Wires connectivity detection and triggers replay on reconnect
  useOfflineQueue();
  // Weekly "you have uncategorized transactions" nudge — idempotent.
  useUncategorizedReminder();

  // Initialize notification channel + request permission
  // Defer ALL non-critical native bridge / notification work until after the
  // first interaction settles. None of this is required to render the home
  // tab, and each call adds 50–300ms of bridge work that previously blocked
  // first paint on cold start.
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setupNotificationChannel().catch(() => {});
      requestNotificationPermission()
        .then((granted) => {
          if (granted) registerPushToken().catch(() => {});
        })
        .catch(() => {});
      // Mirror Supabase session into shared Keychain for the iOS App Intent.
      startNativeSessionBridge();
    });
    return () => handle.cancel?.();
  }, []);

  const isLoading = useAuthStore((s) => s.isLoading);
  const colors = useThemeColors();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      <OfflineBanner />
      <Slot />
    </>
  );
}

// ─── Root Layout ─────────────────────────────────────────────────────

export default function RootLayout(): React.ReactElement {
  const colors = useThemeColors();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <RootLayoutInner />
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
