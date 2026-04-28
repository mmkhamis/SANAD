import {
  readAsStringAsync,
  copyAsync,
  deleteAsync,
  cacheDirectory,
  EncodingType,
} from 'expo-file-system/legacy';

import { invokeWithRetry } from '../lib/supabase';
import type {
  SmartInputResult,
  ParseResult,
  TransactionType,
  Category,
} from '../types/index';
import { createTransaction, type CreateTransactionInput } from './transaction-service';
import { FLATTENED_SUBCATEGORIES } from '../constants/category-taxonomy';

// ─── Hallucination filter for voice transcription ────────────────────
// When audio is silent/unclear, Whisper may echo parts of the prompt.
// We detect that by checking for known prompt fragments and return null.

const PROMPT_FRAGMENTS = [
  'critical',
  'transcribe only',
  'never fabricate',
  'if silent',
  'return empty',
  'franko',
  'dafa3t',
  'فلوس',
  'مبلغ',
  'expect:',
  'possible merchants:',
  'merchants:',
  'currencies:',
  'actions:',
  'voice note',
  'تسجيل صوتي',
];

function filterPromptHallucination(text: string): string | null {
  if (!text || !text.trim()) return null;
  const lower = text.trim().toLowerCase();

  // If the transcription contains 2+ prompt fragments, it's hallucination
  let hits = 0;
  for (const frag of PROMPT_FRAGMENTS) {
    if (lower.includes(frag)) hits++;
    if (hits >= 2) return null;
  }

  // If it's extremely short (1-2 chars) and not a number, likely noise
  if (lower.length <= 2 && !/\d/.test(lower)) return null;

  return text.trim();
}

// ─── Parse text via Edge Function ────────────────────────────────────

export interface ParseContext {
  accounts?: { id: string; name: string; type: string }[];
  categories?: { id: string; name: string; type: string }[];
}

const EXPENSE_SIGNAL_RE = /(purchase|paid|payment|spent|debited|withdrawn|card payment|pos|شراء|تم خصم|دفع|سحب|نقطة بيع)/i;
const INCOME_SIGNAL_RE = /(received|credited|deposited|salary|payroll|incoming|refund|cash\s?back|تم إضافة|تم اضافة|تم استلام|إيداع|ايداع|راتب|تحويل وارد|استرداد)/i;
const TRANSFER_SIGNAL_RE = /(transfer(?:red)?|تحويل|حوال[ةه])/i;
const TRANSFER_DIRECTION_RE = /(?:\bfrom\b.*\bto\b|\bto\b.*\bfrom\b|من\s+.+(?:الى|إلى)|(?:الى|إلى)\s+.+من)/i;
const CARD_INSTRUMENT_RE = /(apple\s?pay|google\s?pay|mada|credit\s*card|card\b|بطاق(?:ة|ه)\s*(?:ائتماني(?:ة|ه)|مدى)?)/i;

function coerceTransactionType(
  text: string,
  candidate: TransactionType,
): TransactionType {
  const hasExpenseSignal = EXPENSE_SIGNAL_RE.test(text);
  const hasIncomeSignal = INCOME_SIGNAL_RE.test(text);
  const hasTransferSignal = TRANSFER_SIGNAL_RE.test(text);
  const hasTransferDirection = TRANSFER_DIRECTION_RE.test(text);
  const hasCardInstrument = CARD_INSTRUMENT_RE.test(text);

  if (candidate === 'income' && hasExpenseSignal && !hasIncomeSignal) {
    return hasTransferSignal && hasTransferDirection && !hasCardInstrument ? 'transfer' : 'expense';
  }

  if (candidate === 'transfer' && hasExpenseSignal && hasCardInstrument && !hasTransferDirection) {
    return 'expense';
  }

  if (candidate === 'expense' && hasIncomeSignal && !hasExpenseSignal && !hasCardInstrument) {
    return hasTransferSignal && hasTransferDirection ? 'transfer' : 'income';
  }

  return candidate;
}

