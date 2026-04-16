import { supabase } from '../lib/supabase';
import { adjustAccountBalance } from './account-service';
import { extractReferenceNumber } from '../utils/sms-parser';
import type {
  Transaction,
  TransactionType,
  PaginatedResponse,
} from '../types/index';

// ─── Filter / pagination params ──────────────────────────────────────

export interface TransactionFilters {
  type?: TransactionType;
  category_id?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  search?: string;
}

export interface TransactionListParams {
  page?: number;
  page_size?: number;
  filters?: TransactionFilters;
}

const DEFAULT_PAGE_SIZE = 20;

function getAccountDelta(type: TransactionType, amount: number): number {
  return type === 'income' ? amount : -amount;
}

// ─── Fetch paginated transactions ────────────────────────────────────

export async function fetchTransactions(
  params: TransactionListParams = {},
): Promise<PaginatedResponse<Transaction>> {
  const page = params.page ?? 1;
  const pageSize = params.page_size ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const filters = params.filters;

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id);
  }

  if (filters?.start_date) {
    query = query.gte('date', filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte('date', filters.end_date);
  }

  if (filters?.search) {
    const safe = filters.search.replace(/[%_,()]/g, '');
    if (safe.trim()) {
      query = query.or(
        `description.ilike.%${safe}%,merchant.ilike.%${safe}%`,
      );
    }
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    data: (data as Transaction[]) ?? [],
    count: total,
    page,
    page_size: pageSize,
    has_more: from + pageSize < total,
  };
}

// ─── Fetch single transaction ────────────────────────────────────────

export async function fetchTransactionById(
  id: string,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Transaction;
}

// ─── Create transaction ──────────────────────────────────────────────

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  description: string;
  merchant?: string | null;
  counterparty?: string | null;
  date: string; // YYYY-MM-DD
  notes?: string | null;
  is_recurring?: boolean;
  account_id?: string | null;
  source?: 'manual' | 'sms' | 'ocr' | 'recurring';
  /** Optional idempotency key to prevent duplicate inserts on network retry */
  idempotency_key?: string;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  // Get current user id for RLS
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }

  // If idempotency key provided, check for existing transaction with same key
  // to prevent duplicate inserts on network retry
  if (input.idempotency_key) {
    const { data: existing } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('idempotency_key', input.idempotency_key)
      .is('deleted_at', null)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0] as Transaction;
    }
  }

  const row: Record<string, unknown> = {
    user_id: session.user.id,
    amount: input.amount,
    type: input.type,
    transaction_type: input.type,
    category_id: input.category_id,
    category_name: input.category_name,
    category_icon: input.category_icon,
    category_color: input.category_color,
    description: input.description,
    merchant: input.merchant ?? null,
    date: input.date,
    notes: input.notes ?? null,
    is_recurring: input.is_recurring ?? false,
    account_id: input.account_id ?? null,
    source: input.source ?? 'manual',
    source_type: input.source ?? 'manual',
  };

  // Include idempotency key if provided
  if (input.idempotency_key) {
    row.idempotency_key = input.idempotency_key;
  }

  // Only include counterparty if it has a value (avoids error if column doesn't exist yet)
  if (input.counterparty) {
    row.counterparty = input.counterparty;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Adjust account balance if an account was specified
  if (input.account_id) {
    const delta = getAccountDelta(input.type, input.amount);
    try {
      await adjustAccountBalance(input.account_id, delta);
    } catch (balanceErr) {
      // Log the error but don't fail the transaction — the transaction is saved,
      // but the balance may need manual reconciliation.
      console.error(
        `[TransactionService] Balance adjustment failed for account ${input.account_id}:`,
        balanceErr,
      );
      // In production, consider:
      // 1. Storing a reconciliation flag for later background fix
      // 2. Notifying the user via a banner
      // 3. Using a database trigger instead of client-side balance management
    }
  }

  return data as Transaction;
}

// ─── Soft-delete transaction (moves to trash) ───────────────────────

