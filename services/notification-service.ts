import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// ─── Configure notification behavior ─────────────────────────────────
// Show alerts even when the app is in the foreground.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Android notification channel ────────────────────────────────────

export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sms-transactions', {
      name: 'SMS Transactions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100],
      lightColor: '#8B5CF6',
    });
  }
}

// ─── Request permission ──────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Send a local notification ───────────────────────────────────────

interface SMSNotificationParams {
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  merchant?: string | null;
  counterparty?: string | null;
  category?: string | null;
  currency?: string | null;
}

/**
 * Build a clean, information-dense SMS notification.
 *   Title: "-4,129.40 EGP · BEET ELGOMLA"
 *   Body:  "Groceries · tap to review"
 * No "Card payment" fallback. Graceful when fields are missing.
 */
export async function notifySmsTransaction(params: SMSNotificationParams): Promise<void> {
  const { amount, type, merchant, counterparty, category, currency } = params;
  const cur = currency ?? 'EGP';

  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : '';
  const amountStr = `${sign}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${cur}`;

  const person = merchant || counterparty;
  const typeLabel = type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'expense';
  const title = person ? `${amountStr} · ${person}` : `${amountStr} · ${typeLabel}`;
  const body = category ? `${category} · tap to review` : 'Tap to review & categorize';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { source: 'sms', amount, type, merchant: merchant ?? null, category: category ?? null },
      ...(Platform.OS === 'android' ? { channelId: 'sms-transactions' } : {}),
    },
    trigger: null,
  });
}

// ─── Expo push token registration ────────────────────────────────────
// Required for the silent SMS webhook flow (supabase/functions/sms-webhook).
// The edge function pushes notifications to whatever token we save here.

/**
 * Register the device's Expo push token and save it to `profiles.expo_push_token`.
 * Idempotent — safe to call on every app launch.
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') return null;
    }

    const result = await Notifications.getExpoPushTokenAsync();
    const token = result?.data ?? null;
    if (!token) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return token;

    // Only write if changed to avoid noisy updates.
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.expo_push_token !== token) {
      await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', user.id);
    }

    return token;
  } catch (e) {
    console.warn('[registerPushToken] failed:', e);
    return null;
  }
}