export async function parseTransactionText(
  text: string,
  context?: ParseContext,
): Promise<SmartInputResult[]> {
  const data = await invokeWithRetry<{
    transactions?: SmartInputResult[];
    results?: ParseResult[];
  } | SmartInputResult>(
    'parse-transaction',
    {
      body: {
        text,
        accounts: context?.accounts ?? [],
        categories: context?.categories ?? [],
      },
    },
  );

  // Canonical parser-v2 payload: { results: ParseResult[] }
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results?: ParseResult[] }).results)) {
    const mapped = ((data as { results: ParseResult[] }).results ?? [])
      .filter((item) => item.should_create_transaction && item.amount !== null)
      .map((item) => {
        const transaction_type = coerceTransactionType(
          text,
          item.message_class === 'income' || item.message_class === 'refund'
            ? 'income'
            : item.message_class === 'transfer'
              ? 'transfer'
              : 'expense',
        );

        return {
          amount: item.amount,
          currency: item.currency,
          transaction_type,
          category: null,
          merchant: item.merchant_raw,
          counterparty: item.counterparty_name,
          account_name: null,
          confidence: item.confidence,
          needs_review: item.confidence < 0.85 || item.review_flags.length > 0,
          source: item.parser_source === 'rules' ? 'rules' : 'ai',
          date: (item.timestamp ?? new Date().toISOString()).slice(0, 10),
          description:
            item.descriptor
            ?? item.merchant_raw
            ?? item.counterparty_name
            ?? text.trim().slice(0, 80),
        } satisfies SmartInputResult;
      });
    if (__DEV__) console.log('[parseTransactionText]', mapped.length, 'transactions (canonical)');
    return mapped;
  }
  // Legacy payload: { transactions: [...] }
  if (data && typeof data === 'object' && 'transactions' in data && Array.isArray(data.transactions)) {
    const normalized = data.transactions.map((item) => ({
      ...item,
      transaction_type: coerceTransactionType(text, item.transaction_type ?? 'expense'),
    }));
    if (__DEV__) console.log('[parseTransactionText]', normalized.length, 'transactions');
    return normalized;
  }
  // Backward compat: single object
  if (__DEV__) console.log('[parseTransactionText] single result, wrapping');
  const single = data as SmartInputResult;
  return [{
    ...single,
    transaction_type: coerceTransactionType(text, single.transaction_type ?? 'expense'),
  }];
}

// ─── Match category by name ─────────────────────────────────────────

/** Normalise text for matching: lowercase, strip diacritics, collapse whitespace */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, '') // Latin + Arabic diacritics
    .replace(/[\/\-_&]/g, ' ')                           // treat separators as spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split into unique tokens for overlap comparison */
function tokens(s: string): Set<string> {
  return new Set(norm(s).split(' ').filter(Boolean));
}

/** Token-overlap score (Jaccard-ish: intersection / min-set-size) */
function tokenScore(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap++;
  return overlap / Math.min(ta.size, tb.size);
}

/**
 * Build a reverse lookup: alias → taxonomy subcategory key.
 * Cached on first call.
 */
let _aliasIndex: Map<string, string> | null = null;
function getAliasIndex(): Map<string, string> {
  if (_aliasIndex) return _aliasIndex;
  _aliasIndex = new Map<string, string>();
  for (const sub of FLATTENED_SUBCATEGORIES) {
    // Index by label and key
    _aliasIndex.set(norm(sub.label), sub.key);
    _aliasIndex.set(norm(sub.key.replace(/_/g, ' ')), sub.key);
    // Index by parent label
    _aliasIndex.set(norm(sub.parentLabel), sub.parentKey);
    for (const alias of sub.aliases ?? []) {
      _aliasIndex.set(norm(alias), sub.key);
    }
  }
  return _aliasIndex;
}

