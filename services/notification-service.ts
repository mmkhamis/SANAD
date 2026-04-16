import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
  description?: string;
}

export async function notifySmsTransaction(params: SMSNotificationParams): Promise<void> {
  const { amount, type, merchant, description } = params;

  const sign = type === 'income' ? '+' : type === 'expense' ? '-' : '';
  const amountStr = `${sign}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;

  const verb = type === 'income' ? 'received' : type === 'expense' ? 'recorded' : 'transferred';
  const title = `${amountStr} ${verb}`;

  const body = merchant
    ? merchant
    : description
      ? description
      : type === 'income' ? 'Income added to wallet' : 'Expense tracked';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { source: 'sms' },
      ...(Platform.OS === 'android' ? { channelId: 'sms-transactions' } : {}),
    },
    trigger: null, // send immediately
  });
}
