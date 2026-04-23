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
    await Notifications.setNotificationChannelAsync('review-reminder', {
      name: 'Review Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 80],
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

// ─── Recurring uncategorized-transactions reminder ───────────────────
// A weekly local nudge when the user has transactions sitting in review.
// The handler runs inside the app (fires a local push) and — separately —
// the WhatsApp webhook can trigger an outbound DM when the user replies
// with "uncategorized". Both entry points call `buildReviewNudgeContent`.

const REVIEW_NUDGE_ID = 'review-uncategorized-weekly';

interface ReviewNudgeContent {
  title: string;
  body: string;
}

export function buildReviewNudgeContent(count: number): ReviewNudgeContent {
  if (count <= 0) {
    return { title: '', body: '' };
  }
  const plural = count === 1 ? 'transaction' : 'transactions';
  return {
    title: `${count} uncategorized ${plural}`,
    body: 'Tap to categorize — or reply "uncategorized" on WhatsApp to sort them by voice.',
  };
}

/**
 * Schedule (or reschedule) a weekly reminder that fires when the user
 * has uncategorized transactions. The reminder is idempotent — calling
 * this repeatedly replaces the previous schedule without stacking.
 *
 * Pass `count = 0` to cancel the reminder entirely (no pending work).
 */
export async function scheduleUncategorizedReminder(count: number): Promise<void> {
  // Always cancel the existing one first so we don't double-schedule.
  try {
    await Notifications.cancelScheduledNotificationAsync(REVIEW_NUDGE_ID);
  } catch {
    // Not scheduled yet — ignore.
  }

  if (count <= 0) return;

  const { title, body } = buildReviewNudgeContent(count);

  // Weekly trigger — Sunday 10:00 local. expo-notifications normalizes
  // weekday Sunday = 1 on iOS. We use the generic weekly trigger which
  // works on both platforms.
  await Notifications.scheduleNotificationAsync({
    identifier: REVIEW_NUDGE_ID,
    content: {
      title,
      body,
      data: { source: 'review-nudge', count },
      ...(Platform.OS === 'android' ? { channelId: 'review-reminder' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 10,
      minute: 0,
    },
  });
}

/** One-shot: fire the nudge NOW. Useful after SMS batch imports. */
export async function fireUncategorizedReminderNow(count: number): Promise<void> {
  if (count <= 0) return;
  const { title, body } = buildReviewNudgeContent(count);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { source: 'review-nudge', count },
      ...(Platform.OS === 'android' ? { channelId: 'review-reminder' } : {}),
    },
    trigger: null,
  });
}