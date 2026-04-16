import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/query-client';
import {
  parseTransactionText,
  createSmartTransaction,
  matchCategory,
  type SmartTransactionInput,
  type OCRResult,
  type ParseContext,
} from '../services/smart-input-service';
import { suggestCategory } from '../utils/sms-parser';
import { normalizeMerchant } from '../utils/merchant';
import type { SmartInputResult, Category, Account, TransactionType } from '../types/index';

// ─── useParseTransaction ─────────────────────────────────────────────

export function useParseTransaction() {
  const { mutateAsync, isPending, error, reset } = useMutation<
    SmartInputResult[],
    Error,
    { text: string; context?: ParseContext }
  >({
    mutationFn: ({ text, context }) => parseTransactionText(text, context),
  });

  return { mutateAsync, isPending, error: error as Error | null, reset };
}

// ─── useCreateParsedTransaction ──────────────────────────────────────

export function useCreateParsedTransaction() {
  const qc = useQueryClient();
  const { mutateAsync, isPending, error, reset } = useMutation({
    mutationFn: createSmartTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
    },
  });

  return { mutateAsync, isPending, error: error as Error | null, reset };
}

// ─── useSmartInput (orchestrator) ────────────────────────────────────

export interface TransactionDraft {
  id: string;
  parseResult: SmartInputResult;
  amount: string;
  transactionType: TransactionType;
  category: Category | null;
  merchant: string;
  counterparty: string;
  description: string;
  date: string;
  notes: string;
  accountId: string | null;
  saved: boolean;
  /** Per-draft error message, null when no error */
  error: string | null;
}

export interface SmartInputState {
  rawText: string;
  drafts: TransactionDraft[];
  activeDraftIndex: number;
  inputSource: 'smart-text' | 'voice' | 'ocr';
}

const initialState: SmartInputState = {
  rawText: '',
  drafts: [],
  activeDraftIndex: 0,
  inputSource: 'smart-text',
};

let draftCounter = 0;
function nextDraftId(): string {
  draftCounter += 1;
  return `draft-${Date.now()}-${draftCounter}`;
}

