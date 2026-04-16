import { format, startOfMonth, endOfMonth, addDays, addMonths } from 'date-fns';

import { supabase } from '../lib/supabase';
import type { Commitment, CommitmentsDueSummary } from '../types/index';

// ─── Fetch all active commitments ────────────────────────────────────

export async function fetchCommitments(): Promise<Commitment[]> {
  const { data, error } = await supabase
    .from('commitments')
    .select('*')
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });

  if (error) {
    if (error.message.includes('schema cache') || error.code === '42P01') {
      return [];
    }
    throw new Error(error.message);
  }
  return (data as Commitment[]) ?? [];
}

// ─── Due summary for a given month ──────────────────────────────────

export async function fetchCommitmentsDue(month: string): Promise<CommitmentsDueSummary> {
  // month is 'YYYY-MM'
  const monthDate = new Date(`${month}-01`);
  const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
  const today = new Date();
  const sevenDaysFromNow = format(addDays(today, 7), 'yyyy-MM-dd');
  const nextMonthStart = format(startOfMonth(addMonths(monthDate, 1)), 'yyyy-MM-dd');
  const nextMonthEnd = format(endOfMonth(addMonths(monthDate, 1)), 'yyyy-MM-dd');

  const { data, error } = await supabase
    .from('commitments')
    .select('*')
    .eq('is_active', true)
    .gte('next_due_date', monthStart)
    .lte('next_due_date', nextMonthEnd)
    .order('next_due_date', { ascending: true });

  if (error) {
    if (error.message.includes('schema cache') || error.code === '42P01') {
      return { this_month: [], nearly_due: [], upcoming_next_month: [], total_due_this_month: 0 };
    }
    throw new Error(error.message);
  }

  const all = (data as Commitment[]) ?? [];
  const todayStr = format(today, 'yyyy-MM-dd');

  const thisMonth: Commitment[] = [];
  const nearlyDue: Commitment[] = [];
  const upcomingNextMonth: Commitment[] = [];

  for (const c of all) {
    if (c.next_due_date >= monthStart && c.next_due_date <= monthEnd) {
      thisMonth.push(c);
      if (c.next_due_date >= todayStr && c.next_due_date <= sevenDaysFromNow) {
        nearlyDue.push(c);
      }
    } else if (c.next_due_date >= nextMonthStart && c.next_due_date <= nextMonthEnd) {
      upcomingNextMonth.push(c);
    }
  }

  const totalDueThisMonth = thisMonth.reduce((sum, c) => sum + c.amount, 0);

  return {
    this_month: thisMonth,
    nearly_due: nearlyDue,
    upcoming_next_month: upcomingNextMonth,
    total_due_this_month: totalDueThisMonth,
  };
}

// ─── Create commitment ──────────────────────────────────────────────

export interface CreateCommitmentInput {
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  amount: number;
  currency_code?: string;
  recurrence_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  recurrence_interval_months?: number;
  next_due_date: string;
  is_fixed_amount?: boolean;
  notes?: string | null;
}

export async function createCommitment(input: CreateCommitmentInput): Promise<Commitment> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const intervalMap: Record<string, number> = {
    monthly: 1,
    quarterly: 3,
    yearly: 12,
  };

  const { data, error } = await supabase
    .from('commitments')
    .insert({
      user_id: session.user.id,
      name: input.name,
      category_id: input.category_id ?? null,
      category_name: input.category_name ?? null,
      category_icon: input.category_icon ?? null,
      category_color: input.category_color ?? null,
      amount: input.amount,
      currency_code: input.currency_code ?? 'SAR',
      recurrence_type: input.recurrence_type,
      recurrence_interval_months:
        input.recurrence_interval_months ?? intervalMap[input.recurrence_type] ?? 1,
      next_due_date: input.next_due_date,
      is_fixed_amount: input.is_fixed_amount ?? true,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Commitment;
}

// ─── Update commitment ──────────────────────────────────────────────

export interface UpdateCommitmentInput {
  id: string;
  name?: string;
  amount?: number;
  recurrence_type?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  recurrence_interval_months?: number;
  next_due_date?: string;
  last_paid_date?: string;
  is_fixed_amount?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

export async function updateCommitment(input: UpdateCommitmentInput): Promise<Commitment> {
  const { id, ...fields } = input;
  const payload: Record<string, unknown> = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('commitments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Commitment;
}

// ─── Mark commitment as paid (advances next_due_date) ────────────────

export async function markCommitmentPaid(id: string): Promise<Commitment> {
  const { data: existing, error: fetchErr } = await supabase
    .from('commitments')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  const commitment = existing as Commitment;
  const nextDate = addMonths(
    new Date(commitment.next_due_date),
    commitment.recurrence_interval_months,
  );

  return updateCommitment({
    id,
    last_paid_date: format(new Date(), 'yyyy-MM-dd'),
    next_due_date: format(nextDate, 'yyyy-MM-dd'),
  });
}

// ─── Delete commitment ───────────────────────────────────────────────

export async function deleteCommitment(id: string): Promise<void> {
  const { error } = await supabase
    .from('commitments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}
