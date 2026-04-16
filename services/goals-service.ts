import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';

import { supabase } from '../lib/supabase';
import { translateCategory, t } from '../lib/i18n';
import { fetchActiveBudgets } from './budget-service';
import { fetchCategories, fetchCategoryGroups } from './category-service';
import type { Budget, BudgetGoal, GoalsSummary, GoalStatus } from '../types/index';
import { formatAmount } from '../utils/currency';

// ─── Compute period range from budget ────────────────────────────────

function getPeriodRange(period: Budget['period'], refDate?: Date): { start: string; end: string } {
  const d = refDate ?? new Date();
  switch (period) {
    case 'weekly':
      return {
        start: format(startOfWeek(d, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(d, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
      };
    case 'monthly':
      return {
        start: format(startOfMonth(d), 'yyyy-MM-dd'),
        end: format(endOfMonth(d), 'yyyy-MM-dd'),
      };
    case 'yearly':
      return {
        start: format(startOfYear(d), 'yyyy-MM-dd'),
        end: format(endOfYear(d), 'yyyy-MM-dd'),
      };
  }
}

function getStatus(percent: number): GoalStatus {
  if (percent >= 100) return 'exceeded';
  if (percent >= 80) return 'near_limit';
  return 'on_track';
}

// ─── Fetch Goals Summary ─────────────────────────────────────────────

export async function fetchGoalsSummary(month?: string): Promise<GoalsSummary> {
  const refDate = month ? new Date(`${month}-01`) : new Date();
  const monthRange = {
    start: format(startOfMonth(refDate), 'yyyy-MM-dd'),
    end: format(endOfMonth(refDate), 'yyyy-MM-dd'),
  };

  const [budgets, categories, groups] = await Promise.all([
    fetchActiveBudgets(),
    fetchCategories(),
    fetchCategoryGroups(),
  ]);

  if (budgets.length === 0) {
    return {
      goals: [],
      total_budgeted: 0,
      total_spent: 0,
      on_track_count: 0,
      near_limit_count: 0,
      exceeded_count: 0,
      insights: [],
    };
  }

  // Fetch all expense transactions in the month
  const { data: txData, error } = await supabase
    .from('transactions')
    .select('amount, category_id')
    .is('deleted_at', null)
    .eq('exclude_from_insights', false)
    .eq('type', 'expense')
    .gte('date', monthRange.start)
    .lte('date', monthRange.end);

  if (error) throw new Error(error.message);

  // Aggregate spending by category_id
  const spendingMap = new Map<string, number>();
  for (const tx of txData ?? []) {
    if (tx.category_id) {
      spendingMap.set(tx.category_id, (spendingMap.get(tx.category_id) ?? 0) + tx.amount);
    }
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // Build group_id → category_ids map so parent budgets include children
  const groupToCategoryIds = new Map<string, string[]>();
  for (const c of categories) {
    if (c.group_id) {
      const list = groupToCategoryIds.get(c.group_id) ?? [];
      list.push(c.id);
      groupToCategoryIds.set(c.group_id, list);
    }
  }

  const goals: BudgetGoal[] = budgets.map((budget) => {
    const cat = categoryMap.get(budget.category_id);
    const grp = cat?.group_id ? groupMap.get(cat.group_id) : null;

    // Collect all related category IDs: the budget's own category + siblings in the same group
    const relatedIds = cat?.group_id
      ? groupToCategoryIds.get(cat.group_id) ?? [budget.category_id]
      : [budget.category_id];

    // Sum spending across all related categories
    let actualSpent = 0;
    for (const cid of relatedIds) {
      actualSpent += spendingMap.get(cid) ?? 0;
    }

    const remaining = budget.amount - actualSpent;
    const percentUsed = budget.amount > 0 ? (actualSpent / budget.amount) * 100 : 0;
    const status = getStatus(percentUsed);

    return {
      budget,
      category_icon: cat?.icon ?? '📦',
      category_color: cat?.color ?? '#94A3B8',
      group_name: grp?.name ?? null,
      related_category_ids: relatedIds,
      actual_spent: actualSpent,
      remaining,
      percent_used: percentUsed,
      status,
    };
  });

  // Sort: exceeded first, then near_limit, then on_track
  const statusOrder: Record<GoalStatus, number> = { exceeded: 0, near_limit: 1, on_track: 2 };
  goals.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const totalBudgeted = goals.reduce((s, g) => s + g.budget.amount, 0);
  const totalSpent = goals.reduce((s, g) => s + g.actual_spent, 0);

  // Generate insights
  const insights: string[] = [];
  for (const g of goals) {
    if (g.status === 'exceeded') {
      const over = g.actual_spent - g.budget.amount;
      insights.push(
        t('INSIGHT_EXCEEDED' as any)
          .replace('{name}', translateCategory(g.budget.category_name))
          .replace('{amount}', formatAmount(over)),
      );
    } else if (g.status === 'near_limit') {
      insights.push(
        t('INSIGHT_NEAR_LIMIT' as any)
          .replace('{name}', translateCategory(g.budget.category_name))
          .replace('{percent}', String(Math.round(g.percent_used))),
      );
    }
  }
  const onTrack = goals.filter((g) => g.status === 'on_track');
  if (onTrack.length > 0 && onTrack.length <= 3) {
    for (const g of onTrack) {
      insights.push(
        t('INSIGHT_WITHIN_BUDGET' as any)
          .replace('{name}', translateCategory(g.budget.category_name)),
      );
    }
  } else if (onTrack.length > 3) {
    insights.push(
      t('INSIGHT_CATEGORIES_ON_TRACK' as any)
        .replace('{count}', String(onTrack.length)),
    );
  }

  return {
    goals,
    total_budgeted: totalBudgeted,
    total_spent: totalSpent,
    on_track_count: goals.filter((g) => g.status === 'on_track').length,
    near_limit_count: goals.filter((g) => g.status === 'near_limit').length,
    exceeded_count: goals.filter((g) => g.status === 'exceeded').length,
    insights,
  };
}
