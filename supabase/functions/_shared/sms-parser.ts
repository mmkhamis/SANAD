// Vendored, server-side subset of utils/sms-parser.ts for the ingest-sms
// Edge Function. Kept as a separate file (not imported from the app) because
// edge functions are deployed in isolation and cannot reach the project src.
// Behavior MUST mirror utils/sms-parser.ts → parseSmsToTransaction.
//
// This file purposefully does NOT import the full FLATTENED_SUBCATEGORIES
// taxonomy. Instead, the caller (ingest-sms/index.ts) passes an alias map
// derived from the user's own categories table at request time, which is
// both smaller and self-correcting per user.

export type ServerTxType = 'income' | 'expense' | 'transfer';

export interface ServerParsedSms {
  amount: number;
  transaction_type: ServerTxType;
  merchant: string | null;
  counterparty: string | null;
  description: string;
  date: string;          // YYYY-MM-DD
  parse_confidence: number;
  needs_review: boolean;
  review_reason: string | null;
  reference_number: string | null;
  rawText: string;
}

// ─── Currency / digits ──────────────────────────────────────────────

const CURRENCIES = [
  'SAR', 'AED', 'EGP', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD',
  'USD', 'EUR', 'GBP', 'LE',
  'ج.م', 'جم', 'جنيه', 'ر.س', 'ريال', 'د.إ', 'درهم',
];
const CURRENCY_RE = CURRENCIES.map((s) => s.replace(/\./g, '\\.')).join('|');

function normDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

function extractAmount(text: string): number | null {
  const t = normDigits(text);
  const patterns = [
    new RegExp(`(?:${CURRENCY_RE})\\s*([\\d,]+\\.?\\d*)`, 'i'),
    new RegExp(`([\\d,]+\\.?\\d*)\\s*(?:${CURRENCY_RE})`, 'i'),
    /(?:amount|مبلغ|قيمة)[:\s]*([\d,]+\.?\d*)/i,
  ];
  let best: number | null = null;
  for (const p of patterns) {
    const m = t.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(n) && n > 0 && (best === null || n > best)) best = n;
    }
  }
  if (best !== null) return best;

  // Fallback — largest plausible standalone number
  for (const m of t.matchAll(/(\d[\d,]*\.?\d*)/g)) {
    const raw = m[1];
    const n = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(n) || n <= 0 || n >= 1_000_000) continue;
    if (/^\d{7,}$/.test(raw)) continue;
    if (best === null || n > best) best = n;
  }
  return best;
}

// ─── Type detection ─────────────────────────────────────────────────

const ARABIC_BANK_TRANSFER = ['تحويل لحظي', 'تحويل بنكي', 'تم تحويل', 'تحويل إلى حساب', 'تحويل من حساب'];
const ARABIC_BANK_INCOMING = ['تم إضافة', 'تم اضافة', 'تم استلام', 'تم ايداع', 'تم إيداع'];
const ARABIC_BANK_OUTGOING = ['تم خصم', 'تم إرسال', 'تم ارسال', 'تم الدفع', 'تم السحب', 'تم سحب'];
const ARABIC_INCOMING_CTX = ['لبطاقتكم', 'لبطاقتك', 'لحسابكم', 'لحسابك', 'إلى بطاقتكم', 'الى بطاقتكم', 'إلى حسابكم', 'الى حسابكم'];
const ARABIC_OUTGOING_CTX = ['من حسابكم', 'من حسابك', 'من بطاقتكم', 'من بطاقتك'];
const ARABIC_INCOME_VERBS = ['حولي', 'حوّل لي', 'حوّلي', 'بعتلي', 'بعت لي', 'ارسل لي', 'ارسلي', 'وصلي', 'وصل لي', 'جالي', 'جا لي'];
const TRANSFER_KEYWORDS = ['transfer to', 'transfer from', 'moved to', 'internal transfer', 'transferred to', 'transferred from'];
const INCOME_KEYWORDS = ['received', 'credited', 'credit', 'deposit', 'salary', 'transfer in', 'incoming', 'refund', 'cash back', 'cashback', 'إيداع', 'تحويل وارد', 'راتب', 'استرداد', 'ائتمان'];
const EXPENSE_KEYWORDS = ['purchase', 'spent', 'paid', 'payment', 'debit', 'deducted', 'withdrawn', 'withdrawal', 'charged', 'debited', 'pos', 'buy', 'bought', 'sale', 'bill', 'card purchase', 'شراء', 'سحب', 'خصم', 'دفع', 'مشتريات', 'نقطة بيع'];

