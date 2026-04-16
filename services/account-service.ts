import { supabase } from '../lib/supabase';
import type { Account, AccountType } from '../types/index';

// ─── Fetch all accounts for current user ─────────────────────────────

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Account[]) ?? [];
}

// ─── Total balance across included accounts ──────────────────────────

export async function fetchTotalBalance(): Promise<number> {
  const accounts = await fetchAccounts();
  return accounts
    .filter((a) => a.include_in_total)
    .reduce((sum, a) => sum + a.current_balance, 0);
}

// ─── Create account ──────────────────────────────────────────────────

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  opening_balance: number;
  include_in_total?: boolean;
}

export async function createAccount(
  input: CreateAccountInput,
): Promise<Account> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: session.user.id,
      name: input.name,
      type: input.type,
      opening_balance: input.opening_balance,
      current_balance: input.opening_balance,
      include_in_total: input.include_in_total ?? true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Account;
}

// ─── Update account ──────────────────────────────────────────────────

export interface UpdateAccountInput {
  name?: string;
  include_in_total?: boolean;
  current_balance?: number;
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Account;
}

// ─── Delete account ──────────────────────────────────────────────────

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

// ─── Adjust account balance after transaction ────────────────────────
// Uses atomic SQL increment to prevent race conditions.
// Rounds to 2 decimal places to avoid floating-point drift.

export async function adjustAccountBalance(
  accountId: string,
  delta: number,
): Promise<void> {
  // Round delta to 2 decimal places to prevent floating-point accumulation errors
  const roundedDelta = Math.round(delta * 100) / 100;

  // Use atomic SQL increment/decrement via Postgres RPC to prevent race conditions.
  // This avoids the classic read-modify-write TOCTOU race.
  // If the RPC function doesn't exist, fall back to a direct atomic update.
  const { error: rpcErr } = await supabase.rpc(
    'adjust_account_balance',
    {
      p_account_id: accountId,
      p_delta: roundedDelta,
    }
  );

  if (!rpcErr) return;

  // Fallback: read-modify-write with rounding (has a small race window).
  // This path is only used if the RPC function hasn't been deployed yet.
  // After applying migration 026, this branch will never execute.
  const { data: account, error: fetchErr } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', accountId)
    .single();

  if (fetchErr || !account) {
    throw new Error(fetchErr?.message ?? 'Account not found');
  }

  // Round the new balance to prevent floating-point drift
  const newBalance = Math.round((account.current_balance + roundedDelta) * 100) / 100;

  const { error: updateErr } = await supabase
    .from('accounts')
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId);

  if (updateErr) {
    throw new Error(`Failed to adjust account balance: ${updateErr.message}`);
  }
}

// ─── Default accounts for new users ──────────────────────────────────

export async function seedDefaultAccounts(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return;

  const existing = await fetchAccounts();
  if (existing.length > 0) return;

  const defaults = [
    { name: 'Cash', type: 'cash' as AccountType, opening_balance: 0 },
    { name: 'Bank Account', type: 'bank' as AccountType, opening_balance: 0 },
  ];

  const rows = defaults.map((d) => ({
    user_id: session.user.id,
    name: d.name,
    type: d.type,
    opening_balance: d.opening_balance,
    current_balance: d.opening_balance,
    include_in_total: true,
  }));

  const { error } = await supabase.from('accounts').insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}
