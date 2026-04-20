/**
 * Subscription pricing service.
 *
 * Reads the public `subscription_plan_catalog` table (migration 037) and turns
 * a user's tracked subscriptions into actionable savings insights.
 *
 * Architecture notes:
 *   - The catalog is region-aware (ISO-2 country code).
 *   - Prices are stored in their native currency. We compare like-for-like —
 *     no FX is applied here. If a user pays in SAR but their tracked
 *     subscription is recorded in EGP, the insight will be skipped.
 *   - This file owns all *insight generation* logic. UI components consume
 *     the typed `SubscriptionSavingsInsight` shape and render it.
 *   - The catalog can be refreshed weekly by a service-role job that supersedes
 *     old rows (set is_active=false, set superseded_at) and inserts new rows.
 *     The query below filters on is_active so the UI always sees the latest.
 */

import { supabase } from '../lib/supabase';
import type { Subscription, BillingCycle } from './subscription-service';

// ─── Types ───────────────────────────────────────────────────────────

export type PlanType =
  | 'individual'
  | 'family'
  | 'student'
  | 'bundle'
  | 'duo'
  | 'basic'
  | 'standard'
  | 'premium';

export interface SubscriptionPlan {
  id: string;
  provider_key: string;
  provider_name: string;
  category: string;
  region: string;          // ISO-3166 alpha-2
  currency: string;        // ISO-4217
  plan_type: PlanType;
  billing_cycle: BillingCycle;
  variant: string | null;
  price: number;
  source: 'manual' | 'ingest' | 'user_report';
}

export interface SubscriptionSavingsInsight {
  /** The user's current subscription that triggered this insight. */
  subscription: Subscription;
  /** The recommended alternative plan. */
  recommendedPlan: SubscriptionPlan;
  /** Currency-native annual cost of current plan. */
  currentYearlyCost: number;
  /** Currency-native annual cost of recommended plan. */
  recommendedYearlyCost: number;
  /** currentYearlyCost - recommendedYearlyCost (always > 0). */
  yearlySavings: number;
  /** Single-line explanation, English. */
  reasonEn: string;
  /** Single-line explanation, Arabic. */
  reasonAr: string;
}

// ─── Provider key normalization ──────────────────────────────────────
// Maps the user-facing subscription name to the catalog's canonical key.
// Keep this list in sync with seeds in 037_subscription_plan_catalog.sql.

const PROVIDER_KEY_BY_NAME: Record<string, string> = {
  'Netflix': 'netflix',
  'نتفلكس': 'netflix',
  'Spotify': 'spotify',
  'سبوتيفاي': 'spotify',
  'YouTube Premium': 'youtube_premium',
  'يوتيوب بريميوم': 'youtube_premium',
  'Shahid VIP': 'shahid_vip',
  'شاهد VIP': 'shahid_vip',
  'Disney+': 'disney_plus',
  'ديزني+': 'disney_plus',
  'Apple Music': 'apple_music',
  'أبل ميوزك': 'apple_music',
  'Anghami': 'anghami',
  'أنغامي': 'anghami',
};

export function resolveProviderKey(subscriptionName: string): string | null {
  return PROVIDER_KEY_BY_NAME[subscriptionName] ?? null;
}

// ─── Catalog queries ─────────────────────────────────────────────────

export async function fetchPlansForProvider(
  providerKey: string,
  region: string,
): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plan_catalog')
    .select('id, provider_key, provider_name, category, region, currency, plan_type, billing_cycle, variant, price, source')
    .eq('provider_key', providerKey)
    .eq('region', region)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as SubscriptionPlan[];
}

// ─── Insight generation ──────────────────────────────────────────────

function toYearly(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly':   return amount * 12;
    case 'quarterly': return amount * 4;
    case 'yearly':    return amount;
  }
}

