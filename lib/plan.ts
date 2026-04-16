/**
 * Plan gating & entitlement resolver.
 *
 * This is the SINGLE SOURCE OF TRUTH for "what plan does the user have?"
 * and "what can each plan do?". All UI code and hooks resolve through
 * `resolveEntitlement()` for state and `canAccess()` / `getLimit()` /
 * `getLevel()` for capabilities.
 *
 * The raw {@link UserSubscription} row is read from `user_subscriptions`
 * via the billing service + TanStack Query hook.
 *
 * Rules:
 *   1. `status = 'active'`   → `plan` field is the effective plan
 *   2. `status = 'trialing'` → `trial_plan` is the effective plan
 *      (checked lazily: if `trial_end_at` is past → treat as expired)
 *   3. everything else       → free
 *
 * Entitlement model:
 *   - Boolean access   → true / false
 *   - Numeric limits   → number (0 = disabled, Infinity = unlimited)
 *   - Quality / levels → typed string unions with ordered hierarchies
 *
 * Usage state (consumed quotas) is NOT stored here — it belongs in a
 * separate usage-tracking layer. This file only defines static plan caps.
 */

import type {
  UserPlan,
  UserSubscription,
  ResolvedEntitlement,
  PlanEntitlements,
  FeatureKey,
  LimitKey,
  LevelKey,
} from '../types/index';

// Re-export for convenience
export type { UserPlan, PlanEntitlements, FeatureKey, LimitKey, LevelKey } from '../types/index';

// ─── Sentinel ────────────────────────────────────────────────────────

/** Use for unlimited numeric entitlements. Works natively with `used < UNLIMITED`. */
export const UNLIMITED = Infinity;

// ─── Plan Entitlement Map ────────────────────────────────────────────

const PLAN_ENTITLEMENTS: Record<UserPlan, PlanEntitlements> = {
  free: {
    adsShown: true,
    budgetGoals: false,
    pendingPayments: false,
    receiptOcr: false,
    goldSilverTracking: false,
    stocksLive: false,
    smsNotifications: false,
    userComparison: false,
    customThemes: false,
    whatsappUsage: false,

    aiChatPerDay: 3,
    voiceTrackingPerDay: 0,
    deepAnalyticsPerWeek: 2,
    insightsPerWeek: 5,
    customCategoriesPerMonth: 0,

    categoriesLevel: 'basic',
    insightsQuality: 'basic',
    habitDetectionLevel: 'basic',
    savingTipsLevel: 'none',
    subscriptionsLevel: 'basic',
    billSplitLevel: 'basic',
  },

  pro: {
    adsShown: false,
    budgetGoals: true,
    pendingPayments: true,
    receiptOcr: false,
    goldSilverTracking: true,
    stocksLive: false,
    smsNotifications: true,
    userComparison: false,
    customThemes: false,
    whatsappUsage: true,

    aiChatPerDay: UNLIMITED,
    voiceTrackingPerDay: 3,
    deepAnalyticsPerWeek: UNLIMITED,
    insightsPerWeek: UNLIMITED,
    customCategoriesPerMonth: 0,

    categoriesLevel: 'all',
    insightsQuality: 'smarter',
    habitDetectionLevel: 'advanced',
    savingTipsLevel: 'basic',
    subscriptionsLevel: 'full',
    billSplitLevel: 'basic',
  },

  max: {
    adsShown: false,
    budgetGoals: true,
    pendingPayments: true,
    receiptOcr: true,
    goldSilverTracking: true,
    stocksLive: true,
    smsNotifications: true,
    userComparison: true,
    customThemes: true,
    whatsappUsage: true,

    aiChatPerDay: UNLIMITED,
    voiceTrackingPerDay: UNLIMITED,
    deepAnalyticsPerWeek: UNLIMITED,
    insightsPerWeek: UNLIMITED,
    customCategoriesPerMonth: 3,

    categoriesLevel: 'all_plus_custom',
    insightsQuality: 'predictive',
    habitDetectionLevel: 'predictive',
    savingTipsLevel: 'advanced',
    subscriptionsLevel: 'full_plus_insights',
    billSplitLevel: 'full',
  },
};

// ─── Level Hierarchies ───────────────────────────────────────────────

const LEVEL_ORDER: Record<LevelKey, Record<string, number>> = {
  categoriesLevel:      { basic: 0, all: 1, all_plus_custom: 2 },
  insightsQuality:      { basic: 0, smarter: 1, predictive: 2 },
  habitDetectionLevel:  { basic: 0, advanced: 1, predictive: 2 },
  savingTipsLevel:      { none: 0, basic: 1, advanced: 2 },
  subscriptionsLevel:   { basic: 0, full: 1, full_plus_insights: 2 },
  billSplitLevel:       { none: 0, basic: 1, full: 2 },
};

// ─── FeatureKey → boolean resolution map ─────────────────────────────