export function matchCategory(
  categoryName: string | null,
  categories: Category[],
  transactionType: TransactionType,
): Category | null {
  if (!categoryName) return null;
  const lower = norm(categoryName);
  const typed = categories.filter((c) => c.type === transactionType);
  if (typed.length === 0) return null;

  // 1. Exact name match
  const exact = typed.find((c) => norm(c.name) === lower);
  if (exact) return exact;

  // 2. Alias → taxonomy key → match user category by taxonomy_key
  const aliasIndex = getAliasIndex();
  const taxKey = aliasIndex.get(lower);
  if (taxKey) {
    const byKey = typed.find((c) => c.taxonomy_key === taxKey);
    if (byKey) return byKey;
    // Also check parent key (e.g. "food_dining" when category has taxonomy_key "groceries")
    const sub = FLATTENED_SUBCATEGORIES.find((s) => s.key === taxKey);
    if (sub) {
      const byParent = typed.find((c) => c.taxonomy_key === sub.parentKey);
      if (byParent) return byParent;
    }
  }

  // 3. Fuzzy alias scan: check each token of the input against all aliases
  //    of each user category's taxonomy entry
  let bestScore = 0;
  let bestCat: Category | null = null;

  for (const cat of typed) {
    if (!cat.taxonomy_key) continue;
    // Gather all aliases for this category's taxonomy key (as subcategory or parent)
    const matchingSubs = FLATTENED_SUBCATEGORIES.filter(
      (s) => s.key === cat.taxonomy_key || s.parentKey === cat.taxonomy_key,
    );
    for (const sub of matchingSubs) {
      // Check label
      const labelScore = tokenScore(categoryName, sub.label);
      if (labelScore > bestScore) { bestScore = labelScore; bestCat = cat; }
      // Check parent label
      const parentScore = tokenScore(categoryName, sub.parentLabel);
      if (parentScore > bestScore) { bestScore = parentScore; bestCat = cat; }
      // Check aliases
      for (const alias of sub.aliases ?? []) {
        const aScore = tokenScore(categoryName, alias);
        if (aScore > bestScore) { bestScore = aScore; bestCat = cat; }
      }
    }
  }
  if (bestScore >= 0.5 && bestCat) return bestCat;

  // 4. Direct substring match on name (fallback)
  const partial = typed.find(
    (c) => norm(c.name).includes(lower) || lower.includes(norm(c.name)),
  );
  if (partial) return partial;

  // 5. Word-overlap on category name (catches "Dining / Food" → "Food & Dining")
  let bestNameScore = 0;
  let bestNameCat: Category | null = null;
  for (const cat of typed) {
    const score = tokenScore(categoryName, cat.name);
    if (score > bestNameScore) { bestNameScore = score; bestNameCat = cat; }
  }
  if (bestNameScore >= 0.5 && bestNameCat) return bestNameCat;

  return null;
}

// ─── Create transaction from smart input ─────────────────────────────

export interface SmartTransactionInput {
  amount: number;
  type: TransactionType;
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  description: string;
  merchant?: string | null;
  counterparty?: string | null;
  date: string;
  notes?: string | null;
  account_id?: string | null;
  parse_confidence?: number;
  needs_review?: boolean;
  /** Tracks how the input was captured: 'smart-text' | 'voice' | 'ocr' */
  input_source?: 'smart-text' | 'voice' | 'ocr';
  /** Optional idempotency key to prevent duplicate inserts on network retry */
  idempotency_key?: string;
}

