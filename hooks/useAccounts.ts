import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  type CreateAccountInput,
  type UpdateAccountInput,
} from '../services/account-service';
import type { Account } from '../types/index';
import { useAuthStore } from '../store/auth-store';

// ─── Fetch all accounts ──────────────────────────────────────────────

interface UseAccountsResult {
  data: Account[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAccounts(enabled = true): UseAccountsResult {
  const { data, isLoading, isError, error, refetch } = useQuery<Account[], Error>({
    queryKey: QUERY_KEYS.accounts,
    queryFn: fetchAccounts,
    staleTime: 10 * 60 * 1000,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Create account mutation ─────────────────────────────────────────

export function useCreateAccount() {
  const qc = useQueryClient();

  return useMutation<Account, Error, CreateAccountInput>({
    mutationFn: createAccount,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}

// ─── Update account mutation ─────────────────────────────────────────

export function useUpdateAccount() {
  const qc = useQueryClient();

  return useMutation<Account, Error, { id: string; input: UpdateAccountInput }>({
    mutationFn: ({ id, input }) => updateAccount(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}

// ─── Delete account mutation ─────────────────────────────────────────

export function useDeleteAccount() {
  const qc = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteAccount,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.accounts });
      const prev = qc.getQueryData(QUERY_KEYS.accounts);
      qc.setQueryData(QUERY_KEYS.accounts, (old: any) =>
        Array.isArray(old) ? old.filter((a: any) => a.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(QUERY_KEYS.accounts, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}