function detectType(text: string): ServerTxType {
  const lower = text.toLowerCase();
  for (const k of ARABIC_BANK_TRANSFER) if (lower.includes(k)) return 'transfer';
  for (const k of TRANSFER_KEYWORDS) if (lower.includes(k.toLowerCase())) return 'transfer';
  if (lower.includes('تحويل')) return 'transfer';
  for (const k of ARABIC_BANK_INCOMING) if (lower.includes(k)) return 'income';
  for (const k of ARABIC_BANK_OUTGOING) if (lower.includes(k)) return 'expense';
  for (const k of ARABIC_INCOMING_CTX) if (lower.includes(k)) return 'income';
  for (const k of ARABIC_OUTGOING_CTX) if (lower.includes(k)) return 'expense';
  for (const k of ARABIC_INCOME_VERBS) if (lower.includes(k)) return 'income';
  for (const k of INCOME_KEYWORDS) if (lower.includes(k.toLowerCase())) return 'income';
  for (const k of EXPENSE_KEYWORDS) if (lower.includes(k.toLowerCase())) return 'expense';
  return 'expense';
}

// ─── Merchant ───────────────────────────────────────────────────────

const MERCHANT_TERM = '(?:\\s+on\\b|\\s+ref\\b|\\s+at\\s+\\d|\\s+يوم\\b|\\s+بتاريخ\\b|\\s+الساعه\\b|\\s+الساعة\\b|\\s+في\\s+\\d|\\s+بمبلغ\\b|\\s+كود\\b|\\s+رقم\\b|\\s+المتاح\\b|\\s+للمزيد\\b|\\s*[.,]|\\s*$)';
const MERCHANT_NOISE = [
  /^mobile\s+payment$/i, /^pos$/i, /^card$/i, /^online$/i, /^transfer$/i,
  /^بطاقة/i, /^حساب/i,
];

