// Merchant extraction. Conservative: never invent. Strips bank names,
// payment-rail names, and other noise.
//
// Brand normalization is left to the caller (it imports findBrand from
// constants/brand-presets which lives in the client bundle). We expose
// just the raw extraction here.

// Try عند/at first (merchant-specific prepositions), then من/from (may match card context)
const AT_PREP_RE = /(?:\bat\s+|عند\s+)([A-Za-zÀ-ÿ0-9 .&'*\-]+?)(?=\s+(?:يوم|بتاريخ|الساعة|الساعه|بطاقة|في\s+\d|كود|رقم|بمبلغ|مبلغ|on|at|via|\d{2}\/\d{2})|\s*[\.,;\n]|$)/i;
const FROM_PREP_RE = /(?:\bfrom\s+|في\s+|من\s+)(?!بطاق|حساب|account|card)([A-Za-zÀ-ÿ0-9 .&'*\-]+?)(?=\s+(?:يوم|بتاريخ|الساعة|الساعه|بطاقة|في\s+\d|كود|رقم|بمبلغ|مبلغ|on|at|via|\d{2}\/\d{2})|\s*[\.,;\n]|$)/i;

const NOISE = [
  /apple\s?pay/i, /google\s?pay/i, /stc\s?pay/i, /\burpay\b/i, /\bmada\b/i,
  /\bvisa\b/i, /\bmastercard\b/i, /\bIBAN\b/i,
  /alrajhi/i, /al rajhi/i, /\bSNB\b/i, /alinma/i, /riyad bank/i, /\bSAB\b/i,
  /\bBSF\b/i, /\bANB\b/i, /albilad/i, /aljazira/i, /\bSAIB\b/i, /\bGIB\b/i,
  /STC\s?Bank/i, /\bCIB\b/i, /\bNBE\b/i, /banque misr/i, /\binstapay\b/i,
  /\b\d{4}\*+/, /\*+\d{4}\b/,
];

export interface MerchantResult {
  merchant_raw: string | null;
  // Set true when the message LOOKS like it should have one (e.g. card
  // purchase) but extraction failed → flag for review or AI fallback.
  missing_merchant: boolean;
}

export function extractMerchant(text: string, isPurchase: boolean): MerchantResult {
  // Try named-line patterns first: "من: HUNGERSTATION" / "From: ..."
  const lineMatch = text.match(/(?:من|from|merchant)\s*[:：]\s*([^\n]+)/i);
  if (lineMatch) {
    const cleaned = cleanCandidate(lineMatch[1]);
    if (cleaned) return { merchant_raw: cleaned, missing_merchant: false };
  }

  // Inline preposition match — try عند/at first, then من/from
  for (const re of [AT_PREP_RE, FROM_PREP_RE]) {
    const m = text.match(re);
    if (m) {
      const cleaned = cleanCandidate(m[1]);
      if (cleaned) return { merchant_raw: cleaned, missing_merchant: false };
    }
  }

  // MOI / government service sub-categorization
  // SMS from MOI often has "الجهة: ..." or "الخدمة: ..." lines
  const moiMerchant = extractMOIService(text);
  if (moiMerchant) return { merchant_raw: moiMerchant, missing_merchant: false };

  return { merchant_raw: null, missing_merchant: isPurchase };
}

// ── MOI / Government sub-categorization ──────────────────────────
// Saudi MOI SMS format: "الجهة: المرور" / "الخدمة: مخالفات مرورية"
// Maps specific service lines to merchant names for taxonomy matching.
const MOI_SERVICE_RE = /(?:الجه[ةه]|الخدم[ةه]|service|department)\s*[:：]\s*([^\n,]+)/i;
const MOI_SENDER_RE = /\b(MOI|وزار[ةه]\s*الداخلي[ةه]|absher|ابشر|مرور|muroor|najm|نجم|balady|بلدي|ejar|ايجار)\b/i;

// Map MOI sub-services to normalized merchant names for taxonomy_key resolution
const MOI_SERVICE_MAP: Record<string, string> = {
  // Traffic
  'مرور': 'مخالفات مرورية',
  'المرور': 'مخالفات مرورية',
  'مخالفات': 'مخالفات مرورية',
  'مخالفات مرورية': 'مخالفات مرورية',
  'مخالفه مروريه': 'مخالفات مرورية',
  'ساهر': 'مخالفات مرورية',
  'saher': 'مخالفات مرورية',
  'traffic': 'مخالفات مرورية',
  'traffic fines': 'مخالفات مرورية',
  'muroor': 'مخالفات مرورية',
  // Licensing
  'رخصة قيادة': 'رخص قيادة',
  'رخصه قياده': 'رخص قيادة',
  'تجديد استمارة': 'تجديد استمارة',
  'تجديد استماره': 'تجديد استمارة',
  'رخصة سير': 'تجديد استمارة',
  'رخصه سير': 'تجديد استمارة',
  'vehicle registration': 'تجديد استمارة',
  // Passport / civil
  'جوازات': 'جوازات',
  'الجوازات': 'جوازات',
  'passport': 'جوازات',
  'احوال': 'أحوال مدنية',
  'الاحوال': 'أحوال مدنية',
  'احوال مدنيه': 'أحوال مدنية',
  'civil affairs': 'أحوال مدنية',
  // Municipal
  'بلدي': 'بلدي',
  'balady': 'بلدي',
  'أمانة': 'بلدي',
  'امانه': 'بلدي',
  // Ejar (rental)
  'ايجار': 'إيجار',
  'ejar': 'إيجار',
  'عقد ايجار': 'إيجار',
  // Absher
  'ابشر': 'أبشر',
  'absher': 'أبشر',
  // Najm (insurance/accidents)
  'نجم': 'نجم',
  'najm': 'نجم',
};

function extractMOIService(text: string): string | null {
  // Only try MOI parsing if sender looks governmental
  if (!MOI_SENDER_RE.test(text)) return null;

  const m = text.match(MOI_SERVICE_RE);
  if (m) {
    const raw = m[1].trim().toLowerCase()
      .replace(/[ً-ْٰ]/g, '')
      .replace(/أ|إ|آ/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه');
    // Try exact match then substring match
    for (const [key, val] of Object.entries(MOI_SERVICE_MAP)) {
      const normKey = key.toLowerCase()
        .replace(/[ً-ْٰ]/g, '')
        .replace(/أ|إ|آ/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه');
      if (raw.includes(normKey)) return val;
    }
    return m[1].trim(); // Return raw service name if no map match
  }

  // Fallback: check for known MOI keywords directly in the text
  const lowerText = text.toLowerCase()
    .replace(/[ً-ْٰ]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
  if (/مخالف[هة]?\s*مروري|ساهر|saher/i.test(lowerText)) return 'مخالفات مرورية';
  if (/تجديد\s*استمار/i.test(lowerText)) return 'تجديد استمارة';
  if (/رخص[هة]\s*قياد/i.test(lowerText)) return 'رخص قيادة';

  return null;
}

function cleanCandidate(raw: string): string | null {
  let s = raw.trim().replace(/[\.,;]+$/g, '').trim();
  if (!s) return null;
  // Strip payment gateway prefixes: "GEIDEA*BOBA HOUSE" → "BOBA HOUSE"
  s = s.replace(/^(?:GEIDEA|FOODICS|SUMUP|MOYASAR|HYPERPAY|TELR|PAYFORT|PAYTABS|TAP|CHECKOUT)\s*[*\-]\s*/i, '');
  // Strip LLC/Ltd/Co./Inc./SA suffixes for normalization (raw kept by caller if needed)
  s = s.replace(/\s+(LLC|L\.L\.C\.|Ltd|Co\.?|Inc\.?|SA|S\.A\.|FZE|FZ-?LLC)\.?\b/i, '').trim();
  if (s.length < 2) return null;
  // Reject if it's pure noise
  for (const n of NOISE) {
    if (n.test(s)) return null;
  }
  // Reject if it's just digits
  if (/^[\d\s,.\-]+$/.test(s)) return null;
  return s;
}
