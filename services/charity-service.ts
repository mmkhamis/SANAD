import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';

import { supabase } from '../lib/supabase';
import { fetchActiveBudgets } from './budget-service';
import { fetchCategories, fetchCategoryGroups } from './category-service';
import type { Transaction } from '../types/index';

// Taxonomy keys that count as "charity / religious giving" for the purposes
// of this feature. Drawn from constants/category-taxonomy.ts — the
// `religion_charity_social` group plus its charity-specific subcategories.
const CHARITY_GROUP_KEY = 'religion_charity_social';
const CHARITY_SUBCATEGORY_KEYS: ReadonlySet<string> = new Set([
  'zakat',
  'sadaqah',
  'mosque_community',
  'eid_social_giving',
  'family_occasions',
  'funeral_support',
  'religious_courses',
]);

export interface CharityCategoryBreakdown {
  category_id: string;
  category_name: string;
  taxonomy_key: string | null;
  icon: string;
  color: string;
  amount: number;
}

export interface CharityGoalStatus {
  budget_amount: number;
  given: number;
  percent_used: number;
  remaining: number;
  status: 'on_track' | 'near_limit' | 'exceeded';
}

export interface CharityDailyPoint {
  label: string;
  value: number;
  fullLabel: string;
}

export interface CharitySummary {
  given_this_month: number;
  given_this_year: number;
  donation_count_this_month: number;
  last_donation_date: string | null;
  top_category: CharityCategoryBreakdown | null;
  breakdown: CharityCategoryBreakdown[];
  goal: CharityGoalStatus | null;
  daily_trend: CharityDailyPoint[];
  transactions: Transaction[];
  charity_category_ids: string[];
}

function getStatus(percent: number): CharityGoalStatus['status'] {
  if (percent >= 100) return 'exceeded';
  if (percent >= 80) return 'near_limit';
  return 'on_track';
}

export async function fetchCharitySummary(month?: string): Promise<CharitySummary> {
  const refDate = month ? new Date(`${month}-01`) : new Date();
  const monthRange = {
    start: format(startOfMonth(refDate), 'yyyy-MM-dd'),
    end: format(endOfMonth(refDate), 'yyyy-MM-dd'),
  };
  const yearRange = {
    start: format(startOfYear(refDate), 'yyyy-MM-dd'),
    end: format(endOfYear(refDate), 'yyyy-MM-dd'),
  };

  const [categories, groups] = await Promise.all([
    fetchCategories(),
    fetchCategoryGroups(),
  ]);

  const charityGroupIds = new Set(
    groups.filter((g) => g.taxonomy_key === CHARITY_GROUP_KEY).map((g) => g.id),
  );

  const charityCategories = categories.filter((c) => {
    if (c.group_id && charityGroupIds.has(c.group_id)) return true;
    if (c.taxonomy_key && CHARITY_SUBCATEGORY_KEYS.has(c.taxonomy_key)) return true;
    return false;
  });

  if (charityCategories.length === 0) {
    return {
      given_this_month: 0,
      given_this_year: 0,
      donation_count_this_month: 0,
      last_donation_date: null,
      top_category: null,
      breakdown: [],
      goal: null,
      daily_trend: [],
      transactions: [],
      charity_category_ids: [],
    };
  }

  const charityCategoryIds = charityCategories.map((c) => c.id);

  // Fetch this-month (full rows) and this-year (amount only) for charity categories
  const [monthTxRes, yearTxRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .is('deleted_at', null)
      .eq('exclude_from_insights', false)
      .eq('type', 'expense')
      .in('category_id', charityCategoryIds)
      .gte('date', monthRange.start)
      .lte('date', monthRange.end)
      .order('date', { ascending: false }),
    supabase
      .from('transactions')
      .select('amount')
      .is('deleted_at', null)
      .eq('exclude_from_insights', false)
      .eq('type', 'expense')
      .in('category_id', charityCategoryIds)
      .gte('date', yearRange.start)
      .lte('date', yearRange.end),
  ]);

  if (monthTxRes.error) throw new Error(monthTxRes.error.message);
  if (yearTxRes.error) throw new Error(yearTxRes.error.message);

  const monthTx = (monthTxRes.data ?? []) as Transaction[];
  const yearTx = yearTxRes.data ?? [];

  const given_this_month = monthTx.reduce((s, t) => s + (t.amount ?? 0), 0);
  const given_this_year = yearTx.reduce((s, t) => s + (t.amount ?? 0), 0);
  const donation_count_this_month = monthTx.length;
  const last_donation_date = monthTx[0]?.date ?? null;

  // Per-category breakdown (this month)
  const perCategory = new Map<string, number>();
  for (const tx of monthTx) {
    if (!tx.category_id) continue;
    perCategory.set(tx.category_id, (perCategory.get(tx.category_id) ?? 0) + (tx.amount ?? 0));
  }

  const breakdown: CharityCategoryBreakdown[] = charityCategories
    .map((c) => ({
      category_id: c.id,
      category_name: c.name,
      taxonomy_key: c.taxonomy_key,
      icon: c.icon,
      color: c.color,
      amount: perCategory.get(c.id) ?? 0,
    }))
    .filter((b) => b.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const top_category = breakdown[0] ?? null;

  // Goal: any active budget whose category is a charity category
  const budgets = await fetchActiveBudgets();
  const charityIdSet = new Set(charityCategoryIds);
  const charityBudgets = budgets.filter((b) => charityIdSet.has(b.category_id));

  let goal: CharityGoalStatus | null = null;
  if (charityBudgets.length > 0) {
    // Aggregate: if user has budgets on multiple charity categories, sum them
    // as the composite charity target for this month.
    const budgetAmount = charityBudgets.reduce((s, b) => s + (b.amount ?? 0), 0);
    const percent = budgetAmount > 0 ? (given_this_month / budgetAmount) * 100 : 0;
    goal = {
      budget_amount: budgetAmount,
      given: given_this_month,
      percent_used: percent,
      remaining: budgetAmount - given_this_month,
      status: getStatus(percent),
    };
  }

  // Daily trend for the month (current month)
  const days = eachDayOfInterval({
    start: startOfMonth(refDate),
    end: endOfMonth(refDate),
  });
  const dailyMap = new Map<string, number>();
  for (const tx of monthTx) {
    const key = tx.date.slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + (tx.amount ?? 0));
  }
  const daily_trend: CharityDailyPoint[] = days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const total = dailyMap.get(dayStr) ?? 0;
    return {
      label: format(day, 'd'),
      value: Math.round(total * 100) / 100,
      fullLabel: format(day, 'MMM d'),
    };
  });

  return {
    given_this_month,
    given_this_year,
    donation_count_this_month,
    last_donation_date,
    top_category,
    breakdown,
    goal,
    daily_trend,
    transactions: monthTx,
    charity_category_ids: charityCategoryIds,
  };
}
