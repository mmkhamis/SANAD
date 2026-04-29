import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  parseSms,
  buildDedupKey,
  bodyHash,
  shouldCallAI,
  callAI,
  mergeRulesAndAI,
  type ParseResult,
} from './sms-parser-v2/index.ts';
import { suggestUserCategory, type CategoryRow } from './sms-parser.ts';

export type IngestStatus =
  | 'created'
  | 'duplicate'
  | 'no_amount'
  | 'offer'
  | 'dropped'
  | 'error';

export interface IngestTransactionShape {
  id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  merchant: string | null;
  counterparty: string | null;
  category_name: string | null;
  needs_review: boolean;
  parser_source: string;
}

export interface IngestOutcome {
  ok: boolean;
  status: IngestStatus;
  transaction?: IngestTransactionShape;
  parser_source?: string;
  message_class?: string;
  error?: string;
  parsed?: ParseResult;
}

interface IngestParams {
  sb: ReturnType<typeof createClient>;
  userId: string;
  message: string;
  sender?: string | null;
  defaultCurrency?: string;
  defaultCountry?: string;
  ingestSource: 'ingest_sms' | 'sms_webhook';
}

const SMS_PARSE_QUOTA: Record<string, number> = {
  free: 0,
  pro: 30,
  max: Number.POSITIVE_INFINITY,
};

