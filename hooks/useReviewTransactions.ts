import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchUnreviewedTransactions,
  reviewTransaction,
  type ReviewTransactionInput,
} from '../services/transaction-service';
import type { Transaction } from '../types/index';
import { useAuthStore } from '../store/auth-store';

// ─── Fetch transactions that need review ─────────────────────────────

interface UseUnreviewedResult {
  data: Transaction[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useUnreviewedTransactions(): UseUnreviewedResult {
  const { data, isLoading, isError, error, refetch } = useQuery<Transaction[], Error>({
    queryKey: QUERY_KEYS.unreviewedTransactions,
    queryFn: fetchUnreviewedTransactions,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Review / categorize a transaction ───────────────────────────────

interface UseReviewTransactionResult {
  mutate: (input: ReviewTransactionInput) => void;
  mutateAsync: (input: ReviewTransactionInput) => Promise<Transaction>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useReviewTransaction(): UseReviewTransactionResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: reviewTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    },
  });

  return {
    mutate,
    mutateAsync,
    isPending,
    isError,
    error: error as Error | null,
    reset,
  };
}
