// Resolve each last4 hit against the user's owned account/card/iban
// last4 list. Mutates the hits in place with `ownedAccountId`.

import type { Last4Hit, ParseContext } from './types.ts';

export interface OwnershipResolution {
  hits: Last4Hit[];
  fromAccountId: string | null;
  toAccountId: string | null;
  isInternalTransfer: boolean;
}

export function matchOwnership(
  hits: Last4Hit[],
  ctx: ParseContext,
): OwnershipResolution {
  const owned = ctx.ownedAccounts ?? [];
  const lookup = new Map<string, string>();
  for (const a of owned) {
    if (a.account_last4) lookup.set(a.account_last4, a.id);
    if (a.card_last4)    lookup.set(a.card_last4, a.id);
    if (a.iban_last4)    lookup.set(a.iban_last4, a.id);
  }
  const enriched = hits.map((h) => ({
    ...h,
    ownedAccountId: lookup.get(h.digits) ?? suffixMatch(h.digits, lookup) ?? null,
  }));
  const fromHit = enriched.find((h) => h.role === 'from');
  const toHit   = enriched.find((h) => h.role === 'to');
  const fromAccountId = fromHit?.ownedAccountId ?? null;
  const toAccountId   = toHit?.ownedAccountId ?? null;
  const isInternalTransfer = !!(fromAccountId && toAccountId);
  return { hits: enriched, fromAccountId, toAccountId, isInternalTransfer };
}

/** Suffix match for NNN*NNN wallet formats or other non-exact digits.
 *  Strips non-digit chars, then matches if last 3+ digits are the same. */
function suffixMatch(digits: string, lookup: Map<string, string>): string | undefined {
  const clean = digits.replace(/\D/g, '');
  if (clean.length < 3) return undefined;
  for (const [key, id] of lookup) {
    const keyClean = key.replace(/\D/g, '');
    const minLen = Math.min(keyClean.length, clean.length, 3);
    if (minLen >= 3 && keyClean.slice(-minLen) === clean.slice(-minLen)) {
      return id;
    }
  }
  return undefined;
}
