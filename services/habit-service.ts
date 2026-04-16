import {
  format, subMonths, startOfMonth, endOfMonth,
  differenceInDays, parseISO, getDay,
} from 'date-fns';

import { supabase } from '../lib/supabase';
import { normalizeMerchant } from '../utils/merchant';
import type { Transaction, SpendingHabit, HabitInsights, HabitFrequency } from '../types/index';

// ─── Constants ───────────────────────────────────────────────────────

/** Minimum number of transactions to qualify as a habit */
const MIN_TRANSACTIONS = 3;
/** Maximum days between occurrences to be considered a pattern */
const MAX_AVG_DAYS_BETWEEN = 35;
/** Number of recent transactions to include per habit */
const RECENT_TX_LIMIT = 5;

// ─── Helpers ─────────────────────────────────────────────────────────

function classifyFrequency(avgDays: number): HabitFrequency {
  if (avgDays <= 2) return 'daily';
  if (avgDays <= 9) return 'weekly';
  if (avgDays <= 18) return 'biweekly';
  if (avgDays <= 35) return 'monthly';
  return 'irregular';
}

function annualize(totalSpend: number, spanDays: number): number {
  if (spanDays <= 0) return totalSpend * 12;
  return Math.round((totalSpend / spanDays) * 365 * 100) / 100;
}

function mostCommonDay(dates: string[]): number | null {
  if (dates.length < 3) return null;
  const counts = new Array<number>(7).fill(0);
  for (const d of dates) {
    counts[getDay(parseISO(d))]++;
  }
  const maxCount = Math.max(...counts);
  if (maxCount < 2) return null;
  const ratio = maxCount / dates.length;
  // Only return if at least 40% of transactions fall on the same day
  if (ratio < 0.4) return null;
  return counts.indexOf(maxCount);
}

function avgDaysBetween(sortedDates: string[]): number {
  if (sortedDates.length < 2) return 0;
  const first = parseISO(sortedDates[0]);
  const last = parseISO(sortedDates[sortedDates.length - 1]);
  const span = differenceInDays(last, first);
  return span / (sortedDates.length - 1);
}

// ─── Core habit detection ────────────────────────────────────────────

interface GroupedTxns {
  key: string;
  name: string;
  icon: string | null;
  color: string | null;
  source: 'merchant' | 'category';
  txns: Transaction[];
}

