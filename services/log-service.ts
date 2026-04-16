import { supabase } from '../lib/supabase';
import type { MonthlyLog, MonthlySummaryWithLogs } from '../types/index';

// ─── Fetch all active logs ───────────────────────────────────────────

export async function getMonthlyLogs(): Promise<MonthlyLog[]> {
  const { data, error } = await supabase
    .from('monthly_logs')
    .select('*')
    .order('day_of_month', { ascending: true });

  if (error) {
    if (error.message.includes('schema cache') || error.code === '42P01') {
      return [];
    }
    throw new Error(error.message);
  }
  return (data as MonthlyLog[]) ?? [];
}

// ─── Create log ──────────────────────────────────────────────────────

export interface CreateLogInput {
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  day_of_month: number;
  notes?: string | null;
  end_date?: string | null;
}

export async function createMonthlyLog(input: CreateLogInput): Promise<MonthlyLog> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const { data, error } = await supabase
    .from('monthly_logs')
    .insert({
      user_id: session.user.id,
      name: input.name,
      amount: input.amount,
      type: input.type,
      category_name: input.category_name ?? null,
      category_icon: input.category_icon ?? null,
      category_color: input.category_color ?? null,
      day_of_month: input.day_of_month,
      notes: input.notes ?? null,
      end_date: input.end_date ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MonthlyLog;
}

// ─── Update log ──────────────────────────────────────────────────────

export interface UpdateLogInput {
  id: string;
  name?: string;
  amount?: number;
  type?: 'income' | 'expense';
  day_of_month?: number;
  is_active?: boolean;
  notes?: string | null;
  end_date?: string | null;
}

export async function updateMonthlyLog(input: UpdateLogInput): Promise<MonthlyLog> {
  const { id, ...fields } = input;
  const payload: Record<string, unknown> = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('monthly_logs')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as MonthlyLog;
}

// ─── Delete log ──────────────────────────────────────────────────────

export async function deleteMonthlyLog(id: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_logs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Monthly summary ─────────────────────────────────────────────────

export async function getMonthlySummary(): Promise<MonthlySummaryWithLogs> {
  const logs = await getMonthlyLogs();
  const activeLogs = logs.filter((l) => l.is_active);

  let fixedIncome = 0;
  let fixedExpenses = 0;

  for (const log of activeLogs) {
    if (log.type === 'income') fixedIncome += log.amount;
    else fixedExpenses += log.amount;
  }

  return {
    fixed_income: fixedIncome,
    fixed_expenses: fixedExpenses,
    net_fixed: fixedIncome - fixedExpenses,
    logs: activeLogs,
  };
}
