import { format } from 'date-fns';
import type { TransactionType, ParsedTransaction } from '../types/index';

// ─── Parsed SMS result ───────────────────────────────────────────────

export interface ParsedSMS {
  amount: number;
  type: 'income' | 'expense';
  merchant: string | null;
  counterparty: string | null;
  description: string;
  date: string; // YYYY-MM-DD
  rawText: string;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Currency patterns (MENA + common) ───────────────────────────────

const CURRENCY_SYMBOLS = [
  'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD',
  'USD', 'EUR', 'GBP', 'LE', 'ج.م', 'جم', 'جنيه', 'ر.س', 'ريال', 'د.إ', 'درهم',
];

const CURRENCY_PATTERN = CURRENCY_SYMBOLS.map((s) =>
  s.replace(/\./g, '\\.'),
).join('|');

// ─── Amount extraction ───────────────────────────────────────────────

const BIDI_MARKS_RE = /[‎‏‪-‮⁦-⁩﻿]/g;
const AMOUNT_HINT_RE = /(amount|مبلغ|بقيمة|قيمة|سداد|payment|paid|خصم|تحويل)/i;
const BALANCE_HINT_RE = /(remaining|available|limit|balance|المتبقي|الرصيد|حد الصرف|الصرف المتبقي)/i;
const MASKED_LAST4_RE = /\*+\s*(\d{4})(?!\d)|(\d{4})\s*\*+|(?:رقم|no\.?)\s+(\d{4})(?!\d)/gi;

const EXPLICIT_AMOUNT_RE = new RegExp(
  `(?:amount|مبلغ|بقيمة|قيمة|سداد)\\s*[:\\-]?\\s*(?:${CURRENCY_PATTERN}\\s*)?([\\d,]+\\.?\\d*)`,
  'i',
);

const CURRENCY_BEFORE_RE = new RegExp(
  `(?:${CURRENCY_PATTERN})\\s*([\\d,]+\\.?\\d*)`,
  'gi',
);

const CURRENCY_AFTER_RE = new RegExp(
  `([\\d,]+\\.?\\d*)\\s*(?:${CURRENCY_PATTERN})`,
  'gi',
);

const STANDALONE_NUMBER_RE = /(\d[\d,]*\.?\d*)/g;
const STRUCTURE_MARKERS: RegExp[] = [
  /(سداد\s+بطاق(?:ة|ه)\s+ائتمان(?:ية|يه)?)/gi,
  /((?:من|from)\s*حساب)/gi,
  /((?:الى|إلى|to)\s*بطاق[ةت]\w*)/gi,
  /((?:الى|إلى|to)\s*حساب\w*)/gi,
  /((?:مبلغ|amount|بقيمة|value))/gi,
  /((?:في)\s*\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+\d{1,2}:\d{2})?)/gi,
  /((?:الصرف|حد\s+الصرف|الرصيد)\s*المتبقي|remaining\s+balance|available\s+balance)/gi,
];

const BALANCE_SEGMENT_RE = /(?:الصرف\s*المتبقي|حد\s*الصرف\s*المتبقي|الرصيد\s*المتبقي|remaining(?:\s+balance)?|available(?:\s+balance)?|balance|limit)\s*[:\-]?\s*(?:[A-Za-z\u0600-\u06FF$.]+\s*)?\d[\d,]*(?:\.\d{1,2})?/gi;
const BALANCE_SEGMENT_REVERSED = /(?:[A-Za-z\u0600-\u06FF$.]+\s*)?\d[\d,]*(?:\.\d{1,2})?\s*(?:الصرف\s*المتبقي|حد\s*الصرف\s*المتبقي|الرصيد\s*المتبقي|remaining(?:\s+balance)?|available(?:\s+balance)?)/gi;