export async function createSmartTransaction(
  input: SmartTransactionInput,
): Promise<ReturnType<typeof createTransaction>> {
  // Map input_source to a valid DB source enum (manual|sms|ocr|recurring).
  const dbSource: 'manual' | 'sms' | 'ocr' | 'recurring' =
    input.input_source === 'ocr' ? 'ocr' : 'manual';

  // Delegate to createTransaction which handles:
  // - idempotency dedup
  // - account balance adjustment (adjustAccountBalance RPC)
  // - proper row construction
  return createTransaction({
    amount: input.amount,
    type: input.type,
    category_id: input.category_id,
    category_name: input.category_name,
    category_icon: input.category_icon,
    category_color: input.category_color,
    description: input.description,
    merchant: input.merchant ?? null,
    counterparty: input.counterparty ?? null,
    date: input.date,
    notes: input.notes ?? null,
    account_id: input.account_id ?? null,
    source: dbSource,
    idempotency_key: input.idempotency_key,
  });
}

// ─── Voice transcription via Edge Function ───────────────────────────

export async function transcribeVoiceNote(audioUri: string): Promise<string> {
  // Read file as base64 — handle both file:// and content:// URIs
  let base64: string;
  try {
    base64 = await readAsStringAsync(audioUri, {
      encoding: EncodingType.Base64,
    });
  } catch {
    // Fallback: copy to a known cache path first, then read
    const cachePath = `${cacheDirectory}voice_${Date.now()}.m4a`;
    await copyAsync({ from: audioUri, to: cachePath });
    base64 = await readAsStringAsync(cachePath, {
      encoding: EncodingType.Base64,
    });
    deleteAsync(cachePath, { idempotent: true }).catch(() => {});
  }

  if (!base64 || base64.length === 0) {
    throw new Error('Audio file is empty');
  }

  // Derive MIME type from file extension so the edge function sends
  // the correct format to OpenAI Whisper (avoids 400 from format mismatch)
  const ext = audioUri.split('.').pop()?.toLowerCase() ?? 'm4a';
  const mimeMap: Record<string, string> = {
    m4a: 'audio/m4a', caf: 'audio/m4a', mp4: 'audio/mp4',
    '3gp': 'audio/3gpp', wav: 'audio/wav', ogg: 'audio/ogg',
    webm: 'audio/webm', mp3: 'audio/mpeg',
  };
  const mime_type = mimeMap[ext] ?? 'audio/m4a';

  const data = await invokeWithRetry<{ text?: string }>(
    'transcribe-voice',
    { body: { audio_base64: base64, mime_type } },
  );

  if (!data?.text) throw new Error('No transcription returned');

  // Filter out hallucinated prompt fragments that Whisper produces on silence
  const cleaned = filterPromptHallucination(data.text);
  if (!cleaned) throw new Error('No transcription returned');
  return cleaned;
}

// ─── OCR receipt via Edge Function ───────────────────────────────────

export interface OCRResult {
  text: string;
  amount: number | null;
  currency: string | null;
  transaction_type: 'income' | 'expense' | 'transfer';
  category: string | null;
  merchant: string | null;
  date: string | null;
  items: string[];
}

export async function ocrReceiptImage(imageBase64: string): Promise<OCRResult> {
  if (!imageBase64 || imageBase64.length === 0) {
    throw new Error('Image data is empty');
  }

  const data = await invokeWithRetry<OCRResult>(
    'ocr-receipt',
    { body: { image_base64: imageBase64 } },
  );

  return data;
}

// ─── LLM-powered voice review matching ───────────────────────────────

interface VoicePendingItem {
  index: number;
  amount: number;
  description: string;
  merchant: string | null;
}

export interface VoiceMatchResult {
  index: number;
  category_name: string;
  transaction_type: 'income' | 'expense' | 'transfer';
}

export async function matchVoiceToReview(
  transcription: string,
  pendingItems: VoicePendingItem[],
  availableCategories: string[],
): Promise<VoiceMatchResult[]> {
  const data = await invokeWithRetry<{ matches?: VoiceMatchResult[] }>(
    'match-voice-review',
    {
      body: {
        transcription,
        pending_items: pendingItems,
        available_categories: availableCategories,
      },
    },
  );

  return data?.matches ?? [];
}
