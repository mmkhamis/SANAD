import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

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

export function useUnreviewedTransactions(enabled = true): UseUnreviewedResult {
  const { data, isLoading, isError, error, refetch } = useQuery<Transaction[], Error>({
    queryKey: QUERY_KEYS.unreviewedTransactions,
    queryFn: fetchUnreviewedTransactions,
    // Bumped from 0 → 5min. This list only grows via SMS ingest (which
    // invalidates the key) so refetching on every dashboard re-mount was
    // pure waste.
    staleTime: 5 * 60 * 1000,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
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

// ─── Bulk review (Save all) ──────────────────────────────────────────
//
// Sequentially flushes a list of ReviewTransactionInput rows through
// `reviewTransaction` with a small concurrency cap so we never blast the
// Supabase row-level update endpoint. Aggregates per-row failures into
// a single error array so the UI can re-render the still-pending rows.

interface BulkProgress {
  total: number;
  done: number;
  failed: number;
}

interface UseBulkReviewResult {
  saveAll: (inputs: ReviewTransactionInput[]) => Promise<{
    saved: string[];
    failed: { id: string; error: Error }[];
  }>;
  isSaving: boolean;
  progress: BulkProgress;
  reset: () => void;
}

const CONCURRENCY = 3;

export function useBulkReviewTransactions(): UseBulkReviewResult {
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<BulkProgress>({ total: 0, done: 0, failed: 0 });

  const reset = useCallback((): void => {
    setProgress({ total: 0, done: 0, failed: 0 });
    setIsSaving(false);
  }, []);

  const saveAll = useCallback(
    async (
      inputs: ReviewTransactionInput[],
    ): Promise<{ saved: string[]; failed: { id: string; error: Error }[] }> => {
      if (inputs.length === 0) {
        return { saved: [], failed: [] };
      }

      setIsSaving(true);
      setProgress({ total: inputs.length, done: 0, failed: 0 });

      const saved: string[] = [];
      const failed: { id: string; error: Error }[] = [];
      const queue = [...inputs];

      // Optimistic cache strip — remove rows we are about to save so the
      // FlashList does not jitter while requests fly. Failed rows get
      // restored at the end via invalidation.
      const previous = qc.getQueryData<Transaction[]>(QUERY_KEYS.unreviewedTransactions);

      const runWorker = async (): Promise<void> => {
        while (queue.length > 0) {
          const next = queue.shift();
          if (!next) break;
          try {
            await reviewTransaction(next);
            saved.push(next.id);
            setProgress((p) => ({ ...p, done: p.done + 1 }));
            qc.setQueryData<Transaction[]>(
              QUERY_KEYS.unreviewedTransactions,
              (old) => old?.filter((t) => t.id !== next.id) ?? [],
            );
          } catch (err) {
            failed.push({ id: next.id, error: err as Error });
            setProgress((p) => ({ ...p, failed: p.failed + 1, done: p.done + 1 }));
          }
        }
      };

      try {
        await Promise.all(
          Array.from({ length: Math.min(CONCURRENCY, inputs.length) }, () => runWorker()),
        );
      } finally {
        // Always re-sync caches that depend on the transactions table.
        qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
        // If everything failed, restore previous cache to keep UI stable.
        if (saved.length === 0 && previous) {
          qc.setQueryData(QUERY_KEYS.unreviewedTransactions, previous);
        }
        setIsSaving(false);
      }

      return { saved, failed };
    },
    [qc],
  );

  return { saveAll, isSaving, progress, reset };
}
