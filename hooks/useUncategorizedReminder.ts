import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { countUncategorizedTransactions } from '../services/transaction-service';
import { scheduleUncategorizedReminder } from '../services/notification-service';
import { QUERY_KEYS } from '../lib/query-client';
import { useAuthStore } from '../store/auth-store';

/**
 * Polls the uncategorized-transactions count and keeps a weekly local
 * reminder in sync with it. If the user has pending work, a Sunday
 * 10:00 nudge is scheduled. If they've cleared everything, the
 * reminder is cancelled.
 *
 * Mount this once at the app root (after auth bootstrap) — it's a
 * fire-and-forget side effect with no render output.
 */
export function useUncategorizedReminder(): { count: number } {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: count = 0 } = useQuery<number, Error>({
    queryKey: [...QUERY_KEYS.transactions, 'uncategorized-count'],
    queryFn: countUncategorizedTransactions,
    enabled: isAuthenticated,
    // Hourly refresh is plenty — this drives a weekly notification.
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    scheduleUncategorizedReminder(count).catch(() => {
      // Notifications may be denied — silent failure is fine.
    });
  }, [count, isAuthenticated]);

  return { count };
}