/** Convert Eastern Arabic numerals (٠-٩) to Western (0-9). */
function normalizeArabicDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function normalizeSmsText(text: string): string {
  let normalized = normalizeArabicDigits(text).replace(BIDI_MARKS_RE, '');
  // Strip Arabic tatweel (kashida) that glues prefixes to digits (e.g. بـ200 → ب 200)
  normalized = normalized.replace(/\u0640/g, ' ');
  normalized = normalized.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ');
  // Insert space at Arabic↔Latin/digit boundaries where providers strip newlines
  normalized = normalized.replace(/([\u0600-\u06FF])([A-Za-z0-9])/g, '$1 $2');
  normalized = normalized.replace(/([A-Za-z0-9])([\u0600-\u06FF])/g, '$1 $2');
  for (const marker of STRUCTURE_MARKERS) {
    normalized = normalized.replace(marker, '\n$1');
  }
  return normalized
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n[ ]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function toPositiveNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const num = parseFloat(raw.replace(/,/g, ''));
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function removeBalanceSegments(text: string): string {
  return text
    .replace(BALANCE_SEGMENT_RE, ' ')
    .replace(BALANCE_SEGMENT_REVERSED, ' ');
}

function isMaskedLast4Context(text: string, index: number, raw: string): boolean {
  const before = Math.max(0, index - 12);
  const after = Math.min(text.length, index + raw.length + 12);
  const window = text.slice(before, after);
  if (/\*+\s*\d{4}(?!\d)|\d{4}\s*\*+/.test(window)) return true;
  if (/^\d{4}$/.test(raw) && /(?:حساب|بطاق|account|card|من|الى|إلى|from|to)/i.test(window)) {
    return true;
  }
  return false;
}

function isBalanceContext(text: string, index: number, raw: string): boolean {
  const before = Math.max(0, index - 24);
  const after = Math.min(text.length, index + raw.length + 24);
  return BALANCE_HINT_RE.test(text.slice(before, after));
}

function extractAmount(text: string): number | null {
  const normalized = normalizeSmsText(text);
  const scrubbed = removeBalanceSegments(normalized);

  // Second preference: currency-adjacent numbers, in text order.
  const candidates: Array<{ value: number; index: number; raw: string }> = [];
  CURRENCY_BEFORE_RE.lastIndex = 0;
  CURRENCY_AFTER_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CURRENCY_BEFORE_RE.exec(scrubbed)) !== null) {
    const raw = match[1];
    const value = toPositiveNumber(raw);
    if (value !== null && !isMaskedLast4Context(scrubbed, match.index, raw)) {
      candidates.push({ value, index: match.index, raw });
    }
  }
  while ((match = CURRENCY_AFTER_RE.exec(scrubbed)) !== null) {
    const raw = match[1];
    const value = toPositiveNumber(raw);
    if (value !== null && !isMaskedLast4Context(scrubbed, match.index, raw)) {
      candidates.push({ value, index: match.index, raw });
    }
  }

  if (candidates.length > 0) {
    const usable = candidates.filter((c) => !isBalanceContext(scrubbed, c.index, c.raw));
    const pool = usable.length > 0 ? usable : candidates;
    pool.sort((a, b) => a.index - b.index);
    const hinted = pool.find((c) => {
      const before = scrubbed.slice(Math.max(0, c.index - 28), c.index);
      return AMOUNT_HINT_RE.test(before);
    });
    if (hinted) return hinted.value;
    return pool[0].value;
  }

  // Third preference: explicit amount marker ("مبلغ", "amount", ...).
  const explicit = EXPLICIT_AMOUNT_RE.exec(scrubbed);
  if (explicit && explicit.index !== undefined) {
    const raw = explicit[1];
    const value = toPositiveNumber(raw);
    if (
      value !== null
      && !isMaskedLast4Context(scrubbed, explicit.index, raw)
      && !isBalanceContext(scrubbed, explicit.index, raw)
    ) {
      return value;
    }
  }

  // Fallback: largest standalone numeric token that looks monetary.
  let best: number | null = null;
  STANDALONE_NUMBER_RE.lastIndex = 0;
  while ((match = STANDALONE_NUMBER_RE.exec(scrubbed)) !== null) {
    const raw = match[1];
    if (isMaskedLast4Context(scrubbed, match.index ?? 0, raw)) continue;
    if (isBalanceContext(scrubbed, match.index ?? 0, raw)) continue;
    const num = toPositiveNumber(raw);
    // Skip: NaN, zero, negative, numbers > 1M (likely refs), numbers
    // with 7+ consecutive digits without separators (phone/ref numbers)
    if (num === null || num >= 1_000_000) continue;
    if (/^\d{7,}$/.test(raw)) continue; // 7+ unbroken digits = reference
    if (best === null || num > best) {
      best = num;
    }
  }

  return best;
}

