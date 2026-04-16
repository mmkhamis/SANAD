/**
 * Usage tracking types.
 *
 * These types model per-user consumption of quota-limited features.
 * Static plan limits live in PlanEntitlements (types/index.ts).
 * This file models the runtime usage counters and enforcement results.
 */

import type { LimitKey } from './index';

// Re-export so consumers can import everything from one place
export type { LimitKey } from './index';

// ─── Usage period ────────────────────────────────────────────────────

export type UsagePeriod = 'daily' | 'weekly' | 'monthly';

/** Map from LimitKey to its reset period. */
export const USAGE_PERIODS: Record<LimitKey, UsagePeriod> = {
  aiChatPerDay: 'daily',
  voiceTrackingPerDay: 'daily',
  deepAnalyticsPerWeek: 'weekly',
  insightsPerWeek: 'weekly',
  customCategoriesPerMonth: 'monthly',
};

// ─── Usage counts ────────────────────────────────────────────────────

/**
 * Current-period usage counts keyed by LimitKey.
 * Missing keys mean 0 usage in the current period.
 */
export type UsageCounts = Partial<Record<LimitKey, number>>;

// ─── Usage status (resolved per-key) ─────────────────────────────────

export interface UsageStatus {
  /** The limit key this status is for */
  key: LimitKey;
  /** How many times the user has used this in the current period */
  used: number;
  /** The plan's limit for this key (Infinity = unlimited) */
  limit: number;
  /** How many uses remain (Infinity if unlimited, 0 if exhausted) */
  remaining: number;
  /** Whether the limit is unlimited for the user's plan */
  unlimited: boolean;
  /** Whether the user can perform this action right now */
  allowed: boolean;
  /** The reset period for this usage key */
  period: UsagePeriod;
}

// ─── Record usage result (from DB RPC) ──────────────────────────────

export interface RecordUsageResult {
  allowed: boolean;
  used: number;
}
