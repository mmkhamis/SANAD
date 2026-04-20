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

const AMOUNT_PATTERNS = [
  // "SAR 1,234.56" or "EGP1234.56" or "1,234.56 SAR"
  new RegExp(
    `(?:${CURRENCY_PATTERN})\\s*([\\d,]+\\.?\\d*)`,
    'i',
  ),
  new RegExp(
    `([\\d,]+\\.?\\d*)\\s*(?:${CURRENCY_PATTERN})`,
    'i',
  ),
  // "Amount: 1234.56" or "Amount 1,234.56"
  /(?:amount|مبلغ|قيمة)[:\s]*([\d,]+\.?\d*)/i,
  // Standalone large number — comma-separated or plain digits (fallback)
  /(\d[\d,]*\.?\d*)/,
];

/** Convert Eastern Arabic numerals (٠-٩) to Western (0-9). */
function normalizeArabicDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function extractAmount(text: string): number | null {
  const normalized = normalizeArabicDigits(text);

  // ─── Phase 1: Currency-adjacent patterns (high confidence) ─────
  // These appear next to known currency symbols/words — trust them.
  let currencyMatch: number | null = null;
  for (let i = 0; i < AMOUNT_PATTERNS.length - 1; i++) {
    const pattern = AMOUNT_PATTERNS[i];
    const match = normalized.match(pattern);
    if (match?.[1]) {
      const cleaned = match[1].replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0 && (currencyMatch === null || num > currencyMatch)) {
        currencyMatch = num;
      }
    }
  }

  // If we found a currency-adjacent number, use it — don't let
  // standalone reference/phone numbers override it.
  if (currencyMatch !== null) {
    return currencyMatch;
  }

  // ─── Phase 2: Standalone number fallback (low confidence) ──────
  // Only used when no currency pattern matched. Pick the largest
  // number that looks monetary (skip dates, phone numbers, refs).
  let best: number | null = null;

  // Try the generic "Amount: 1234" pattern
  const lastPattern = AMOUNT_PATTERNS[AMOUNT_PATTERNS.length - 1];
  const fallbackMatch = normalized.match(lastPattern);
  if (fallbackMatch?.[1]) {
    const cleaned = fallbackMatch[1].replace(/,/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      best = num;
    }
  }

  // Scan all standalone numbers — skip those that look like refs/phones
  const allNumbers = normalized.matchAll(/(\d[\d,]*\.?\d*)/g);
  for (const m of allNumbers) {
    const raw = m[1];
    const cleaned = raw.replace(/,/g, '');
    const num = parseFloat(cleaned);
    // Skip: NaN, zero, negative, numbers > 1M (likely refs), numbers
    // with 7+ consecutive digits without separators (phone/ref numbers)
    if (isNaN(num) || num <= 0 || num >= 1_000_000) continue;
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
  // English
  'received', 'credited', 'credit', 'deposit', 'salary',
  'transfer in', 'incoming', 'refund', 'cash back', 'cashback',
  // Arabic
  'إيداع', 'تحويل وارد', 'راتب', 'استرداد', 'ائتمان',
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
  // 4. Generic keywords
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'income';
  }
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'expense';
  }
  return 'expense';
}

function detectTransactionType(text: string): TransactionType {
  const lower = text.toLowerCase();
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
  // 6. Generic keyword layers
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'income';
  }
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'expense';
  }
  return 'expense';
}

// ─── Merchant extraction ─────────────────────────────────────────────

// Terminators that follow a merchant name in Arabic/English SMS.
// Important for Arabic SMS like "عند BEET ELGOMLA يوم 15/04..." where
// "يوم" (on/day), "بتاريخ" (on date), "الساعه" (at time) end the merchant.
const MERCHANT_TERMINATORS =
  '(?:\\s+on\\b|\\s+ref\\b|\\s+at\\s+\\d|\\s+يوم\\b|\\s+بتاريخ\\b|\\s+الساعه\\b|\\s+الساعة\\b|\\s+في\\s+\\d|\\s+بمبلغ\\b|\\s+كود\\b|\\s+رقم\\b|\\s+المتاح\\b|\\s+للمزيد\\b|\\s*[.,]|\\s*$)';

const MERCHANT_PATTERNS = [
  // "at MERCHANT_NAME" / "from MERCHANT_NAME" / "عند MERCHANT"
  new RegExp(
    `(?:at|from|عند|لدى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)${MERCHANT_TERMINATORS}`,
    'i',
  ),
  // Egyptian bank style: "By Mobile payment عند BEET ELGOMLA" → captured via عند above.
  // Standalone "By <Method>" is NOT a merchant — skip.
  // "to MERCHANT_NAME"
  new RegExp(
    `(?:to|إلى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)${MERCHANT_TERMINATORS}`,
    'i',
  ),
  // "Merchant: NAME"
  /(?:merchant|store|shop|التاجر)[:\s]+([A-Za-z0-9][A-Za-z0-9\s&'._-]{1,60})/i,
];

// Noise fragments that sometimes get captured as a merchant name.
const MERCHANT_NOISE = [
  /^mobile\s+payment$/i,
  /^pos$/i,
  /^card$/i,
  /^online$/i,
  /^transfer$/i,
  /^بطاقة/i,          // Arabic "card..."
  /^حساب/i,          // Arabic "account..."
];

function cleanMerchant(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
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

  const amount = extractAmount(text);
  if (!amount) return null;

  const type = detectType(text);
  const merchant = extractMerchant(text);
  const date = extractDate(text);

  // Extract counterparty from Arabic bank SMS
  const counterparty = extractBankSMSCounterparty(text, type);

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
  const hasExplicitMatch = allKeywords.some((kw) => lower.includes(kw.toLowerCase()));
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

  const amount = extractAmount(message);
  if (!amount) return null;

  const transactionType = detectTransactionType(message);
  const merchant = extractMerchant(message);
  const date = extractDate(message);

  // Extract counterparty — map transaction_type to income/expense for extraction
  const directionForCounterparty = transactionType === 'income' ? 'income' : 'expense';
  const counterparty = extractBankSMSCounterparty(message, directionForCounterparty);

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
    message,
  );

  // Suggest a taxonomy subcategory based on merchant + raw text.
  // We combine the merchant into the haystack so brand names like
  // "BEET ELGOMLA" ("بيت الجملة") match grocery aliases.
  const haystack = [merchant ?? '', message].join(' ');
  const suggestedKey = suggestCategoryKey(haystack);
  const suggestedLabel = suggestedKey
    ? FLATTENED_SUBCATEGORIES.find((s) => s.key === suggestedKey)?.label ?? null
    : null;

  return {
    amount,
    transaction_type: transactionType,
    merchant: counterparty ? null : merchant,
    counterparty,
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
