/**
 * usage-service.ts — Supabase interaction layer for usage tracking.
 *
 * Reads and writes usage_events via RPC functions.
 * All usage DB access is centralized here — screens never touch
 * the usage_events table directly.
 */

import { supabase } from '../lib/supabase';
import type { LimitKey } from '../types/index';
import type { UsageCounts, RecordUsageResult } from '../types/usage';

// ─── Read current-period counts ──────────────────────────────────────

/**
 * Fetch all current-period usage counts for the authenticated user.
 * Returns a partial map — missing keys mean 0 usage.
 *
 * Uses the `get_usage_counts` RPC which computes period boundaries
 * server-side (daily/weekly/monthly) based on key naming.
 */
export async function fetchUsageCounts(): Promise<UsageCounts> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_usage_counts', {
    p_user_id: user.id,
  });

  if (error) throw new Error(error.message);

  // RPC returns jsonb object: { "aiChatPerDay": 2, "voiceTrackingPerDay": 1 }
  // Missing keys = 0 usage. Cast to our typed partial record.
  return (data as UsageCounts) ?? {};
}

// ─── Record a usage event ────────────────────────────────────────────

/**
 * Record a single usage event for the given key.
 *
 * Optionally enforces server-side limit: if `limit` is finite (not Infinity),
 * the RPC checks the current count before inserting. If at capacity,
 * returns `{ allowed: false, used: N }` without inserting.
 *
 * For unlimited plans, pass `null` for limit to skip server enforcement.
 *
 * @param key   The usage key (must match a LimitKey)
 * @param limit The plan's limit for this key, or null to skip server check
 * @returns     { allowed, used } from the server
 */
export async function recordUsage(
  key: LimitKey,
  limit: number | null,
): Promise<RecordUsageResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Convert Infinity/null to SQL-safe null (no limit enforcement)
  const sqlLimit = (limit !== null && Number.isFinite(limit) && limit > 0)
    ? limit
    : null;

  const { data, error } = await supabase.rpc('record_usage', {
    p_user_id: user.id,
    p_usage_key: key,
    p_limit: sqlLimit,
  });

  if (error) throw new Error(error.message);

  return data as RecordUsageResult;
}
