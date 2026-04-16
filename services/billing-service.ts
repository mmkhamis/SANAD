/**
 * billing-service.ts — Supabase interaction layer for user_subscriptions.
 *
 * All reads/writes for plan & trial state go through here.
 * Screens and components NEVER touch Supabase directly.
 */

import { supabase, invokeWithRetry } from '../lib/supabase';
import type { UserSubscription, TrialPlan, AppConfig } from '../types/index';

// ─── Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AppConfig = { pro_trial_days: 14, max_trial_days: 14 };

/**
 * Fetch app-level config (trial durations, etc.).
 * Returns safe defaults if the config row is missing.
 */
export async function fetchAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('app_config')
    .select('pro_trial_days, max_trial_days')
    .limit(1)
    .maybeSingle();

  if (error || !data) return DEFAULT_CONFIG;
  return data as AppConfig;
}

// ─── Read ────────────────────────────────────────────────────────────

/**
 * Fetch the current user's subscription row.
 * Returns `null` for users without a row (pre-migration).
 */
export async function fetchSubscription(): Promise<UserSubscription | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as UserSubscription | null;
}

// ─── Trial ───────────────────────────────────────────────────────────

export interface StartTrialResult {
  subscription: UserSubscription;
}

/**
 * Start a trial via the secure edge function.
 * The edge function calls the `start_trial` RPC which enforces
 * all eligibility checks atomically.
 */
export async function startTrial(trialPlan: TrialPlan): Promise<StartTrialResult> {
  const result = await invokeWithRetry<StartTrialResult>(
    'start-trial',
    { body: { trial_plan: trialPlan } },
  );
  return result;
}

// ─── Lazy expiration ─────────────────────────────────────────────────

/**
 * If the user's trial has expired, call the expire_trial RPC
 * to persist the state change in the database.
 *
 * Safe to call at any time — the RPC only touches rows where
 * `status = 'trialing' AND trial_end_at < now()`.
 */
export async function expireTrialIfNeeded(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc('expire_trial', { p_user_id: user.id });
}

// ─── Dev / Test ──────────────────────────────────────────────────────

/**
 * DEV ONLY — Reset subscription to free (clears trial flags).
 * Remove before production launch.
 */
export async function __dev_resetSubscription(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc('reset_subscription', { p_user_id: user.id });
  if (error) throw new Error(error.message);
}