export async function ingestSmsMessage({
  sb,
  userId,
  message,
  sender,
  defaultCurrency = 'SAR',
  defaultCountry = 'SA',
  ingestSource,
}: IngestParams): Promise<IngestOutcome> {
  console.log('[sms-ingest-v2] START, msgLen=', message.length, 'first50=', message.slice(0, 50));
  try {
    // 1) Load parser context
    const [accountsRes, promoRes] = await Promise.all([
      sb.from('accounts')
        .select('id, name, type, account_last4, card_last4, iban_last4')
        .eq('user_id', userId),
      sb.from('promo_keywords')
        .select('keyword, language, weight')
        .eq('active', true),
    ]);

    const ownedAccounts = (accountsRes.data ?? []).map((a) => ({
      id: a.id as string,
      name: (a.name as string) ?? '',
      type: (a.type as string) ?? '',
      account_last4: (a.account_last4 as string | null) ?? null,
      card_last4: (a.card_last4 as string | null) ?? null,
      iban_last4: (a.iban_last4 as string | null) ?? null,
    }));
    const promoKeywords = (promoRes.data ?? []).map((p) => ({
      keyword: p.keyword as string,
      language: p.language as 'ar' | 'en',
      weight: Number(p.weight),
    }));

    // 2) Parse rules first
    let parsed: ParseResult = parseSms(message, {
      arrived_at: new Date().toISOString(),
      sender: sender ?? null,
      ownedAccounts,
      promoKeywords,
      defaultCurrency,
      defaultCountry,
    });

    // 3) Load user categories early (needed for AI gating decision)
    const { data: cats } = await sb
      .from('categories')
      .select('id, name, icon, color, type, taxonomy_key')
      .eq('user_id', userId)
      .is('retired_at', null);
    const userCats = (cats ?? []) as CategoryRow[];

    // Preliminary rules-based category match (before AI)
    // Transfers don't need categories — they're internal money movements
    const txType = mapToTxType(parsed.message_class);
    let matchedCategory = txType === 'transfer'
      ? null
      : suggestUserCategory(
          message,
          parsed.merchant_raw,
          txType,
          userCats,
        );

    // Refund class → force refund_rebate category
    if (parsed.message_class === 'refund' && !matchedCategory) {
      const incomeCats = userCats.filter((c) => c.type === 'income');
      matchedCategory = incomeCats.find((c) => c.taxonomy_key === 'refund_rebate') ?? null;
      if (!matchedCategory) {
        matchedCategory = resolveParentCategory('refund_rebate', incomeCats);
      }
    }

    // 3b) Check merchant→category cache before calling AI
    const merchantKey = parsed.merchant_raw?.toLowerCase().trim() ?? null;
    if (!matchedCategory && merchantKey) {
      const { data: cached } = await sb
        .from('merchant_category_cache')
        .select('taxonomy_key, hit_count')
        .eq('merchant_key', merchantKey)
        .limit(1)
        .maybeSingle();

      if (cached?.taxonomy_key) {
        const sameType = userCats.filter((c) => c.type === txType);
        matchedCategory = sameType.find((c) => c.taxonomy_key === cached.taxonomy_key) ?? null;
        // Parent fallback for cached taxonomy_key
        if (!matchedCategory) {
          matchedCategory = resolveParentCategory(cached.taxonomy_key, sameType);
        }
        // Bump hit count in background (fire-and-forget)
        if (matchedCategory) {
          sb.from('merchant_category_cache')
            .update({ hit_count: (cached.hit_count ?? 0) + 1, updated_at: new Date().toISOString() })
            .eq('merchant_key', merchantKey)
            .then(() => {});
        }
      }
    }

    // 4) AI fallback (plan + quota + score band + missing category)
    let aiUsed = false;
    if (parsed.message_class !== 'otp'
      && parsed.message_class !== 'balance_alert'
      && parsed.message_class !== 'promotion_offer') {
      const allowAI = await canCallAI(sb, userId);
      if (allowAI) {
        const mixedScript = /[A-Za-z]/.test(message) && /[؀-ۿ]/.test(message);
        const latinOnly = message.replace(/\b(SAR|EGP|AED|USD|EUR|GBP|KWD|QAR|BHD|OMR|JOD|POS|ATM|PIN|OTP|SMS|STC|mada|MADA)\b/gi, '');
        const trueMixedScript = mixedScript && /[A-Za-z]{3,}/.test(latinOnly);
        const wants = shouldCallAI(parsed, {
          amountConflict: parsed.review_flags.includes('amount_conflict'),
          mixedScript: trueMixedScript,
          categoryMissing: !matchedCategory,
        });

        if (wants) {
          const apiKey = Deno.env.get('OPENAI_API_KEY');
          if (apiKey) {
            const ai = await callAI(message, parsed, {
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
            }, { apiKey });

            if (ai) {
              parsed = mergeRulesAndAI(parsed, ai);
              aiUsed = true;
              await sb.from('usage_events').insert({
                user_id: userId,
                usage_key: 'smsParsePerDay',
              });

              // If rules missed the category but AI suggested a taxonomy_key, try matching
              if (!matchedCategory && parsed.taxonomy_key) {
                const aiTaxKey = parsed.taxonomy_key;
                const sameType = userCats.filter((c) => c.type === txType);
                matchedCategory = sameType.find((c) => c.taxonomy_key === aiTaxKey) ?? null;
                if (!matchedCategory) {
                  matchedCategory = resolveParentCategory(aiTaxKey, sameType);
                }
              }

              // Re-try rules-based category with AI-cleaned merchant
              if (!matchedCategory && parsed.merchant_raw) {
                matchedCategory = suggestUserCategory(
                  message,
                  parsed.merchant_raw,
                  txType,
                  userCats,
                );
              }

              // Save AI's merchant→category to cache for future reuse
              if (parsed.taxonomy_key && merchantKey) {
                sb.from('merchant_category_cache')
                  .upsert({
                    merchant_key: merchantKey,
                    taxonomy_key: parsed.taxonomy_key,
                    merchant_raw: parsed.merchant_raw,
                    source: 'ai',
                    hit_count: 1,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'merchant_key' })
                  .then(() => {});
              }
            }
          }
        }
      }
    }

    // 4) Drop-only classes
    if (parsed.message_class === 'otp' || parsed.message_class === 'balance_alert') {
      const outcome: IngestOutcome = {
        ok: true,
        status: 'dropped',
        parser_source: parsed.parser_source,
        message_class: parsed.message_class,
        parsed,
      };
      await logParseEvent(sb, {
        userId,
        ingestSource,
        parsed,
        status: outcome.status,
        aiUsed,
        dedupHit: false,
        needsReview: false,
      });
      return outcome;
    }

    // 5) Promotion offers path
    if (parsed.message_class === 'promotion_offer') {
      const redacted = redactBody(message);
      const { error: offerErr } = await sb.from('offers').insert({
        user_id: userId,
        received_at: new Date().toISOString(),
        institution_name: parsed.institution_name,
        body: redacted,
        body_hash: bodyHash(redacted),
        cta_url: extractFirstUrl(message),
        parser_source: parsed.parser_source,
        confidence: parsed.confidence,
      });

      const status: IngestStatus = offerErr && (offerErr as { code?: string }).code === '23505'
        ? 'duplicate'
        : 'offer';
      if (offerErr && status !== 'duplicate') {
        console.error('[sms-ingest-v2] offer insert error', offerErr);
      }

      const outcome: IngestOutcome = {
        ok: true,
        status,
        parser_source: parsed.parser_source,
        message_class: parsed.message_class,
        parsed,
      };
      await logParseEvent(sb, {
        userId,
        ingestSource,
        parsed,
        status: outcome.status,
        aiUsed,
        dedupHit: status === 'duplicate',
        needsReview: false,
      });
      return outcome;
    }

    // 6) Unknown/no amount
    if (!parsed.should_create_transaction || parsed.amount === null) {
      const outcome: IngestOutcome = {
        ok: true,
        status: 'no_amount',
        parser_source: parsed.parser_source,
        parsed,
      };
      await logParseEvent(sb, {
        userId,
        ingestSource,
        parsed,
        status: outcome.status,
        aiUsed,
        dedupHit: false,
        needsReview: true,
      });
      return outcome;
    }

    // 7) Dedup
    const dedupKey = buildDedupKey(parsed);
    const { data: dup } = await sb
      .from('transactions')
      .select('id, amount, transaction_type, description, merchant, counterparty, category_name, needs_review, parser_source')
      .eq('user_id', userId)
      .eq('idempotency_key', dedupKey)
      .is('deleted_at', null)
      .limit(1);

    if (dup && dup.length > 0) {
      const outcome: IngestOutcome = {
        ok: true,
        status: 'duplicate',
        transaction: shapeTx(dup[0]),
        parser_source: parsed.parser_source,
        parsed,
      };
      await logParseEvent(sb, {
        userId,
        ingestSource,
        parsed,
        status: outcome.status,
        aiUsed,
        dedupHit: true,
        needsReview: Boolean(dup[0].needs_review),
      });
      return outcome;
    }

    // 8) Build transaction row
    const isoDate = (parsed.timestamp ?? new Date().toISOString()).slice(0, 10);

    // Match account by last4 digits (exact or suffix match for NNN*NNN format)
    const matchAccount = (last4: string) =>
      ownedAccounts.find((a) =>
        matchLast4(a.account_last4, last4)
        || matchLast4(a.card_last4, last4)
        || matchLast4(a.iban_last4, last4)) ?? null;

    const fromAccountId = parsed.from_last4 ? matchAccount(parsed.from_last4)?.id ?? null : null;
    const toAccountId = parsed.to_last4 ? matchAccount(parsed.to_last4)?.id ?? null : null;

    const reasons: string[] = [];
    if (!matchedCategory) reasons.push('missing_category');
    reasons.push(parsed.parse_reason);
    for (const f of parsed.review_flags) reasons.push(f);
    const reviewReason = reasons.filter(Boolean).join('; ');

    const needsReview = txType === 'transfer'
      ? !(fromAccountId || toAccountId)  // transfers only need review if no accounts matched
      : !matchedCategory || (parsed.confidence < 0.70);

    // For non-transfer transactions, resolve account_id from source_card_last4
    // or source_account_last4 (the user's own card/account that was charged)
    let accountId: string | null = fromAccountId;
    if (!accountId && txType !== 'transfer') {
      const srcLast4 = parsed.source_card_last4 ?? parsed.source_account_last4 ?? null;
      if (srcLast4) {
        accountId = ownedAccounts.find((a) =>
          matchLast4(a.account_last4, srcLast4)
          || matchLast4(a.card_last4, srcLast4)
          || matchLast4(a.iban_last4, srcLast4))?.id ?? null;
      }
    }

    // Fallback: if no account matched, assign to "Other" account (auto-created)
    if (!accountId && txType !== 'transfer') {
      accountId = await getOrCreateOtherAccount(sb, userId);
    }

    // Transfers don't need categories — they're internal movements
    const effectiveCategory = txType === 'transfer' ? null : matchedCategory;

    const row: Record<string, unknown> = {
      user_id: userId,
      amount: parsed.amount,
      type: txType,
      transaction_type: txType,
      category_id: effectiveCategory?.id ?? null,
      category_name: effectiveCategory?.name ?? null,
      category_icon: effectiveCategory?.icon ?? null,
      category_color: effectiveCategory?.color ?? null,
      description: buildDescription(parsed, txType, parsed.institution_name, message),
      merchant: parsed.merchant_raw,
      merchant_raw: parsed.merchant_raw,
      merchant_normalized: parsed.merchant_normalized,
      counterparty: parsed.counterparty_name,
      date: isoDate,
      notes: message,
      source: 'sms',
      source_type: 'sms',
      parser_source: parsed.parser_source,
      needs_review: needsReview,
      parse_confidence: parsed.confidence,
      review_reason: reviewReason || null,
      institution_name: parsed.institution_name,
      channel: parsed.channel,
      descriptor: parsed.descriptor,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      account_id: accountId,
      from_last4: parsed.from_last4 ?? parsed.source_card_last4 ?? parsed.source_account_last4 ?? null,
      to_last4: parsed.to_last4,
      ignored_values: parsed.ignored_values,
      idempotency_key: dedupKey,
    };

    console.log('[sms-ingest-v2] INSERTING tx:', { txType, amount: parsed.amount, accountId, fromAccountId, toAccountId, dedupKey, needsReview });

    const { data: inserted, error: insertErr } = await sb
      .from('transactions')
      .insert(row)
      .select()
      .single();

    if (insertErr) {
      console.error('[sms-ingest-v2] insert error', insertErr);
      const outcome: IngestOutcome = {
        ok: false,
        status: 'error',
        error: insertErr.message,
        parser_source: parsed.parser_source,
        parsed,
      };
      await logParseEvent(sb, {
        userId,
        ingestSource,
        parsed,
        status: outcome.status,
        aiUsed,
        dedupHit: false,
        needsReview,
      });
      return outcome;
    }

    const outcome: IngestOutcome = {
      ok: true,
      status: 'created',
      transaction: shapeTx(inserted as Record<string, unknown>),
      parser_source: parsed.parser_source,
      parsed,
    };

    // 9) Adjust account balances
    // For purchases/expenses: debit the source account
    // For income: credit the destination account
    // For transfers: debit source, credit destination
    const amount = parsed.amount ?? 0;
    console.log('[sms-ingest-v2] balance adjustment:', {
      txType, amount, accountId, fromAccountId, toAccountId,
      source_card_last4: parsed.source_card_last4,
      source_account_last4: parsed.source_account_last4,
      from_last4: parsed.from_last4,
      ownedAccountCount: ownedAccounts.length,
      ownedLast4s: ownedAccounts.map(a => ({ id: a.id, card: a.card_last4, acct: a.account_last4, iban: a.iban_last4 })),
    });
    if (amount > 0) {
      if (txType === 'transfer') {
        if (fromAccountId) {
          const { error: e1 } = await sb.rpc('adjust_account_balance', {
            p_account_id: fromAccountId,
            p_delta: Math.round(-amount * 100) / 100,
          });
          if (e1) console.error('[sms-ingest-v2] transfer debit error', e1);
        }
        if (toAccountId) {
          const { error: e2 } = await sb.rpc('adjust_account_balance', {
            p_account_id: toAccountId,
            p_delta: Math.round(amount * 100) / 100,
          });
          if (e2) console.error('[sms-ingest-v2] transfer credit error', e2);
        }
      } else if (txType === 'expense' && accountId) {
        const { error: e3 } = await sb.rpc('adjust_account_balance', {
          p_account_id: accountId,
          p_delta: Math.round(-amount * 100) / 100,
        });
        if (e3) console.error('[sms-ingest-v2] expense debit error', e3);
      } else if (txType === 'income' && accountId) {
        const { error: e4 } = await sb.rpc('adjust_account_balance', {
          p_account_id: accountId,
          p_delta: Math.round(amount * 100) / 100,
        });
        if (e4) console.error('[sms-ingest-v2] income credit error', e4);
      }
    }

    await logParseEvent(sb, {
      userId,
      ingestSource,
      parsed,
      status: outcome.status,
      aiUsed,
      dedupHit: false,
      needsReview,
    });
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[sms-ingest-v2] CRASH:', message, err instanceof Error ? err.stack : '');
    return { ok: false, status: 'error', error: message };
  }
}

