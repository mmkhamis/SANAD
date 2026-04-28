const BIDI_MARKS_RE = /[‎‏‪-‮⁦-⁩﻿]/g;

// Each entry becomes its own line in the preview.
// Order matters — more specific patterns first to avoid partial captures.
const PREVIEW_MARKERS: RegExp[] = [
  // Card settlement
  /(سداد\s+بطاق(?:ة|ه)\s+ائتمان(?:ية|يه)?)/gi,
  // "عبر تطبيق:" / "via app:" — Saudi bank format
  /(عبر\s+تطبيق\s*[:：]?)/gi,
  // "بطاقة ائتمانية:" / "بطاقة مدى:" — card line
  /(بطاق[ةت]\s*(?:ائتمان(?:ية|يه)?|مد[ىي])\s*[:：]?)/gi,
  // "من:" / "from:" with colon — field-style merchant/account line
  /((?:من|from)\s*[:：])/gi,
  // "من حساب" / "من *XXXX" (no colon)
  /((?:من|from)\s*(?:حساب|\*+\s*\d{4}))/gi,
  // "الى/إلى" lines
  /((?:الى|إلى|to)\s*[:：]?\s*(?:بطاق[ةت]\w*|حساب\w*))/gi,
  // "مبلغ:" / "amount:" / "بقيمة" / "بمبلغ"
  /((?:مبلغ|amount|بقيمة|value|بمبلغ)\s*[:：]?)/gi,
  // "في:" field or date with في
  /((?:في)\s*[:：]\s*)/gi,
  /((?:في)\s*\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
  // Date ISO format: YYYY-MM-DD
  /(\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/gi,
  // Remaining balance/limit
  /((?:الصرف|حد\s+الصرف|الرصيد)\s*المتبقي|remaining\s+balance|available\s+balance)/gi,
  // Payment channel markers
  /(مد[ىي]-?\s*(?:ابل|apple)|mada[\s-]*apple)/gi,
];

/**
 * Makes SMS preview readable when providers flatten multi-line Arabic SMS
 * into one line with bidi marks.
 */
export function formatSmsPreview(raw: string): string {
  if (!raw) return raw;

  let text = raw
    .replace(BIDI_MARKS_RE, '')
    .replace(/\u0640/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ');

  // Insert space at Arabic↔Latin/digit boundaries where the provider
  // stripped the newline and glued tokens (e.g. "إنترنتعبر" → "إنترنت عبر",
  // "SA21:04" → "SA 21:04"). Boundaries: Arabic letter → ASCII or digit → Arabic.
  text = text.replace(/([\u0600-\u06FF])([A-Za-z0-9])/g, '$1 $2');
  text = text.replace(/([A-Za-z0-9])([\u0600-\u06FF])/g, '$1 $2');

  for (const marker of PREVIEW_MARKERS) {
    text = text.replace(marker, '\n$1');
  }

  return text
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n[ ]+/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

