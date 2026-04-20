/**
 * Generates plan-savings insights for the user's tracked subscriptions.
 * Region defaults to the user's stored country_code; pass an override for tests.
 */

import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import { useSubscriptions } from './useSubscriptions';
import { useAuthStore } from '../store/auth-store';
import {
  generateSavingsInsights,
  type SubscriptionSavingsInsight,
} from '../services/subscription-pricing-service';

interface UseSubscriptionInsightsResult {
  data: SubscriptionSavingsInsight[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useSubscriptionInsights(regionOverride?: string): UseSubscriptionInsightsResult {
  const { data: subs, isLoading: subsLoading } = useSubscriptions();
  const user = useAuthStore((s) => s.user);
  const region = (regionOverride ?? user?.country_code ?? '').toUpperCase();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEYS.subscriptionSavings(region || 'unknown'),
    queryFn: () => generateSavingsInsights(subs ?? [], region),
    enabled: !!region && !!subs && subs.length > 0,
    staleTime: 1000 * 60 * 60,
  });

  return {
    data: data ?? [],
    isLoading: isLoading || subsLoading,
    isError,
    refetch,
  };
}
