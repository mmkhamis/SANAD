// Cheap heuristic class gate. Picks one of:
//   promotion_offer | balance_alert | otp | transactional | unknown

import type { ClassResult, ParseContext } from './types.ts';

export const DEFAULT_PROMO_KEYWORDS = {
  en: [
    'discount', '% off', 'free', 'redeem', 'points', 'gift',
    'cashback offer', 'voucher', 'promo code', 'coupon',
  ],
  ar: [
    'عرض', 'تخفيض', 'هدية', 'نقاط', 'قسيمة', 'كوبون',
    'مجاني', 'بدون رسوم',
  ],
};

// ─── TRANSACTIONAL SIGNAL WORDS ─────────────────────────────────────
// Any SMS containing one of these is treated as transactional (not promo/balance).
// All entries are normalized via simpleNormalize() (أ/إ/آ→ا, ة→ه, ى→ي, no diacritics).
//
// Comprehensive Saudi bank SMS vocabulary:
//   Al Rajhi, Al Inma, SNB, Riyad Bank, AlBilad, SABB, BSF, ANB, STC Pay, Al Jazeera
const TRANSACTIONAL_VERBS_RAW = [
  // ── Arabic: Expense / Debit ────────────────────────────
  'تم خصم',            // has been deducted
  'خصم',               // deduction
  'شراء',              // purchase
  'عملية شراء',        // purchase operation
  'سحب',               // withdrawal (ATM)
  'سحب نقدي',          // cash withdrawal
  'دفع',               // payment
  'تم الدفع',          // payment was made
  'تم السحب',          // withdrawal was made
  'تم سحب',            // was withdrawn
  'مشتريات',           // purchases
  'نقطة بيع',          // POS (point of sale)
  'مدفوعات',           // payments (gov/utility)
  'سداد',              // settlement/payment
  'سداد فاتورة',       // bill payment
  'دفع فاتورة',        // bill payment
  'فاتورة',            // invoice/bill
  'قسط',               // installment
  'قسط تمويل',         // loan installment
  'خصم قسط',           // installment deducted
  'رسوم',              // fees
  'عمولة',             // commission
  'غرامة',             // fine/penalty
  'مخالفة',            // violation/fine

  // ── Arabic: Income / Credit ────────────────────────────
  'تم إضافة',          // has been added
  'تم اضافة',          // has been added (no hamza)
  'إيداع',             // deposit
  'ايداع',             // deposit (no hamza)
  'تم إيداع',          // has been deposited
  'تم ايداع',          // has been deposited (no hamza)
  'تم استلام',         // has been received
  'ايداع رواتب',       // salary deposit
  'ايداع نقدي',        // cash deposit
  'ايداع راتب',        // salary deposit (singular)
  'راتب',              // salary
  'رواتب',             // salaries
  'مرتب',              // salary (alt)
  'مرتبات',            // salaries (alt)
  'أجر',               // wage
  'اجر',               // wage (no hamza)
  'أجور',              // wages
  'اجور',              // wages (no hamza)
  'معاش',              // pension
  'مكافأة',            // reward/bonus
  'بدل',               // allowance
  'استرداد',           // refund
  'استرجاع',           // refund/reverse
  'تم استرجاع',        // has been refunded
  'استرداد نقدي',      // cashback

  // ── Arabic: Transfer / Remittance ──────────────────────
  'تحويل',             // transfer
  'تم تحويل',          // has been transferred
  'تحويل لحظي',        // instant transfer (SARIE/IPS)
  'تحويل بنكي',        // bank transfer
  'تحويل صادر',        // outgoing transfer
  'تحويل وارد',        // incoming transfer
  'حوالة',             // remittance
  'حوالة صادرة',       // outgoing remittance
  'حوالة واردة',       // incoming remittance
  'حوالة محلية',       // local remittance
  'حوالة دولية',       // international remittance
  'حوالة صادرة محلية', // outgoing local remittance
  'حوالة واردة محلية', // incoming local remittance
  'حوالة صادرة دولية', // outgoing international remittance
  'حوالة سريعة',       // quick remittance (SARIE)
  'سداد بطاقة',        // card settlement

  // ── Arabic: Generic transactional signals ──────────────
  'مبلغ',              // amount (present in almost all bank SMS)
  'عملية',             // operation/transaction

  // ── English ────────────────────────────────────────────
  'purchase', 'purchased', 'withdrawn', 'deposited', 'transferred',
  'paid', 'debited', 'credited', 'received', 'payment', 'installment',
  'salary', 'wage', 'payroll', 'pension', 'bonus', 'allowance',
  'remittance', 'refund', 'cashback', 'settlement',
];

const BALANCE_ONLY_RAW = [
  'available balance', 'current balance',
  'الرصيد المتاح', 'الرصيد الحالي',
];

function simpleNormalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْٰ]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

const TRANSACTIONAL_VERBS = TRANSACTIONAL_VERBS_RAW.map(simpleNormalize);
const BALANCE_ONLY = BALANCE_ONLY_RAW.map(simpleNormalize);

const OTP_RE = /\b(otp|verification code|one[- ]?time password)\b|رمز التحقق|كلمة المرور لمرة واحدة/i;

export function classify(lower: string, ctx: ParseContext): ClassResult {
  if (OTP_RE.test(lower) && /\b\d{4,6}\b/.test(lower)) {
    return { class: 'otp', hard: true };
  }

  const hasTransactional = TRANSACTIONAL_VERBS.some((v) => lower.includes(v));

  if (!hasTransactional && BALANCE_ONLY.some((p) => lower.includes(p))) {
    return { class: 'balance_alert', hard: true };
  }

  const keywordsRaw = ctx.promoKeywords && ctx.promoKeywords.length > 0
    ? ctx.promoKeywords.map((k) => k.keyword)
    : [...DEFAULT_PROMO_KEYWORDS.en, ...DEFAULT_PROMO_KEYWORDS.ar];
  const keywords = keywordsRaw.map(simpleNormalize);

  if (!hasTransactional && keywords.some((k) => lower.includes(k))) {
    return { class: 'promotion_offer', hard: true };
  }

  if (hasTransactional) {
    return { class: 'unknown', hard: false };
  }

  return { class: 'unknown', hard: false };
}
