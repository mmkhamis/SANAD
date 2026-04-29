import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchDashboardData } from '../services/dashboard-service';
import { useAuthStore } from '../store/auth-store';
import type { DashboardData } from '../types/index';

interface UseDashboardResult {
  data: DashboardData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboard(month?: string): UseDashboardResult {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData, Error>({
    queryKey: [...QUERY_KEYS.dashboard, resolvedMonth],
    queryFn: async () => {
      const result = await fetchDashboardData(resolvedMonth);

      // ─── Seed sibling caches ─────────────────────────────────────
      // The dashboard fetch already paid the cost of these rows; pushing
      // them into the matching query keys turns the deferred secondary
      // queries (useAccounts, useCategories, useCategoryGroups,
      // useGoals, useHabitInsights) into instant cache hits.
      //
      // _hydration is stripped before returning so it doesn't end up in
      // the persisted dashboard cache as a duplicate of data already
      // stored under its own keys (accounts/categories/etc).
      const { _hydration, ...publicResult } = result;
      if (_hydration) {
        qc.setQueryData(QUERY_KEYS.accounts, _hydration.accounts);
        qc.setQueryData(QUERY_KEYS.categories, _hydration.categories);
        qc.setQueryData(QUERY_KEYS.categoryGroups, _hydration.groups);
        // Cache the raw transactions snapshot so goals/habits services
        // can read it instead of re-querying Supabase for the same rows.
        // Marked transient — useDashboard rebuilds it on next fetch and
        // the query-client persister filters it out from disk storage.
        qc.setQueryData(
          QUERY_KEYS.monthTransactionsSnapshot(resolvedMonth),
          _hydration.month_transactions,
        );
      }
      return publicResult as DashboardData;
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}
