import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchTrashedTransactions,
  restoreTransaction,
  permanentlyDeleteTransaction,
} from '../services/transaction-service';
import {
  fetchTrashedAssets,
  restoreAsset,
  permanentlyDeleteAsset,
} from '../services/asset-service';
import type { Transaction, UserAsset } from '../types/index';
import { useAuthStore } from '../store/auth-store';

// ─── Trashed transactions ────────────────────────────────────────────

export function useTrashedTransactions(): ReturnType<typeof useQuery<Transaction[]>> {
  return useQuery<Transaction[]>({
    queryKey: QUERY_KEYS.trashedTransactions,
    queryFn: fetchTrashedTransactions,
    enabled: useAuthStore.getState().isAuthenticated,
  });
}

export function useRestoreTransaction(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: restoreTransaction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.trashedTransactions });
      const prev = queryClient.getQueryData(QUERY_KEYS.trashedTransactions);
      queryClient.setQueryData(QUERY_KEYS.trashedTransactions, (old: any) =>
        Array.isArray(old) ? old.filter((t: any) => t.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEYS.trashedTransactions, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trashedTransactions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });
}

export function usePermanentlyDeleteTransaction(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: permanentlyDeleteTransaction,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.trashedTransactions });
      const prev = queryClient.getQueryData(QUERY_KEYS.trashedTransactions);
      queryClient.setQueryData(QUERY_KEYS.trashedTransactions, (old: any) =>
        Array.isArray(old) ? old.filter((t: any) => t.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEYS.trashedTransactions, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trashedTransactions });
    },
  });
}

// ─── Trashed assets ──────────────────────────────────────────────────

export function useTrashedAssets(): ReturnType<typeof useQuery<UserAsset[]>> {
  return useQuery<UserAsset[]>({
    queryKey: QUERY_KEYS.trashedAssets,
    queryFn: fetchTrashedAssets,
    enabled: useAuthStore.getState().isAuthenticated,
  });
}

export function useRestoreAsset(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: restoreAsset,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.trashedAssets });
      const prev = queryClient.getQueryData(QUERY_KEYS.trashedAssets);
      queryClient.setQueryData(QUERY_KEYS.trashedAssets, (old: any) =>
        Array.isArray(old) ? old.filter((a: any) => a.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEYS.trashedAssets, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trashedAssets });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assets });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSummary });
    },
  });
}

export function usePermanentlyDeleteAsset(): ReturnType<typeof useMutation<void, Error, string>> {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: permanentlyDeleteAsset,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.trashedAssets });
      const prev = queryClient.getQueryData(QUERY_KEYS.trashedAssets);
      queryClient.setQueryData(QUERY_KEYS.trashedAssets, (old: any) =>
        Array.isArray(old) ? old.filter((a: any) => a.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEYS.trashedAssets, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.trashedAssets });
    },
  });
}
