import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import { fetchHabitInsights } from '../services/habit-service';
import { useAuthStore } from '../store/auth-store';
import type { HabitInsights } from '../types/index';

export function useHabitInsights(month?: string): {
  data: HabitInsights | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');
  return useQuery<HabitInsights, Error>({
    queryKey: QUERY_KEYS.habitInsights(resolvedMonth),
    queryFn: () => fetchHabitInsights(resolvedMonth),
    staleTime: 10 * 60 * 1000,
    enabled: useAuthStore.getState().isAuthenticated,
  });
}
