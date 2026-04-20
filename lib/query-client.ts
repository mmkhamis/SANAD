import { QueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours — must be >= persister maxAge
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ─── Persistent cache ────────────────────────────────────────────────
// Persists all query data to AsyncStorage so the app can render cached
// data when opening offline. Cache is keyed by `buster` — increment
// CACHE_BUSTER when the query data shape changes to force a clean slate.

const CACHE_BUSTER = 'wallet-cache-v1';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_BUSTER,
  throttleTime: 1000, // Debounce writes by 1 second
});

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_BUSTER,
} as const;

// ─── Query Keys ─────────────────────────────────────────────
export const QUERY_KEYS = {
  userProfile: ['user-profile'] as const,
  dashboard: ['dashboard'] as const,
  monthSummary: (month: string) => ['month-summary', month] as const,
  categorySpending: (month: string) => ['category-spending', month] as const,
  recentTransactions: ['recent-transactions'] as const,
  aiInsight: ['ai-insight'] as const,
  transactions: ['transactions'] as const,
  categories: ['categories'] as const,
  categoryGroups: ['category-groups'] as const,
  budgets: ['budgets'] as const,
  accounts: ['accounts'] as const,
  unreviewedTransactions: ['unreviewed-transactions'] as const,
  assets: ['assets'] as const,
  assetPrices: ['asset-prices'] as const,
  portfolioSummary: ['portfolio-summary'] as const,
  monthlyLogs: ['monthly-logs'] as const,
  monthlySummary: ['monthly-summary'] as const,
  smartInputParse: ['smart-input-parse'] as const,
  subscriptions: ['subscriptions'] as const,
  commitments: ['commitments'] as const,
  commitmentsDue: (month: string) => ['commitments-due', month] as const,
  trashedTransactions: ['trashed-transactions'] as const,
  trashedAssets: ['trashed-assets'] as const,
  benchmarks: ['benchmarks'] as const,
  expenseTrend: (mode: string, month: string) => ['expense-trend', mode, month] as const,
  habitInsights: (month: string) => ['habit-insights', month] as const,
  subscription: ['subscription'] as const,
  appConfig: ['app-config'] as const,
  usageCounts: ['usage-counts'] as const,
  subscriptionSavings: (region: string) => ['subscription-savings', region] as const,
} as const;
