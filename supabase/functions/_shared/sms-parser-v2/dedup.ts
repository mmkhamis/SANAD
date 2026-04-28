// Stable dedup key for a parsed SMS. Pure JS hash (FNV-1a) so the same
// implementation runs in Deno (edge functions) and the React Native client
// without crypto polyfills. Sufficiently unique for SMS dedup at user scale.

import type { ParseResult } from './types.ts';

export function buildDedupKey(p: ParseResult): string {
  const minute = (p.timestamp ?? '').slice(0, 16); // YYYY-MM-DDTHH:mm
  const fromTo = [p.from_last4 ?? '', p.to_last4 ?? '']
    .sort()
    .join('|');
  const ext = p.merchant_raw ?? '';
  const seed = `${p.amount ?? ''}|${minute}|${fromTo}|${ext}`;
  return `sms:${fnv1a(seed)}`;
}

export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Used by offers feed: hash the redacted body so re-receives are deduped. */
export function bodyHash(body: string): string {
  return fnv1a(body.trim());
}