async function canCallAI(
  sb: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: sub } = await sb
    .from('user_subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .maybeSingle();

  const plan = (sub?.plan as string | undefined) ?? 'free';
  const quota = SMS_PARSE_QUOTA[plan] ?? 0;
  if (quota === 0) return false;
  if (!isFinite(quota)) return true;

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('usage_key', 'smsParsePerDay')
    .gte('created_at', sinceIso);
  return (count ?? 0) < quota;
}

const TAXONOMY_PARENT_MAP: Record<string, string[]> = {
  hungerstation: ['food_delivery', 'restaurants', 'food_dining'],
  jahez: ['food_delivery', 'restaurants', 'food_dining'],
  marsool: ['food_delivery', 'restaurants', 'food_dining'],
  talabat: ['food_delivery', 'restaurants', 'food_dining'],
  elmenus: ['food_delivery', 'restaurants', 'food_dining'],
  food_delivery: ['restaurants', 'food_dining'],
  restaurants: ['food_dining'],
  cafes_coffee: ['food_dining'],
  groceries: ['food_dining'],
  bakery: ['food_dining'],
  taxi_rideshare: ['transport'],
  fuel: ['transport'],
  careem: ['taxi_rideshare', 'transport'],
  parking: ['transport'],
  tolls: ['transport'],
  traffic_fines: ['fines'],
  parking_fines: ['fines'],
  government_fines: ['fines'],
  late_payment_fines: ['fines'],
  other_fines: ['fines'],
  personal_loan: ['debt_obligations'],
  car_loan: ['debt_obligations'],
  mortgage_payment: ['debt_obligations'],
  installments_bnpl: ['debt_obligations'],
  tabby: ['installments_bnpl', 'debt_obligations'],
  tamara: ['installments_bnpl', 'debt_obligations'],
  credit_card_payment: ['debt_obligations'],
  pharmacy: ['health_medical'],
  gym_fitness: ['health_medical'],
};

