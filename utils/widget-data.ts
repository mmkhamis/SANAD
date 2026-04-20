/**
 * Widget data sync — writes compact JSON payloads to the iOS App Group
 * for all three widgets: Budget, Upcoming Payments, Charity.
 */

import { Platform } from 'react-native';
import { differenceInCalendarDays, parseISO } from 'date-fns';

import { setWidgetData, removeWidgetData, reloadAllWidgets } from '../modules/widget-shared-data';
import { getActiveCurrency } from './currency';
import { translateCategory } from '../lib/i18n';
import type { GoalsSummary, CommitmentsDueSummary, Commitment } from '../types/index';
import type { CharitySummary } from '../services/charity-service';

// ─── Storage keys (must match each Swift widget) ────────────────────

const BUDGET_KEY      = 'budgetWidgetData';
const COMMITMENTS_KEY = 'commitmentsWidgetData';
const CHARITY_KEY     = 'charityWidgetData';

// ─── Payload types ──────────────────────────────────────────────────

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

interface WidgetCommitmentItem {
  widgetId: string;
  name: string;
  icon: string;
  amount: number;
  dueDateIso: string;
  daysUntilDue: number;
  isOverdue: boolean;
  categoryColor: string | null;
}

interface WidgetCommitmentsPayload {
  items: WidgetCommitmentItem[];
  totalDueThisMonth: number;
  currency: string;
  paidCount: number;
  remainingCount: number;
  updatedAt: string;
}

interface WidgetCharityPayload {
  givenThisMonth: number;
  givenThisYear: number;
  donationCount: number;
  currency: string;
  goal: {
    budgetAmount: number;
    percent: number;
    remaining: number;
    status: string;
  } | null;
  topCategory: {
    name: string;
    icon: string;
    amount: number;
  } | null;
  updatedAt: string;
}

// ─── Sync: Budget ────────────────────────────────────────────────────

export async function syncBudgetToWidget(summary: GoalsSummary): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const payload: WidgetBudgetPayload = {
    totalBudgeted: summary.total_budgeted,
    totalSpent: summary.total_spent,
    currency: getActiveCurrency(),
    goals: summary.goals.slice(0, 5).map((g) => ({
      name: translateCategory(g.budget.category_name) ?? g.budget.category_name,
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

  await setWidgetData(BUDGET_KEY, payload);
  await reloadAllWidgets();
}

// ─── Sync: Upcoming Payments ─────────────────────────────────────────

function toWidgetCommitment(c: Commitment): WidgetCommitmentItem {
  const days = differenceInCalendarDays(parseISO(c.next_due_date), new Date());
  return {
    widgetId: c.id,
    name: c.name,
    icon: c.category_icon ?? '💸',
    amount: c.amount,
    dueDateIso: c.next_due_date,
    daysUntilDue: Math.max(days, 0),
    isOverdue: days < 0,
    categoryColor: c.category_color,
  };
}

export async function syncCommitmentsToWidget(
  summary: CommitmentsDueSummary,
): Promise<void> {
  if (Platform.OS !== 'ios') return;

  // Merge + dedupe by id, sort ascending by next_due_date
  const map = new Map<string, Commitment>();
  [...summary.nearly_due, ...summary.this_month, ...summary.upcoming_next_month].forEach(
    (c) => map.set(c.id, c),
  );

  const sorted = Array.from(map.values()).sort(
    (a, b) => parseISO(a.next_due_date).getTime() - parseISO(b.next_due_date).getTime(),
  );

  const items = sorted.slice(0, 5).map(toWidgetCommitment);

  const remainingCount = summary.this_month.filter((c) => {
    const days = differenceInCalendarDays(parseISO(c.next_due_date), new Date());
    return days >= 0;
  }).length;
  const paidCount = Math.max(summary.this_month.length - remainingCount, 0);

  const payload: WidgetCommitmentsPayload = {
    items,
    totalDueThisMonth: summary.total_due_this_month,
    currency: getActiveCurrency(),
    paidCount,
    remainingCount,
    updatedAt: new Date().toISOString(),
  };

  await setWidgetData(COMMITMENTS_KEY, payload);
  await reloadAllWidgets();
}

// ─── Sync: Charity ───────────────────────────────────────────────────

export async function syncCharityToWidget(summary: CharitySummary): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const payload: WidgetCharityPayload = {
    givenThisMonth: summary.given_this_month,
    givenThisYear: summary.given_this_year,
    donationCount: summary.donation_count_this_month,
    currency: getActiveCurrency(),
    goal: summary.goal
      ? {
          budgetAmount: summary.goal.budget_amount,
          percent: summary.goal.percent_used,
          remaining: summary.goal.remaining,
          status: summary.goal.status,
        }
      : null,
    topCategory: summary.top_category
      ? {
          name:
            translateCategory(summary.top_category.category_name) ??
            summary.top_category.category_name,
          icon: summary.top_category.icon,
          amount: summary.top_category.amount,
        }
      : null,
    updatedAt: new Date().toISOString(),
  };

  await setWidgetData(CHARITY_KEY, payload);
  await reloadAllWidgets();
}

// ─── Clear all widget data (sign-out) ────────────────────────────────

export async function clearWidgetData(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  await Promise.all([
    removeWidgetData(BUDGET_KEY),
    removeWidgetData(COMMITMENTS_KEY),
    removeWidgetData(CHARITY_KEY),
  ]);
  await reloadAllWidgets();
}
