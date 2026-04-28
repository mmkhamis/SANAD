// Cheap heuristic class gate. Picks one of:
//   promotion_offer | balance_alert | otp | transactional | unknown

import type { ClassResult, ParseContext } from './types.ts';

export const DEFAULT_PROMO_KEYWORDS = {
  en: [
    'discount', '% off', 'free', 'redeem', 'points', 'gift',
    'cashback offer', 'voucher', 'promo code', 'coupon',
  ],
  ar: [
    'عرض', 'خصم', 'استرداد', 'هدية', 'نقاط', 'قسيمة', 'كوبون',
    'مجاني', 'بدون رسوم',
  ],
};

// All keyword lists are normalized to match the `lower` view's transforms
// (إ→ا, ة→ه, ى→ي, diacritics stripped). Done by simpleNormalize() below.

const DEBIT_VERBS_RAW = [
  'تم خصم', 'شراء', 'سحب', 'دفع', 'تحويل', 'تم إضافة', 'تم اضافة',
  'إيداع', 'تم استلام', 'تم استرجاع', 'استرداد نقدي',
  'purchase', 'withdrawn', 'deposited', 'transferred', 'paid',
  'debited', 'credited', 'received',
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

const DEBIT_VERBS = DEBIT_VERBS_RAW.map(simpleNormalize);
const BALANCE_ONLY = BALANCE_ONLY_RAW.map(simpleNormalize);

const OTP_RE = /\b(otp|verification code|one[- ]?time password)\b|رمز التحقق|كلمة المرور لمرة واحدة/i;

export function classify(lower: string, ctx: ParseContext): ClassResult {
  if (OTP_RE.test(lower) && /\b\d{4,6}\b/.test(lower)) {
    return { class: 'otp', hard: true };
  }

  const hasDebit = DEBIT_VERBS.some((v) => lower.includes(v));

  if (!hasDebit && BALANCE_ONLY.some((p) => lower.includes(p))) {
    return { class: 'balance_alert', hard: true };
  }

  const keywordsRaw = ctx.promoKeywords && ctx.promoKeywords.length > 0
    ? ctx.promoKeywords.map((k) => k.keyword)
    : [...DEFAULT_PROMO_KEYWORDS.en, ...DEFAULT_PROMO_KEYWORDS.ar];
  const keywords = keywordsRaw.map(simpleNormalize);

  if (!hasDebit && keywords.some((k) => lower.includes(k))) {
    return { class: 'promotion_offer', hard: true };
  }

  if (hasDebit) {
    return { class: 'unknown', hard: false };
  }

  return { class: 'unknown', hard: false };
}
