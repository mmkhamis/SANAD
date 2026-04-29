import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchHabitInsights } from '../services/habit-service';
import { useAuthStore } from '../store/auth-store';
import type { HabitInsights, Transaction } from '../types/index';

export function useHabitInsights(month?: string, enabled = true): {
  data: HabitInsights | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');
  const qc = useQueryClient();

  return useQuery<HabitInsights, Error>({
    queryKey: QUERY_KEYS.habitInsights(resolvedMonth),
    queryFn: () => {
      const monthTxns = qc.getQueryData<Transaction[]>(
        QUERY_KEYS.monthTransactionsSnapshot(resolvedMonth),
      );
      return fetchHabitInsights(resolvedMonth, { monthTransactions: monthTxns });
    },
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });
}
