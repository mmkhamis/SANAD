// Public entry: parseSms(text, ctx) → ParseResult.

import type { ParseContext, ParseResult, MessageClass, Last4Hit } from './types.ts';
import { normalize } from './normalize.ts';
import { classify } from './classify.ts';
import { extractAmount, DEBIT_VERB_RE } from './extract-amount.ts';
import { extractTimestamp } from './extract-timestamp.ts';
import { extractInstitution } from './extract-institution.ts';
import { extractChannel } from './extract-channel.ts';
import { extractLast4 } from './extract-last4.ts';
import { isTransfer } from './detect-transfer.ts';
import { extractMerchant } from './extract-merchant.ts';
import { extractCounterparty } from './extract-counterparty.ts';
import { matchOwnership } from './match-ownership.ts';
import { score } from './score.ts';

export * from './types.ts';
export { buildDedupKey, bodyHash } from './dedup.ts';
export { shouldCallAI, callAI, mergeRulesAndAI } from './ai-fallback.ts';
export { SYSTEM_PROMPT, buildUserMessage } from './ai-prompt.ts';

// Hard debit verbs — absolute priority over income verb check.
// "شراء" (purchase), "تم خصم" (deducted) are unambiguous expense verbs.
const HARD_DEBIT_RE = /(شراء|تم خصم|pos\b|purchase)/i;

// Regexes applied against ORIGINAL text (not lower) so Arabic chars stay
// verbatim. /i covers Latin case.
const REFUND_RE = /(refund|cashback|reverse|تم استرجاع|استرجاع\s+مبلغ|استرداد\s+مبلغ|استرداد\s+نقدي)/i;
const INCOME_VERB_RE = /(deposited|credited|تم إضافة|إيداع|تم تحويل\s+لك|راتب|salary|تم استلام)/i;
const TRANSFER_VERB_RE = /(تحويل|transfer|transferred)/i;

