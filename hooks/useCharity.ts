import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchCharitySummary, type CharitySummary } from '../services/charity-service';
import { useAuthStore } from '../store/auth-store';

interface UseCharityResult {
  data: CharitySummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCharity(month?: string, enabled = true): UseCharityResult {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');

  const { data, isLoading, isError, error, refetch } = useQuery<CharitySummary, Error>({
    queryKey: [...QUERY_KEYS.budgets, 'charity', resolvedMonth],
    queryFn: () => fetchCharitySummary(resolvedMonth),
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}
