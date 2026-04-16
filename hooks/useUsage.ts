/**
 * useUsage — TanStack Query hook for usage tracking & quota enforcement.
 *
 * Provides:
 *   - Current-period usage counts (auto-refreshed)
 *   - Per-key usage status (used / limit / remaining / allowed)
 *   - Record-usage mutation with optimistic update + server enforcement
 *   - Pure enforcement helpers that combine entitlement + usage state
 *
 * Usage:
 *   const { getStatus, recordAndCheck } = useUsage();
 *
 *   const chatStatus = getStatus('aiChatPerDay');
 *   if (!chatStatus.allowed) showUpgradePrompt();
 *
 *   const result = await recordAndCheck('aiChatPerDay');
 *   if (!result.allowed) showQuotaExhausted();
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import { getLimit, isUnlimited, UNLIMITED } from '../lib/plan';
import { fetchUsageCounts, recordUsage } from '../services/usage-service';
import { useSubscription } from './useSubscription';
import type { LimitKey } from '../types/index';
import type { UsageCounts, UsageStatus, RecordUsageResult } from '../types/usage';
import { USAGE_PERIODS } from '../types/usage';

// ─── Hook ────────────────────────────────────────────────────────────

interface UseUsageReturn {
  /** Raw usage counts (partial map, missing = 0) */
  counts: UsageCounts;
  /** Whether usage data is loading */
  isLoading: boolean;
  /** Get full usage status for a specific key */
  getStatus: (key: LimitKey) => UsageStatus;
  /** Quick check: can the user perform this action right now? */
  canUse: (key: LimitKey) => boolean;
  /**
   * Record a usage event and return whether it was allowed.
   * Handles optimistic cache update + server-side enforcement.
   */
  recordAndCheck: (key: LimitKey) => Promise<RecordUsageResult>;
  /** Whether a record mutation is in flight */
  isRecording: boolean;
  /** Refetch usage counts */
  refetch: () => void;
}

export function useUsage(): UseUsageReturn {
  const queryClient = useQueryClient();
  const { entitlement } = useSubscription();
  const plan = entitlement.effectivePlan;

  // ── Fetch current-period counts ─────────────────────────────────

  const {
    data: counts = {},
    isLoading,
    refetch,
  } = useQuery<UsageCounts>({
    queryKey: QUERY_KEYS.usageCounts,
    queryFn: fetchUsageCounts,
    staleTime: 1000 * 30,          // 30s — quotas should feel responsive
    gcTime: 1000 * 60 * 10,        // 10min cache
    refetchOnWindowFocus: true,     // Re-check on app foreground
  });

  // ── Status resolver ─────────────────────────────────────────────

  const getStatus = useCallback(
    (key: LimitKey): UsageStatus => {
      const used = counts[key] ?? 0;
      const limit = getLimit(plan, key);
      const unlimited = limit === UNLIMITED;
      const remaining = unlimited ? UNLIMITED : Math.max(limit - used, 0);
      const allowed = unlimited || used < limit;

      return {
        key,
        used,
        limit,
        remaining,
        unlimited,
        allowed,
        period: USAGE_PERIODS[key],
      };
    },
    [counts, plan],
  );

  // ── Quick check ─────────────────────────────────────────────────

  const canUse = useCallback(
    (key: LimitKey): boolean => {
      if (isUnlimited(plan, key)) return true;
      return (counts[key] ?? 0) < getLimit(plan, key);
    },
    [counts, plan],
  );

  // ── Record mutation ─────────────────────────────────────────────

  const mutation = useMutation<RecordUsageResult, Error, LimitKey>({
    mutationFn: (key: LimitKey) => {
      const limit = getLimit(plan, key);
      return recordUsage(key, Number.isFinite(limit) ? limit : null);
    },
    onMutate: async (key: LimitKey) => {
      // Optimistic: increment local count immediately
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.usageCounts });
      const prev = queryClient.getQueryData<UsageCounts>(QUERY_KEYS.usageCounts);

      queryClient.setQueryData<UsageCounts>(QUERY_KEYS.usageCounts, (old) => ({
        ...old,
        [key]: ((old?.[key]) ?? 0) + 1,
      }));

      return prev;
    },
    onError: (_err, _key, context) => {
      // Rollback on error
      if (context !== undefined) {
        queryClient.setQueryData(QUERY_KEYS.usageCounts, context);
      }
    },
    onSettled: () => {
      // Refetch to sync with server truth
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usageCounts });
    },
  });

  const recordAndCheck = useCallback(
    async (key: LimitKey): Promise<RecordUsageResult> => {
      // Fast-path: if unlimited, skip server enforcement
      if (isUnlimited(plan, key)) {
        mutation.mutate(key);
        return { allowed: true, used: (counts[key] ?? 0) + 1 };
      }

      // For limited plans, use mutateAsync to get server response
      return mutation.mutateAsync(key);
    },
    [mutation, counts, plan],
  );

  return {
    counts,
    isLoading,
    getStatus,
    canUse,
    recordAndCheck,
    isRecording: mutation.isPending,
    refetch,
  };
}

// ═══════════════════════════════════════════════════════════════════════
//  Pure display helpers (no hook dependency — safe for any context)
// ═══════════════════════════════════════════════════════════════════════

const PERIOD_LABELS: Record<string, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

/**
 * Human-readable quota status string.
 * e.g. "2 of 3 used today" or "Unlimited"
 */
export function formatUsageStatus(status: UsageStatus): string {
  if (status.unlimited) return 'Unlimited';
  return `${status.used} of ${status.limit} used ${PERIOD_LABELS[status.period] ?? ''}`.trim();
}

/**
 * Human-readable remaining string.
 * e.g. "1 remaining today" or "Unlimited"
 */
export function formatRemaining(status: UsageStatus): string {
  if (status.unlimited) return 'Unlimited';
  if (status.remaining === 0) return `No uses left ${PERIOD_LABELS[status.period] ?? ''}`.trim();
  return `${status.remaining} remaining ${PERIOD_LABELS[status.period] ?? ''}`.trim();
}

/**
 * Human-readable exhausted message for upgrade prompts.
 * e.g. "You've used all 3 AI chats today"
 */
const KEY_DISPLAY_NAMES: Record<LimitKey, string> = {
  aiChatPerDay: 'AI chats',
  voiceTrackingPerDay: 'voice actions',
  deepAnalyticsPerWeek: 'deep analytics views',
  insightsPerWeek: 'insights',
  customCategoriesPerMonth: 'custom categories',
};

export function formatExhaustedMessage(status: UsageStatus): string {
  const name = KEY_DISPLAY_NAMES[status.key] ?? status.key;
  const period = PERIOD_LABELS[status.period] ?? '';
  return `You've used all ${status.limit} ${name} ${period}`.trim();
}