function extractMerchant(text: string): string | null {
  const patterns = [
    new RegExp(`(?:at|from|عند|لدى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)${MERCHANT_TERM}`, 'i'),
    new RegExp(`(?:to|إلى)\\s+([A-Za-z0-9][A-Za-z0-9\\s&'._\\-]{1,60}?)${MERCHANT_TERM}`, 'i'),
    /(?:merchant|store|shop|التاجر)[:\s]+([A-Za-z0-9][A-Za-z0-9\s&'._-]{1,60})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    const raw = m?.[1]?.trim().replace(/\s+/g, ' ');
    if (!raw || raw.length < 2 || /^\d+$/.test(raw)) continue;
    if (MERCHANT_NOISE.some((re) => re.test(raw))) continue;
    return raw;
  }
  return null;
}

// ─── Counterparty (Arabic bank P2P) ─────────────────────────────────

function extractCounterparty(text: string, dir: 'income' | 'expense'): string | null {
  if (dir === 'income') {
    const m = text.match(
      /من\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم|خلال)([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.]{2,50}?)(?:\s+رقم|\s+يوم|\s+بتاريخ|\s+في\b|\s*$)/,
    );
    return m?.[1]?.trim() ?? null;
  }
  const m = text.match(
    /(?:إلى|الى)\s+(?!حسابك|بطاقتك|حسابكم|بطاقتكم)([A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.]{2,50}?)(?:\s+رقم|\s+يوم|\s+بتاريخ|\s+في\b|\s*$)/,
  );
  return m?.[1]?.trim() ?? null;
}

// ─── Date ───────────────────────────────────────────────────────────

function extractDate(text: string): string {
  const patterns = [
    /(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/,
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{1,2})[/\-](\d{1,2})[/\-](\d{2})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (!m) continue;
    if (m[1].length === 4) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return new Date().toISOString().slice(0, 10);
}

// ─── Reference number ───────────────────────────────────────────────

const REF_PATTERNS = [
  /(?:ref(?:erence)?[\s.:#]*(?:no\.?|number)?[\s:#]*)([\w\-]{4,30})/i,
  /(?:transaction[\s.:#]*(?:id|no\.?|number)?[\s:#]*)([\w\-]{4,30})/i,
  /(?:trx[\s.:#]*(?:id|no\.?)?[\s:#]*)([\w\-]{4,30})/i,
  /(?:approval[\s.:#]*(?:code|no\.?)?[\s:#]*)([\w\-]{4,20})/i,
  /(?:auth[\s.:#]*(?:code|no\.?)?[\s:#]*)([\w\-]{4,20})/i,
  /(?:رقم[\s]*(?:مرجعي|المرجع|العملية|المعاملة|التحويل)[\s:#]*)([\w\-]{4,30})/i,
  /(?:مرجع[\s:#]*)([\w\-]{4,30})/i,
];

export function extractReferenceNumber(text: string): string | null {
  for (const p of REF_PATTERNS) {
    const m = text.match(p);
    const ref = m?.[1]?.trim();
    if (ref && ref.length >= 4 && !/^\d+\.?\d*$/.test(ref)) return ref;
  }
  return null;
}

// ─── Confidence ─────────────────────────────────────────────────────

function computeConfidence(amount: number | null, type: ServerTxType, merchant: string | null, text: string) {
  let score = 0.5;
  const reasons: string[] = [];
  if (amount && amount > 0) score += 0.2; else reasons.push('Missing or unclear amount');
  if (merchant) score += 0.15; else reasons.push('Unknown merchant');
  const lower = text.toLowerCase();
  const hits = [...EXPENSE_KEYWORDS, ...INCOME_KEYWORDS, ...TRANSFER_KEYWORDS]
    .some((k) => lower.includes(k.toLowerCase()));
  if (hits) score += 0.15; else reasons.push('Transaction type unclear');
  return {
    confidence: Math.min(score, 1),
    needsReview: score < 0.7,
    reviewReason: reasons.length ? reasons.join('; ') : null,
  };
}

// ─── Main ───────────────────────────────────────────────────────────

export function parseSmsServer(message: string): ServerParsedSms | null {
  if (!message || message.length < 10) return null;
  const amount = extractAmount(message);
  if (!amount) return null;

  const transaction_type = detectType(message);
  const merchant = extractMerchant(message);
  const date = extractDate(message);

  const dir = transaction_type === 'income' ? 'income' : 'expense';
  const counterparty = extractCounterparty(message, dir);

  const person = counterparty || merchant;
  const description = person
    ? transaction_type === 'income'
      ? `Received from ${person}`
      : transaction_type === 'transfer'
        ? `Transfer to ${person}`
        : `Payment to ${person}`
    : transaction_type === 'income'
      ? 'Incoming transfer'
      : transaction_type === 'transfer'
        ? 'Internal transfer'
        : 'Card payment';

  const { confidence, needsReview, reviewReason } = computeConfidence(
    amount,
    transaction_type,
    counterparty ? null : merchant,
    message,
  );

  return {
    amount,
    transaction_type,
    merchant: counterparty ? null : merchant,
    counterparty,
    description,
    date,
    parse_confidence: Math.round(confidence * 100) / 100,
    needs_review: needsReview,
    review_reason: reviewReason,
    reference_number: extractReferenceNumber(message),
    rawText: message,
  };
}

// ─── Best-effort category match against the user's own categories ───

export interface CategoryRow {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: ServerTxType;
  taxonomy_key: string | null;
}

// Lightweight alias map used as a fallback when `taxonomy_key` is absent.
// Lower-case keyword → taxonomy_key. Mirrors the most common
// FLATTENED_SUBCATEGORIES aliases for high-traffic categories.
const KEYWORD_TO_TAXONOMY: Array<[RegExp, string]> = [
  [/(carrefour|spinneys|panda|lulu|seoudi|kazyon|gomla|elgomla|بيت\s*الجملة|سوبر\s*ماركت|هايبر|بقالة|كارفور|بندة)/i, 'groceries'],
  [/(restaurant|cafe|coffee|starbucks|mcdonalds|kfc|pizza|burger|مطعم|كافيه|قهوة)/i, 'restaurants'],
  [/(uber|careem|bolt|taxi|lyft|اوبر|كريم)/i, 'taxi_rideshare'],
  [/(petrol|gasoline|fuel|aramco|adnoc|chevron|بنزين|محطة\s*وقود)/i, 'fuel'],
  [/(pharmacy|صيدلية|pharma)/i, 'pharmacy'],
  [/(netflix|spotify|apple\s*music|amazon\s*prime|disney\+)/i, 'subscriptions'],
  [/(salary|payroll|راتب|مرتب)/i, 'salary'],
  [/(electricity|كهرباء)/i, 'electricity'],
  [/(internet|wifi|fiber|انترنت|نت)/i, 'internet'],
  [/(mobile|recharge|sim|موبايل|شحن\s*رصيد)/i, 'mobile'],
  [/(water|مياه)/i, 'water'],
  [/(refund|cashback|كاش\s*باك|استرداد)/i, 'refund_rebate'],
];

export function suggestUserCategory(
  text: string,
  merchant: string | null,
  txType: ServerTxType,
  userCategories: CategoryRow[],
): CategoryRow | null {
  const hay = `${merchant ?? ''} ${text}`.toLowerCase();

  // Pick the taxonomy_key first
  let taxKey: string | null = null;
  for (const [re, k] of KEYWORD_TO_TAXONOMY) {
    if (re.test(hay)) { taxKey = k; break; }
  }
  if (!taxKey) return null;

  // Match against the user's own categories: prefer same-type + matching taxonomy_key
  const sameType = userCategories.filter((c) => c.type === txType);
  const exact = sameType.find((c) => c.taxonomy_key === taxKey);
  if (exact) return exact;

  // Fallback: case-insensitive name contains the taxonomy key root
  const nameMatch = sameType.find((c) =>
    c.name.toLowerCase().includes(taxKey!.replace(/_/g, ' ').toLowerCase()),
  );
  return nameMatch ?? null;
}
