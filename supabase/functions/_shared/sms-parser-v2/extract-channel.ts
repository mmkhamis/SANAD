// Channel extraction. Looks for explicit payment-rail keywords.

import type { Channel } from './types.ts';

const PATTERNS: Array<[RegExp, Exclude<Channel, null>]> = [
  // "مدى-ابل" / "مدى-أبل" both mean mada-Apple Pay → apple_pay wins.
  [/apple\s?pay|[أا]بل\s?باي|مدى[\s\-]*[أا]بل/i, 'apple_pay'],
  [/google\s?pay|قوقل\s?باي/i,       'google_pay'],
  [/stc\s?pay/i,                     'stc_pay'],
  [/urpay|يو\s?ار\s?باي/i,           'urpay'],
  [/\bmada\b|مدى/i,                  'mada'],
  [/\biban\b|آيبان|الايبان/i,        'iban'],
  [/\bvisa\b|\bmastercard\b|بطاقة\s+ائتمانية|بطاقة\s+مدى/i, 'card'],
];

export function extractChannel(text: string): Channel {
  for (const [re, ch] of PATTERNS) {
    if (re.test(text)) return ch;
  }
  return null;
}
