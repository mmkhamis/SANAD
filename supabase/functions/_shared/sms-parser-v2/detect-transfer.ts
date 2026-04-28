// Hard transfer signals. A purchase has at most one last4 in a "card"
// or "account" role; a transfer has both from + to roles.

import type { Last4Hit } from './types.ts';

const TRANSFER_KW = /(تحويل|transfer|transferred|من حساب.*إلى|من حساب.*الى|from.*to.*account)/i;

export function isTransfer(text: string, hits: Last4Hit[]): boolean {
  const fromHits = hits.filter((h) => h.role === 'from').length;
  const toHits   = hits.filter((h) => h.role === 'to').length;
  if (fromHits >= 1 && toHits >= 1) return true;
  if (TRANSFER_KW.test(text) && hits.length >= 2) return true;
  return false;
}
