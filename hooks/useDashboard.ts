import { useQuery } from '@tanstack/react-query';
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

  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData, Error>({
    queryKey: [...QUERY_KEYS.dashboard, resolvedMonth],
    queryFn: () => fetchDashboardData(resolvedMonth),
    staleTime: 1000 * 60 * 2,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}
