import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import {
  getUserAssets,
  getAssetPrices,
  getPortfolioValue,
  createAsset,
  updateAsset,
  deleteAsset,
  type CreateAssetInput,
  type UpdateAssetInput,
} from '../services/asset-service';
import { useSettingsStore } from '../store/settings-store';
import { useAuthStore } from '../store/auth-store';
import type { UserAsset, AssetPriceCache, PortfolioSummary } from '../types/index';

// ─── User assets list ────────────────────────────────────────────────

interface UseAssetsResult {
  data: UserAsset[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAssets(): UseAssetsResult {
  const { data, isLoading, isError, error, refetch } = useQuery<UserAsset[], Error>({
    queryKey: QUERY_KEYS.assets,
    queryFn: getUserAssets,
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Asset prices ────────────────────────────────────────────────────

interface UseAssetPricesResult {
  data: AssetPriceCache[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAssetPrices(): UseAssetPricesResult {
  const { data, isLoading, isError, error, refetch } = useQuery<AssetPriceCache[], Error>({
    queryKey: QUERY_KEYS.assetPrices,
    queryFn: getAssetPrices,
    staleTime: 1000 * 60 * 5, // 5 min — prices don't need constant polling
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Portfolio summary (assets + live prices combined) ───────────────

interface UsePortfolioSummaryResult {
  data: PortfolioSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePortfolioSummary(): UsePortfolioSummaryResult {
  const currency = useSettingsStore((s) => s.activeCurrency);
  const { data, isLoading, isError, error, refetch } = useQuery<PortfolioSummary, Error>({
    queryKey: [...QUERY_KEYS.portfolioSummary, currency],
    queryFn: getPortfolioValue,
    staleTime: 1000 * 60 * 2, // 2 min
    enabled: useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Create asset mutation ───────────────────────────────────────────

interface UseCreateAssetResult {
  mutate: (input: CreateAssetInput) => void;
  mutateAsync: (input: CreateAssetInput) => Promise<UserAsset>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useCreateAsset(): UseCreateAssetResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: createAsset,
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.assets });
      const prev = qc.getQueryData<UserAsset[]>(QUERY_KEYS.assets);
      if (prev) {
        const optimistic: UserAsset = {
          id: `temp-${Date.now()}`,
          user_id: '',
          asset_type: input.asset_type,
          asset_code: input.asset_code,
          display_name: input.display_name,
          quantity: input.quantity,
          unit: input.unit,
          avg_buy_price: input.avg_buy_price ?? null,
          currency_code: input.currency_code ?? 'EGP',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        };
        qc.setQueryData<UserAsset[]>(QUERY_KEYS.assets, [optimistic, ...prev]);
      }
      return { prev };
    },
    onError: (_err, _input, context) => {
      if (context?.prev) {
        qc.setQueryData(QUERY_KEYS.assets, context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.assets });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSummary });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutate, mutateAsync, isPending, isError, error: error as Error | null, reset };
}

// ─── Update asset mutation ───────────────────────────────────────────

interface UseUpdateAssetResult {
  mutate: (input: UpdateAssetInput) => void;
  mutateAsync: (input: UpdateAssetInput) => Promise<UserAsset>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useUpdateAsset(): UseUpdateAssetResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error } = useMutation({
    mutationFn: updateAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.assets });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSummary });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutate, mutateAsync, isPending, isError, error: error as Error | null };
}

// ─── Delete asset mutation ───────────────────────────────────────────

interface UseDeleteAssetResult {
  mutate: (id: string) => void;
  mutateAsync: (id: string) => Promise<void>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useDeleteAsset(): UseDeleteAssetResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error } = useMutation({
    mutationFn: deleteAsset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.assets });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.portfolioSummary });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutate, mutateAsync, isPending, isError, error: error as Error | null };
}
