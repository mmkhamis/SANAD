import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { parseSmsToTransaction } from '../utils/sms-parser';
import { createSMSTransaction } from '../services/transaction-service';
import { notifySmsTransaction } from '../services/notification-service';
import { adjustAccountBalance } from '../services/account-service';
import { useAuthStore } from '../store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/query-client';
import { useThemeColors } from '../hooks/useThemeColors';
import { smsDedup } from '../lib/sms-dedup';
import { invokeWithRetry } from '../lib/supabase';
import { isNetworkError } from '../utils/offline/network-error';

const SMS_PROCESSED_PREFIX = 'sms_processed:';

interface IngestSmsResponse {
  ok: boolean;
  status: 'created' | 'duplicate' | 'no_amount' | 'offer' | 'dropped' | 'error';
  transaction?: {
    id: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    description: string;
    merchant: string | null;
    counterparty: string | null;
    category_name: string | null;
    needs_review: boolean;
    parser_source: string;
  };
  error?: string;
}

/** Simple string hash for deduplication (not cryptographic). */
function hashText(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return String(h);
}

// ─── Silent SMS Processor ────────────────────────────────────────────
//
// Flow:
//   ONLINE  → edge function (AI parses, categorizes, saves, adjusts balances)
//   OFFLINE → local parser (regex) saves to DB without category, needs_review=true
//
// Either way: notification fires, transaction shows in Recent/Transactions immediately.
// Nothing goes to the offline queue — we save directly in both paths.

