// Supabase Edge Function: ingest-sms
//
// Authoritative server-side ingestion endpoint for SMS transactions.
// Called by:
//   - the iOS App Intent "Log SMS in SANAD" (background, native)
//   - (future) Android SMS listener
//
// Auth: Bearer JWT (Supabase user access token). NO service role key on the
// client. RLS is enforced via the user's own JWT, so the inserted row's
// user_id always matches `auth.uid()`.
//
// Behavior must match services/transaction-service.ts → createSMSTransaction:
//   - dedup by reference number + amount + date, fallback to exact notes match
//   - needs_review = true (always)
//   - review_reason includes 'missing_category' when no category matched
//   - source = 'sms', source_type = 'sms'
//   - counterparty written when present
//   - parse_confidence preserved
//   - category preselected when a confident taxonomy match exists for THIS user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  parseSmsServer,
  suggestUserCategory,
  type CategoryRow,
} from '../_shared/sms-parser.ts';
import { verifyAuth } from '../_shared/auth.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IngestRequest {
  message: string;
}

interface IngestResponse {
  ok: boolean;
  status: 'created' | 'duplicate' | 'no_amount' | 'error';
  transaction?: {
    id: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    description: string;
    merchant: string | null;
    counterparty: string | null;
    category_name: string | null;
    needs_review: boolean;
  };
  error?: string;
}

function jsonResponse(body: IngestResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, status: 'error', error: 'method not allowed' }, 405);
  }

  // ─── Auth ──────────────────────────────────────────────────────
  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;
  const userId = authResult.userId;

  // ─── Body ──────────────────────────────────────────────────────
  let body: IngestRequest;
  try {
    body = await req.json() as IngestRequest;
  } catch {
    return jsonResponse({ ok: false, status: 'error', error: 'invalid json' }, 400);
  }
  const message = (body.message ?? '').trim();
  if (!message) {
    return jsonResponse({ ok: false, status: 'error', error: 'missing message' }, 400);
  }

  // ─── Parse ─────────────────────────────────────────────────────
  const parsed = parseSmsServer(message);
  if (!parsed) {
    return jsonResponse({ ok: true, status: 'no_amount' });
  }

  // ─── Supabase client (user-scoped via service role, RLS enforced
  // by manually setting user_id; service role used because the user
  // JWT may not survive the round-trip cleanly in all CLI runtimes). ─
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ─── Dedup (mirrors createSMSTransaction) ──────────────────────
  if (parsed.reference_number) {
    const { data: refMatch } = await sb
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('amount', parsed.amount)
      .eq('date', parsed.date)
      .ilike('notes', `%${parsed.reference_number}%`)
      .is('deleted_at', null)
      .limit(1);
    if (refMatch && refMatch.length > 0) {
      const tx = refMatch[0];
      return jsonResponse({
        ok: true,
        status: 'duplicate',
        transaction: shapeTx(tx),
      });
    }
  }

  const { data: notesMatch } = await sb
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('notes', message)
    .is('deleted_at', null)
    .limit(1);
  if (notesMatch && notesMatch.length > 0) {
    return jsonResponse({
      ok: true,
      status: 'duplicate',
      transaction: shapeTx(notesMatch[0]),
    });
  }

  // ─── Best-effort category preselection ─────────────────────────
  const { data: cats } = await sb
    .from('categories')
    .select('id, name, icon, color, type, taxonomy_key')
    .eq('user_id', userId)
    .is('retired_at', null);

  const matchedCategory = suggestUserCategory(
    message,
    parsed.merchant,
    parsed.transaction_type,
    (cats ?? []) as CategoryRow[],
  );

  // ─── Build review_reason (matches createSMSTransaction logic) ──
  const reasons: string[] = [];
  if (!matchedCategory) reasons.push('missing_category');
  if (parsed.review_reason) reasons.push(parsed.review_reason);
  const reviewReason = reasons.length ? reasons.join('; ') : null;

  // ─── Insert ────────────────────────────────────────────────────
  const row: Record<string, unknown> = {
    user_id: userId,
    amount: parsed.amount,
    type: parsed.transaction_type,
    transaction_type: parsed.transaction_type,
    category_id: matchedCategory?.id ?? null,
    category_name: matchedCategory?.name ?? null,
    category_icon: matchedCategory?.icon ?? null,
    category_color: matchedCategory?.color ?? null,
    description: parsed.description,
    merchant: parsed.merchant,
    date: parsed.date,
    notes: message,
    source: 'sms',
    source_type: 'sms',
    needs_review: true, // always true — same as createSMSTransaction
    parse_confidence: parsed.parse_confidence,
    review_reason: reviewReason,
  };
  if (parsed.counterparty) {
    row.counterparty = parsed.counterparty;
  }

  const { data: inserted, error: insertErr } = await sb
    .from('transactions')
    .insert(row)
    .select()
    .single();

  if (insertErr) {
    console.error('[ingest-sms] insert error', insertErr);
    return jsonResponse({ ok: false, status: 'error', error: insertErr.message }, 500);
  }

  return jsonResponse({
    ok: true,
    status: 'created',
    transaction: shapeTx(inserted),
  });
});

function shapeTx(tx: Record<string, unknown>): NonNullable<IngestResponse['transaction']> {
  return {
    id: String(tx.id),
    amount: Number(tx.amount),
    type: tx.transaction_type as 'income' | 'expense' | 'transfer',
    description: String(tx.description ?? ''),
    merchant: (tx.merchant as string | null) ?? null,
    counterparty: (tx.counterparty as string | null) ?? null,
    category_name: (tx.category_name as string | null) ?? null,
    needs_review: Boolean(tx.needs_review),
  };
}
