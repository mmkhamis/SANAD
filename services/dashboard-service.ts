import {
  format,
  startOfMonth, endOfMonth,
  subMonths,
  startOfWeek, endOfWeek,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  parseISO, isWithinInterval,
  subYears,
} from 'date-fns';

import { supabase } from '../lib/supabase';
import { fetchCategories, fetchCategoryGroups } from './category-service';
import type {
  Account,
  Category,
  CategoryGroup,
  MonthSummary,
  CategorySpending,
  Transaction,
  AIInsight,
  DashboardData,
  ExpenseTrendPoint,
  ExpenseTrendMode,
} from '../types/index';
import { DASHBOARD_RECENT_TRANSACTIONS_LIMIT } from '../constants/layout';

function getMonthRange(month?: string): { start: string; end: string; month: string } {
  const date = month ? new Date(`${month}-01`) : new Date();
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
    month: format(date, 'yyyy-MM'),
  };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

// ─── Pure derivers ───────────────────────────────────────────────────
// Operate on a single in-memory snapshot of the current month's
// transactions. Replaces three separate Supabase queries.

function deriveMonthSummary(rows: Transaction[], monthKey: string): MonthSummary {
  let income = 0;
  let expense = 0;
  let count = 0;

  for (const r of rows) {
    if (r.exclude_from_insights) continue;
    if (r.type === 'income') income += r.amount;
    else if (r.type === 'expense') expense += r.amount;
    count += 1;
  }

  income = round2(income);
  expense = round2(expense);

  return {
    total_income: income,
    total_expense: expense,
    net_balance: round2(income - expense),
    transaction_count: count,
    month: monthKey,
  };
}

function deriveCategorySpending(
  rows: Transaction[],
  categories: Category[],
  groups: CategoryGroup[],
): CategorySpending[] {
  const catToGroup = new Map<string, string>();
  for (const c of categories) {
    if (c.group_id) catToGroup.set(c.id, c.group_id);
  }
  const groupMap = new Map<string, { name: string; icon: string; color: string }>();
  for (const g of groups) {
    groupMap.set(g.id, { name: g.name, icon: g.icon, color: g.color });
  }

  const map = new Map<string, CategorySpending>();
  let total = 0;

  for (const r of rows) {
    if (r.type !== 'expense' || r.exclude_from_insights) continue;
    total = round2(total + r.amount);

    const groupId = r.category_id ? catToGroup.get(r.category_id) : null;
    const group = groupId ? groupMap.get(groupId) : null;
    const key = groupId ?? r.category_id ?? '__uncategorized__';
    const displayName = group?.name ?? r.category_name ?? 'Uncategorized';
    const displayIcon = group?.icon ?? r.category_icon ?? '📦';
    const displayColor = group?.color ?? r.category_color ?? '#94A3B8';

    const existing = map.get(key);
    if (existing) {
      existing.total = round2(existing.total + r.amount);
      existing.transaction_count += 1;
    } else {
      map.set(key, {
        category_id: key,
        category_name: displayName,
        category_color: displayColor,
        category_icon: displayIcon,
        total: r.amount,
        percentage: 0,
        transaction_count: 1,
      });
    }
  }

  return Array.from(map.values())
    .map((c) => ({ ...c, percentage: total > 0 ? (c.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

function deriveMonthExpenseTransactions(rows: Transaction[]): Transaction[] {
  // Matches the legacy fetchMonthExpenseTransactions filter:
  // type = 'expense' (includes needs_review and exclude_from_insights)
  return rows
    .filter((r) => r.type === 'expense')
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Cheap, focused queries used by the dashboard ────────────────────

/** Single fetch of the current month's full transaction rows. */
async function fetchMonthTransactions(month?: string): Promise<Transaction[]> {
  const range = getMonthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .gte('date', range.start)
    .lte('date', range.end);

  if (error) throw new Error(error.message);
  return (data as Transaction[]) ?? [];
}

/** Lightweight totals-only fetch for the previous month. */
async function fetchPrevMonthSummary(prevMonth: string): Promise<MonthSummary> {
  const range = getMonthRange(prevMonth);
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .is('deleted_at', null)
    .eq('exclude_from_insights', false)
    .gte('date', range.start)
    .lte('date', range.end);

  if (error) throw new Error(error.message);

  let income = 0;
  let expense = 0;
  for (const row of data ?? []) {
    if (row.type === 'income') income += row.amount;
    else if (row.type === 'expense') expense += row.amount;
  }

  income = round2(income);
  expense = round2(expense);

  return {
    total_income: income,
    total_expense: expense,
    net_balance: round2(income - expense),
    transaction_count: (data ?? []).length,
    month: range.month,
  };
}

export async function fetchRecentTransactions(_month?: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);

  if (error) throw new Error(error.message);
  return (data as Transaction[]) ?? [];
}

export async function fetchLatestAIInsight(): Promise<AIInsight | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as AIInsight | null) ?? null;
}

async function fetchAccountsForBalance(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Account[]) ?? [];
}

function computeBalanceFromAccounts(accounts: Account[]): number {
  const total = accounts
    .filter((a) => a.include_in_total)
    .reduce((s, a) => s + a.current_balance, 0);
  return round2(total);
}

// ─── Combined Dashboard ──────────────────────────────────────────────
//
// One trip fan-out:
//   1. all current-month transactions (covers summary + category spending +
//      budget ribbon + downstream caches like goals/habits)
//   2. prev-month summary totals (lightweight, amount/type only)
//   3. recent transactions (cross-month, ordered by updated_at)
//   4. accounts (full rows — reused to compute balance AND seeded into
//      the accounts query cache by useDashboard)
//   5. categories + category groups (cached for 15+ min via category-service)
//   6. ai insight (latest unread)
//
// Total: 6 parallel network calls instead of the previous 9, and the
// current-month transactions table is now read once instead of three times.

export async function fetchDashboardData(month?: string): Promise<DashboardData> {
  const currentDate = month ? new Date(`${month}-01`) : new Date();
  const prevMonth = format(subMonths(currentDate, 1), 'yyyy-MM');
  const range = getMonthRange(month);

  const [monthTxns, prevSummary, recentTransactions, accounts, categories, groups, aiInsight] =
    await Promise.all([
      fetchMonthTransactions(month),
      fetchPrevMonthSummary(prevMonth),
      fetchRecentTransactions(),
      fetchAccountsForBalance(),
      fetchCategories(),
      fetchCategoryGroups(),
      fetchLatestAIInsight(),
    ]);

  const summary = deriveMonthSummary(monthTxns, range.month);
  const categorySpending = deriveCategorySpending(monthTxns, categories, groups);
  const monthExpenseTxns = deriveMonthExpenseTransactions(monthTxns);
  const computedBalance = computeBalanceFromAccounts(accounts);

  return {
    summary,
    prev_summary: prevSummary,
    category_spending: categorySpending,
    recent_transactions: recentTransactions,
    month_expense_transactions: monthExpenseTxns,
    ai_insight: aiInsight,
    computed_balance: computedBalance,
    // Hydration payload — consumed by useDashboard to seed sibling caches
    // so deferred queries (useAccounts, useCategories, useGoals,
    // useHabitInsights) become instant cache hits on cold start.
    _hydration: {
      accounts,
      categories,
      groups,
      month_transactions: monthTxns,
    },
  };
}

// ─── Legacy single-purpose exports (kept for back-compat) ────────────

export async function fetchMonthSummary(month?: string): Promise<MonthSummary> {
  const range = getMonthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .is('deleted_at', null)
    .eq('exclude_from_insights', false)
    .gte('date', range.start)
    .lte('date', range.end);

  if (error) throw new Error(error.message);

  let income = 0;
  let expense = 0;
  for (const row of data ?? []) {
    if (row.type === 'income') income += row.amount;
    else if (row.type === 'expense') expense += row.amount;
  }
  income = round2(income);
  expense = round2(expense);

  return {
    total_income: income,
    total_expense: expense,
    net_balance: round2(income - expense),
    transaction_count: (data ?? []).length,
    month: range.month,
  };
}

export async function fetchCategorySpending(month?: string): Promise<CategorySpending[]> {
  const range = getMonthRange(month);
  const [txResult, catResult, grpResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type, needs_review, exclude_from_insights, category_id, category_name, category_color, category_icon')
      .is('deleted_at', null)
      .gte('date', range.start)
      .lte('date', range.end),
    supabase.from('categories').select('id, group_id'),
    supabase.from('category_groups').select('id, name, icon, color'),
  ]);

  if (txResult.error) throw new Error(txResult.error.message);

  return deriveCategorySpending(
    (txResult.data ?? []) as Transaction[],
    (catResult.data ?? []) as Category[],
    (grpResult.data ?? []) as CategoryGroup[],
  );
}

export async function fetchMonthExpenseTransactions(month?: string): Promise<Transaction[]> {
  const range = getMonthRange(month);
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .eq('type', 'expense')
    .gte('date', range.start)
    .lte('date', range.end)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Transaction[]) ?? [];
}

