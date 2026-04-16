/**
 * useSubscription — TanStack Query hook for plan & trial state.
 *
 * Single hook that provides the resolved entitlement, trial actions,
 * and automatic lazy expiration.
 *
 * Usage:
 *   const { entitlement, startTrial, isStartingTrial } = useSubscription();
 *   if (canAccess(entitlement.effectivePlan, 'budgetGoals')) { ... }
 *   const limit = getLimit(entitlement.effectivePlan, 'aiChatPerDay');
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import {
  fetchSubscription,
  fetchAppConfig,
  startTrial as startTrialService,
  expireTrialIfNeeded,
} from '../services/billing-service';
import { resolveEntitlement } from '../lib/plan';
import { QUERY_KEYS } from '../lib/query-client';
import { notifySuccess, notifyError } from '../utils/haptics';
import type { TrialPlan, ResolvedEntitlement, AppConfig } from '../types/index';

// ─── Hook ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AppConfig = { pro_trial_days: 14, max_trial_days: 14 };

interface UseSubscriptionReturn {
  /** Resolved entitlement — always defined, defaults to free */
  entitlement: ResolvedEntitlement;
  /** Trial durations from DB (for marketing labels) */
  trialConfig: AppConfig;
  /** Start a trial for the given plan */
  startTrial: (plan: TrialPlan) => void;
  /** Whether a trial start is in flight */
  isStartingTrial: boolean;
  /** Error from the last startTrial attempt */
  startTrialError: string | null;
  /** Whether the subscription data is loading */
  isLoading: boolean;
  /** Refetch subscription state */
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionReturn {
  const queryClient = useQueryClient();

  // ── Fetch subscription row ──────────────────────────────────────

  const {
    data: subscription,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.subscription,
    queryFn: fetchSubscription,
    staleTime: 1000 * 60 * 2, // 2 min — trial countdown should feel fresh
    gcTime: 1000 * 60 * 30,
  });

  // ── Fetch app config (trial durations) ──────────────────────────

  const { data: appConfig } = useQuery({
    queryKey: QUERY_KEYS.appConfig,
    queryFn: fetchAppConfig,
    staleTime: 1000 * 60 * 60, // 1 hour — rarely changes
    gcTime: 1000 * 60 * 60 * 24,
  });

  const trialConfig = appConfig ?? DEFAULT_CONFIG;

  // ── Resolve entitlement ─────────────────────────────────────────

  const entitlement = resolveEntitlement(subscription ?? null);

  // ── Lazy expiration: persist to DB when we detect client-side ───

  const didExpire = useRef(false);
  useEffect(() => {
    if (
      entitlement.trialExpired &&
      !didExpire.current &&
      subscription?.status === 'trialing'
    ) {
      didExpire.current = true;
      expireTrialIfNeeded().then(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscription });
      });
    }
  }, [entitlement.trialExpired, subscription?.status, queryClient]);

  // ── Refetch on app foreground (catches trial expiry during bg) ──

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.subscription });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  // ── Start trial mutation ────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: (plan: TrialPlan) => startTrialService(plan),
    onSuccess: (result) => {
      // Optimistically update the cache
      queryClient.setQueryData(QUERY_KEYS.subscription, result.subscription);
      notifySuccess();
    },
    onError: () => {
      notifyError();
    },
  });

  const startTrial = useCallback(
    (plan: TrialPlan) => mutation.mutate(plan),
    [mutation],
  );

  return {
    entitlement,
    trialConfig,
    startTrial,
    isStartingTrial: mutation.isPending,
    startTrialError: mutation.error?.message ?? null,
    isLoading,
    refetch,
  };
}