// ─── Transaction type detection ──────────────────────────────────────

const EXPENSE_KEYWORDS = [
  // English
  'purchase', 'spent', 'paid', 'payment', 'debit', 'deducted',
  'withdrawn', 'withdrawal', 'charged', 'debited', 'pos',
  'buy', 'bought', 'sale', 'bill', 'card purchase',
  // Arabic
  'شراء', 'سحب', 'خصم', 'دفع', 'مشتريات', 'نقطة بيع',
  'حولت', 'بعت', 'ارسلت', 'دفعت', 'حوّلت',
];

const INCOME_KEYWORDS = [
  // English — avoid bare "credit" which false-matches "credit card"
  'received', 'credited to', 'deposit', 'salary',
  'transfer in', 'incoming', 'refund', 'cash back', 'cashback',
  // Arabic — avoid bare "ائتمان" which false-matches "بطاقة ائتمانية" (credit card)
  'إيداع', 'تحويل وارد', 'راتب', 'استرداد',
  'حولي', 'حوّل لي', 'حوّلي', 'بعتلي', 'بعت لي', 'ارسل لي', 'ارسلي', 'وصلي', 'وصل لي', 'جالي', 'جا لي',
];

const TRANSFER_KEYWORDS = [
  // English
  'transfer to', 'transfer from', 'moved to', 'internal transfer',
  'transferred to', 'transferred from',
  // Arabic
  'تحويل إلى', 'تحويل من', 'نقل إلى', 'تحويل لحظي', 'تحويل بنكي',
];

const ARABIC_BANK_TRANSFER = [
  'تحويل لحظي',   // instant transfer
  'تحويل بنكي',   // bank transfer
  'تم تحويل',     // was transferred
  'تحويل إلى حساب', // transfer to account
  'تحويل من حساب', // transfer from account
];

// Arabic personal transfer verbs — check before generic expense keywords
// because "حولي" contains "حول" which could false-match elsewhere
const ARABIC_INCOME_VERBS = [
  'حولي', 'حوّل لي', 'حوّلي', 'بعتلي', 'بعت لي',
  'ارسل لي', 'ارسلي', 'وصلي', 'وصل لي', 'جالي', 'جا لي',
];

const CARD_SETTLEMENT_TRANSFER_RE = /(سداد\s+بطاق(?:ة|ه)\s+ائتمان(?:ية|يه)?|(?:من|from)\s+حساب.*(?:إلى|الى|to)\s+بطاق)/i;

interface DirectionalLast4 {
  from_last4: string | null;
  to_last4: string | null;
}

function extractDirectionalLast4(text: string): DirectionalLast4 {
  const fromMatch =
    text.match(/(?:من|from)\s*(?:حساب\w*|account\w*|بطاق[ةت]\w*|card\w*)?\s*[:\-]?\s*(?:\*+\s*(\d{4})|(?:رقم|no\.?)\s+(\d{4}))/i)
    ?? text.match(/(?:بطاق[ةت]\w*|card\w*)\s*(?:الخصم\s+)?(?:المباشر\s+)?(?:رقم|no\.?)\s+(\d{4})/i)
    ?? text.match(/\*+\s*(\d{4})\s*(?=(?:من|from)\s*(?:حساب|account|بطاق|card))/i);
  const toMatch =
    text.match(/(?:إلى|الى|to)\s*(?:حساب\w*|account\w*|بطاق[ةت]\w*|card\w*)?\s*[:\-]?\s*(?:\*+\s*(\d{4})|(?:رقم|no\.?)\s+(\d{4}))/i)
    ?? text.match(/\*+\s*(\d{4})\s*(?=(?:إلى|الى|to)\s*(?:حساب|account|بطاق|card))/i);

  let from = fromMatch?.[1] ?? fromMatch?.[2] ?? null;
  let to = toMatch?.[1] ?? toMatch?.[2] ?? null;

  const hasDirectionalCue = /(?:من|from|إلى|الى|to)\s*(?:حساب|account|بطاق|card)/i.test(text);
  if ((!from || !to) && hasDirectionalCue) {
    const masked = Array.from(text.matchAll(MASKED_LAST4_RE))
      .map((m) => m[1] ?? m[2] ?? m[3] ?? null)
      .filter((x): x is string => !!x);
    if (!from && masked.length >= 1) from = masked[0];
    if (!to && masked.length >= 2) to = masked[1];
  }

  return {
    from_last4: from,
    to_last4: to,
  };
}

