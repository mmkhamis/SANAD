import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  createSMSTransaction,
  type CreateSMSTransactionInput,
} from '../services/transaction-service';
import type { Transaction } from '../types/index';

// ─── Create transaction from SMS ─────────────────────────────────────

interface UseCreateSmsTransactionResult {
  mutate: (input: CreateSMSTransactionInput) => void;
  mutateAsync: (input: CreateSMSTransactionInput) => Promise<Transaction>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateSmsTransaction(): UseCreateSmsTransactionResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: createSMSTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
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
