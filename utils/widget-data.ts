/**
 * Serializes the GoalsSummary into the compact JSON shape the
 * iOS BudgetWidget expects and writes it to the shared App Group.
 */

import { Platform } from 'react-native';

import { setWidgetData, reloadWidget } from '../modules/widget-shared-data';
import { getActiveCurrency } from './currency';
import type { GoalsSummary } from '../types/index';

const WIDGET_DATA_KEY = 'budgetWidgetData';
const WIDGET_KIND = 'BudgetStatusWidget';

interface WidgetGoalItem {
  name: string;
  icon: string;
  budgeted: number;
  spent: number;
  percent: number;
  status: string;
}

interface WidgetBudgetPayload {
  totalBudgeted: number;
  totalSpent: number;
  currency: string;
  goals: WidgetGoalItem[];
  onTrackCount: number;
  nearLimitCount: number;
  exceededCount: number;
  updatedAt: string;
}

/** Push the latest budget summary to the widget via App Group UserDefaults. */
export async function syncBudgetToWidget(summary: GoalsSummary): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const payload: WidgetBudgetPayload = {
    totalBudgeted: summary.total_budgeted,
    totalSpent: summary.total_spent,
    currency: getActiveCurrency(),
    goals: summary.goals.slice(0, 5).map((g) => ({
      name: g.budget.category_name,
      icon: g.category_icon,
      budgeted: g.budget.amount,
      spent: g.actual_spent,
      percent: Math.round(g.percent_used),
      status: g.status,
    })),
    onTrackCount: summary.on_track_count,
    nearLimitCount: summary.near_limit_count,
    exceededCount: summary.exceeded_count,
    updatedAt: new Date().toISOString(),
  };

  await setWidgetData(WIDGET_DATA_KEY, payload);
  await reloadWidget(WIDGET_KIND);
}

/** Clear the cached widget data (e.g. on sign-out). */
export async function clearWidgetData(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const { removeWidgetData } = await import('../modules/widget-shared-data');
  await removeWidgetData(WIDGET_DATA_KEY);
  await reloadWidget(WIDGET_KIND);
}