// ─── Arabic bank SMS direction detection ─────────────────────────────
// Bank SMS uses formal phrases like "تم إضافة" (has been added) or "تم خصم" (deducted).
// These have absolute priority over generic keywords because compound words like
// "مسبقة الدفع" (prepaid) contain "دفع" (pay) which would falsely trigger expense.
//
// Examples:
//   "تم إضافة تحويل لحظي لبطاقتكم مسبقة الدفع بمبلغ 400.00 جم من HANA ..." → income
//   "احمد حولي 150 جنيه" → income (casual verb)
//   "حولت 300 جنيه لأحمد" → expense (casual verb)
//   "تم خصم 200 جنيه" → expense (bank SMS)
//   "تم إضافة 1000 جنيه لحسابكم" → income (bank SMS)

const ARABIC_BANK_INCOMING = [
  'تم إضافة',    // has been added
  'تم اضافة',    // alternate spelling
  'تم استلام',   // has been received
  'تم ايداع',    // has been deposited
  'تم إيداع',    // has been deposited (alt)
];

const ARABIC_BANK_OUTGOING = [
  'تم خصم',      // has been deducted
  'تم إرسال',    // has been sent
  'تم ارسال',    // alternate spelling
  'تم الدفع',    // payment was made (full phrase, not just دفع)
  'تم السحب',    // withdrawal was made
  'تم سحب',      // was withdrawn
];

// Contextual cues reinforcing direction (secondary priority)
const ARABIC_INCOMING_CONTEXT = [
  'لبطاقتكم', 'لبطاقتك', 'لحسابكم', 'لحسابك',
  'إلى بطاقتكم', 'الى بطاقتكم', 'إلى حسابكم', 'الى حسابكم',
];

const ARABIC_OUTGOING_CONTEXT = [
  'من حسابكم', 'من حسابك', 'من بطاقتكم', 'من بطاقتك',
];

/**
 * Extract counterparty (person name) from Arabic bank SMS.
 * Income: name after "من" (from), excluding possessive "من حسابكم/بطاقتكم".
 * Expense: name after "إلى/الى" (to), excluding possessive.
 */
function extractBankSMSCounterparty(
  text: string,
  direction: 'income' | 'expense',
): string | null {
  if (direction === 'income') {
    const match = text.match(
      /من\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم|خلال)([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.]{2,50}?)(?:\s+رقم|\s+يوم|\s+بتاريخ|\s+في\b|\s*$)/,
    );
    return match?.[1]?.trim() ?? null;
  }
  if (direction === 'expense') {
    const match = text.match(
      /(?:إلى|الى)\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم)([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.]{2,50}?)(?:\s+رقم|\s+يوم|\s+بتاريخ|\s+في\b|\s*$)/,
    );
    return match?.[1]?.trim() ?? null;
  }
  return null;
}

