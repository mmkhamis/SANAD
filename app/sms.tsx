import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { parseSmsToTransaction } from '../utils/sms-parser';
import { createSMSTransaction } from '../services/transaction-service';
import { notifySmsTransaction } from '../services/notification-service';
import { useAuthStore } from '../store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../lib/query-client';
import { useThemeColors } from '../hooks/useThemeColors';
import { smsDedup } from '../lib/sms-dedup';
import { enqueue } from '../services/offline-queue-service';
import { isNetworkError } from '../utils/offline/network-error';
import { invokeWithRetry } from '../lib/supabase';

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
// Receives SMS text via deep link, processes in background, fires a
// local notification with the result, and redirects to the dashboard.
// No debug UI is shown — the user only sees the notification.

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

  useEffect(() => {
    if (resolvedPayload) return;
    const parsed = parseQuery(params as unknown as Record<string, unknown>);
    if (parsed.text) {
      setResolvedPayload({ text: parsed.text, force: parsed.force, nonce: parsed.nonce });
    }
  }, [params, parseQuery, resolvedPayload]);

  useEffect(() => {
    if (resolvedPayload) return;
    let cancelled = false;

    Linking.getInitialURL()
      .then((url) => {
        if (cancelled || !url) return;
        const parsed = Linking.parse(url);
        const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;
        const q = parseQuery(qp);
        if (q.text) setResolvedPayload({ text: q.text, force: q.force, nonce: q.nonce });
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      if (cancelled) return;
      const parsed = Linking.parse(event.url);
      const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;
      const q = parseQuery(qp);
      if (q.text) setResolvedPayload({ text: q.text, force: q.force, nonce: q.nonce });
    });

    return () => { cancelled = true; sub.remove(); };
  }, [parseQuery, resolvedPayload]);

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
            navigateToTabs();
            return;
          }
        }

        // Do not block app entry while ingestion/network work is still running.
        // The async pipeline continues in the background and will invalidate
        // dashboard/transactions queries when done.
        navigateToTabs();

        try {
          const ingest = await invokeWithRetry<IngestSmsResponse>('ingest-sms', {
            body: { message: decoded },
          });
          if (!ingest.ok) {
            throw new Error('ingest-sms failed');
          }

          // Mark as processed for this local device/session once the server
          // acknowledges the message (created, duplicate, dropped, offer...).
          if (!resolvedPayload.force) {
            await smsDedup.add(dedupKey);
          }

          // Only transaction statuses trigger the in-app local notification.
          if ((ingest.status === 'created' || ingest.status === 'duplicate') && ingest.transaction) {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });

            await notifySmsTransaction({
              amount: ingest.transaction.amount,
              type: ingest.transaction.type,
              merchant: ingest.transaction.merchant,
              counterparty: ingest.transaction.counterparty,
              category: ingest.transaction.category_name,
            });
          }
        } catch (saveErr) {
          // Fallback path: keep SMS capture working even if ingest-sms is
          // unavailable/misaligned (e.g. edge deploy or schema lag).
          const parsed = parseSmsToTransaction(decoded);
          if (!parsed) {
            navigateToTabs();
            return;
          }

          if (isNetworkError(saveErr)) {
            // Offline: enqueue and replay later.
            const queueId = `sms-${dedupKey}`;
            await enqueue({
              id: queueId,
              type: 'sms_transaction',
              payload: {
                amount: parsed.amount,
                type: parsed.transaction_type,
                transaction_type: parsed.transaction_type,
                description: parsed.description,
                merchant: parsed.merchant,
                counterparty: parsed.counterparty,
                date: parsed.date,
                notes: decoded,
                parse_confidence: parsed.parse_confidence,
                review_reason: parsed.review_reason,
                from_last4: parsed.from_last4 ?? null,
                to_last4: parsed.to_last4 ?? null,
              },
            });
            if (!resolvedPayload.force) {
              await smsDedup.add(dedupKey);
            }
          } else {
            // Backend/edge error: fallback to direct DB insert (legacy path).
            await createSMSTransaction({
              amount: parsed.amount,
              type: parsed.transaction_type,
              transaction_type: parsed.transaction_type,
              description: parsed.description,
              merchant: parsed.merchant,
              counterparty: parsed.counterparty,
              date: parsed.date,
              notes: decoded,
              parse_confidence: parsed.parse_confidence,
              review_reason: parsed.review_reason,
              from_last4: parsed.from_last4 ?? null,
              to_last4: parsed.to_last4 ?? null,
            });
            if (!resolvedPayload.force) {
              await smsDedup.add(dedupKey);
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
          }
        }
      } catch {
        // Silently fail — don't block the user
      }

      // Always navigate away
      navigateToTabs();
    };

    run();
  }, [resolvedPayload, isAuthenticated, isAuthLoading, navigateToTabs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Minimal loading screen while processing (flashes briefly)
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}
