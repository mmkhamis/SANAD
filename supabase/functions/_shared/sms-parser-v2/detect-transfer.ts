// Hard transfer signals. A purchase has at most one last4 in a "card"
// or "account" role; a transfer has both from + to roles.

import type { Last4Hit } from './types.ts';

// Comprehensive Saudi bank transfer keywords (normalized: ة→ه, إ→ا, ى→ي)
// Covers: Al Rajhi, Al Inma, SNB, Riyad Bank, AlBilad, SABB, BSF, ANB, STC Pay
const TRANSFER_KW = new RegExp([
  // Arabic transfer verbs
  'تحويل',             // transfer (generic)
  'حواله',             // remittance (normalized ة→ه)
  'حواله صادره',       // outgoing remittance
  'حواله وارده',       // incoming remittance
  'حواله محليه',       // local remittance
  'حواله دوليه',       // international remittance
  'حواله صادره محليه', // outgoing local remittance
  'حواله صادره دوليه', // outgoing international remittance
  'حواله سريعه',       // quick remittance (SARIE)
  'تحويل لحظي',        // instant transfer
  'تحويل بنكي',        // bank transfer
  'تحويل صادر',        // outgoing transfer
  'تحويل وارد',        // incoming transfer
  'تحويل عبر المحفظه', // wallet transfer
  'سداد\\s+بطاق[هة]\\s*ائتمان', // credit card settlement
  'سداد\\s+بطاقه',     // card settlement
  // English
  'transfer',
  'transferred',
  'remittance',
  // Structural: from account ... to (account/card/iban)
  'من\\s*[:\\.]?\\s*(?:حساب|بطاق).*(?:الي|الى|إلى|to)\\s*[:\\.]?\\s*(?:حساب|بطاق|ايبان|آيبان)',
  'from.*to.*account',
].map(kw => kw.includes('\\') || kw.includes('.*') ? kw : kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

// Bill/government payment keywords — these contain "سداد" but are NOT transfers.
// Must be checked BEFORE transfer keyword matching to avoid false positives.
const BILL_PAYMENT_RE = /(سداد\s+فاتور|دفع\s+فاتور|فاتوره|مدفوعات\s+وزار|مدفوعات\s+حكوم|سداد\s+مخالف|سداد\s+دفع[هة]\s*ايجار|خصم\s+قسط)/i;

export function isTransfer(text: string, hits: Last4Hit[]): boolean {
  // Bill payments are NOT transfers even if they contain "سداد"
  if (BILL_PAYMENT_RE.test(text)) return false;

  const fromHits = hits.filter((h) => h.role === 'from').length;
  const toHits   = hits.filter((h) => h.role === 'to').length;
  // Two directional hits = transfer
  if (fromHits >= 1 && toHits >= 1) return true;
  // Transfer keyword + at least 2 last4 hits (from/to/account/iban)
  if (TRANSFER_KW.test(text) && hits.length >= 2) return true;
  return false;
}