function detectType(text: string): 'income' | 'expense' {
  const lower = text.toLowerCase();
  // 1. Arabic bank SMS patterns — absolute priority
  for (const kw of ARABIC_BANK_INCOMING) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of ARABIC_BANK_OUTGOING) {
    if (lower.includes(kw)) return 'expense';
  }
  // 2. Arabic bank contextual cues
  for (const kw of ARABIC_INCOMING_CONTEXT) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of ARABIC_OUTGOING_CONTEXT) {
    if (lower.includes(kw)) return 'expense';
  }
  // 3. Arabic personal income verbs
  for (const kw of ARABIC_INCOME_VERBS) {
    if (lower.includes(kw)) return 'income';
  }
  // 4. Generic keywords — expense first (شراء is unambiguous)
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'expense';
  }
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'income';
  }
  return 'expense';
}

function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();
  const directional = extractDirectionalLast4(text);
  if (directional.from_last4 && directional.to_last4) {
    return 'transfer';
  }

  // Credit-card settlement messages ("سداد بطاقة ائتمانية ... من حساب ... إلى بطاقة ...")
  // should be treated as transfers, not card purchases.
  if (CARD_SETTLEMENT_TRANSFER_RE.test(lower)) {
    return 'transfer';
  }

  // 1. Arabic bank TRANSFER patterns — highest priority (must come before income/expense)
  for (const kw of ARABIC_BANK_TRANSFER) {
    if (lower.includes(kw)) {
      // Determine direction from context
      for (const inc of ARABIC_INCOMING_CONTEXT) {
        if (lower.includes(inc)) return 'transfer'; // incoming transfer
      }
      for (const inc of ARABIC_BANK_INCOMING) {
        if (lower.includes(inc)) return 'transfer'; // added = incoming transfer
      }
      return 'transfer'; // default for bank transfer SMS
    }
  }
  // 2. Check generic transfer keywords early
  for (const kw of TRANSFER_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'transfer';
  }
  // Also detect "تحويل" (transfer) in SMS that also mentions deduction/addition
  if (lower.includes('تحويل')) {
    return 'transfer';
  }
  // 3. Arabic bank SMS patterns — income / expense
  for (const kw of ARABIC_BANK_INCOMING) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of ARABIC_BANK_OUTGOING) {
    if (lower.includes(kw)) return 'expense';
  }
  // 4. Arabic bank contextual cues
  for (const kw of ARABIC_INCOMING_CONTEXT) {
    if (lower.includes(kw)) return 'income';
  }
  for (const kw of ARABIC_OUTGOING_CONTEXT) {
    if (lower.includes(kw)) return 'expense';
  }
  // 5. Arabic personal income verbs
  for (const kw of ARABIC_INCOME_VERBS) {
    if (lower.includes(kw)) return 'income';
  }
  // 6. Generic keyword layers — check expense FIRST since verbs like
  // شراء (purchase) are unambiguous, while income keywords can false-match.
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'expense';
  }
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'income';
  }
  return 'expense';
}

// ─── Merchant extraction ─────────────────────────────────────────────

// Terminators that follow a merchant name in Arabic/English SMS.
// Important for Arabic SMS like "عند BEET ELGOMLA يوم 15/04..." where
// "يوم" (on/day), "بتاريخ" (on date), "الساعه" (at time) end the merchant.
// Also ends on ISO country code ("في SA", "في AE") used in Saudi bank SMS.
const MERCHANT_TERMINATORS =
  '(?:\\s+on\\b|\\s+ref\\b|\\s+at\\s+\\d|\\s+يوم\\b|\\s+بتاريخ\\b|\\s+الساعه\\b|\\s+الساعة\\b|\\s+في\\s*[:：]?\\s*\\d|\\s+في\\s*[:：]?\\s*[A-Z]{2}\\b|\\s+بمبلغ\\b|\\s+كود\\b|\\s+رقم\\b|\\s+المتاح\\b|\\s+للمزيد\\b|\\s*[.,]|\\s*$)';

