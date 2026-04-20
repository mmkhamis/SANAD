import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  type TransactionFilters,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from '../services/transaction-service';
import type { Transaction, PaginatedResponse } from '../types/index';
import { useAuthStore } from '../store/auth-store';

// ─── Infinite paginated transaction list ─────────────────────────────
// Uses useInfiniteQuery so pages accumulate instead of replacing each
// other. This prevents the "transactions disappear on page change" bug
// that occurred when each page had its own independent query key.

interface UseTransactionsResult {
  /** Flat array of ALL loaded transactions across all pages. */
  data: Transaction[];
  totalCount: number;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

export function useTransactions(
  filters?: TransactionFilters,
): UseTransactionsResult {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<PaginatedResponse<Transaction>, Error>({
    queryKey: [...QUERY_KEYS.transactions, filters ?? {}],
    queryFn: ({ pageParam }) =>
      fetchTransactions({ page: pageParam as number, filters }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.page + 1 : undefined,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  const transactions = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.data) ?? [];
    // Deduplicate: offset-based pagination can produce duplicates after
    // cache invalidation when new items shift page boundaries.
    const seen = new Set<string>();
    return all.filter((tx) => {
      if (seen.has(tx.id)) return false;
      seen.add(tx.id);
      return true;
    });
  }, [data]);

  const totalCount = data?.pages[0]?.count ?? 0;

  return {
    data: transactions,
    totalCount,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage: hasNextPage ?? false,
    fetchNextPage,
    refetch,
  };
}

// ─── Create transaction mutation ─────────────────────────────────────

interface UseCreateTransactionResult {
  mutate: (input: CreateTransactionInput, options?: { onSuccess?: () => void; onError?: (error: Error) => void }) => void;
  mutateAsync: (input: CreateTransactionInput) => Promise<Transaction>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateTransaction(): UseCreateTransactionResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
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

// ─── Delete transaction mutation ─────────────────────────────────────

interface UseDeleteTransactionResult {
  mutate: (id: string) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeleteTransaction(): UseDeleteTransactionResult {
  const qc = useQueryClient();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.transactions });
      const prev = qc.getQueriesData({ queryKey: QUERY_KEYS.transactions });
      qc.setQueriesData({ queryKey: QUERY_KEYS.transactions }, (old: any) => {
        if (Array.isArray(old)) return old.filter((t: any) => t.id !== id);
        return old;
      });
      return { prev };
    },
    onError: (_err, _id, context) => {
      context?.prev?.forEach(([key, data]: [any, any]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    },
  });

  return { mutate, isPending, isError, error: error as Error | null };
}

// ─── Update transaction mutation ─────────────────────────────────────

export function useUpdateTransaction(): {
  mutateAsync: (input: UpdateTransactionInput) => Promise<Transaction>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
    },
  });

  return { mutateAsync, isPending };
}
