// Extract masked card/account last4 digits and bucket each occurrence
// into from / to / card / account based on the surrounding preposition.

import type { Last4Hit } from './types.ts';

// Match: *1234 / **1234 / 1234* / ending 1234 / ينتهي بـ 1234 / 402*079 (Saudi NNN*NNN format).
// No trailing \b — would block matches when the asterisk is followed by
// a non-word char like \n.
const MASK_RE = /\*+\s*(\d{4})(?!\d)|(\d{4})\s*\*+|\bending\s+(\d{4})\b|ينتهي\s+ب?ـ?\s*(\d{4})|(?:رقم|no\.?)\s+(\d{4})(?!\d)|\b(\d{3})\*(\d{3})\b/gi;

const ROLE_PATTERNS: Array<{ re: RegExp; role: Last4Hit['role'] }> = [
  // ORDER MATTERS — most specific first.
  { re: /(من|from)\s*[:.]?\s*حساب/i,                    role: 'from' },
  { re: /(من|from)\s*[:.]?\s*بطاقة/i,                   role: 'from' },
  { re: /(الى|إلى|to)\s*[:.]?\s*حساب/i,                 role: 'to' },
  { re: /(الى|إلى|to)\s*[:.]?\s*بطاقة/i,                role: 'to' },
  { re: /(?:^|[\s\n])(الى|إلى|to)\s*[:.]?(?=[\s\n*\d])/i, role: 'to' },
  { re: /(?:^|[\s\n])(من|from)\s*[:.]?(?=[\s\n*\d])/i,  role: 'from' },
  // IBAN lines like "آيبان:*9000" — treat as 'to' when preceded by "إلى" context
  { re: /(بطاق[ةت]\w*|card|apple\s?pay|google\s?pay|mada|مدى|stc\s?pay|urpay)/i, role: 'card' },
  { re: /(حساب\w*|account|الايبان|آيبان|ايبان|iban)/i,  role: 'account' },
];

export function extractLast4(text: string): Last4Hit[] {
  const hits: Last4Hit[] = [];
  let m: RegExpExecArray | null;
  MASK_RE.lastIndex = 0;
  while ((m = MASK_RE.exec(text)) !== null) {
    // Groups 1-5: standard 4-digit patterns
    // Groups 6+7: Saudi NNN*NNN format → combine as "NNNNNN" and take last 4
    let digits: string;
    if (m[6] && m[7]) {
      // e.g. 402*079 → "402079" → last4 = "2079"
      digits = (m[6] + m[7]).slice(-4);
    } else {
      digits = m[1] ?? m[2] ?? m[3] ?? m[4] ?? m[5] ?? '';
    }
    if (!digits) continue;
    const role = inferRole(text, m.index);
    hits.push({ digits, role });
  }
  return dedupHits(hits);
}

/** Pick the most relevant role keyword preceding the hit. Strategy:
 *  among all matches in the 60-char window, prefer the LATEST END position
 *  (closest to the digits). Break ties by preferring the more specific
 *  pattern (earlier in ROLE_PATTERNS) — this is why compound prepositions
 *  like "من حساب" / "الى بطاقة" must come before bare "حساب" / "بطاقة". */
function inferRole(text: string, hitIndex: number): Last4Hit['role'] {
  const before = text.slice(Math.max(0, hitIndex - 60), hitIndex);
  let bestRole: Last4Hit['role'] = 'unknown';
  let bestEnd = -1;
  let bestPriority = ROLE_PATTERNS.length;
  for (let i = 0; i < ROLE_PATTERNS.length; i++) {
    const { re, role } = ROLE_PATTERNS[i];
    const reG = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let lastEnd = -1;
    let match: RegExpExecArray | null;
    while ((match = reG.exec(before)) !== null) {
      lastEnd = match.index + match[0].length;
      if (match[0].length === 0) reG.lastIndex++;
    }
    if (lastEnd < 0) continue;
    if (lastEnd > bestEnd || (lastEnd === bestEnd && i < bestPriority)) {
      bestEnd = lastEnd;
      bestPriority = i;
      bestRole = role;
    }
  }
  return bestRole;
}

function dedupHits(hits: Last4Hit[]): Last4Hit[] {
  const seen = new Set<string>();
  const out: Last4Hit[] = [];
  for (const h of hits) {
    const k = `${h.digits}:${h.role}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
  }
  return out;
}
