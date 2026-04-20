import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchGoalsSummary } from '../services/goals-service';
import { useAuthStore } from '../store/auth-store';
import type { GoalsSummary } from '../types/index';

interface UseGoalsResult {
  data: GoalsSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useGoals(month?: string, enabled = true): UseGoalsResult {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');

  const { data, isLoading, isError, error, refetch } = useQuery<GoalsSummary, Error>({
    queryKey: [...QUERY_KEYS.budgets, 'goals', resolvedMonth],
    queryFn: () => fetchGoalsSummary(resolvedMonth),
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}
