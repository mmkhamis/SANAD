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
import type {
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

// ─── Month Summary ───────────────────────────────────────────────────

export async function fetchMonthSummary(month?: string): Promise<MonthSummary> {
  const range = getMonthRange(month);

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .is('deleted_at', null)
    .eq('needs_review', false)
    .eq('exclude_from_insights', false)
    .gte('date', range.start)
    .lte('date', range.end);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of rows) {
    if (row.type === 'income') {
      totalIncome = Math.round((totalIncome + row.amount) * 100) / 100;
    } else if (row.type === 'expense') {
      totalExpense = Math.round((totalExpense + row.amount) * 100) / 100;
    }
  }

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_balance: Math.round((totalIncome - totalExpense) * 100) / 100,
    transaction_count: rows.length,
    month: range.month,
  };
}

// ─── Category Spending ───────────────────────────────────────────────

export async function fetchCategorySpending(month?: string): Promise<CategorySpending[]> {
  const range = getMonthRange(month);

  // Fetch transactions + categories + groups in parallel
  const [txResult, catResult, grpResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, category_id, category_name, category_color, category_icon')
      .is('deleted_at', null)
      .eq('needs_review', false)
      .eq('exclude_from_insights', false)
      .eq('type', 'expense')
      .gte('date', range.start)
      .lte('date', range.end),
    supabase.from('categories').select('id, group_id'),
    supabase.from('category_groups').select('id, name, icon, color'),
  ]);

  if (txResult.error) throw new Error(txResult.error.message);

  const rows = txResult.data ?? [];
  const categories = catResult.data ?? [];
  const groups = grpResult.data ?? [];

  // Build lookup maps: category_id → group_id, group_id → group details
  const catToGroup = new Map<string, string>();
  for (const c of categories) {
    if (c.group_id) catToGroup.set(c.id, c.group_id);
  }
  const groupMap = new Map<string, { name: string; icon: string; color: string }>();
  for (const g of groups) {
    groupMap.set(g.id, { name: g.name, icon: g.icon, color: g.color });
  }

  const categoryMap = new Map<string, CategorySpending>();
  let grandTotal = 0;

  for (const row of rows) {
    grandTotal = Math.round((grandTotal + row.amount) * 100) / 100;

    // Resolve to parent group if available
    const groupId = row.category_id ? catToGroup.get(row.category_id) : null;
    const group = groupId ? groupMap.get(groupId) : null;

    // Use group as the key if available, otherwise fall back to category_id
    const key = groupId ?? row.category_id ?? '__uncategorized__';
    const displayName = group?.name ?? row.category_name;
    const displayIcon = group?.icon ?? row.category_icon;
    const displayColor = group?.color ?? row.category_color;

    const existing = categoryMap.get(key);

    if (existing) {
      existing.total = Math.round((existing.total + row.amount) * 100) / 100;
      existing.transaction_count += 1;
    } else {
      categoryMap.set(key, {
        category_id: key,
        category_name: displayName,
        category_color: displayColor,
        category_icon: displayIcon,
        total: row.amount,
        percentage: 0,
        transaction_count: 1,
      });
    }
  }

  const result = Array.from(categoryMap.values())
    .map((cat) => ({
      ...cat,
      percentage: grandTotal > 0 ? (cat.total / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return result;
}

// ─── Recent Transactions ─────────────────────────────────────────────

export async function fetchRecentTransactions(_month?: string): Promise<Transaction[]> {
  const query = supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    // Home "Recent" should prioritize what was just confirmed/edited/added,
    // even if the transaction date itself is older (e.g. backfilled SMS).
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as Transaction[]) ?? [];
}

// ─── Month Expense Transactions (for budget ribbon) ──────────────────

export async function fetchMonthExpenseTransactions(month?: string): Promise<Transaction[]> {
  const range = getMonthRange(month);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .is('deleted_at', null)
    .eq('needs_review', false)
    .eq('type', 'expense')
    .gte('date', range.start)
    .lte('date', range.end)
    .order('date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Transaction[]) ?? [];
}

// ─── AI Insight ──────────────────────────────────────────────────────

export async function fetchLatestAIInsight(): Promise<AIInsight | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AIInsight | null) ?? null;
}

// ─── Combined Dashboard ──────────────────────────────────────────────

/** Compute live balance: sum of current_balance across included accounts.
 *  current_balance is atomically adjusted on every transaction via adjustAccountBalance,
 *  and updated directly when the user sets a new balance. */
async function fetchComputedBalance(): Promise<number> {
  const { data: accountsData } = await supabase
    .from('accounts')
    .select('current_balance, include_in_total');

  const includedAccts = (accountsData ?? []).filter(
    (a: { include_in_total: boolean }) => a.include_in_total,
  );

  if (includedAccts.length === 0) return 0;

  const total = includedAccts.reduce(
    (s: number, a: { current_balance: number }) => s + a.current_balance,
    0,
  );

  return Math.round(total * 100) / 100;
}

export async function fetchDashboardData(month?: string): Promise<DashboardData> {
  // Compute previous month string
  const currentDate = month ? new Date(`${month}-01`) : new Date();
  const prevDate = subMonths(currentDate, 1);
  const prevMonth = format(prevDate, 'yyyy-MM');

  const [summary, prevSummary, categorySpending, recentTransactions, monthExpenseTxns, aiInsight, computedBalance] =
    await Promise.all([
      fetchMonthSummary(month),
      fetchMonthSummary(prevMonth),
      fetchCategorySpending(month),
      fetchRecentTransactions(month),
      fetchMonthExpenseTransactions(month),
      fetchLatestAIInsight(),
      fetchComputedBalance(),
    ]);

  return {
    summary,
    prev_summary: prevSummary,
    category_spending: categorySpending,
    recent_transactions: recentTransactions,
    month_expense_transactions: monthExpenseTxns,
    ai_insight: aiInsight,
    computed_balance: computedBalance,
  };
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
    // Last 12 months
    start = startOfMonth(subYears(now, 1));
    end = endOfMonth(now);
  } else {
    // Current month for day / week
    start = startOfMonth(now);
    end = endOfMonth(now);
  }

  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, date')
    .is('deleted_at', null)
    .eq('needs_review', false)
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
        value: Math.round(total * 100) / 100,
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
        value: Math.round(total * 100) / 100,
        fullLabel: `${format(weekStart, 'MMM d')} – ${format(clampedEnd, 'MMM d')}`,
      };
    });
  }

  // mode === 'month'
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
      value: Math.round(total * 100) / 100,
      fullLabel: format(m, 'MMM yyyy'),
    };
  });
}