function resolveParentCategory(taxKey: string, sameType: CategoryRow[]): CategoryRow | null {
  for (const fk of TAXONOMY_PARENT_MAP[taxKey] ?? []) {
    const match = sameType.find((c) => c.taxonomy_key === fk) ?? null;
    if (match) return match;
  }
  return null;
}

/** Build a human-friendly description for a transaction. */
function buildDescription(
  parsed: ParseResult,
  txType: 'income' | 'expense' | 'transfer',
  institutionName: string | null,
  rawMessage: string,
): string {
  const counterparty = parsed.counterparty_name;
  // Extract first name only from full name (e.g., "حسين عبدالرحمن احمد" → "حسين")
  const firstName = counterparty?.split(/\s+/)[0] ?? null;

  // Card settlement
  const CARD_SETTLE_RE = /سداد\s*بطاق[هةت]\s*ائتمان/i;
  if (txType === 'transfer' && CARD_SETTLE_RE.test(rawMessage)) {
    return 'سداد بطاقة ائتمانية';
  }

  if (txType === 'transfer') {
    // Check direction: incoming vs outgoing vs internal
    const INCOMING_RE = /(وارد|واردة|incoming|received)/i;
    const isIncoming = INCOMING_RE.test(rawMessage);
    const isInternal = parsed.from_last4 && parsed.to_last4;

    if (isInternal) {
      // Internal transfer between own accounts
      const via = institutionName ? ` · ${institutionName}` : '';
      return `تحويل داخلي${via}`;
    }

    if (isIncoming) {
      const from = firstName ?? institutionName ?? null;
      return from ? `تحويل من ${from}` : 'تحويل وارد';
    }

    // Outgoing
    const to = firstName ?? institutionName ?? null;
    return to ? `تحويل إلى ${to}` : 'تحويل صادر';
  }

  if (txType === 'income') {
    if (firstName) return `تحويل من ${firstName}`;
    if (parsed.merchant_raw) return parsed.merchant_raw;
    return parsed.descriptor ?? 'إيداع';
  }

  // Expense — use merchant or descriptor
  return parsed.descriptor ?? parsed.merchant_raw ?? rawMessage.slice(0, 80);
}

