import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import { useAuthStore } from '../store/auth-store';
import {
  fetchMerchantCategoryRules,
  getMerchantCategorizationEnabled,
  setMerchantCategorizationEnabled,
  upsertMerchantCategoryRule,
  type MerchantCategoryRule,
  type UpsertMerchantCategoryRuleInput,
} from '../services/merchant-category-service';

interface UseMerchantCategoryRulesResult {
  data: MerchantCategoryRule[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMerchantCategoryRules(enabled = true): UseMerchantCategoryRulesResult {
  const userId = useAuthStore((s) => s.user?.id);
  const queryKey = [...QUERY_KEYS.merchantCategoryRules, userId ?? 'anon'] as const;
  const { data, isLoading, isError, error, refetch } = useQuery<MerchantCategoryRule[], Error>({
    queryKey,
    queryFn: fetchMerchantCategoryRules,
    staleTime: Infinity,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

interface UseMerchantCategorizationSettingResult {
  enabled: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isPending: boolean;
  setEnabled: (enabled: boolean) => void;
  setEnabledAsync: (enabled: boolean) => Promise<boolean>;
}

export function useMerchantCategorizationSetting(): UseMerchantCategorizationSettingResult {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  const queryKey = [...QUERY_KEYS.merchantCategorizationSetting, userId ?? 'anon'] as const;
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<boolean, Error>({
    queryKey,
    queryFn: getMerchantCategorizationEnabled,
    staleTime: Infinity,
    enabled: isAuthenticated,
  });

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: setMerchantCategorizationEnabled,
    onSuccess: (nextEnabled) => {
      qc.setQueryData(queryKey, nextEnabled);
      if (!nextEnabled) {
        qc.invalidateQueries({ queryKey: QUERY_KEYS.merchantCategoryRules });
      }
    },
  });

  return {
    enabled: data ?? true,
    isLoading,
    isError,
    error: error as Error | null,
    isPending,
    setEnabled: mutate,
    setEnabledAsync: mutateAsync,
  };
}

interface UseSaveMerchantCategoryRuleResult {
  mutate: (input: UpsertMerchantCategoryRuleInput) => void;
  mutateAsync: (input: UpsertMerchantCategoryRuleInput) => Promise<MerchantCategoryRule>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useSaveMerchantCategoryRule(): UseSaveMerchantCategoryRuleResult {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const rulesQueryKey = [...QUERY_KEYS.merchantCategoryRules, userId ?? 'anon'] as const;
  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: upsertMerchantCategoryRule,
    onSuccess: (rule) => {
      qc.setQueryData<MerchantCategoryRule[] | undefined>(
        rulesQueryKey,
        (old) => {
          const prev = old ?? [];
          const idx = prev.findIndex(
            (r) => r.type === rule.type && r.merchant_key === rule.merchant_key,
          );
          if (idx < 0) return [rule, ...prev];
          const next = [...prev];
          next[idx] = rule;
          return next;
        },
      );
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
