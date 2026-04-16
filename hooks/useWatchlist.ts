import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  fetchStockQuotes,
  fetchCommodityPrices,
  DEFAULT_POPULAR_STOCKS,
  type CommodityPrice,
} from '../services/watchlist-service';
import type { WatchlistStock, StockQuote } from '../types/index';

// ─── Query Keys ──────────────────────────────────────────────────────

const WATCHLIST_KEYS = {
  watchlist: ['stock-watchlist'] as const,
  quotes: ['stock-quotes'] as const,
  commodities: ['commodity-prices'] as const,
};

// ─── User watchlist ──────────────────────────────────────────────────

interface UseWatchlistResult {
  data: WatchlistStock[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWatchlist(): UseWatchlistResult {
  const { data, isLoading, isError, error, refetch } = useQuery<WatchlistStock[], Error>({
    queryKey: WATCHLIST_KEYS.watchlist,
    queryFn: getWatchlist,
  });
  return { data, isLoading, isError, error, refetch };
}

// ─── Live stock quotes (depends on watchlist) ────────────────────────

interface UseStockQuotesResult {
  data: StockQuote[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStockQuotes(watchlist: WatchlistStock[] | undefined): UseStockQuotesResult {
  // If user has a watchlist, use it. Otherwise show popular stocks.
  const hasWatchlist = (watchlist ?? []).length > 0;
  const stocks = hasWatchlist
    ? (watchlist ?? []).map((w) => ({ symbol: w.symbol, company_name: w.company_name }))
    : DEFAULT_POPULAR_STOCKS;

  const { data, isLoading, isError, error, refetch } = useQuery<StockQuote[], Error>({
    queryKey: [...WATCHLIST_KEYS.quotes, stocks.map((s) => s.symbol).join(',')],
    queryFn: () => fetchStockQuotes(stocks),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Commodity prices (Gold, Silver, BTC, ETH) ──────────────────────

interface UseCommodityPricesResult {
  data: CommodityPrice[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCommodityPrices(): UseCommodityPricesResult {
  const { data, isLoading, isError, error, refetch } = useQuery<CommodityPrice[], Error>({
    queryKey: WATCHLIST_KEYS.commodities,
    queryFn: fetchCommodityPrices,
    staleTime: 1000 * 60 * 3, // 3 min
    refetchInterval: 1000 * 60 * 3,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Add to watchlist mutation ───────────────────────────────────────

interface UseAddToWatchlistResult {
  mutate: (input: { symbol: string; company_name: string }) => void;
  mutateAsync: (input: { symbol: string; company_name: string }) => Promise<WatchlistStock>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useAddToWatchlist(): UseAddToWatchlistResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending, isError, error, reset } = useMutation({
    mutationFn: (input: { symbol: string; company_name: string }) =>
      addToWatchlist(input.symbol, input.company_name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WATCHLIST_KEYS.watchlist });
      qc.invalidateQueries({ queryKey: WATCHLIST_KEYS.quotes });
    },
  });

  return { mutate, mutateAsync, isPending, isError, error: error as Error | null, reset };
}

// ─── Remove from watchlist mutation ──────────────────────────────────

interface UseRemoveFromWatchlistResult {
  mutate: (id: string) => void;
  mutateAsync: (id: string) => Promise<void>;
  isPending: boolean;
}

export function useRemoveFromWatchlist(): UseRemoveFromWatchlistResult {
  const qc = useQueryClient();

  const { mutate, mutateAsync, isPending } = useMutation({
    mutationFn: removeFromWatchlist,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WATCHLIST_KEYS.watchlist });
      qc.invalidateQueries({ queryKey: WATCHLIST_KEYS.quotes });
    },
  });

  return { mutate, mutateAsync, isPending };
}
