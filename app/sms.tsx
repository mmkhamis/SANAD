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

const SMS_PROCESSED_PREFIX = 'sms_processed:';

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
  const params = useLocalSearchParams<{ text?: string }>();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const qc = useQueryClient();
  const processedText = useRef<string | null>(null);

  // ─── Resolve text from params or native URL ────────────────────
  const [resolvedText, setResolvedText] = React.useState<string | null>(null);

  useEffect(() => {
    if (params.text && !resolvedText) {
      setResolvedText(params.text);
    }
  }, [params.text, resolvedText]);

  useEffect(() => {
    if (resolvedText) return;
    let cancelled = false;

    Linking.getInitialURL()
      .then((url) => {
        if (cancelled || !url) return;
        const parsed = Linking.parse(url);
        const raw = parsed.queryParams?.text;
        if (typeof raw === 'string' && raw) setResolvedText(raw);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', (event) => {
      if (cancelled) return;
      const parsed = Linking.parse(event.url);
      const raw = parsed.queryParams?.text;
      if (typeof raw === 'string' && raw) setResolvedText(raw);
    });

    return () => { cancelled = true; sub.remove(); };
  }, [resolvedText]);

  // ─── Process + notify + redirect ───────────────────────────────
  useEffect(() => {
    if (!resolvedText) return;
    if (processedText.current === resolvedText) return;
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      processedText.current = resolvedText;
      router.replace('/(tabs)');
      return;
    }

    processedText.current = resolvedText;

    const run = async (): Promise<void> => {
      try {
        // Decode
        let decoded: string;
        try { decoded = decodeURIComponent(resolvedText); } catch { decoded = resolvedText; }

        // Dedup
        const dedupKey = SMS_PROCESSED_PREFIX + hashText(decoded);
        const isDuplicate = await smsDedup.has(dedupKey);
        if (isDuplicate) {
          router.replace('/(tabs)');
          return;
        }

        // Parse
        const parsed = parseSmsToTransaction(decoded);
        if (!parsed) {
          router.replace('/(tabs)');
          return;
        }

        // Save
        try {
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
          });

          await smsDedup.add(dedupKey);

          // Invalidate caches
          qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
          qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
          qc.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions });

          // Send local notification (merchant + category, no "Card payment")
          await notifySmsTransaction({
            amount: parsed.amount,
            type: parsed.transaction_type,
            merchant: parsed.merchant,
            counterparty: parsed.counterparty,
            category: parsed.suggested_category_label ?? null,
          });
        } catch (saveErr) {
          if (isNetworkError(saveErr)) {
            // Enqueue for replay when connectivity returns.
            // Mark dedup key NOW so the same SMS deep link won't re-enqueue
            // if the app re-opens before the queue is replayed.
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
              },
            });
            // Store dedup key so the same SMS deep link won't queue it again
            await smsDedup.add(dedupKey);
          }
          // Non-network errors: silently discard (malformed SMS, RLS error, etc.)
        }
      } catch {
        // Silently fail — don't block the user
      }

      // Always navigate away
      router.replace('/(tabs)');
    };

    run();
  }, [resolvedText, isAuthenticated, isAuthLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Minimal loading screen while processing (flashes briefly)
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}
