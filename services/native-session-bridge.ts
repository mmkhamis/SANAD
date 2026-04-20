import { Platform } from 'react-native';

import { supabase } from '../lib/supabase';
import {
  clearSupabaseSessionNative,
  setSupabaseConfigNative,
  setSupabaseSessionNative,
  type NativeSupabaseSession,
} from '../modules/widget-shared-data';

// ─── Native session bridge ──────────────────────────────────────────
// Publishes the Supabase URL/anon key + the active session into the iOS
// shared App Group + Keychain so the "Log SMS in SANAD" App Intent can
// authenticate against the ingest-sms Edge Function while running in the
// background — without ever opening the app.
//
// JS remains the single owner of the auth lifecycle; we just mirror it.

let started = false;
let unsubscribe: (() => void) | null = null;

function buildPayload(
  session: { access_token: string; refresh_token: string; expires_at?: number; user: { id: string } } | null,
): NativeSupabaseSession | null {
  if (!session?.access_token || !session.refresh_token) return null;
  if (!session.user?.id) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    userId: session.user.id,
  };
}

async function publishConfig(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return;
  try {
    await setSupabaseConfigNative(url, anonKey);
  } catch (err) {
    console.warn('[native-session-bridge] config publish failed:', err);
  }
}

async function publishSession(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const { data } = await supabase.auth.getSession();
    const payload = buildPayload(data.session as Parameters<typeof buildPayload>[0]);
    if (payload) {
      await setSupabaseSessionNative(payload);
    } else {
      await clearSupabaseSessionNative();
    }
  } catch (err) {
    console.warn('[native-session-bridge] session publish failed:', err);
  }
}

/**
 * Start mirroring the Supabase session into the iOS shared Keychain.
 * Idempotent — safe to call multiple times.
 */
export function startNativeSessionBridge(): void {
  if (started || Platform.OS !== 'ios') return;
  started = true;

  // Publish current state immediately
  void publishConfig();
  void publishSession();

  // Then track auth state changes
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const payload = buildPayload(session as Parameters<typeof buildPayload>[0]);
    if (payload) {
      void setSupabaseSessionNative(payload).catch((err) => {
        console.warn('[native-session-bridge] update failed:', err);
      });
    } else {
      void clearSupabaseSessionNative().catch(() => {});
    }
  });

  unsubscribe = (): void => {
    data.subscription.unsubscribe();
  };
}

/** Stop mirroring the session (mainly for tests). */
export function stopNativeSessionBridge(): void {
  unsubscribe?.();
  unsubscribe = null;
  started = false;
}