export function useSmartInput(
  categories: Category[],
  accounts: Account[],
  defaultAccountId?: string | null,
) {
  const [state, setState] = useState<SmartInputState>(initialState);
  const parseMutation = useParseTransaction();
  const createMutation = useCreateParsedTransaction();

  // Use a ref so confirmDraft always reads the latest state
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── Resolve account from AI's account_name ───────────────────
  const resolveAccount = useCallback((accountName: string | null | undefined): string | null => {
    if (!accountName || accounts.length === 0) return defaultAccountId ?? null;
    const lower = accountName.toLowerCase();
    // Exact name match
    const exact = accounts.find((a) => a.name.toLowerCase() === lower);
    if (exact) return exact.id;
    // Partial / type match (e.g. "bank" → account with type "bank", "cash" → type "cash")
    const byType = accounts.find((a) => lower.includes(a.type) || a.type.includes(lower));
    if (byType) return byType.id;
    // Substring match on name
    const partial = accounts.find(
      (a) => a.name.toLowerCase().includes(lower) || lower.includes(a.name.toLowerCase()),
    );
    if (partial) return partial.id;
    return defaultAccountId ?? null;
  }, [accounts, defaultAccountId]);

  // ─── Resolve category for a parse result ─────────────────────
  const resolveCategory = useCallback((result: SmartInputResult, rawText: string): Category | null => {
    let matched = matchCategory(result.category, categories, result.transaction_type);

    if (!matched) {
      const localSuggestion = suggestCategory(rawText);
      if (localSuggestion) {
        matched = matchCategory(localSuggestion, categories, result.transaction_type);
      }
    }

    if (!matched && result.merchant) {
      const merchantSuggestion = suggestCategory(result.merchant);
      if (merchantSuggestion) {
        matched = matchCategory(merchantSuggestion, categories, result.transaction_type);
      }
    }

    if (!matched && result.description) {
      const descSuggestion = suggestCategory(result.description);
      if (descSuggestion) {
        matched = matchCategory(descSuggestion, categories, result.transaction_type);
      }
    }

    return matched;
  }, [categories]);

  // ─── Build a draft from a parse result ───────────────────────
  const buildDraft = useCallback((result: SmartInputResult, rawText: string): TransactionDraft => ({
    id: nextDraftId(),
    parseResult: result,
    amount: result.amount != null ? String(result.amount) : '',
    transactionType: result.transaction_type,
    category: resolveCategory(result, rawText),
    merchant: normalizeMerchant(result.merchant) ?? '',
    counterparty: result.counterparty ?? '',
    description: result.description ?? '',
    date: result.date ?? new Date().toISOString().split('T')[0],
    notes: '',
    accountId: resolveAccount(result.account_name),
    saved: false,
    error: null,
  }), [resolveCategory, resolveAccount]);

  // ─── Update a field on a specific draft ──────────────────────
  const updateDraftField = useCallback(<K extends keyof TransactionDraft>(
    draftIndex: number,
    key: K,
    value: TransactionDraft[K],
  ) => {
    setState((prev) => {
      const drafts = [...prev.drafts];
      if (drafts[draftIndex]) {
        drafts[draftIndex] = { ...drafts[draftIndex], [key]: value, error: null };
      }
      return { ...prev, drafts };
    });
  }, []);

  // ─── Set active draft index ──────────────────────────────────
  const setActiveDraft = useCallback((index: number) => {
    setState((prev) => ({ ...prev, activeDraftIndex: index }));
  }, []);

  // ─── Set input source ─────────────────────────────────────────
  const setInputSource = useCallback((source: SmartInputState['inputSource']) => {
    setState((prev) => ({ ...prev, inputSource: source }));
  }, []);

  // ─── Remove a draft ──────────────────────────────────────────
  const removeDraft = useCallback((draftIndex: number) => {
    setState((prev) => {
      const drafts = prev.drafts.filter((_, i) => i !== draftIndex);
      const activeDraftIndex = Math.min(prev.activeDraftIndex, Math.max(drafts.length - 1, 0));
      return { ...prev, drafts, activeDraftIndex };
    });
  }, []);

  // ─── Parse text (produces multiple drafts) ───────────────────
  const parseText = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      const context = {
        accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type })),
        categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      };
      const results = await parseMutation.mutateAsync({ text, context });
      const drafts = results.map((r) => buildDraft(r, text));
      setState((prev) => ({
        ...prev,
        rawText: text,
        drafts,
        activeDraftIndex: 0,
      }));
    } catch {
      // parseMutation.error will be set
    }
  }, [parseMutation, buildDraft, accounts, categories]);

  // ─── Process OCR result (single draft) ───────────────────────
  const processOCRResult = useCallback((ocrResult: OCRResult) => {
    const result: SmartInputResult = {
      amount: ocrResult.amount,
      currency: ocrResult.currency,
      transaction_type: ocrResult.transaction_type ?? 'expense',
      category: ocrResult.category,
      merchant: ocrResult.merchant,
      counterparty: null,
      account_name: null,
      confidence: ocrResult.amount ? 0.8 : 0.5,
      needs_review: !ocrResult.amount,
      source: 'ai',
      date: ocrResult.date ?? new Date().toISOString().split('T')[0],
      description: ocrResult.text ?? 'Receipt transaction',
    };
    const draft = buildDraft(result, ocrResult.text ?? 'Receipt scan');
    setState((prev) => ({
      ...prev,
      rawText: ocrResult.text ?? 'Receipt scan',
      drafts: [draft],
      activeDraftIndex: 0,
      inputSource: 'ocr',
    }));
  }, [buildDraft]);

  // ─── Process multiple OCR results (batch receipts) ──────────
  const processMultipleOCRResults = useCallback((ocrResults: OCRResult[]) => {
    const newDrafts = ocrResults.map((ocrResult) => {
      const result: SmartInputResult = {
        amount: ocrResult.amount,
        currency: ocrResult.currency,
        transaction_type: ocrResult.transaction_type ?? 'expense',
        category: ocrResult.category,
        merchant: ocrResult.merchant,
        counterparty: null,
        account_name: null,
        confidence: ocrResult.amount ? 0.8 : 0.5,
        needs_review: !ocrResult.amount,
        source: 'ai',
        date: ocrResult.date ?? new Date().toISOString().split('T')[0],
        description: ocrResult.text ?? 'Receipt transaction',
      };
      return buildDraft(result, ocrResult.text ?? 'Receipt scan');
    });
    setState((prev) => ({
      ...prev,
      rawText: 'Batch receipt scan',
      drafts: newDrafts,
      activeDraftIndex: 0,
      inputSource: 'ocr',
    }));
  }, [buildDraft]);

  // ─── Confirm a single draft (reads from ref to avoid stale closure) ──
  const confirmDraft = useCallback(async (draftIndex: number): Promise<void> => {
    const current = stateRef.current;
    const draft = current.drafts[draftIndex];
    if (!draft) throw new Error('Draft not found');
    if (draft.saved) return; // already saved

    const amount = parseFloat(draft.amount);
    if (isNaN(amount) || amount <= 0) {
      setState((prev) => {
        const drafts = [...prev.drafts];
        drafts[draftIndex] = { ...drafts[draftIndex], error: 'Invalid amount' };
        return { ...prev, drafts };
      });
      throw new Error('Invalid amount');
    }
    if (!draft.category) {
      setState((prev) => {
        const drafts = [...prev.drafts];
        drafts[draftIndex] = { ...drafts[draftIndex], error: 'Select a category' };
        return { ...prev, drafts };
      });
      throw new Error('Select a category');
    }

    const input: SmartTransactionInput = {
      amount,
      type: draft.transactionType,
      category_id: draft.category.id,
      category_name: draft.category.name,
      category_icon: draft.category.icon,
      category_color: draft.category.color,
      description: draft.description || 'Transaction',
      merchant: draft.merchant || null,
      counterparty: draft.counterparty || null,
      date: draft.date,
      notes: draft.notes || null,
      account_id: draft.accountId,
      parse_confidence: draft.parseResult?.confidence,
      needs_review: draft.parseResult?.needs_review,
      input_source: current.inputSource,
    };

    try {
      await createMutation.mutateAsync(input);
      setState((prev) => {
        const drafts = [...prev.drafts];
        drafts[draftIndex] = { ...drafts[draftIndex], saved: true, error: null };
        return { ...prev, drafts };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setState((prev) => {
        const drafts = [...prev.drafts];
        drafts[draftIndex] = { ...drafts[draftIndex], error: msg };
        return { ...prev, drafts };
      });
      throw err;
    }
  }, [createMutation]);

  // ─── Confirm all unsaved drafts (sequential, resilient) ──────
  const confirmAllDrafts = useCallback(async (): Promise<{ saved: number; failed: number }> => {
    const current = stateRef.current;
    let saved = 0;
    let failed = 0;

    for (let i = 0; i < current.drafts.length; i++) {
      if (current.drafts[i].saved) {
        saved++;
        continue;
      }
      try {
        await confirmDraft(i);
        saved++;
      } catch {
        failed++;
      }
    }

    return { saved, failed };
  }, [confirmDraft]);

  const resetState = useCallback(() => {
    setState(initialState);
    parseMutation.reset();
    createMutation.reset();
  }, [parseMutation, createMutation]);

  // Convenience: current active draft
  const activeDraft = state.drafts[state.activeDraftIndex] ?? null;
  const savedCount = state.drafts.filter((d) => d.saved).length;
  const unsavedCount = state.drafts.length - savedCount;
  const allSaved = state.drafts.length > 0 && unsavedCount === 0;

  return {
    state,
    activeDraft,
    savedCount,
    unsavedCount,
    allSaved,
    updateDraftField,
    setActiveDraft,
    setInputSource,
    removeDraft,
    parseText,
    processOCRResult,
    processMultipleOCRResults,
    confirmDraft,
    confirmAllDrafts,
    resetState,
    isParsing: parseMutation.isPending,
    parseError: parseMutation.error,
    isSaving: createMutation.isPending,
    saveError: createMutation.error,
  };
}
