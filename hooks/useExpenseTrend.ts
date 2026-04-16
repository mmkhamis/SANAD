import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchExpenseTrend } from '../services/dashboard-service';
import type { ExpenseTrendPoint, ExpenseTrendMode } from '../types/index';

export function useExpenseTrend(
  mode: ExpenseTrendMode,
  month?: string,
): {
  data: ExpenseTrendPoint[] | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');
  return useQuery<ExpenseTrendPoint[], Error>({
    queryKey: QUERY_KEYS.expenseTrend(mode, resolvedMonth),
    queryFn: () => fetchExpenseTrend(mode, resolvedMonth),
    staleTime: 5 * 60 * 1000,
  });
}
