// ─── Core Financial Types ────────────────────────────────────────────

export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransactionSource = 'manual' | 'sms' | 'ocr' | 'recurring' | 'whatsapp';

export type AccountType = 'cash' | 'bank' | 'savings' | 'credit_card';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  current_balance: number;
  /** The last manually-set balance (snapshot) */
  balance_snapshot: number;
  /** When the user last set/reset the balance */
  balance_set_at: string;
  include_in_total: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  transaction_type: TransactionType;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  description: string;
  merchant: string | null;
  counterparty: string | null;
  date: string; // ISO 8601
  source: TransactionSource;
  source_type: TransactionSource;
  receipt_url: string | null;
  notes: string | null;
  is_recurring: boolean;
  needs_review: boolean;
  parse_confidence: number | null;
  review_reason: string | null;
  account_id: string | null;
  exclude_from_insights: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Asset Types ─────────────────────────────────────────────────────

export type AssetType = 'gold' | 'silver' | 'crypto' | 'stock';

export interface UserAsset {
  id: string;
  user_id: string;
  asset_type: AssetType;
  asset_code: string;
  display_name: string;
  quantity: number;
  unit: string;
  avg_buy_price: number | null;
  currency_code: string;
  include_in_summary: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetPriceCache {
  asset_code: string;
  price: number;
  currency_code: string;
  last_updated_at: string;
  source: string | null;
}

export interface PortfolioSummary {
  total_value: number;
  breakdown: {
    gold: number;
    silver: number;
    crypto: number;
    stock: number;
  };
  assets: Array<UserAsset & { current_price: number; total_value: number; gain_loss: number | null }>;
}

// ─── Stock Watchlist ─────────────────────────────────────────────────

export interface WatchlistStock {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string;
  sort_order: number;
  created_at: string;
}

export interface StockQuote {
  symbol: string;
  company_name: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
}

// ─── Monthly Logs (Fixed Installments) ───────────────────────────────

export interface MonthlyLog {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  day_of_month: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummaryWithLogs {
  fixed_income: number;
  fixed_expenses: number;
  net_fixed: number;
  logs: MonthlyLog[];
}

// ─── Recurring Commitments ───────────────────────────────────────────

export type CommitmentRecurrenceType = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface Commitment {
  id: string;
  user_id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  amount: number;
  currency_code: string;
  recurrence_type: CommitmentRecurrenceType;
  recurrence_interval_months: number;
  next_due_date: string; // ISO date
  last_paid_date: string | null;
  is_fixed_amount: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitmentsDueSummary {
  this_month: Commitment[];
  nearly_due: Commitment[];      // due within 7 days
  upcoming_next_month: Commitment[];
  total_due_this_month: number;
}

// ─── SMS Parsed Transaction ──────────────────────────────────────────

export interface ParsedTransaction {
  amount: number;
  transaction_type: TransactionType;
  merchant: string | null;
  counterparty: string | null;
  description: string;
  date: string;
  parse_confidence: number;
  needs_review: boolean;
  review_reason: string | null;
  rawText: string;
}

export interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  sort_order: number;
  is_default: boolean;
  taxonomy_key: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  budget_limit: number | null;
  is_default: boolean;
  group_id: string | null;
  taxonomy_key: string | null;
  created_at: string;
}

export interface GroupedCategories {
  group: CategoryGroup;
  categories: Category[];
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  amount: number;
  spent: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
  created_at: string;
}

export type GoalStatus = 'on_track' | 'near_limit' | 'exceeded';

export interface BudgetGoal {
  budget: Budget;
  category_icon: string;
  category_color: string;
  group_name: string | null;
  /** All category IDs that belong to this budget (parent + children sharing same group) */
  related_category_ids: string[];
  actual_spent: number;
  remaining: number;
  percent_used: number;
  status: GoalStatus;
}

export interface GoalsSummary {
  goals: BudgetGoal[];
  total_budgeted: number;
  total_spent: number;
  on_track_count: number;
  near_limit_count: number;
  exceeded_count: number;
  insights: string[];
}

// ─── Dashboard Types ─────────────────────────────────────────────────

export interface MonthSummary {
  total_income: number;
  total_expense: number;
  net_balance: number;
  transaction_count: number;
  month: string; // YYYY-MM
}

export type ExpenseTrendMode = 'day' | 'week' | 'month';

export interface ExpenseTrendPoint {
  label: string;      // display label (e.g. "Mon", "W1", "Jan")
  value: number;      // total expense amount
  fullLabel: string;  // longer label for tooltip (e.g. "Apr 14", "Week 1", "Jan 2026")
}

export interface CategorySpending {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string;
  total: number;
  percentage: number;
  transaction_count: number;
}

export interface AIInsight {
  id: string;
  user_id: string;
  message: string;
  type: 'spending' | 'saving' | 'budget' | 'trend';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  is_read: boolean;
}

export interface DashboardData {
  summary: MonthSummary;
  prev_summary: MonthSummary | null;
  category_spending: CategorySpending[];
  recent_transactions: Transaction[];
  /** All expense transactions for the selected month (used by budget ribbon) */
  month_expense_transactions: Transaction[];
  ai_insight: AIInsight | null;
  /** Computed balance: sum(balance_snapshot) + income − expenses since each account's balance_set_at */
  computed_balance: number;
}

// ─── Spending Habits ─────────────────────────────────────────────────

export type HabitFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'irregular';

export interface SpendingHabit {
  /** Unique key: merchant name or category_id */
  key: string;
  /** Display name (merchant or category) */
  name: string;
  icon: string | null;
  color: string | null;
  /** 'merchant' or 'category' */
  source: 'merchant' | 'category';
  transactionCount: number;
  totalSpend: number;
  averageSpend: number;
  frequency: HabitFrequency;
  /** Estimated yearly cost based on frequency */
  annualizedCost: number;
  /** Average days between occurrences */
  avgDaysBetween: number;
  /** Most common day of week (0=Sun..6=Sat), null if no clear pattern */
  preferredDayOfWeek: number | null;
  /** Month-over-month change percentage (null if not enough data) */
  momChange: number | null;
  /** Sample transactions for detail view */
  recentTransactions: Transaction[];
}

export interface HabitInsights {
  /** Top habits sorted by total spend */
  habits: SpendingHabit[];
  /** Total monthly spend attributed to detected habits */
  totalHabitSpend: number;
  /** Percentage of monthly expenses from habits */
  habitPercentage: number;
}

// ─── User & Auth Types ───────────────────────────────────────────────

export type AgeBand = '18-24' | '25-34' | '35-44' | '45-54' | '55+';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  currency: string;
  locale: string;
  onboarding_completed: boolean;
  date_of_birth: string | null;
  age_band: AgeBand | null;
  country_code: string | null;
  region_name: string | null;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
}

export interface OnboardingData {
  currency: string;
  locale: string;
}

// ─── API Response Types ──────────────────────────────────────────────

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

// ─── Smart Input Types ───────────────────────────────────────────────

export type SmartInputSource = 'text' | 'sms' | 'voice' | 'ocr';

export interface SmartInputResult {
  amount: number | null;
  currency: string | null;
  transaction_type: TransactionType;
  category: string | null;
  merchant: string | null;
  counterparty: string | null;
  account_name: string | null;
  confidence: number;
  needs_review: boolean;
  source: 'rules' | 'ai' | 'rules-fallback';
  date: string;
  description: string;
}

// ─── Benchmark Types (anonymized internal Wallet user data) ──────────

export interface SpendingBenchmark {
  id: string;
  month: string;
  age_band: AgeBand;
  country_code: string;
  region_name: string;
  category_name: string;
  average_spend: number;
  median_spend: number;
  sample_size: number;
}

export interface BenchmarkComparison {
  category_name: string;
  category_icon: string;
  category_color: string;
  user_spend: number;
  benchmark_median: number;
  benchmark_average: number;
  sample_size: number;
  diff_percent: number;        // positive = above benchmark
  insight: string;
}

export interface BenchmarkSummary {
  comparisons: BenchmarkComparison[];
  age_band: AgeBand;
  country_code: string;
  region_name: string;
  month: string;
  has_profile: boolean;         // user has set age + region
  has_data: boolean;            // benchmarks exist for cohort
}

// ─── Community / Split Bill Types ────────────────────────────────────

export type CommunityMemberRole = 'admin' | 'member';
export type SplitEventStatus = 'open' | 'settled';

export interface Community {
  id: string;
  name: string;
  icon: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: CommunityMemberRole;
  joined_at: string;
  // joined from profiles
  full_name: string;
  avatar_url: string | null;
  email: string;
}

export interface CommunityWithMembers extends Community {
  members: CommunityMember[];
  my_role: CommunityMemberRole;
}

export interface SplitEvent {
  id: string;
  community_id: string;
  title: string;
  date: string;
  currency: string;
  subtotal: number;
  tax: number;
  service_fee: number;
  discount: number;
  total: number;
  status: SplitEventStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SplitItem {
  id: string;
  event_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  // populated on fetch
  assignments: SplitAssignment[];
}

export interface SplitAssignment {
  id: string;
  item_id: string;
  user_id: string;
  share_count: number;
  created_at: string;
  // joined
  full_name: string;
  avatar_url: string | null;
}

export interface SplitSettlement {
  id: string;
  event_id: string;
  user_id: string;
  items_total: number;
  extras_share: number;
  amount_owed: number;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  // joined
  full_name: string;
  avatar_url: string | null;
}

export interface SplitEventDetail extends SplitEvent {
  items: SplitItem[];
  settlements: SplitSettlement[];
  community: Community;
}

// ─── Plan & Billing Types ────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'max';
export type TrialPlan = 'pro' | 'max';
export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'expired' | 'canceled';
export type SubscriptionProvider = 'apple' | 'google' | 'web' | 'internal';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan: UserPlan;
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  trial_plan: TrialPlan | null;
  trial_start_at: string | null;
  trial_end_at: string | null;
  has_used_pro_trial: boolean;
  has_used_max_trial: boolean;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppConfig {
  pro_trial_days: number;
  max_trial_days: number;
}

export interface ResolvedEntitlement {
  /** The plan the user effectively has right now */
  effectivePlan: UserPlan;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Whether the user is currently in a trial */
  isTrialing: boolean;
  /** Days left in trial (0 if not trialing) */
  trialDaysLeft: number;
  /** Whether the trial just expired (useful for one-time messaging) */
  trialExpired: boolean;
  /** Can start a Pro trial */
  canStartProTrial: boolean;
  /** Can start a Max trial */
  canStartMaxTrial: boolean;
  /** Raw subscription row (null for users without a row yet) */
  raw: UserSubscription | null;
}

// ─── Plan Entitlement Types ─────────────────────────────────────────

export type CategoriesLevel = 'basic' | 'all' | 'all_plus_custom';
export type InsightsQuality = 'basic' | 'smarter' | 'predictive';
export type HabitDetectionLevel = 'basic' | 'advanced' | 'predictive';
export type SavingTipsLevel = 'none' | 'basic' | 'advanced';
export type SubscriptionsLevel = 'basic' | 'full' | 'full_plus_insights';
export type BillSplitLevel = 'none' | 'basic' | 'full';

export interface PlanEntitlements {
  // ── Boolean access ──────────────────────────────────────────────
  adsShown: boolean;
  budgetGoals: boolean;
  pendingPayments: boolean;
  receiptOcr: boolean;
  goldSilverTracking: boolean;
  stocksLive: boolean;
  smsNotifications: boolean;
  userComparison: boolean;
  customThemes: boolean;
  whatsappUsage: boolean;