// ─── Expense Trend (day / week / month) ──────────────────────────────

export async function fetchExpenseTrend(
  mode: ExpenseTrendMode,
  month?: string,
): Promise<ExpenseTrendPoint[]> {
  const now = month ? new Date(`${month}-01`) : new Date();

  let start: Date;
  let end: Date;

  if (mode === 'month') {
    start = startOfMonth(subYears(now, 1));
    end = endOfMonth(now);
  } else {
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, date')
    .is('deleted_at', null)
    .eq('type', 'expense')
    .eq('exclude_from_insights', false)
    .gte('date', startStr)
    .lte('date', endStr);

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  if (mode === 'day') {
    const days = eachDayOfInterval({ start, end });
    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const total = rows
        .filter((r) => r.date === dayStr)
        .reduce((s, r) => s + r.amount, 0);
      return {
        label: format(day, 'd'),
        value: round2(total),
        fullLabel: format(day, 'MMM d'),
      };
    });
  }

  if (mode === 'week') {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 6 });
    return weeks.map((weekStart, idx) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
      const clampedEnd = weekEnd > end ? end : weekEnd;
      const total = rows.filter((r) => {
        const d = parseISO(r.date);
        return isWithinInterval(d, { start: weekStart, end: clampedEnd });
      }).reduce((s, r) => s + r.amount, 0);
      return {
        label: `W${idx + 1}`,
        value: round2(total),
        fullLabel: `${format(weekStart, 'MMM d')} – ${format(clampedEnd, 'MMM d')}`,
      };
    });
  }

  const months = eachMonthOfInterval({ start, end });
  return months.map((m) => {
    const mStart = startOfMonth(m);
    const mEnd = endOfMonth(m);
    const total = rows.filter((r) => {
      const d = parseISO(r.date);
      return isWithinInterval(d, { start: mStart, end: mEnd });
    }).reduce((s, r) => s + r.amount, 0);
    return {
      label: format(m, 'MMM'),
      value: round2(total),
      fullLabel: format(m, 'MMM yyyy'),
    };
  });
}