function resolveFeatureAccess(e: PlanEntitlements, feature: FeatureKey): boolean {
  switch (feature) {
    // Direct booleans
    case 'budgetGoals':        return e.budgetGoals;
    case 'pendingPayments':    return e.pendingPayments;
    case 'receiptOcr':         return e.receiptOcr;
    case 'goldSilverTracking': return e.goldSilverTracking;
    case 'stocksLive':         return e.stocksLive;
    case 'smsNotifications':   return e.smsNotifications;
    case 'userComparison':     return e.userComparison;
    case 'customThemes':       return e.customThemes;
    case 'whatsappUsage':      return e.whatsappUsage;
    case 'noAds':              return !e.adsShown;

    // Derived from limits (limit > 0)
    case 'aiChat':             return e.aiChatPerDay > 0;
    case 'voiceTracking':      return e.voiceTrackingPerDay > 0;
    case 'deepAnalytics':      return e.deepAnalyticsPerWeek > 0;
    case 'customCategories':   return e.customCategoriesPerMonth > 0;

    // Derived from levels (above lowest)
    case 'savingTips':         return e.savingTipsLevel !== 'none';
    case 'billSplit':          return e.billSplitLevel !== 'none';
    case 'advancedInsights':   return e.insightsQuality !== 'basic';
    case 'advancedHabits':     return e.habitDetectionLevel !== 'basic';
    case 'fullSubscriptions':  return e.subscriptionsLevel !== 'basic';

    // Legacy aliases (backward compat with old PlanFeatures)
    case 'analyticsCards':          return true; // all plans
    case 'moneyAnalysisDetail':     return e.deepAnalyticsPerWeek > 0 && e.insightsQuality !== 'basic';
    case 'subscriptionsDetail':     return true; // all plans
    case 'savingTipsPersonalized':  return e.savingTipsLevel !== 'none';
    case 'savingTipsAdvanced':      return e.savingTipsLevel === 'advanced';
    case 'aiAssistant':             return e.aiChatPerDay > 0;
    case 'voiceInput':              return e.voiceTrackingPerDay > 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Access checks
// ═══════════════════════════════════════════════════════════════════════

/** Get the full entitlement config for a plan. */
export function getEntitlements(plan: UserPlan): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}

/** Check boolean access for a feature (works with all FeatureKey types). */
export function canAccess(plan: UserPlan, feature: FeatureKey): boolean {
  return resolveFeatureAccess(PLAN_ENTITLEMENTS[plan], feature);
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Numeric limits
// ═══════════════════════════════════════════════════════════════════════

/** Get the numeric cap for a limit entitlement. Returns Infinity for unlimited. */
export function getLimit(plan: UserPlan, key: LimitKey): number {
  return PLAN_ENTITLEMENTS[plan][key];
}

/** Check whether a limit entitlement is unlimited for this plan. */
export function isUnlimited(plan: UserPlan, key: LimitKey): boolean {
  return PLAN_ENTITLEMENTS[plan][key] === UNLIMITED;
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Level / quality
// ═══════════════════════════════════════════════════════════════════════

/** Get the level value for a level entitlement. */
export function getLevel<K extends LevelKey>(
  plan: UserPlan,
  key: K,
): PlanEntitlements[K] {
  return PLAN_ENTITLEMENTS[plan][key];
}

/** Check whether a plan meets or exceeds a required level. */
export function meetsLevel<K extends LevelKey>(
  plan: UserPlan,
  key: K,
  required: PlanEntitlements[K],
): boolean {
  const hierarchy = LEVEL_ORDER[key];
  const planRank = hierarchy[PLAN_ENTITLEMENTS[plan][key] as string] ?? 0;
  const requiredRank = hierarchy[required as string] ?? 0;
  return planRank >= requiredRank;
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Plan comparison & minimum plan
// ═══════════════════════════════════════════════════════════════════════

export const PLAN_HIERARCHY: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  max: 2,
};

const PLANS_ORDERED: UserPlan[] = ['free', 'pro', 'max'];

/** Returns true when `a` is a higher tier than `b`. */
export function isHigherPlan(a: UserPlan, b: UserPlan): boolean {
  return PLAN_HIERARCHY[a] > PLAN_HIERARCHY[b];
}

/** Returns the lowest plan that grants access to a FeatureKey. */
export function getMinPlanFor(feature: FeatureKey): UserPlan {
  for (const plan of PLANS_ORDERED) {
    if (canAccess(plan, feature)) return plan;
  }
  return 'max'; // fallback
}

/** Returns the lowest plan that meets or exceeds a given level. */
export function getMinPlanForLevel<K extends LevelKey>(
  key: K,
  required: PlanEntitlements[K],
): UserPlan {
  for (const plan of PLANS_ORDERED) {
    if (meetsLevel(plan, key, required)) return plan;
  }
  return 'max';
}

/** Returns the lowest plan where a limit is ≥ a given value. */
export function getMinPlanForLimit(key: LimitKey, minimum: number): UserPlan {
  for (const plan of PLANS_ORDERED) {
    if (PLAN_ENTITLEMENTS[plan][key] >= minimum) return plan;
  }
  return 'max';
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Usage helpers (pure, stateless)
// ═══════════════════════════════════════════════════════════════════════

/** How many uses remain given a plan's limit and current usage count. */
export function getRemainingUsage(plan: UserPlan, key: LimitKey, used: number): number {
  const limit = PLAN_ENTITLEMENTS[plan][key];
  if (limit === UNLIMITED) return UNLIMITED;
  return Math.max(limit - used, 0);
}

/** Whether the user has remaining usage for a limit. */
export function hasRemainingUsage(plan: UserPlan, key: LimitKey, used: number): boolean {
  const limit = PLAN_ENTITLEMENTS[plan][key];
  return limit === UNLIMITED || used < limit;
}

// ═══════════════════════════════════════════════════════════════════════
//  PUBLIC API — Display helpers
// ═══════════════════════════════════════════════════════════════════════

export const PLAN_DISPLAY_NAMES: Record<UserPlan, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
};

/** Format a numeric limit for display: "Unlimited" or the number as string. */
export function formatLimit(value: number): string {
  return value === UNLIMITED ? 'Unlimited' : String(value);
}

/** Human-readable label for a level value. */
const LEVEL_DISPLAY: Record<string, string> = {
  none: 'None',
  basic: 'Basic',
  all: 'All',
  all_plus_custom: 'All + Custom',
  smarter: 'Smarter',
  predictive: 'Predictive',
  advanced: 'Advanced',
  full: 'Full',
  full_plus_insights: 'Full + Insights',
};

/** Get a display-safe label for a level value. */
export function formatLevel(value: string): string {
  return LEVEL_DISPLAY[value] ?? value;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Fallback only — UI reads actual values from app_config via useSubscription(). */
export const DEFAULT_TRIAL_DAYS = 14;

// ─── Entitlement resolver (pure function) ────────────────────────────

const FREE_ENTITLEMENT: ResolvedEntitlement = {
  effectivePlan: 'free',
  status: 'free',
  isTrialing: false,
  trialDaysLeft: 0,
  trialExpired: false,
  canStartProTrial: true,
  canStartMaxTrial: true,
  raw: null,
};

/**
 * Resolve the effective entitlement for a user.
 *
 * Pure, synchronous, safe to call from any context.
 * Uses `now` parameter to avoid depending on mutable `Date.now()`.
 *
 * @param sub  The raw `user_subscriptions` row (null if missing)
 * @param now  Current time in ms. Defaults to `Date.now()`.
 */
export function resolveEntitlement(
  sub: UserSubscription | null,
  now: number = Date.now(),
): ResolvedEntitlement {
  if (!sub) return FREE_ENTITLEMENT;

  const canProTrial = !sub.has_used_pro_trial;
  const canMaxTrial = !sub.has_used_max_trial;

  // ── Active paid subscription ────────────────────────────────────
  if (sub.status === 'active') {
    if (sub.current_period_end) {
      const end = new Date(sub.current_period_end).getTime();
      if (now >= end) {
        return {
          effectivePlan: 'free',
          status: 'expired',
          isTrialing: false,
          trialDaysLeft: 0,
          trialExpired: false,
          canStartProTrial: canProTrial,
          canStartMaxTrial: canMaxTrial,
          raw: sub,
        };
      }
    }
    return {
      effectivePlan: sub.plan,
      status: 'active',
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: false,
      canStartProTrial: canProTrial,
      canStartMaxTrial: canMaxTrial,
      raw: sub,
    };
  }

  // ── Trialing ────────────────────────────────────────────────────
  if (sub.status === 'trialing' && sub.trial_plan && sub.trial_end_at) {
    const end = new Date(sub.trial_end_at).getTime();
    if (now < end) {
      const msLeft = end - now;
      const daysLeft = Math.ceil(msLeft / 86_400_000);
      return {
        effectivePlan: sub.trial_plan,
        status: 'trialing',
        isTrialing: true,
        trialDaysLeft: daysLeft,
        trialExpired: false,
        canStartProTrial: canProTrial,
        canStartMaxTrial: canMaxTrial,
        raw: sub,
      };
    }
    // Trial expired (lazy detection)
    return {
      effectivePlan: 'free',
      status: 'expired',
      isTrialing: false,
      trialDaysLeft: 0,
      trialExpired: true,
      canStartProTrial: canProTrial,
      canStartMaxTrial: canMaxTrial,
      raw: sub,
    };
  }

  // ── Canceled but still in billing period ────────────────────────
  if (sub.status === 'canceled' && sub.current_period_end) {
    const end = new Date(sub.current_period_end).getTime();
    if (now < end) {
      return {
        effectivePlan: sub.plan,
        status: 'canceled',
        isTrialing: false,
        trialDaysLeft: 0,
        trialExpired: false,
        canStartProTrial: canProTrial,
        canStartMaxTrial: canMaxTrial,
        raw: sub,
      };
    }
  }

  // ── Fallback: free ──────────────────────────────────────────────
  return {
    effectivePlan: 'free',
    status: sub.status === 'expired' ? 'expired' : 'free',
    isTrialing: false,
    trialDaysLeft: 0,
    trialExpired: sub.status === 'expired' && sub.trial_plan != null,
    canStartProTrial: canProTrial,
    canStartMaxTrial: canMaxTrial,
    raw: sub,
  };
}
