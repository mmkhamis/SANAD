import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchBenchmarkSummary } from '../services/benchmark-service';
import { useAuthStore } from '../store/auth-store';
import type { BenchmarkSummary } from '../types/index';

interface UseBenchmarksResult {
  data: BenchmarkSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBenchmarks(month?: string): UseBenchmarksResult {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');

  const { data, isLoading, isError, error, refetch } = useQuery<BenchmarkSummary, Error>({
    queryKey: [...QUERY_KEYS.benchmarks, resolvedMonth],
    queryFn: () => fetchBenchmarkSummary(resolvedMonth),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}