function groupByMerchant(txns: Transaction[]): GroupedTxns[] {
  const map = new Map<string, GroupedTxns>();
  for (const tx of txns) {
    const normalized = normalizeMerchant(tx.merchant);
    if (!normalized) continue;
    const key = `merchant:${normalized.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.txns.push(tx);
    } else {
      map.set(key, {
        key,
        name: normalized,
        icon: null,
        color: null,
        source: 'merchant',
        txns: [tx],
      });
    }
  }
  return Array.from(map.values());
}

function groupByCategory(txns: Transaction[]): GroupedTxns[] {
  const map = new Map<string, GroupedTxns>();
  for (const tx of txns) {
    if (!tx.category_id) continue;
    const key = `category:${tx.category_id}`;
    const existing = map.get(key);
    if (existing) {
      existing.txns.push(tx);
    } else {
      map.set(key, {
        key,
        name: tx.category_name ?? 'Unknown',
        icon: tx.category_icon,
        color: tx.category_color,
        source: 'category',
        txns: [tx],
      });
    }
  }
  return Array.from(map.values());
}

function buildHabit(
  group: GroupedTxns,
  prevMonthTxns: Transaction[],
): SpendingHabit | null {
  const { txns } = group;
  if (txns.length < MIN_TRANSACTIONS) return null;

  const sortedDates = txns.map((t) => t.date).sort();
  const avg = avgDaysBetween(sortedDates);
  if (avg > MAX_AVG_DAYS_BETWEEN && txns.length < 5) return null;

  const totalSpend = Math.round(txns.reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const averageSpend = Math.round((totalSpend / txns.length) * 100) / 100;
  const frequency = classifyFrequency(avg);

  const first = parseISO(sortedDates[0]);
  const last = parseISO(sortedDates[sortedDates.length - 1]);
  const spanDays = differenceInDays(last, first) || 1;

  // Month-over-month comparison
  let momChange: number | null = null;
  if (prevMonthTxns.length > 0) {
    let prevTotal = 0;
    for (const pt of prevMonthTxns) {
      const match = group.source === 'merchant'
        ? normalizeMerchant(pt.merchant)?.toLowerCase() === group.name.toLowerCase()
        : pt.category_id === group.key.replace('category:', '');
      if (match) prevTotal += pt.amount;
    }
    if (prevTotal > 0) {
      momChange = Math.round(((totalSpend - prevTotal) / prevTotal) * 100);
    }
  }

  return {
    key: group.key,
    name: group.name,
    icon: group.icon,
    color: group.color,
    source: group.source,
    transactionCount: txns.length,
    totalSpend,
    averageSpend,
    frequency,
    annualizedCost: annualize(totalSpend, spanDays),
    avgDaysBetween: Math.round(avg * 10) / 10,
    preferredDayOfWeek: mostCommonDay(sortedDates),
    momChange,
    recentTransactions: txns
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, RECENT_TX_LIMIT),
  };
}

// ─── Public API ──────────────────────────────────────────────────────

export async function fetchHabitInsights(month?: string): Promise<HabitInsights> {
  const now = month ? new Date(`${month}-01`) : new Date();
  const start = format(startOfMonth(now), 'yyyy-MM-dd');
  const end = format(endOfMonth(now), 'yyyy-MM-dd');

  // Also fetch previous month for MoM comparison
  const prevStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
  const prevEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

  const [currentResult, prevResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('type', 'expense')
      .eq('exclude_from_insights', false)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true }),
    supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('type', 'expense')
      .eq('exclude_from_insights', false)
      .gte('date', prevStart)
      .lte('date', prevEnd),
  ]);

  if (currentResult.error) throw new Error(currentResult.error.message);

  const currentTxns = (currentResult.data ?? []) as Transaction[];
  const prevTxns = (prevResult.data ?? []) as Transaction[];
  const totalMonthExpense = currentTxns.reduce((s, t) => s + t.amount, 0);

  // Detect habits from both merchant and category groupings
  const merchantGroups = groupByMerchant(currentTxns);
  const categoryGroups = groupByCategory(currentTxns);

  const allGroups = [...merchantGroups, ...categoryGroups];
  const habits: SpendingHabit[] = [];

  // Track merchant keys already added to avoid category duplicates for same spending
  const addedMerchantKeys = new Set<string>();

  for (const group of allGroups) {
    const habit = buildHabit(group, prevTxns);
    if (!habit) continue;

    // If we already have a merchant habit, skip the category habit if it's smaller
    if (habit.source === 'category') {
      // Check if most transactions in this category are already covered by a merchant habit
      const coveredCount = habit.recentTransactions.filter((tx) => {
        const norm = normalizeMerchant(tx.merchant);
        return norm && addedMerchantKeys.has(`merchant:${norm.toLowerCase()}`);
      }).length;
      if (coveredCount >= habit.transactionCount * 0.7) continue;
    }

    habits.push(habit);
    if (habit.source === 'merchant') {
      addedMerchantKeys.add(habit.key);
    }
  }

  // Sort by total spend descending
  habits.sort((a, b) => b.totalSpend - a.totalSpend);

  const totalHabitSpend = Math.round(
    habits.reduce((s, h) => s + h.totalSpend, 0) * 100,
  ) / 100;

  return {
    habits,
    totalHabitSpend,
    habitPercentage: totalMonthExpense > 0
      ? Math.round((totalHabitSpend / totalMonthExpense) * 100)
      : 0,
  };
}