function mapToTxType(c: ParseResult['message_class']): 'income' | 'expense' | 'transfer' {
  if (c === 'income' || c === 'refund') return 'income';
  if (c === 'transfer') return 'transfer';
  return 'expense';
}

function redactBody(body: string): string {
  return body
    .replace(/(\*+)\s*\d{4}/g, '$1****')
    .replace(/\d{4}\s*\*+/g, '****$&'.replace(/\d{4}/, '****'));
}

function extractFirstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : null;
}

function shapeTx(tx: Record<string, unknown>): IngestTransactionShape {
  return {
    id: String(tx.id),
    amount: Number(tx.amount),
    type: (tx.transaction_type ?? tx.type) as 'income' | 'expense' | 'transfer',
    description: String(tx.description ?? ''),
    merchant: (tx.merchant as string | null) ?? null,
    counterparty: (tx.counterparty as string | null) ?? null,
    category_name: (tx.category_name as string | null) ?? null,
    needs_review: Boolean(tx.needs_review),
    parser_source: String(tx.parser_source ?? 'rules'),
  };
}

export interface ParseEventInput {
  userId: string;
  ingestSource: 'ingest_sms' | 'sms_webhook' | 'parse_transaction';
  parsed: ParseResult;
  status: IngestStatus;
  aiUsed: boolean;
  dedupHit: boolean;
  needsReview: boolean;
}

