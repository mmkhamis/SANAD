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

  return { merchant_raw: null, missing_merchant: isPurchase };
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