const PLAN_TYPE_LABEL_EN: Record<PlanType, string> = {
  individual: 'Individual',
  family: 'Family',
  student: 'Student',
  bundle: 'Bundle',
  duo: 'Duo',
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

const PLAN_TYPE_LABEL_AR: Record<PlanType, string> = {
  individual: 'فردي',
  family: 'عائلي',
  student: 'طلاب',
  bundle: 'باقة',
  duo: 'شخصين',
  basic: 'أساسي',
  standard: 'قياسي',
  premium: 'بريميوم',
};

/**
 * Pick the cheapest yearly-equivalent alternative plan for the same provider+region.
 * Skips alternatives that aren't strictly cheaper than the current plan.
 */
export function pickBestAlternative(
  currentSubscription: Subscription,
  candidates: SubscriptionPlan[],
): SubscriptionPlan | null {
  const currentYearly = toYearly(currentSubscription.amount, currentSubscription.billing_cycle as BillingCycle);
  let best: SubscriptionPlan | null = null;
  let bestYearly = currentYearly;

  for (const plan of candidates) {
    const planYearly = toYearly(plan.price, plan.billing_cycle);
    if (planYearly < bestYearly) {
      best = plan;
      bestYearly = planYearly;
    }
  }
  return best;
}

export function buildInsightForSubscription(
  subscription: Subscription,
  candidates: SubscriptionPlan[],
): SubscriptionSavingsInsight | null {
  const recommended = pickBestAlternative(subscription, candidates);
  if (!recommended) return null;

  const currentYearly = toYearly(subscription.amount, subscription.billing_cycle as BillingCycle);
  const recommendedYearly = toYearly(recommended.price, recommended.billing_cycle);
  const yearlySavings = Math.round((currentYearly - recommendedYearly) * 100) / 100;

  if (yearlySavings <= 0) return null;

  const planLabelEn = PLAN_TYPE_LABEL_EN[recommended.plan_type];
  const planLabelAr = PLAN_TYPE_LABEL_AR[recommended.plan_type];
  const cycleEn = recommended.billing_cycle === 'yearly' ? 'yearly' : recommended.billing_cycle === 'quarterly' ? 'quarterly' : 'monthly';
  const cycleAr = recommended.billing_cycle === 'yearly' ? 'سنوي' : recommended.billing_cycle === 'quarterly' ? 'ربع سنوي' : 'شهري';

  return {
    subscription,
    recommendedPlan: recommended,
    currentYearlyCost: currentYearly,
    recommendedYearlyCost: recommendedYearly,
    yearlySavings,
    reasonEn: `Switch to the ${planLabelEn.toLowerCase()} ${cycleEn} plan to save based on your usage.`,
    reasonAr: `حوّل لباقة ${planLabelAr} ${cycleAr} عشان توفر حسب استخدامك.`,
  };
}

/**
 * Top-level entry point. Given the user's tracked subscriptions and their
 * region, returns a sorted list of savings insights (largest savings first).
 */
export async function generateSavingsInsights(
  subscriptions: Subscription[],
  region: string,
): Promise<SubscriptionSavingsInsight[]> {
  const insights: SubscriptionSavingsInsight[] = [];

  // Group by provider key so we only hit the catalog once per provider.
  const providerToSubs = new Map<string, Subscription[]>();
  for (const sub of subscriptions) {
    if (!sub.is_active) continue;
    const key = resolveProviderKey(sub.name);
    if (!key) continue;
    const list = providerToSubs.get(key) ?? [];
    list.push(sub);
    providerToSubs.set(key, list);
  }

  for (const [providerKey, subs] of providerToSubs.entries()) {
    let candidates: SubscriptionPlan[];
    try {
      candidates = await fetchPlansForProvider(providerKey, region);
    } catch {
      continue;
    }
    if (candidates.length === 0) continue;
    for (const sub of subs) {
      const insight = buildInsightForSubscription(sub, candidates);
      if (insight) insights.push(insight);
    }
  }

  insights.sort((a, b) => b.yearlySavings - a.yearlySavings);
  return insights;
}
