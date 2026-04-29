// Text normalization for downstream regex matching.
// We always KEEP the original text for display; this returns a parallel
// pair: { original, lower } where lower is for case- and digit-insensitive
// keyword scans.

const BIDI_MARKS = /[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\u00AD]/g;

const ARABIC_INDIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

const ARABIC_DIACRITICS = /[ً-ْٰ]/g;

export function normalize(text: string): { original: string; lower: string } {
  let original = stripBidi(text).replace(/[\t ]+/g, ' ').trim();
  // Insert space at Arabic↔Latin/digit boundaries where providers strip newlines
  original = original.replace(/([\u0600-\u06FF])([A-Za-z0-9])/g, '$1 $2');
  original = original.replace(/([A-Za-z0-9])([\u0600-\u06FF])/g, '$1 $2');
  const ascii = digitsToAscii(original);
  const lower = ascii
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
  return { original: digitsToAscii(original), lower };
}

export function stripBidi(text: string): string {
  return text.replace(BIDI_MARKS, '').replace(/\u0640/g, ' ');
}

export function digitsToAscii(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (ch) => ARABIC_INDIC_DIGITS[ch] ?? ch);
}
