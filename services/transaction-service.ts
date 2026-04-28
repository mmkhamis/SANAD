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
  from_last4?: string | null;
  to_last4?: string | null;
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

  let txType = input.transaction_type ?? input.type;
  const fromLast4 = input.from_last4 ?? null;
  const toLast4 = input.to_last4 ?? null;
  if (txType !== 'transfer' && fromLast4 && toLast4) {
    txType = 'transfer';
  }

  let fromAccountId: string | null = null;
  let toAccountId: string | null = null;
  if (fromLast4 || toLast4 || txType === 'transfer') {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, account_last4, card_last4, iban_last4')
      .eq('user_id', session.user.id);

    const resolveOwnedAccountId = (last4: string | null): string | null => {
      if (!last4 || !accounts?.length) return null;
      const match = accounts.find((a) =>
        a.account_last4 === last4 || a.card_last4 === last4 || a.iban_last4 === last4,
      );
      return (match?.id as string | undefined) ?? null;
    };

    fromAccountId = resolveOwnedAccountId(fromLast4);
    toAccountId = resolveOwnedAccountId(toLast4);
    if (fromAccountId && toAccountId) {
      txType = 'transfer';
    }
  }

  const needsReview = input.parse_confidence != null ? input.parse_confidence < 0.7 : true;

  // Build review reason — always include 'missing_category' since SMS transactions
  // are saved without a category and need user categorization.
  const cleanedReviewReason = input.review_reason
    ?.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !(txType === 'transfer' && /transaction type unclear|unknown merchant/i.test(s)))
    .join('; ') ?? null;
  const reasons: string[] = [];
  reasons.push('missing_category');
  if (cleanedReviewReason) reasons.push(cleanedReviewReason);
  const reviewReason = reasons.join('; ');

  const description = txType === 'transfer' && /card payment/i.test(input.description)
    ? 'Internal transfer'
    : input.description;

  const row: Record<string, unknown> = {
    user_id: session.user.id,
    amount: input.amount,
    type: txType,
    transaction_type: txType,
    category_id: null,
    category_name: null,
    category_icon: null,
    category_color: null,
    description,
    merchant: input.merchant ?? null,
    date: input.date,
    notes: input.notes ?? null,
    source: 'sms',
    source_type: 'sms',
    needs_review: true, // Always true for SMS — no category assigned
    parse_confidence: input.parse_confidence ?? null,
    review_reason: reviewReason,
    from_last4: fromLast4,
    to_last4: toLast4,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
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

/**
 * Cheap, count-only query for uncategorized transactions. Used by the
 * recurring nudge notification + the review banner on the home screen.
 * Returns a scalar — no rows transferred — so it's safe to poll.
 */
export async function countUncategorizedTransactions(): Promise<number> {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('needs_review', true)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return count ?? 0;
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
  /** For transfers: the destination account to credit */
  to_account_id?: string | null;
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

  // ─── Cache merchant→category for future SMS auto-categorization ────
  // Only for SMS-sourced transactions with a merchant name.
  const reviewed = data as Transaction;
  if (reviewed.merchant && reviewed.source === 'sms' && input.category_id) {
    const merchantKey = reviewed.merchant.toLowerCase().trim();
    if (merchantKey.length >= 2) {
      // Fetch the category's taxonomy_key
      const { data: catRow } = await supabase
        .from('categories')
        .select('taxonomy_key')
        .eq('id', input.category_id)
        .maybeSingle();

      if (catRow?.taxonomy_key) {
        supabase
          .from('merchant_category_cache')
          .upsert({
            merchant_key: merchantKey,
            taxonomy_key: catRow.taxonomy_key,
            merchant_raw: reviewed.merchant,
            source: 'manual',
            hit_count: 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'merchant_key' })
          .then(() => {});
      }
    }
  }

  // ─── Balance adjustments ────────────────────────────────────────────
  // For transfers: debit from_account, credit to_account.
  // For income/expense: adjust the single account_id.
  const isTransfer = nextType === 'transfer';

  if (isTransfer) {
    const toAccountId = input.to_account_id ?? null;

    // Reverse any previous adjustments
    if (existing.account_id) {
      const prevDelta = getAccountDelta(existing.type, existing.amount);
      await adjustAccountBalance(existing.account_id, -prevDelta).catch(() => {});
    }

    // Debit from source
    if (nextAccountId) {
      await adjustAccountBalance(nextAccountId, -nextAmount).catch(() => {});
    }
    // Credit to destination
    if (toAccountId) {
      await adjustAccountBalance(toAccountId, nextAmount).catch(() => {});
    }
  } else {
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