export async function logParseEvent(
  sb: ReturnType<typeof createClient>,
  input: ParseEventInput,
): Promise<void> {
  const aiCostUsd = input.aiUsed ? 0.0002 : 0;
  const payload = {
    user_id: input.userId,
    ingest_source: input.ingestSource,
    parser_source: input.parsed.parser_source,
    message_class: input.parsed.message_class,
    confidence: input.parsed.confidence,
    review_flags: input.parsed.review_flags,
    ai_used: input.aiUsed,
    ai_cost_usd: aiCostUsd,
    status: input.status,
    dedup_hit: input.dedupHit,
    needs_review: input.needsReview,
  };

  const { error } = await sb.from('parse_events').insert(payload);
  if (error) {
    console.warn('[sms-ingest-v2] parse_events insert skipped:', error.message);
  }
}

/** Fuzzy last4 match: exact match, or suffix match (e.g. DB "0079" matches parsed "2079" via last 3 digits).
 *  Handles the Saudi NNN*NNN format where we extract "2079" but the DB stores "0079". */
function matchLast4(dbVal: string | null, parsed: string): boolean {
  if (!dbVal || !parsed) return false;
  if (dbVal === parsed) return true;
  // Suffix match: the last 3 digits must match (to avoid false positives)
  const minLen = Math.min(dbVal.length, parsed.length, 3);
  return minLen >= 3 && dbVal.slice(-minLen) === parsed.slice(-minLen);
}

async function getOrCreateOtherAccount(
  sb: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  // Check if "Other" account already exists
  const { data: existing } = await sb
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'bank')
    .eq('name', 'Other')
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  // Create it
  const { data: created, error } = await sb
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'Other',
      type: 'bank',
      opening_balance: 0,
      current_balance: 0,
      include_in_total: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[sms-ingest-v2] failed to create Other account', error);
    return null;
  }
  return (created?.id as string) ?? null;
}