  // ── Numeric limits (Infinity = unlimited, 0 = disabled) ─────────
  aiChatPerDay: number;
  voiceTrackingPerDay: number;
  deepAnalyticsPerWeek: number;
  insightsPerWeek: number;
  customCategoriesPerMonth: number;

  // ── Quality / feature levels ────────────────────────────────────
  categoriesLevel: CategoriesLevel;
  insightsQuality: InsightsQuality;
  habitDetectionLevel: HabitDetectionLevel;
  savingTipsLevel: SavingTipsLevel;
  subscriptionsLevel: SubscriptionsLevel;
  billSplitLevel: BillSplitLevel;
}

/** Keys for numeric entitlements (limits & quotas). */
export type LimitKey = keyof Pick<
  PlanEntitlements,
  'aiChatPerDay' | 'voiceTrackingPerDay' | 'deepAnalyticsPerWeek' | 'insightsPerWeek' | 'customCategoriesPerMonth'
>;

/** Keys for level/quality entitlements. */
export type LevelKey = keyof Pick<
  PlanEntitlements,
  'categoriesLevel' | 'insightsQuality' | 'habitDetectionLevel' | 'savingTipsLevel' | 'subscriptionsLevel' | 'billSplitLevel'
>;

/**
 * Unified feature key for access checks and FeatureGate.
 *
 * Includes direct boolean fields, derived access from limits/levels,
 * and legacy keys for backward compatibility.
 */
export type FeatureKey =
  // Direct boolean entitlements
  | 'budgetGoals'
  | 'pendingPayments'
  | 'receiptOcr'
  | 'goldSilverTracking'
  | 'stocksLive'
  | 'smsNotifications'
  | 'userComparison'
  | 'customThemes'
  | 'whatsappUsage'
  | 'noAds'
  // Derived from limits (limit > 0)
  | 'aiChat'
  | 'voiceTracking'
  | 'deepAnalytics'
  | 'customCategories'
  // Derived from levels (level beyond lowest/none)
  | 'savingTips'
  | 'billSplit'
  | 'advancedInsights'
  | 'advancedHabits'
  | 'fullSubscriptions'
  // Legacy aliases (backward compat with old PlanFeatures keys)
  | 'analyticsCards'
  | 'moneyAnalysisDetail'
  | 'subscriptionsDetail'
  | 'savingTipsPersonalized'
  | 'savingTipsAdvanced'
  | 'aiAssistant'
  | 'voiceInput';
