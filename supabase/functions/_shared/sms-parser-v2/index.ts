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
export { redactPII } from './redact-pii.ts';

// Hard debit verbs — absolute priority over income verb check.
// Unambiguous expense signals that can NEVER be income/transfer.
const HARD_DEBIT_RE = /(شراء|عمليه شراء|تم خصم|خصم\s+قسط|pos\b|purchase|نقطه بيع|transaction approved|cash out|merchant payment)/i;

// All Arabic patterns below use NORMALIZED forms (أ/إ/آ→ا, ة→ه, ى→ي, diacritics stripped)
// to match against the `lower` view from normalize().
//
// ── INCOME: unambiguous credit signals ──
// "ايداع" = deposit, "راتب/رواتب" = salary, "تم اضافه" = was added, etc.
const INCOME_VERB_RE = new RegExp([
  // Arabic compound (high confidence — check first)
  'تم اضافه', 'تم استلام', 'تم ايداع',
  'ايداع رواتب', 'ايداع راتب', 'ايداع نقدي',
  // Arabic single words (pure income — no transfer ambiguity)
  'ايداع', 'راتب', 'رواتب', 'مرتب', 'مرتبات',
  'اجر', 'اجور', 'معاش', 'مكافاه', 'بدل',
  // English
  'deposited', 'credited', 'salary', 'wage', 'payroll',
  'pension', 'bonus', 'allowance',
  // Arabic personal verbs (P2P incoming)
  'تم تحويل\\s+لك',
].join('|'), 'i');

// ── REFUND: explicit reverse/return signals ──
// MUST be checked BEFORE income because "reversal" + "credited" both appear in refund SMS
const REFUND_RE = /(refund|cashback|reverse|reversal|reversed|online reversal|تم استرجاع|استرجاع\s+مبلغ|استرداد\s+مبلغ|استرداد\s+نقدي)/i;

// ── TRANSFER: money movement between accounts ──
// "تحويل" = transfer, "حواله" = remittance, "سداد بطاقه" = card settlement
const TRANSFER_VERB_RE = new RegExp([
  // Arabic compound
  'تحويل لحظي', 'تحويل بنكي', 'تحويل صادر',
  'حواله صادره', 'حواله محليه', 'حواله دوليه', 'حواله سريعه',
  'سداد\\s+بطاق[هة]\\s*ائتمان', 'سداد\\s+بطاقه',
  'تم تحويل',
  // Arabic single (only "حواله" — "تحويل" needs structural context to avoid
  // false positives on "تحويل وارد" which is income)
  'حواله',
  // English
  'transfer', 'transferred', 'remittance',
  // Wallet patterns
  'top up', 'p2p transfer',
].join('|'), 'i');

// ── GOVERNMENT / BILL PAYMENT: expense with gov/utility context ──
// "سداد" alone is too broad (also matches card settlement). Require "فاتوره" or gov keywords.
const GOVT_PAYMENT_RE = /(مدفوعات|سداد\s+فاتور|دفع\s+فاتور|فاتوره|مخالف|غرامه|fine|penalty|violation|government payment|rent payment|tuition payment|bill paid|bank fee|fee\/charge)/i;

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

  // Class precedence (run against `lower` for normalized Arabic matching):
  //  0. Hard debit verbs FIRST — "شراء"/"خصم قسط" are NEVER transfers or income.
  //  1. Income verbs — "ايداع رواتب"/"راتب" beat generic transfer keywords.
  //     Without this, "ايداع" loses to "تحويل" if both appear in the message.
  //  2. Refund — explicit reverse/return verbs.
  //  3. Transfer — structural (from+to hits) or transfer keywords.
  //     "حوالة واردة" is a transfer, not income.
  //  4. Government/bill payment.
  //  5. Any remaining debit verb with an amount = purchase.
  let messageClass: MessageClass = 'unknown';
  if (HARD_DEBIT_RE.test(lower) && amt.amount !== null) messageClass = 'purchase';
  else if (REFUND_RE.test(lower)) messageClass = 'refund';
  else if (INCOME_VERB_RE.test(lower)) messageClass = 'income';
  else if (GOVT_PAYMENT_RE.test(lower) && amt.amount !== null) messageClass = 'purchase';
  else if (transfer || TRANSFER_VERB_RE.test(lower)) messageClass = 'transfer';
  else if (DEBIT_VERB_RE.test(lower) && amt.amount !== null) messageClass = 'purchase';

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

  // For transfers with only 'account' hits (no from/to role), infer direction
  // from "واردة/وارد" (incoming) vs "صادرة/صادر" (outgoing) keywords.
  const INCOMING_DIR_RE = /(وارده|وارد|incoming|received|تم استلام|تم اضافه)/i;
  const OUTGOING_DIR_RE = /(صادره|صادر|outgoing|sent)/i;
  let inferredFromHit = fromHit;
  let inferredToHit = toHit;
  if (messageClass === 'transfer' && !fromHit && !toHit && acctHit) {
    if (INCOMING_DIR_RE.test(lower)) {
      // Incoming transfer: the account is the destination (user's own)
      inferredToHit = acctHit;
    } else if (OUTGOING_DIR_RE.test(lower)) {
      // Outgoing transfer: the account is the source
      inferredFromHit = acctHit;
    } else {
      // Ambiguous direction — default to source (outgoing)
      inferredFromHit = acctHit;
    }
  }

  if (own.isInternalTransfer) messageClass = 'transfer';

  const verbIdx = original.toLowerCase().search(DEBIT_VERB_RE);
  const amountIdx = amt.amount !== null ? original.search(/\d/) : -1;
  const amountNearVerb = verbIdx !== -1 && amountIdx !== -1 && Math.abs(verbIdx - amountIdx) <= 80;
  const mixedScript = /[A-Za-z]/.test(original) && /[؀-ۿ]/.test(original);
  // Don't flag mixed_script when the only Latin chars are currency codes or common bank terms
  const latinOnly = original.replace(/\b(SAR|EGP|AED|USD|EUR|GBP|KWD|QAR|BHD|OMR|JOD|POS|ATM|PIN|OTP|SMS|STC|mada|MADA)\b/gi, '');
  const trueMixedScript = mixedScript && /[A-Za-z]{3,}/.test(latinOnly);

  const merchantSource: Parameters<typeof score>[0]['merchantSource'] =
    merch.merchant_raw ? 'extracted'
      : merch.missing_merchant ? 'missing'
        : isPurchase ? 'missing' : 'na';

  const reviewFlags: string[] = [];
  if (merch.missing_merchant) reviewFlags.push('missing_merchant');
  if (amt.amountConflict) reviewFlags.push('amount_conflict');
  if (trueMixedScript) reviewFlags.push('mixed_script');
  if (own.hits.length >= 2 && !own.isInternalTransfer && !inferredFromHit?.ownedAccountId && !inferredToHit?.ownedAccountId) {
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
    from_last4: messageClass === 'transfer' ? (inferredFromHit?.digits ?? null) : null,
    to_last4:   messageClass === 'transfer' ? (inferredToHit?.digits ?? null)   : null,
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
