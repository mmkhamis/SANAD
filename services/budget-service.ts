import { supabase } from '../lib/supabase';
import type { Budget } from '../types/index';

// ─── Fetch all budgets for the current user ──────────────────────────

export async function fetchBudgets(): Promise<Budget[]> {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Budget[]) ?? [];
}

// ─── Fetch active budgets (where today falls within the period) ──────

export async function fetchActiveBudgets(): Promise<Budget[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('category_name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Budget[]) ?? [];
}

// ─── Create a budget ─────────────────────────────────────────────────

export interface CreateBudgetInput {
  category_id: string;
  category_name: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string;
}

export async function createBudget(
  input: CreateBudgetInput,
): Promise<Budget> {
  // Get current user id for RLS
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: session.user.id,
      category_id: input.category_id,
      category_name: input.category_name,
      amount: input.amount,
      period: input.period,
      start_date: input.start_date,
      end_date: input.end_date,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Budget;
}

// ─── Update a budget ─────────────────────────────────────────────────

export interface UpdateBudgetInput {
  id: string;
  amount: number;
}

export async function updateBudget(input: UpdateBudgetInput): Promise<Budget> {
  const { data, error } = await supabase
    .from('budgets')
    .update({ amount: input.amount })
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Budget;
}

// ─── Delete a budget ─────────────────────────────────────────────────

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}