export async function deleteTransaction(id: string): Promise<void> {
  const existing = await fetchTransactionById(id);

  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  if (existing.account_id) {
    await adjustAccountBalance(
      existing.account_id,
      -getAccountDelta(existing.type, existing.amount),
    ).catch(() => {});
  }
}

// ─── Trash: list recently deleted transactions (last 7 days) ─────────

export async function fetchTrashedTransactions(): Promise<Transaction[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .not('deleted_at', 'is', null)
    .gte('deleted_at', sevenDaysAgo)
    .order('deleted_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data as Transaction[]) ?? [];
}

// ─── Restore a soft-deleted transaction ──────────────────────────────

export async function restoreTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

// ─── Permanently delete a transaction ────────────────────────────────

export async function permanentlyDeleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

// ─── SMS auto-save (no category required) ────────────────────────────

export interface CreateSMSTransactionInput {
  amount: number;
  type: TransactionType;
  description: string;
  merchant?: string | null;
  counterparty?: string | null;
  date: string;
  notes?: string | null;
  parse_confidence?: number | null;
  review_reason?: string | null;
  transaction_type?: TransactionType;
}

export async function createSMSTransaction(
  input: CreateSMSTransactionInput,
): Promise<Transaction> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('No authenticated session');
  }

  // ─── Dedup: check if an identical SMS transaction already exists ───
  // Strategy 1: Extract reference number from SMS text — if found,
  // match on ref alone (bank ref numbers are unique identifiers).
  // Strategy 2: Fall back to matching notes + amount + date.
  if (input.notes) {
    const refNumber = extractReferenceNumber(input.notes);

    if (refNumber) {
      // Search for any existing transaction with the same ref number, amount, and date.
      // Must match all three to avoid false dedup — ref numbers can be substrings of
      // longer reference numbers in other SMS texts.
      const { data: refMatches } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('amount', input.amount)
        .eq('date', input.date)
        .ilike('notes', `%${refNumber}%`)
        .limit(1);

      if (refMatches && refMatches.length > 0) {
        const { data: full } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', refMatches[0].id)
          .single();
        if (full) return full as Transaction;
      }
    }

    // Fall back to exact notes text matching (same SMS, same day)
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('notes', input.notes)
      .limit(1);

    if (existing && existing.length > 0) {
      const { data: full } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', existing[0].id)
        .single();
      if (full) return full as Transaction;
    }
  }

  const txType = input.transaction_type ?? input.type;
  const needsReview = input.parse_confidence != null ? input.parse_confidence < 0.7 : true;

  // Build review reason — always include 'missing_category' since SMS transactions
  // are saved without a category and need user categorization.
  const reasons: string[] = [];
  reasons.push('missing_category');
  if (input.review_reason) reasons.push(input.review_reason);
  const reviewReason = reasons.join('; ');

  const row: Record<string, unknown> = {
    user_id: session.user.id,
    amount: input.amount,
    type: txType,
    transaction_type: txType,
    category_id: null,
    category_name: null,
    category_icon: null,
    category_color: null,
    description: input.description,
    merchant: input.merchant ?? null,
    date: input.date,
    notes: input.notes ?? null,
    source: 'sms',
    source_type: 'sms',
    needs_review: true, // Always true for SMS — no category assigned
    parse_confidence: input.parse_confidence ?? null,
    review_reason: reviewReason,
  };

  // Only include counterparty if it has a value (avoids error if column doesn't exist yet)
  if (input.counterparty) {
    row.counterparty = input.counterparty;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Transaction;
}

// ─── Fetch unreviewed SMS transactions ───────────────────────────────

export async function fetchUnreviewedTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('needs_review', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as Transaction[]) ?? [];
}

// ─── Review / categorize a transaction ───────────────────────────────

export interface ReviewTransactionInput {
  id: string;
  type?: TransactionType;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  account_id?: string | null;
  amount?: number;
  description?: string;
}

