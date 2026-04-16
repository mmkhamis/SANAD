import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import { useAuthStore } from '../store/auth-store';
import {
  getMonthlyLogs,
  getMonthlySummary,
  createMonthlyLog,
  updateMonthlyLog,
  deleteMonthlyLog,
  type CreateLogInput,
  type UpdateLogInput,
} from '../services/log-service';
import type { MonthlyLog, MonthlySummaryWithLogs } from '../types/index';

// ─── All logs ────────────────────────────────────────────────────────

export function useMonthlyLogs(): {
  data: MonthlyLog[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isError, error, refetch } = useQuery<MonthlyLog[], Error>({
    queryKey: QUERY_KEYS.monthlyLogs,
    queryFn: getMonthlyLogs,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Monthly summary ─────────────────────────────────────────────────

export function useMonthlySummary(): {
  data: MonthlySummaryWithLogs | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isError, error, refetch } = useQuery<MonthlySummaryWithLogs, Error>({
    queryKey: QUERY_KEYS.monthlySummary,
    queryFn: getMonthlySummary,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Create log ──────────────────────────────────────────────────────

export function useCreateLog(): {
  mutate: (input: CreateLogInput) => void;
  mutateAsync: (input: CreateLogInput) => Promise<MonthlyLog>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
} {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: createMonthlyLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monthlyLogs });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monthlySummary });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutate, mutateAsync, isPending, isError, error: error as Error | null, reset };
}

// ─── Update log ──────────────────────────────────────────────────────

export function useUpdateLog(): {
  mutateAsync: (input: UpdateLogInput) => Promise<MonthlyLog>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: updateMonthlyLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monthlyLogs });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monthlySummary });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

// ─── Delete log ──────────────────────────────────────────────────────

export function useDeleteLog(): {
  mutateAsync: (id: string) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteMonthlyLog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monthlyLogs });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.monthlySummary });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}