export function parseSms(rawText: string, ctx: ParseContext = {}): ParseResult {
  const { original, lower } = normalize(rawText);
  const cls = classify(lower, ctx);

  const empty = (kls: MessageClass, reason: string): ParseResult => ({
    message_class: kls,
    should_create_transaction: false,
    should_route_to_offers_feed: kls === 'promotion_offer',
    amount: null,
    currency: ctx.defaultCurrency ?? 'SAR',
    timestamp: ctx.arrived_at ?? null,
    institution_name: null,
    merchant_raw: null,
    merchant_normalized: null,
    descriptor: null,
    channel: null,
    country: ctx.defaultCountry ?? null,
    source_account_last4: null,
    source_card_last4: null,
    from_last4: null,
    to_last4: null,
    counterparty_name: null,
    ignored_values: [],
    confidence: 0.95,
    parse_reason: reason,
    review_flags: [],
    parser_source: 'rules',
  });

  if (cls.class === 'otp')           return empty('otp', 'OTP message — drop');
  if (cls.class === 'balance_alert') return empty('balance_alert', 'Balance-only — drop');
  if (cls.class === 'promotion_offer') {
    const inst = extractInstitution(lower, ctx.sender);
    return {
      ...empty('promotion_offer', 'Promotional content — route to offers'),
      institution_name: inst.institution_name,
      country: inst.country ?? ctx.defaultCountry ?? null,
    };
  }

  // Transactional path
  const amt = extractAmount(original, ctx.defaultCurrency ?? 'SAR');
  const ts  = extractTimestamp(original, ctx.arrived_at);
  const inst = extractInstitution(lower, ctx.sender);
  const channel = extractChannel(original);
  const last4 = extractLast4(original);
  const transfer = isTransfer(original, last4);

  // Class precedence:
  //  - hard debit verbs (شراء/تم خصم/purchase/POS) win first — unambiguous expense
  //  - income only when "تم إضافة"/"deposited" is present WITHOUT a hard debit verb
  //  - refund only when an explicit reverse/refund verb is present
  //  - transfer when both from+to last4 hits OR transfer verb present
  //  - purchase otherwise (with a debit verb + amount)
  let messageClass: MessageClass = 'unknown';
  if (HARD_DEBIT_RE.test(original) && amt.amount !== null) messageClass = 'purchase';
  else if (INCOME_VERB_RE.test(original)) messageClass = 'income';
  else if (REFUND_RE.test(original)) messageClass = 'refund';
  else if (transfer || TRANSFER_VERB_RE.test(original)) messageClass = 'transfer';
  else if (DEBIT_VERB_RE.test(original) && amt.amount !== null) messageClass = 'purchase';

  const isPurchase = messageClass === 'purchase';
  const isIncoming = messageClass === 'income' || messageClass === 'refund';

  // Run merchant extraction for purchases AND refunds (refund SMS often
  // names the merchant — "refunded by Amazon"). Transfers get counterparty.
  const merch = (isPurchase || messageClass === 'refund')
    ? extractMerchant(original, isPurchase)
    : { merchant_raw: null, missing_merchant: false };

  const counterparty = (messageClass === 'transfer' || messageClass === 'income')
    ? extractCounterparty(original, isIncoming)
    : null;

  // Bucket last4 hits by role. For non-transfer messages, what the bank
  // labels "from"/"to" usually means the user's own account or card from
  // the user's perspective. Direction matters:
  //  - purchase   "من حساب *X" = source account; "to" never appears here
  //  - income     "إلى حسابك *X" = destination account (user's own)
  //  - refund     "إلى بطاقتك *X" = destination card (user's own)
  // We collapse all of these to {account, card} based on which keyword
  // anchored the role.
  const own = matchOwnership(last4, ctx);
  let mapped = own.hits;
  if (messageClass !== 'transfer') {
    mapped = own.hits.map((h) => {
      if (h.role === 'from' || h.role === 'to') {
        // Re-inspect the original 60-char window to pick account vs card.
        // Cheap proxy: if a card keyword was nearby, it's a card; else account.
        const idx = original.indexOf(h.digits);
        if (idx > 0) {
          const before = original.slice(Math.max(0, idx - 60), idx);
          if (/بطاق[ةت]\w*|card/i.test(before)) return { ...h, role: 'card' as const };
        }
        return { ...h, role: 'account' as const };
      }
      if (h.role === 'unknown' && (channel === 'apple_pay' || channel === 'mada' || channel === 'card')) {
        return { ...h, role: 'card' as const };
      }
      return h;
    });
  }

  const fromHit = own.hits.find((h) => h.role === 'from');
  const toHit   = own.hits.find((h) => h.role === 'to');
  const cardHit = mapped.find((h) => h.role === 'card');
  const acctHit = mapped.find((h) => h.role === 'account');

  if (own.isInternalTransfer) messageClass = 'transfer';

  const verbIdx = original.toLowerCase().search(DEBIT_VERB_RE);
  const amountIdx = amt.amount !== null ? original.search(/\d/) : -1;
  const amountNearVerb = verbIdx !== -1 && amountIdx !== -1 && Math.abs(verbIdx - amountIdx) <= 80;
  const mixedScript = /[A-Za-z]/.test(original) && /[؀-ۿ]/.test(original);

  const merchantSource: Parameters<typeof score>[0]['merchantSource'] =
    merch.merchant_raw ? 'extracted'
      : merch.missing_merchant ? 'missing'
        : isPurchase ? 'missing' : 'na';

  const reviewFlags: string[] = [];
  if (merch.missing_merchant) reviewFlags.push('missing_merchant');
  if (amt.amountConflict) reviewFlags.push('amount_conflict');
  if (mixedScript) reviewFlags.push('mixed_script');
  if (own.hits.length >= 2 && !own.isInternalTransfer && !fromHit?.ownedAccountId && !toHit?.ownedAccountId) {
    reviewFlags.push('unknown_transfer');
  }

  const sc = score({
    amountFound: amt.amount !== null,
    amountConflict: amt.amountConflict,
    amountNearVerb,
    classHard: messageClass !== 'unknown',
    classFinal: messageClass,
    merchantSource,
    channelExplicit: channel !== null,
    last4Hits: mapped as Last4Hit[],
    isPurchase,
    timestampParsed: ts.parsed,
  });

  // For non-transfers: a "from" hit (e.g. "من بطاقة...رقم 7959") is actually
  // the user's own card/account. Map it to source_card or source_account.
  const effectiveCardHit = cardHit
    ?? (messageClass !== 'transfer' && fromHit ? fromHit : null);
  const effectiveAcctHit = acctHit
    ?? (messageClass !== 'transfer' && !effectiveCardHit && fromHit ? fromHit : null);

  return {
    message_class: messageClass,
    should_create_transaction: messageClass !== 'unknown' && amt.amount !== null,
    should_route_to_offers_feed: false,

    amount: amt.amount,
    currency: amt.currency || ctx.defaultCurrency || 'SAR',
    timestamp: ts.timestamp,

    institution_name: inst.institution_name,
    merchant_raw: merch.merchant_raw,
    merchant_normalized: null,
    descriptor: extractDescriptor(original),
    channel,
    country: inst.country ?? ctx.defaultCountry ?? null,

    source_account_last4: messageClass !== 'transfer' ? (effectiveAcctHit?.digits ?? null) : null,
    source_card_last4:    messageClass !== 'transfer' ? (effectiveCardHit?.digits ?? null) : null,
    from_last4: messageClass === 'transfer' ? (fromHit?.digits ?? null) : null,
    to_last4:   messageClass === 'transfer' ? (toHit?.digits ?? null)   : null,
    counterparty_name: counterparty,

    ignored_values: amt.ignored,
    confidence: round2(sc.total),
    parse_reason: buildReason(messageClass, sc.total, reviewFlags),
    review_flags: reviewFlags,
    parser_source: 'rules',
  };
}

function extractDescriptor(text: string): string | null {
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0 && l.length < 80);
  if (!firstLine) return null;
  if (/[\d,]+(\.\d+)?\s*(SAR|EGP|AED|USD|ر\.?س)/i.test(firstLine)) return null;
  return firstLine;
}

function buildReason(cls: MessageClass, conf: number, flags: string[]): string {
  const base = `${cls}, conf=${conf.toFixed(2)}`;
  if (flags.length === 0) return base;
  return `${base} flags=${flags.join(',')}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
