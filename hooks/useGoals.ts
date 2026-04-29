import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchGoalsSummary } from '../services/goals-service';
import { useAuthStore } from '../store/auth-store';
import type {
  Category,
  CategoryGroup,
  GoalsSummary,
  Transaction,
} from '../types/index';

interface UseGoalsResult {
  data: GoalsSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useGoals(month?: string, enabled = true): UseGoalsResult {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<GoalsSummary, Error>({
    queryKey: [...QUERY_KEYS.budgets, 'goals', resolvedMonth],
    queryFn: () => {
      // Pull whatever the dashboard already loaded into cache so this query
      // can derive its result without re-hitting Supabase for the same rows.
      const monthTxns = qc.getQueryData<Transaction[]>(
        QUERY_KEYS.monthTransactionsSnapshot(resolvedMonth),
      );
      const categories = qc.getQueryData<Category[]>(QUERY_KEYS.categories);
      const groups = qc.getQueryData<CategoryGroup[]>(QUERY_KEYS.categoryGroups);

      return fetchGoalsSummary(resolvedMonth, {
        monthTransactions: monthTxns,
        categories,
        groups,
      });
    },
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}
