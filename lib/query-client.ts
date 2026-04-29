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
// Persists query data to AsyncStorage so the app can render cached data
// when opening offline. Cache is keyed by `buster` — increment
// CACHE_BUSTER when the query data shape changes to force a clean slate.
//
// Bumped to v2 because we now strip the dashboard's `_hydration` payload
// before persisting (see useDashboard) and we filter transient keys out
// of the dehydrated snapshot. Old v1 caches contained ~4× the data size
// they should — this buster purges them on first launch.

const CACHE_BUSTER = 'wallet-cache-v2';
const CACHE_MAX_AGE = 1000 * 60 * 60 * 12; // 12 hours

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_BUSTER,
  // Bumped from 1s → 4s. AsyncStorage writes touch disk, so debouncing
  // bursts of mutations into one write reduces I/O + battery drain.
  throttleTime: 4000,
});

// Query keys whose data is purely a derived/transient snapshot of another
// cache. Persisting them would duplicate bytes already on disk under their
// canonical keys, and stale snapshots can mask freshly-fetched data on
// rehydrate. The "first segment" check keeps this filter cheap.
const TRANSIENT_QUERY_PREFIXES: readonly string[] = [
  // Raw current-month transactions — derived from dashboard fetch in-session
  'transactions',
  // High-churn lists that are cheap to refetch and don't need offline replay
  'recent-transactions',
  'unreviewed-transactions',
  // Derived charts; recomputed from the dashboard cache on demand
  'expense-trend',
  // Auth + usage metadata — must be live, never stale
  'usage-counts',
  'subscription',
  'app-config',
];

function isTransientQueryKey(key: readonly unknown[]): boolean {
  if (key.length === 0) return false;
  const first = String(key[0]);
  // The month-snapshot key shape is ['transactions', 'month-snapshot', month]
  // which we want to filter; the parent 'transactions' (paginated list) is
  // also fine to skip from disk — it refetches quickly when the screen mounts.
  return TRANSIENT_QUERY_PREFIXES.includes(first);
}

export const persistOptions = {
  persister: asyncStoragePersister,
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_BUSTER,
  dehydrateOptions: {
    // Only persist successfully-fetched, non-transient queries. This is
    // the dominant lever on the AsyncStorage footprint — skipping the
    // pagination + raw snapshot keys easily halves the persisted payload.
    shouldDehydrateQuery: (query: { state: { status: string }; queryKey: readonly unknown[] }) =>
      query.state.status === 'success' && !isTransientQueryKey(query.queryKey),
  },
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
  merchantCategoryRules: ['merchant-category-rules'] as const,
  merchantCategorizationSetting: ['merchant-categorization-setting'] as const,
  subscriptions: ['subscriptions'] as const,
  commitments: ['commitments'] as const,
  commitmentsDue: (month: string) => ['commitments-due', month] as const,
  trashedTransactions: ['trashed-transactions'] as const,
  trashedAssets: ['trashed-assets'] as const,
  /** Raw current-month transaction snapshot — populated by useDashboard,
   * consumed by useGoals + useHabitInsights to skip a duplicate fetch. */
  monthTransactionsSnapshot: (month: string) =>
    ['transactions', 'month-snapshot', month] as const,
  benchmarks: ['benchmarks'] as const,
  expenseTrend: (mode: string, month: string) => ['expense-trend', mode, month] as const,
  habitInsights: (month: string) => ['habit-insights', month] as const,
  subscription: ['subscription'] as const,
  appConfig: ['app-config'] as const,
  usageCounts: ['usage-counts'] as const,
  subscriptionSavings: (region: string) => ['subscription-savings', region] as const,
  offers: ['offers'] as const,
} as const;
