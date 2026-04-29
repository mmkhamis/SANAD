// PII redaction — strips sensitive data before sending SMS text to AI.
// Preserves structure (merchant names, amounts, keywords) while removing
// IBANs, full card numbers, phone numbers, and national IDs.

/**
 * Redact PII from SMS text before sending to external AI.
 * Replaces sensitive patterns with safe placeholders.
 */
export function redactPII(text: string): string {
  let s = text;

  // Full IBAN (SA + 22 digits, or generic 2-letter + up to 30 alphanumeric)
  // Keep last 4 for context, redact the rest
  s = s.replace(/\b([A-Z]{2}\d{2})\d{12,26}(\d{4})\b/g, '$1****$2');

  // Saudi national ID (10 digits starting with 1 or 2)
  s = s.replace(/\b([12])\d{8}(\d)\b/g, '$1********$2');

  // Full card numbers (13-19 digits, with optional spaces/dashes)
  // Keep first 4 and last 4
  s = s.replace(/\b(\d{4})[\s\-]?\d{4,6}[\s\-]?\d{0,5}[\s\-]?(\d{4})\b/g, (match) => {
    // Only redact if it looks like a card number (13+ digits)
    const digits = match.replace(/[\s\-]/g, '');
    if (digits.length >= 13 && digits.length <= 19) {
      return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
    }
    return match;
  });

  // Phone numbers: Saudi (+966 or 05xx), Egyptian (+20), UAE (+971), generic international
  s = s.replace(/(?:\+966|00966)\s*\d{8,9}/g, '+966*****');
  s = s.replace(/\b05\d{8}\b/g, '05*****');
  s = s.replace(/(?:\+20|0020)\s*\d{9,10}/g, '+20*****');
  s = s.replace(/(?:\+971|00971)\s*\d{8,9}/g, '+971*****');

  // Email addresses
  s = s.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '***@***.***');

  // Names after "المستفيد" / "beneficiary" / "المحول له" / "المحول اليه"
  // Replace the name but keep the label
  s = s.replace(
    /((?:المستفيد|beneficiary|المحول\s*(?:له|اليه|إليه)|recipient)\s*[:：]\s*)([^\n,]{2,30})/gi,
    '$1[REDACTED]',
  );

  return s;
}
