type TxType = 'income' | 'expense' | 'transfer';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(/[,\s]/g, '');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeCurrency(value: unknown): string | null {
  const currency = cleanString(value);
  if (!currency) return null;
  return /^[a-z]{3,4}$/i.test(currency) ? currency.toUpperCase() : currency;
}

function normalizeDate(value: unknown): string | null {
  const date = cleanString(value);
  if (!date) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function normalizeTxType(value: unknown, fallback: TxType = 'expense'): TxType {
  if (value === 'income' || value === 'expense' || value === 'transfer') return value;
  return fallback;
}

function pickCategory(type: TxType, rawCategory: unknown, expenseCategories: string[], incomeCategories: string[]): string {
  const value = cleanString(rawCategory);
  const allowed = type === 'income' ? incomeCategories : expenseCategories;
  if (value) {
    const exact = allowed.find((c) => c.toLowerCase() === value.toLowerCase());
    if (exact) return exact;
  }

  if (type === 'income') {
    return (
      allowed.find((c) => c.toLowerCase() === 'other income') ??
      allowed[0] ??
      'Other Income'
    );
  }

  return (
    allowed.find((c) => c.toLowerCase() === 'miscellaneous') ??
    allowed[0] ??
    'Miscellaneous'
  );
}

export interface NormalizedOcrSingle {
  text: string;
  amount: number | null;
  currency: string | null;
  transaction_type: TxType;
  category: string | null;
  merchant: string | null;
  date: string | null;
  items: string[];
}

export interface NormalizedStructuredItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface NormalizedOcrStructured {
  merchant: string | null;
  date: string | null;
  currency: string | null;
  items: NormalizedStructuredItem[];
  subtotal: number | null;
  tax: number | null;
  service_fee: number | null;
  tip: number | null;
  discount: number | null;
  total: number | null;
}

export interface ParseNormalizedTransaction {
  amount: number;
  currency: string;
  transaction_type: TxType;
  category: string;
  merchant: string | null;
  counterparty: string | null;
  account_name: string | null;
  description: string | null;
  confidence: number;
  needs_review: boolean;
}

export interface VoiceReviewMatch {
  index: number;
  category_name: string;
  transaction_type: TxType;
}

export function normalizeOcrSingleResult(raw: unknown): NormalizedOcrSingle {
  const obj = asRecord(raw) ?? {};

  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];
  const items = itemsRaw
    .map((item) => {
      if (typeof item === 'string') return cleanString(item);
      const rec = asRecord(item);
      if (!rec) return null;
      return cleanString(rec.name) ?? cleanString(rec.text) ?? cleanString(rec.description);
    })
    .filter((item): item is string => Boolean(item));

  const amount = cleanNumber(obj.amount) ?? cleanNumber(obj.total);

  return {
    text: cleanString(obj.text) ?? '',
    amount,
    currency: normalizeCurrency(obj.currency),
    transaction_type: normalizeTxType(obj.transaction_type, 'expense'),
    category: cleanString(obj.category),
    merchant: cleanString(obj.merchant),
    date: normalizeDate(obj.date),
    items,
  };
}

export function normalizeOcrStructuredResult(raw: unknown): NormalizedOcrStructured {
  const obj = asRecord(raw) ?? {};
  const itemsRaw = Array.isArray(obj.items) ? obj.items : [];

  const items: NormalizedStructuredItem[] = itemsRaw
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;

      const name = cleanString(rec.name);
      if (!name) return null;

      const quantityRaw = cleanNumber(rec.quantity);
      const quantity = quantityRaw ? Math.max(1, Math.round(quantityRaw)) : 1;

      let unitPrice = cleanNumber(rec.unit_price);
      const lineTotal = cleanNumber(rec.total_line_price) ?? cleanNumber(rec.line_total);
      if (!unitPrice && lineTotal && quantity > 0) {
        unitPrice = Number((lineTotal / quantity).toFixed(2));
      }

      if (!unitPrice) return null;
      return { name, quantity, unit_price: unitPrice };
    })
    .filter((item): item is NormalizedStructuredItem => Boolean(item));

  const subtotalFromItems = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const subtotal = cleanNumber(obj.subtotal) ?? (subtotalFromItems > 0 ? Number(subtotalFromItems.toFixed(2)) : null);
  const tax = cleanNumber(obj.tax);
  const serviceFee = cleanNumber(obj.service_fee);
  const tip = cleanNumber(obj.tip);
  const discount = cleanNumber(obj.discount);
  const totalFromFormula = (() => {
    if (!subtotal) return null;
    const value = subtotal + (tax ?? 0) + (serviceFee ?? 0) + (tip ?? 0) - (discount ?? 0);
    return value > 0 ? Number(value.toFixed(2)) : null;
  })();
  const total = cleanNumber(obj.total) ?? totalFromFormula;

  return {
    merchant: cleanString(obj.merchant),
    date: normalizeDate(obj.date),
    currency: normalizeCurrency(obj.currency),
    items,
    subtotal,
    tax,
    service_fee: serviceFee,
    tip,
    discount,
    total,
  };
}

export function normalizeParsedTransactions(
  raw: unknown[],
  expenseCategories: string[],
  incomeCategories: string[],
): ParseNormalizedTransaction[] {
  return raw
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;

      const txType: TxType = rec.transaction_type === 'income' || rec.transaction_type === 'transfer' || rec.transaction_type === 'expense'
        ? rec.transaction_type
        : 'expense';

      const amount = cleanNumber(rec.amount) ?? 0;
      const confidenceRaw = typeof rec.confidence === 'number' && Number.isFinite(rec.confidence) ? rec.confidence : 0.5;
      const confidence = Math.min(Math.max(confidenceRaw, 0), 1);
      const needsReview = Boolean(rec.needs_review) || amount <= 0 || confidence < 0.7;

      return {
        amount,
        currency: normalizeCurrency(rec.currency) ?? 'EGP',
        transaction_type: txType,
        category: pickCategory(txType, rec.category, expenseCategories, incomeCategories),
        merchant: cleanString(rec.merchant),
        counterparty: cleanString(rec.counterparty),
        account_name: cleanString(rec.account_name),
        description: cleanString(rec.description),
        confidence,
        needs_review: needsReview,
      };
    })
    .filter((item): item is ParseNormalizedTransaction => Boolean(item));
}

export function normalizeVoiceReviewMatches(
  raw: unknown,
  availableCategories: string[],
): VoiceReviewMatch[] {
  const source = Array.isArray(raw) ? raw : [];
  const seen = new Set<number>();

  return source
    .map((item) => {
      const rec = asRecord(item);
      if (!rec) return null;

      const indexValue = typeof rec.index === 'number' && Number.isInteger(rec.index) ? rec.index : Number(rec.index);
      if (!Number.isInteger(indexValue) || indexValue <= 0 || seen.has(indexValue)) return null;

      const requestedCategory = cleanString(rec.category_name);
      if (!requestedCategory) return null;

      const matchedCategory = availableCategories.find(
        (category) => category.toLowerCase() === requestedCategory.toLowerCase(),
      );
      if (!matchedCategory) return null;

      const txType: TxType = rec.transaction_type === 'income' || rec.transaction_type === 'transfer' || rec.transaction_type === 'expense'
        ? rec.transaction_type
        : 'expense';

      seen.add(indexValue);
      return {
        index: indexValue,
        category_name: matchedCategory,
        transaction_type: txType,
      };
    })
    .filter((item): item is VoiceReviewMatch => Boolean(item));
}
