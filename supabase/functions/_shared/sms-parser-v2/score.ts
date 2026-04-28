// Per-field confidence aggregated into a final 0..1 score.

import type { Last4Hit, MessageClass } from './types.ts';

export interface ScoreInputs {
  amountFound: boolean;
  amountConflict: boolean;
  amountNearVerb: boolean;        // currency-adjacent + within debit verb proximity
  classHard: boolean;             // promo/balance/otp/transfer hit a hard signal
  classFinal: MessageClass;
  merchantSource: 'brand' | 'extracted' | 'missing' | 'na';
  channelExplicit: boolean;
  last4Hits: Last4Hit[];
  isPurchase: boolean;
  timestampParsed: boolean;
}

export interface ScoreResult {
  amount: number;
  class: number;
  merchant: number;
  channel: number;
  last4: number;
  total: number;
}

export function score(s: ScoreInputs): ScoreResult {
  const amount = !s.amountFound
    ? 0
    : s.amountConflict
      ? 0.4
      : s.amountNearVerb
        ? 1.0
        : 0.7;

  const cls = s.classHard ? 0.95 : 0.6;

  let merchant = 0.6; // neutral default
  if (s.merchantSource === 'brand') merchant = 1.0;
  else if (s.merchantSource === 'extracted') merchant = 0.85;
  else if (s.merchantSource === 'missing' && s.isPurchase) merchant = 0;
  else if (s.merchantSource === 'na') merchant = 0.8; // transfers, balance, otp

  const channel = s.channelExplicit ? 1.0 : 0.6;

  let last4 = 0.5;
  if (s.last4Hits.length === 0) {
    last4 = s.isPurchase ? 0 : 0.4;
  } else {
    const ownedHits = s.last4Hits.filter((h) => h.ownedAccountId).length;
    last4 = ownedHits > 0 ? 1.0 : 0.7;
  }

  const total =
    0.30 * amount +
    0.25 * cls +
    0.20 * merchant +
    0.10 * channel +
    0.15 * last4;

  return { amount, class: cls, merchant, channel, last4, total };
}
