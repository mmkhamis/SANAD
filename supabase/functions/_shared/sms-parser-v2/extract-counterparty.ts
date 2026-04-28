// Counterparty (person name) extraction for P2P transfers. Stops at
// newlines / numbers / known terminator words so we don't over-capture.

const TO_PERSON_RE   = /(?:إلى|الى|to)\s+([A-Za-zÀ-ÿ؀-ۿ][A-Za-zÀ-ÿ؀-ۿ '\.-]{2,40}?)(?=\s*(?:بمبلغ|بقيمة|amount|on|في|بتاريخ|عبر|via|\n|\r|\d|$))/i;
const FROM_PERSON_RE = /(?:من|from)\s+([A-Za-zÀ-ÿ؀-ۿ][A-Za-zÀ-ÿ؀-ۿ '\.-]{2,40}?)(?=\s*(?:بمبلغ|بقيمة|amount|on|في|بتاريخ|عبر|via|\n|\r|\d|$))/i;

const REJECT_RE = /bank|حساب|account|card|بطاقة|stc\s?pay|urpay|apple\s?pay|mada|مدى|\*\d|\d{4}/i;

export function extractCounterparty(text: string, isIncoming: boolean): string | null {
  const re = isIncoming ? FROM_PERSON_RE : TO_PERSON_RE;
  const m = text.match(re);
  if (!m) return null;
  const name = m[1].trim();
  if (REJECT_RE.test(name)) return null;
  if (name.length < 3 || name.length > 40) return null;
  return name;
}
