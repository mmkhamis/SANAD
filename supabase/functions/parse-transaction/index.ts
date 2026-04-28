// Supabase Edge Function: parse-transaction
//
// AI-first parser for smart input (text/voice/OCR/WhatsApp text) that emits
// the canonical parser-v2 ParseResult schema. Response also includes a legacy
// `transactions` array for existing clients still expecting SmartInputResult.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';
import {
  parseSms,
  callAI,
  mergeRulesAndAI,
  type ParseResult,
} from '../_shared/sms-parser-v2/index.ts';
import { logParseEvent } from '../_shared/sms-ingest-v2.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseRequest {
  text: string;
  sender?: string | null;
  defaultCurrency?: string;
  defaultCountry?: string;
}

interface LegacySmartResult {
  amount: number | null;
  currency: string | null;
  transaction_type: 'income' | 'expense' | 'transfer';
  category: string | null;
  merchant: string | null;
  counterparty: string | null;
  account_name: string | null;
  confidence: number;
  needs_review: boolean;
  source: 'rules' | 'ai' | 'rules-fallback';
  date: string;
  description: string;
}

function mapClassToTxType(c: ParseResult['message_class']): 'income' | 'expense' | 'transfer' {
  if (c === 'income' || c === 'refund') return 'income';
  if (c === 'transfer') return 'transfer';
  return 'expense';
}

function toLegacy(result: ParseResult): LegacySmartResult {
  const transaction_type = mapClassToTxType(result.message_class);
  const date = (result.timestamp ?? new Date().toISOString()).slice(0, 10);
  const description =
    result.descriptor
    ?? result.merchant_raw
    ?? result.counterparty_name
    ?? (transaction_type === 'income'
      ? 'Incoming payment'
      : transaction_type === 'transfer'
        ? 'Transfer'
        : 'Expense');

  const source: LegacySmartResult['source'] =
    result.parser_source === 'rules' ? 'rules'
      : result.parser_source === 'ai_fallback' ? 'ai'
        : 'ai';

  return {
    amount: result.amount,
    currency: result.currency,
    transaction_type,
    category: null,
    merchant: result.merchant_raw,
    counterparty: result.counterparty_name,
    account_name: null,
    confidence: result.confidence,
    needs_review: result.confidence < 0.85 || result.review_flags.length > 0,
    source,
    date,
    description,
  };
}

function looksLikeHighConfidenceBankSms(result: ParseResult): boolean {
  if (result.message_class === 'otp'
    || result.message_class === 'balance_alert'
    || result.message_class === 'promotion_offer'
    || result.message_class === 'unknown') {
    return false;
  }
  return result.amount !== null && result.confidence >= 0.86;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const body = await req.json() as ParseRequest;
    const text = (body.text ?? '').trim();
    if (!text || text.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Input text is required (min 3 characters)' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const userId = auth.userId;
    const sanitized = text.slice(0, 2500);
    let parsed = parseSms(sanitized, {
      arrived_at: new Date().toISOString(),
      sender: body.sender ?? null,
      defaultCurrency: body.defaultCurrency ?? 'SAR',
      defaultCountry: body.defaultCountry ?? 'SA',
    });

    // AI-first for free-text input, with a high-confidence bank-SMS short-circuit.
    let aiUsed = false;
    const shouldSkipAI = looksLikeHighConfidenceBankSms(parsed);
    if (!shouldSkipAI) {
      const apiKey = Deno.env.get('OPENAI_API_KEY');
      if (apiKey) {
        const ai = await callAI(
          sanitized,
          parsed,
          {
            amount_candidates: parsed.amount !== null ? [parsed.amount] : [],
            institution_guess: parsed.institution_name,
            last4_hits: [
              parsed.from_last4,
              parsed.to_last4,
              parsed.source_account_last4,
              parsed.source_card_last4,
            ]
              .filter(Boolean)
              .map((d) => ({ digits: d as string, role: 'unknown' })),
            ignored_values: parsed.ignored_values.map((v) => ({ kind: v.kind, value: v.value })),
          },
          { apiKey },
        );
        if (ai) {
          parsed = mergeRulesAndAI(parsed, ai);
          aiUsed = true;
        }
      }
    }

    const canonicalResults: ParseResult[] = [parsed];
    const legacyTransactions: LegacySmartResult[] = canonicalResults
      .filter((r) => r.should_create_transaction && r.amount !== null)
      .map(toLegacy);

    // Telemetry (best effort): parser_source / confidence / review_flags / AI cost.
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await logParseEvent(sb, {
      userId,
      ingestSource: 'parse_transaction',
      parsed,
      status: parsed.should_create_transaction && parsed.amount !== null ? 'created' : 'no_amount',
      aiUsed,
      dedupHit: false,
      needsReview: parsed.confidence < 0.85 || parsed.review_flags.length > 0,
    });

    return new Response(
      JSON.stringify({
        results: canonicalResults,
        transactions: legacyTransactions,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
