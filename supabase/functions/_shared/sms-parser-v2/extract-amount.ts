// Amount + currency extraction.
// Pre-suppresses "remaining balance / limit" lines and reference numbers,
// then prefers currency-adjacent amounts near a debit verb.

import type { IgnoredValue } from './types.ts';

const BALANCE_LINE_RE = /(remaining|available|limit|balance|المتبقي|الرصيد|حد الصرف)/i;
const AMOUNT_HINT_RE = /(amount|مبلغ|بقيمة|قيمة|سداد|payment)/i;

const REF_NUM_RE = /\b\d{7,}\b/g;

const CURRENCY_TOKEN_RE = /(SAR|ر\.?س|EGP|ج\.?م|AED|د\.?إ|USD|\$)/i;

const AMOUNT_RE = /(?:(SAR|ر\.?س|EGP|ج\.?م|AED|د\.?إ|USD|\$)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?))|(?:([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s?(SAR|ر\.?س|EGP|ج\.?م|AED|د\.?إ|USD|\$))/gi;

const DEBIT_VERB_RE = /(تم خصم|تم إضافة|شراء|سحب|دفع|تحويل|إيداع|سداد|purchase|withdrawn|deposited|transferred|paid|debited|credited|payment)/i;

export interface AmountResult {
  amount: number | null;
  currency: string | null;
  ignored: IgnoredValue[];
  amountConflict: boolean;
}

export function extractAmount(text: string, defaultCurrency = 'SAR'): AmountResult {
  const ignored: IgnoredValue[] = [];

  // Pre-pass: suppress balance/limit lines
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (BALANCE_LINE_RE.test(line) && !DEBIT_VERB_RE.test(line) && !AMOUNT_HINT_RE.test(line)) {
      const kind: IgnoredValue['kind'] = /limit|حد الصرف/i.test(line)
        ? 'remaining_limit'
        : 'remaining_balance';
      ignored.push({ kind, value: line.trim() });
      continue;
    }
    kept.push(line);
  }
  let scrubbed = kept.join('\n');

  // Pre-pass: blank reference numbers (7+ unbroken digits, no decimal)
  scrubbed = scrubbed.replace(REF_NUM_RE, (m) => {
    ignored.push({ kind: 'reference_number', value: m });
    return ' '.repeat(m.length);
  });

  // Find all amount candidates
  const candidates: Array<{ value: number; currency: string; index: number }> = [];
  let match: RegExpExecArray | null;
  AMOUNT_RE.lastIndex = 0;
  while ((match = AMOUNT_RE.exec(scrubbed)) !== null) {
    const [, c1, n1, n2, c2] = match;
    const num = parseFloat((n1 ?? n2).replace(/,/g, ''));
    if (!isFinite(num) || num <= 0) continue;
    const currency = normalizeCurrency(c1 ?? c2);
    candidates.push({ value: num, currency, index: match.index });
  }
  const nonBalanceCandidates = candidates.filter((c) => !isBalanceContext(scrubbed, c.index));
  const usableCandidates = nonBalanceCandidates.length > 0 ? nonBalanceCandidates : candidates;

  if (usableCandidates.length === 0) {
    // Fallback: largest plain number that's not a reference
    const plainNums = Array.from(scrubbed.matchAll(/\b(\d{1,6}(?:\.\d{1,2})?)\b/g))
      .map((m) => ({ value: parseFloat(m[1]), index: m.index ?? 0 }))
      .filter((x) => isFinite(x.value) && x.value > 0);
    if (plainNums.length === 0) {
      return { amount: null, currency: defaultCurrency, ignored, amountConflict: false };
    }
    plainNums.sort((a, b) => b.value - a.value);
    return {
      amount: plainNums[0].value,
      currency: defaultCurrency,
      ignored,
      amountConflict: false,
    };
  }

  if (usableCandidates.length === 1) {
    return {
      amount: usableCandidates[0].value,
      currency: usableCandidates[0].currency || defaultCurrency,
      ignored,
      amountConflict: false,
    };
  }

  // Multiple candidates — prefer the one nearest a debit verb (within 60 chars)
  const verbMatch = scrubbed.match(DEBIT_VERB_RE);
  if (verbMatch && verbMatch.index !== undefined) {
    const verbIdx = verbMatch.index;
    usableCandidates.sort(
      (a, b) => Math.abs(a.index - verbIdx) - Math.abs(b.index - verbIdx),
    );
    const best = usableCandidates[0];
    const distance = Math.abs(best.index - verbIdx);
    if (distance <= 80) {
      return {
        amount: best.value,
        currency: best.currency || defaultCurrency,
        ignored,
        amountConflict: false,
      };
    }
  }

  // Truly ambiguous — flag for AI fallback, return the first
  return {
    amount: usableCandidates[0].value,
    currency: usableCandidates[0].currency || defaultCurrency,
    ignored,
    amountConflict: true,
  };
}

function isBalanceContext(text: string, index: number): boolean {
  const start = Math.max(0, index - 26);
  const end = Math.min(text.length, index + 26);
  return BALANCE_LINE_RE.test(text.slice(start, end));
}

function normalizeCurrency(raw: string | undefined): string {
  if (!raw) return '';
  const u = raw.toUpperCase().replace(/\./g, '').replace(/\s/g, '');
  if (u === 'SAR' || u === 'رس') return 'SAR';
  if (u === 'EGP' || u === 'جم') return 'EGP';
  if (u === 'AED' || u === 'دإ') return 'AED';
  if (u === 'USD' || u === '$') return 'USD';
  return u;
}

export { CURRENCY_TOKEN_RE, DEBIT_VERB_RE };