const MERCHANT_PATTERNS = [
  // Field-style merchant line that may appear inline with other labels:
  // "من: HUNGERSTATION LLC في: SA ..."
  /(?:من|from|merchant)\s*[:：]\s*([A-Za-z0-9\u0600-\u06FF][A-Za-z0-9\u0600-\u06FF\s&'._\-]{1,80}?)(?=\s+(?:في|بتاريخ|on|date|time|مبلغ|amount|بطاق|card|حد|available|remaining|الرصيد)|\s*$)/i,
  // "at MERCHANT" / "عند MERCHANT" — highest priority merchant prepositions
  new RegExp(
    `(?:at|عند|لدى)\\s*[:\\-]?\\s+(?!بطاق|حساب|account|card)([A-Za-z0-9\\u0600-\\u06FF][A-Za-z0-9\\u0600-\\u06FF\\s&'._*\\-]{1,60}?)${MERCHANT_TERMINATORS}`,
    'i',
  ),
  // "from MERCHANT" / "من MERCHANT" — skip card/account contexts
  new RegExp(
    `(?:from|من)\\s*[:\\-]?\\s+(?!بطاق|حساب|account|card)([A-Za-z0-9\\u0600-\\u06FF][A-Za-z0-9\\u0600-\\u06FF\\s&'._*\\-]{1,60}?)${MERCHANT_TERMINATORS}`,
    'i',
  ),
  // Egyptian bank style: "By Mobile payment عند BEET ELGOMLA" → captured via عند above.
  // Standalone "By <Method>" is NOT a merchant — skip.
  // "to MERCHANT_NAME"
  new RegExp(
    `(?:to|إلى)\\s+([A-Za-z0-9\\u0600-\\u06FF][A-Za-z0-9\\u0600-\\u06FF\\s&'._\\-]{1,60}?)${MERCHANT_TERMINATORS}`,
    'i',
  ),
  // "Merchant: NAME"
  /(?:merchant|store|shop|التاجر)[:\s]+([A-Za-z0-9\u0600-\u06FF][A-Za-z0-9\u0600-\u06FF\s&'._-]{1,60})/i,
];

// Noise fragments that sometimes get captured as a merchant name.
// Includes payment rails (Apple Pay, mada), card-number patterns, and
// Gulf bank names that appear after "من" but are the issuing bank, not
// the actual merchant.
const MERCHANT_NOISE = [
  /^mobile\s+payment$/i,
  /^pos$/i,
  /^card$/i,
  /^online$/i,
  /^transfer$/i,
  /^بطاقة/i,          // Arabic "card..."
  /^حساب/i,          // Arabic "account..."
  /^\*?\d+\*?$/,      // Card/acct numbers like "*3452", "7402*"
  // Payment rails — never real merchants
  /^(?:apple\s*pay|google\s*pay|samsung\s*pay|mada|stc\s*pay|urpay)$/i,
  // Gulf & MENA banks — issuer, not merchant
  /^(?:stc\s*bank|alrajhi|al\s*rajhi|snb|anb|sab|riyad\s*bank|albilad|al\s*bilad|aljazira|al\s*jazira|saib|bsf|emirates\s*nbd|enbd|adcb|fab|cbd|rakbank|nbd|qnb|cib|banque\s*misr|nbe|alexbank|aib)$/i,
];

function cleanMerchant(raw: string): string | null {
  // Strip trailing corporate suffixes that banks append to the merchant
  // name ("HUNGERSTATION LLC", "Carrefour L.L.C.") — noisy for display.
  const trimmed = raw
    .trim()
    .replace(/\s+/g, ' ')
    // Strip payment gateway prefixes: "GEIDEA*BOBA HOUSE" → "BOBA HOUSE"
    .replace(/^(?:GEIDEA|FOODICS|SUMUP|MOYASAR|HYPERPAY|TELR|PAYFORT|PAYTABS|TAP|CHECKOUT)\s*[*\-]\s*/i, '')
    .replace(/\s+(?:llc|l\.l\.c\.?|ltd|inc|co\.?|company|corp(?:oration)?)\.?$/i, '')
    .trim();
  if (trimmed.length < 2) return null;
  if (/^\d+$/.test(trimmed)) return null;
  if (MERCHANT_NOISE.some((re) => re.test(trimmed))) return null;
  return trimmed;
}

function extractMerchant(text: string): string | null {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const cleaned = cleanMerchant(match[1]);
      if (cleaned) return cleaned;
    }
  }
  return null;
}

// ─── Date extraction ─────────────────────────────────────────────────

const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/,
  // YYYY-MM-DD
  /(\d{4})-(\d{2})-(\d{2})/,
  // DD/MM/YY
  /(\d{1,2})[/\-](\d{1,2})[/\-](\d{2})\b/,
];

function extractDate(text: string): string {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Check if first group is a 4-digit year (YYYY-MM-DD)
      if (match[1].length === 4) {
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      }
      // DD/MM/YYYY
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
  }
  // Default to today
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── Reference number extraction ─────────────────────────────────────

const REFERENCE_PATTERNS = [
  // English patterns
  /(?:ref(?:erence)?[\s.:#]*(?:no\.?|number)?[\s:#]*)([\w\-]{4,30})/i,
  /(?:transaction[\s.:#]*(?:id|no\.?|number)?[\s:#]*)([\w\-]{4,30})/i,
  /(?:trx[\s.:#]*(?:id|no\.?)?[\s:#]*)([\w\-]{4,30})/i,
  /(?:approval[\s.:#]*(?:code|no\.?)?[\s:#]*)([\w\-]{4,20})/i,
  /(?:auth[\s.:#]*(?:code|no\.?)?[\s:#]*)([\w\-]{4,20})/i,
  // Arabic patterns
  /(?:رقم[\s]*(?:مرجعي|المرجع|العملية|المعاملة|التحويل)[\s:#]*)([\w\-]{4,30})/i,
  /(?:مرجع[\s:#]*)([\w\-]{4,30})/i,
  // Generic "For/In/عند" preceded by a ref-like code
  /(?:(?:For|In|عند|at)\s+)([A-Z0-9]{6,20})/i,
];

export function extractReferenceNumber(text: string): string | null {
  for (const pattern of REFERENCE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const ref = match[1].trim();
      // Must be at least 4 chars and not purely a monetary amount
      if (ref.length >= 4 && !/^\d+\.?\d*$/.test(ref)) {
        return ref;
      }
    }
  }
  return null;
}

// ─── Main parser ─────────────────────────────────────────────────────

export function parseSMS(text: string): ParsedSMS | null {
  if (!text || text.length < 10) return null;
  const normalizedText = normalizeSmsText(text);

  const amount = extractAmount(normalizedText);
  if (!amount) return null;

  const type = detectType(normalizedText);
  const merchant = extractMerchant(normalizedText);
  const date = extractDate(normalizedText);

  // Extract counterparty from Arabic bank SMS
  const counterparty = extractBankSMSCounterparty(normalizedText, type);

  // Build a description — prefer counterparty over merchant for P2P
  const person = counterparty || merchant;
  const description = person
    ? `${type === 'income' ? 'Received from' : 'Payment to'} ${person}`
    : type === 'income'
      ? 'Incoming transfer'
      : 'Card payment';

  // Confidence scoring
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (amount && (merchant || counterparty)) confidence = 'high';
  else if (amount) confidence = 'medium';

  return {
    amount,
    type,
    merchant: counterparty ? null : merchant,
    counterparty,
    description,
    date,
    rawText: text,
    confidence,
  };
}

// ─── Category suggestion based on taxonomy aliases ───────────────────

import {
  FLATTENED_SUBCATEGORIES,
  type FlattenedTaxonomySubcategory,
} from '../constants/category-taxonomy';

/** Match SMS text against taxonomy aliases. Returns the best subcategory key. */
export function suggestCategory(text: string): string | null {
  const lower = text.toLowerCase();
  let bestMatch: FlattenedTaxonomySubcategory | null = null;
  let bestLength = 0;

  for (const sub of FLATTENED_SUBCATEGORIES) {
    if (!sub.aliases) continue;
    for (const alias of sub.aliases) {
      if (lower.includes(alias.toLowerCase()) && alias.length > bestLength) {
        bestMatch = sub;
        bestLength = alias.length;
      }
    }
  }

  return bestMatch?.parentLabel ?? null;
}

/** Like suggestCategory but returns the taxonomy subcategory key instead of a label. */
export function suggestCategoryKey(text: string): string | null {
  const lower = text.toLowerCase();
  let bestKey: string | null = null;
  let bestLength = 0;

  for (const sub of FLATTENED_SUBCATEGORIES) {
    if (!sub.aliases) continue;
    for (const alias of sub.aliases) {
      if (lower.includes(alias.toLowerCase()) && alias.length > bestLength) {
        bestKey = sub.key;
        bestLength = alias.length;
      }
    }
  }

  return bestKey;
}

// ─── Enhanced SMS parser with confidence scoring ─────────────────────

function computeConfidence(
  amount: number | null,
  transactionType: TransactionType,
  merchant: string | null,
  text: string,
): { confidence: number; needsReview: boolean; reviewReason: string | null } {
  let score = 0.5; // base score
  const reasons: string[] = [];

  // Amount found
  if (amount && amount > 0) {
    score += 0.2;
  } else {
    reasons.push('Missing or unclear amount');
  }

  // Merchant found
  if (merchant) {
    score += 0.15;
  } else {
    reasons.push('Unknown merchant');
  }

  // Type was explicitly matched (not default)
  const lower = text.toLowerCase();
  const allKeywords = [...EXPENSE_KEYWORDS, ...INCOME_KEYWORDS, ...TRANSFER_KEYWORDS];
  const hasExplicitMatch =
    allKeywords.some((kw) => lower.includes(kw.toLowerCase()))
    || CARD_SETTLEMENT_TRANSFER_RE.test(lower);
  if (hasExplicitMatch) {
    score += 0.15;
  } else {
    reasons.push('Transaction type unclear');
  }

  // Cap at 1.0
  const confidence = Math.min(score, 1.0);
  const needsReview = confidence < 0.7;
  const reviewReason = reasons.length > 0 ? reasons.join('; ') : null;

  return { confidence, needsReview, reviewReason };
}

export function parseSmsToTransaction(message: string): ParsedTransaction | null {
  if (!message || message.length < 10) return null;
  const normalizedMessage = normalizeSmsText(message);

  const amount = extractAmount(normalizedMessage);
  if (!amount) return null;

  const directional = extractDirectionalLast4(normalizedMessage);
  const transactionType = detectTransactionType(normalizedMessage);
  const merchant = extractMerchant(normalizedMessage);
  const date = extractDate(normalizedMessage);

  // Extract counterparty — map transaction_type to income/expense for extraction
  const directionForCounterparty = transactionType === 'income' ? 'income' : 'expense';
  const counterparty = extractBankSMSCounterparty(normalizedMessage, directionForCounterparty);

  // Build description — prefer counterparty over merchant for P2P
  const person = counterparty || merchant;
  const description = person
    ? transactionType === 'income'
      ? `Received from ${person}`
      : transactionType === 'transfer'
        ? `Transfer to ${person}`
        : `Payment to ${person}`
    : transactionType === 'income'
      ? 'Incoming transfer'
      : transactionType === 'transfer'
        ? 'Internal transfer'
        : 'Card payment';

  const { confidence, needsReview, reviewReason } = computeConfidence(
    amount,
    transactionType,
    counterparty ? null : merchant,
    normalizedMessage,
  );

  // Suggest a taxonomy subcategory based on merchant + raw text.
  // We combine the merchant into the haystack so brand names like
  // "BEET ELGOMLA" ("بيت الجملة") match grocery aliases.
  const haystack = [merchant ?? '', normalizedMessage].join(' ');
  const suggestedKey = suggestCategoryKey(haystack);
  const suggestedLabel = suggestedKey
    ? FLATTENED_SUBCATEGORIES.find((s) => s.key === suggestedKey)?.label ?? null
    : null;

  return {
    amount,
    transaction_type: transactionType,
    merchant: counterparty ? null : merchant,
    counterparty,
    from_last4: directional.from_last4,
    to_last4: directional.to_last4,
    description,
    date,
    parse_confidence: Math.round(confidence * 100) / 100,
    needs_review: needsReview,
    review_reason: reviewReason,
    rawText: message,
    suggested_category_key: suggestedKey,
    suggested_category_label: suggestedLabel,
  };
}
