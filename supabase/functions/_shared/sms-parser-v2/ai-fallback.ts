// AI fallback wrapper. Calls gpt-4o-mini with the canonical prompt and
// merges its output on top of the rules result. Rules win on numeric /
// last4 fields; AI wins on merchant + descriptor + class.

import type { ParseResult } from './types.ts';
import { SYSTEM_PROMPT, buildUserMessage, type RulesHint } from './ai-prompt.ts';
import { redactPII } from './redact-pii.ts';

export interface AICallOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

/** True when the deterministic pass should hand off to AI. */
export function shouldCallAI(rules: ParseResult, flags: { amountConflict: boolean; mixedScript: boolean; categoryMissing?: boolean }): boolean {
  // Never pay for non-transactional classes
  if (rules.message_class === 'promotion_offer'
   || rules.message_class === 'balance_alert'
   || rules.message_class === 'otp') return false;

  // Always call AI when category is missing (our biggest value-add)
  if (flags.categoryMissing) return true;

  // Amount conflict — AI can disambiguate
  if (flags.amountConflict) return true;

  // Mixed script with missing merchant — AI reads both languages
  const merchantMissing = rules.review_flags.includes('missing_merchant');
  if (merchantMissing && flags.mixedScript) return true;

  // Unknown class — AI might figure it out
  if (rules.message_class === 'unknown' && rules.amount !== null) return true;

  // Already confident enough with category
  if (rules.confidence >= 0.80) return false;

  // In the [0, 0.80) band → call AI
  return true;
}

export async function callAI(
  rawText: string,
  rules: ParseResult,
  hint: RulesHint,
  opts: AICallOptions,
): Promise<Partial<ParseResult> | null> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(redactPII(rawText), hint) },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
      return JSON.parse(content) as Partial<ParseResult>;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Merge AI output onto rules. Rules win on numeric / last4 / ignored.
 *  Rules also win on message_class when a hard verb was matched. */
export function mergeRulesAndAI(rules: ParseResult, ai: Partial<ParseResult>): ParseResult {
  // If rules matched a definitive class (not 'unknown'), keep it. AI can
  // only override 'unknown' to a concrete class — never downgrade/change
  // a hard verb match like شراء/تم خصم (purchase) vs deposited (income).
  // Exception: AI can upgrade 'purchase' to more specific classes like 'transfer'
  // when it has better context understanding.
  const mergedClass = rules.message_class !== 'unknown'
    ? rules.message_class
    : ai.message_class ?? rules.message_class;

  const merged: ParseResult = {
    ...rules,
    // AI wins on these "soft" fields
    message_class: mergedClass,
    // Rules win on should_create_transaction when rules found an amount and
    // classified the message — AI should not be able to suppress a valid transaction.
    should_create_transaction: (rules.amount !== null && rules.message_class !== 'unknown')
      ? rules.should_create_transaction
      : ai.should_create_transaction ?? rules.should_create_transaction,
    should_route_to_offers_feed: ai.should_route_to_offers_feed ?? rules.should_route_to_offers_feed,
    merchant_raw: ai.merchant_raw ?? rules.merchant_raw,
    merchant_normalized: ai.merchant_normalized ?? rules.merchant_normalized,
    descriptor: ai.descriptor ?? rules.descriptor,
    counterparty_name: ai.counterparty_name ?? rules.counterparty_name,
    institution_name: rules.institution_name ?? ai.institution_name ?? null,
    country: rules.country ?? ai.country ?? null,
    channel: rules.channel ?? ai.channel ?? null,
    // Rules win on numeric / last4 / amount-related
    amount: rules.amount ?? ai.amount ?? null,
    currency: rules.currency || ai.currency || 'SAR',
    timestamp: rules.timestamp ?? ai.timestamp ?? null,
    source_account_last4: rules.source_account_last4 ?? ai.source_account_last4 ?? null,
    source_card_last4: rules.source_card_last4 ?? ai.source_card_last4 ?? null,
    from_last4: rules.from_last4 ?? ai.from_last4 ?? null,
    to_last4: rules.to_last4 ?? ai.to_last4 ?? null,
    // Ignored values: union
    ignored_values: [...rules.ignored_values, ...(ai.ignored_values ?? [])],
    // Confidence: take the higher of the two; AI rarely lowers it
    confidence: Math.max(rules.confidence, ai.confidence ?? 0),
    parse_reason: ai.parse_reason ?? rules.parse_reason,
    review_flags: Array.from(new Set([...rules.review_flags, ...(ai.review_flags ?? [])])),
    parser_source: 'rules_then_ai',
    // AI WINS on taxonomy — this is the main reason we call AI
    taxonomy_key: ai.taxonomy_key ?? rules.taxonomy_key ?? null,
  };
  return merged;
}
