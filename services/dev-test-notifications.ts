/**
 * Dev-only test notification scheduler.
 *
 * In `__DEV__` builds only. Fires a local notification every 60 seconds
 * with a random insight/tip/transaction snippet, so you can verify
 * notification UX without waiting for real events.
 *
 * NOT a Zustand store — just a module-level controller. A tiny
 * Zustand store holds the on/off flag for the Profile toggle.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { create } from 'zustand';

// ─── Sample payloads (rotating) ──────────────────────────────────────

interface DevPing {
  title: string;
  body: string;
}

const SAMPLE_PINGS: DevPing[] = [
  { title: 'Daily Insight', body: 'You spent 23% less on coffee this week — keep it up.' },
  { title: 'Today\'s Top Expense', body: 'BEET ELGOMLA · 4,129.40 EGP · Groceries' },
  { title: 'Budget Check', body: 'Groceries budget: 68% used with 11 days left.' },
  { title: 'Goal Progress', body: 'Emergency Fund: +850 EGP this week. On track!' },
  { title: 'Upcoming Payment', body: 'Rent due in 3 days · 8,500 EGP' },
  { title: 'Charity Goal', body: 'Monthly charity: 4 of 10 donations complete.' },
  { title: 'Smart Tip', body: 'You have 3 subscriptions you haven\'t used in 30 days.' },
  { title: 'Weekly Recap', body: 'Week total: 12 transactions · 6,842 EGP spent.' },
  { title: 'Savings Alert', body: 'You saved 1,200 EGP vs. last month. Nice work.' },
  { title: 'Category Shift', body: 'Dining moved from #3 to #1 this month.' },
];

// ─── Interval presets ────────────────────────────────────────────────

export type DevPingInterval = 'off' | '30s' | '1m' | '5m' | '15m';

export const DEV_PING_INTERVALS: Array<{
  key: DevPingInterval;
  label: string;
  ms: number;
  tint: string;
}> = [
  { key: 'off', label: 'Off', ms: 0, tint: '#94A3B8' },
  { key: '30s', label: '30s', ms: 30_000, tint: '#EF4444' },
  { key: '1m', label: '1 min', ms: 60_000, tint: '#F59E0B' },
  { key: '5m', label: '5 min', ms: 300_000, tint: '#10B981' },
  { key: '15m', label: '15 min', ms: 900_000, tint: '#3B82F6' },
];

// ─── Controller (module-level) ───────────────────────────────────────

let timer: ReturnType<typeof setInterval> | null = null;

async function firePing(): Promise<void> {
  const pick = SAMPLE_PINGS[Math.floor(Math.random() * SAMPLE_PINGS.length)];
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `[DEV] ${pick.title}`,
      body: pick.body,
      data: { source: 'dev-test' },
      ...(Platform.OS === 'android' ? { channelId: 'sms-transactions' } : {}),
    },
    trigger: null,
  });
}

function stopTimer(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer(intervalMs: number): void {
  if (!__DEV__ || intervalMs <= 0) return;
  stopTimer();
  // Fire immediately so the user sees it worked
  firePing().catch(() => {});
  timer = setInterval(() => {
    firePing().catch(() => {});
  }, intervalMs);
}

// ─── Interval store (for Profile UI) ─────────────────────────────────

interface DevPingStore {
  interval: DevPingInterval;
  setInterval: (value: DevPingInterval) => void;
}

export const useDevPingStore = create<DevPingStore>((set) => ({
  interval: 'off',
  setInterval: (value) => {
    const preset = DEV_PING_INTERVALS.find((p) => p.key === value);
    if (!preset || preset.ms === 0) stopTimer();
    else startTimer(preset.ms);
    set({ interval: value });
  },
}));
