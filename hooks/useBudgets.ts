import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchActiveBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '../services/budget-service';
import type { Budget } from '../types/index';
import { useAuthStore } from '../store/auth-store';

// ─── Active budgets query ────────────────────────────────────────────

interface UseBudgetsResult {
  data: Budget[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useBudgets(): UseBudgetsResult {
  const { data, isLoading, isError, error, refetch } = useQuery<Budget[], Error>({
    queryKey: QUERY_KEYS.budgets,
    queryFn: fetchActiveBudgets,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Create budget mutation ──────────────────────────────────────────

interface UseCreateBudgetResult {
  mutate: (input: CreateBudgetInput) => void;
  mutateAsync: (input: CreateBudgetInput) => Promise<Budget>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCreateBudget(): UseCreateBudgetResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error } = useMutation({
    mutationFn: createBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutate, mutateAsync, isPending, isError, error: error as Error | null };
}

// ─── Update budget mutation ──────────────────────────────────────────

interface UseUpdateBudgetResult {
  mutateAsync: (input: UpdateBudgetInput) => Promise<Budget>;
  isPending: boolean;
}

export function useUpdateBudget(): UseUpdateBudgetResult {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: updateBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

// ─── Delete budget mutation ──────────────────────────────────────────

interface UseDeleteBudgetResult {
  mutate: (id: string) => void;
  isPending: boolean;
}

export function useDeleteBudget(): UseDeleteBudgetResult {
  const qc = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.budgets });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutate, isPending };
}