export default function SMSProcessorScreen(): React.ReactElement {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    text?: string;
    sms?: string;
    message?: string;
    body?: string;
    force?: string;
    nonce?: string;
  }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const qc = useQueryClient();
  const processedPayload = useRef<string | null>(null);
  const hasNavigated = useRef(false);

  const navigateToTabs = React.useCallback((): void => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    router.replace('/(tabs)');
  }, [router]);

  const firstQueryValue = React.useCallback((v: unknown): string | null => {
    if (typeof v === 'string' && v.trim().length > 0) return v;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && item.trim().length > 0) return item;
      }
    }
    return null;
  }, []);

  const parseQuery = React.useCallback((qp: Record<string, unknown>): {
    text: string | null;
    force: boolean;
    nonce: string | null;
  } => {
    const text =
      firstQueryValue(qp.text)
      ?? firstQueryValue(qp.sms)
      ?? firstQueryValue(qp.message)
      ?? firstQueryValue(qp.body);

    const forceRaw = firstQueryValue(qp.force)?.toLowerCase() ?? '';
    const force = forceRaw === '1' || forceRaw === 'true' || forceRaw === 'yes' || forceRaw === 'y';
    const nonce = firstQueryValue(qp.nonce);
    return { text, force, nonce };
  }, [firstQueryValue]);

  // ─── Resolve text from params or native URL ────────────────────
  const [resolvedPayload, setResolvedPayload] = React.useState<{
    text: string;
    force: boolean;
    nonce: string | null;
  } | null>(null);

  // Accept new payloads — each unique SMS gets a fresh state
  const updatePayload = React.useCallback((parsed: { text: string | null; force: boolean; nonce: string | null }) => {
    if (!parsed.text) return;
    const key = `${parsed.text}::${parsed.force ? '1' : '0'}::${parsed.nonce ?? ''}`;
    setResolvedPayload((prev) => {
      const prevKey = prev ? `${prev.text}::${prev.force ? '1' : '0'}::${prev.nonce ?? ''}` : null;
      if (prevKey === key) return prev;
      return { text: parsed.text!, force: parsed.force, nonce: parsed.nonce };
    });
  }, []);

  useEffect(() => {
    updatePayload(parseQuery(params as unknown as Record<string, unknown>));
  }, [params, parseQuery, updatePayload]);

  useEffect(() => {
    let cancelled = false;

    Linking.getInitialURL()
      .then((url) => {
        if (cancelled || !url) return;
        const parsed = Linking.parse(url);
        updatePayload(parseQuery((parsed.queryParams ?? {}) as Record<string, unknown>));
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      if (cancelled) return;
      const parsed = Linking.parse(event.url);
      updatePayload(parseQuery((parsed.queryParams ?? {}) as Record<string, unknown>));
    });

    return () => { cancelled = true; sub.remove(); };
  }, [parseQuery, updatePayload]);

  // ─── Process + notify + redirect ───────────────────────────────
  useEffect(() => {
    if (!resolvedPayload) return;
    const payloadKey = `${resolvedPayload.text}::${resolvedPayload.force ? '1' : '0'}::${resolvedPayload.nonce ?? ''}`;
    if (processedPayload.current === payloadKey) return;
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      processedPayload.current = payloadKey;
      navigateToTabs();
      return;
    }

    // Reset navigation for each new SMS
    hasNavigated.current = false;
    processedPayload.current = payloadKey;

    const run = async (): Promise<void> => {
      try {
        // Decode
        let decoded: string;
        try { decoded = decodeURIComponent(resolvedPayload.text); } catch { decoded = resolvedPayload.text; }

        const dedupMaterial = resolvedPayload.nonce
          ? `${decoded}::${resolvedPayload.nonce}`
          : decoded;

        // Dedup
        const dedupKey = SMS_PROCESSED_PREFIX + hashText(dedupMaterial);
        if (!resolvedPayload.force) {
          const isDuplicate = await smsDedup.has(dedupKey);
          if (isDuplicate) {
            console.log('[sms] duplicate, skipping');
            navigateToTabs();
            return;
          }
        }

        // Drop OTP messages immediately — no network call, no DB write
        const OTP_RE = /\b(otp|verification code|one[- ]?time password|pin code)\b|رمز التحقق|رمز التأكيد|كلمة المرور لمرة واحدة|رمز الدخول/i;
        if (OTP_RE.test(decoded) && /\b\d{4,6}\b/.test(decoded)) {
          console.log('[sms] OTP detected, dropping');
          await smsDedup.add(dedupKey);
          navigateToTabs();
          return;
        }

        // Navigate immediately — processing continues in background
        navigateToTabs();

        // ──────────────────────────────────────────────────────────
        // PATH 1: ONLINE → Edge function (AI) handles everything
        // ──────────────────────────────────────────────────────────
        try {
          const ingest = await invokeWithRetry<IngestSmsResponse>('ingest-sms', {
            body: { message: decoded },
          });

          console.log('[sms] AI response:', JSON.stringify({ ok: ingest.ok, status: ingest.status, txId: ingest.transaction?.id, catName: ingest.transaction?.category_name, error: ingest.error }));

          if (ingest.ok && (ingest.status === 'created' || ingest.status === 'duplicate')) {
            // ✓ Edge function parsed, categorized, saved, and adjusted balances
            if (!resolvedPayload.force) {
              await smsDedup.add(dedupKey);
            }

            qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });

            if (ingest.transaction) {
              await notifySmsTransaction({
                amount: ingest.transaction.amount,
                type: ingest.transaction.type,
                merchant: ingest.transaction.merchant,
                counterparty: ingest.transaction.counterparty,
                category: ingest.transaction.category_name,
              });
            }

            console.log('[sms] AI processed:', ingest.status, ingest.transaction?.id);
            return; // Done — AI handled everything
          }

          if (ingest.ok && (ingest.status === 'dropped' || ingest.status === 'offer' || ingest.status === 'no_amount')) {
            // Edge function decided this isn't a transaction (OTP, promo, balance alert)
            if (!resolvedPayload.force) {
              await smsDedup.add(dedupKey);
            }
            console.log('[sms] AI dropped:', ingest.status);
            return;
          }

          // Edge function returned an error status — fall through to local path
          console.warn('[sms] AI returned error:', ingest.error ?? ingest.status);
        } catch (edgeErr) {
          // Network/timeout or function unavailable — fall through to local path
          const isOffline = isNetworkError(edgeErr);
          console.log('[sms] edge function unavailable (offline=%s):', isOffline,
            edgeErr instanceof Error ? edgeErr.message : edgeErr);
        }

        // ──────────────────────────────────────────────────────────
        // PATH 2: OFFLINE / EDGE FAILED → Local parse + direct DB save
        // ──────────────────────────────────────────────────────────
        const parsed = parseSmsToTransaction(decoded);
        if (!parsed) {
          console.log('[sms] local parser could not parse SMS');
          return;
        }

        console.log('[sms] local parse:', parsed.amount, parsed.transaction_type, parsed.merchant, parsed.suggested_category_key);

        // Save directly to DB — no queue, no waiting
        const savedTx = await createSMSTransaction({
          amount: parsed.amount,
          type: parsed.transaction_type,
          transaction_type: parsed.transaction_type,
          description: parsed.description,
          merchant: parsed.merchant,
          counterparty: parsed.counterparty,
          date: parsed.date,
          notes: decoded,
          parse_confidence: parsed.parse_confidence,
          review_reason: (parsed.review_reason ? parsed.review_reason + '; ' : '') + 'offline_parse',
          from_last4: parsed.from_last4 ?? null,
          to_last4: parsed.to_last4 ?? null,
          suggested_category_key: parsed.suggested_category_key ?? null,
        });

        if (!resolvedPayload.force) {
          await smsDedup.add(dedupKey);
        }

        // Adjust account balance (mirrors what the edge function does online)
        const txAny = savedTx as unknown as Record<string, unknown>;
        if (savedTx.amount > 0) {
          if (savedTx.type === 'transfer') {
            if (txAny.from_account_id) {
              await adjustAccountBalance(txAny.from_account_id as string, -savedTx.amount).catch(() => {});
            }
            if (txAny.to_account_id) {
              await adjustAccountBalance(txAny.to_account_id as string, savedTx.amount).catch(() => {});
            }
          } else if (savedTx.type === 'expense' && savedTx.account_id) {
            await adjustAccountBalance(savedTx.account_id, -savedTx.amount).catch(() => {});
          } else if (savedTx.type === 'income' && savedTx.account_id) {
            await adjustAccountBalance(savedTx.account_id, savedTx.amount).catch(() => {});
          }
        }

        qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
        qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });

        await notifySmsTransaction({
          amount: parsed.amount,
          type: parsed.transaction_type,
          merchant: parsed.merchant,
          counterparty: parsed.counterparty,
          category: parsed.suggested_category_label ?? null,
        });

        console.log('[sms] saved locally (offline fallback):', savedTx.id);

      } catch (err) {
        console.error('[sms] fatal error:', err instanceof Error ? err.message : err);
      }
    };

    run();
  }, [resolvedPayload, isAuthenticated, isAuthLoading, navigateToTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}