export async function reviewTransaction(
  input: ReviewTransactionInput,
): Promise<Transaction> {
  const existing = await fetchTransactionById(input.id);

  // Convert empty string category_id to null for UUID column
  const catId = input.category_id && input.category_id.length > 0 ? input.category_id : null;
  const nextType = input.type ?? existing.type;
  const nextAmount = input.amount ?? existing.amount;
  const nextAccountId = input.account_id !== undefined ? input.account_id : existing.account_id;

  const updatePayload: Record<string, unknown> = {
    category_id: catId,
    category_name: input.category_name,
    category_icon: input.category_icon,
    category_color: input.category_color,
    account_id: input.account_id ?? null,
    needs_review: false,
    review_reason: null,
    updated_at: new Date().toISOString(),
  };

  if (input.type) {
    updatePayload.type = input.type;
    updatePayload.transaction_type = input.type;
  }

  if (input.amount != null) {
    updatePayload.amount = input.amount;
  }

  if (input.description != null) {
    updatePayload.description = input.description;
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const previousDelta = existing.account_id
    ? getAccountDelta(existing.type, existing.amount)
    : 0;
  const updatedDelta = nextAccountId
    ? getAccountDelta(nextType, nextAmount)
    : 0;

  if (existing.account_id && existing.account_id === nextAccountId) {
    const deltaDiff = updatedDelta - previousDelta;
    if (deltaDiff !== 0) {
      await adjustAccountBalance(existing.account_id, deltaDiff).catch(() => {});
    }
  } else {
    if (existing.account_id) {
      await adjustAccountBalance(existing.account_id, -previousDelta).catch(() => {});
    }
    if (nextAccountId) {
      await adjustAccountBalance(nextAccountId, updatedDelta).catch(() => {});
    }
  }

  return data as Transaction;
}

// ─── Update any transaction (general edit) ───────────────────────────

export interface UpdateTransactionInput {
  id: string;
  amount?: number;
  type?: TransactionType;
  description?: string;
  merchant?: string | null;
  date?: string;
  notes?: string | null;
  account_id?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  category_icon?: string | null;
  category_color?: string | null;
  exclude_from_insights?: boolean;
}

export async function updateTransaction(
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const existing = await fetchTransactionById(input.id);
  const nextType = input.type ?? existing.type;
  const nextAmount = input.amount ?? existing.amount;
  const nextAccountId = input.account_id !== undefined ? input.account_id : existing.account_id;

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.type !== undefined) {
    payload.type = input.type;
    payload.transaction_type = input.type;
  }
  if (input.description !== undefined) payload.description = input.description;
  if (input.merchant !== undefined) payload.merchant = input.merchant;
  if (input.date !== undefined) payload.date = input.date;
  if (input.notes !== undefined) payload.notes = input.notes;
  if (input.account_id !== undefined) payload.account_id = input.account_id;
  if (input.exclude_from_insights !== undefined) payload.exclude_from_insights = input.exclude_from_insights;
  if (input.category_id !== undefined) {
    payload.category_id = input.category_id;
    payload.category_name = input.category_name ?? null;
    payload.category_icon = input.category_icon ?? null;
    payload.category_color = input.category_color ?? null;
    if (input.category_id) {
      payload.needs_review = false;
      payload.review_reason = null;
    }
  }

  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', input.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const previousDelta = existing.account_id
    ? getAccountDelta(existing.type, existing.amount)
    : 0;
  const updatedDelta = nextAccountId
    ? getAccountDelta(nextType, nextAmount)
    : 0;

  if (existing.account_id && existing.account_id === nextAccountId) {
    const deltaDiff = updatedDelta - previousDelta;
    if (deltaDiff !== 0) {
      await adjustAccountBalance(existing.account_id, deltaDiff).catch(() => {});
    }
  } else {
    if (existing.account_id) {
      await adjustAccountBalance(existing.account_id, -previousDelta).catch(() => {});
    }
    if (nextAccountId) {
      await adjustAccountBalance(nextAccountId, updatedDelta).catch(() => {});
    }
  }

  return data as Transaction;
}
