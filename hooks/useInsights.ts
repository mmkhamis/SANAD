/**
 * TanStack Query hook for fetching AI-powered financial insights.
 *
 * Data flow:
 *   Supabase → useQuery (cache 5 min, stale 2 min) → InsightCard UI
 *
 * Supports real-time subscription on the `ai_insights` table so new
 * insights appear without a manual refresh.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '../lib/supabase';
import { QUERY_KEYS } from '../lib/query-client';

export interface Insight {
  id: string;
  user_id: string;
  message: string;
  type: 'spending' | 'saving' | 'budget' | 'trend' | 'alert';
  priority: 'low' | 'medium' | 'high';
  is_read: boolean;
  created_at: string;
}

/** Fetch insights from Supabase */
async function fetchInsights(): Promise<Insight[]> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data as Insight[]) ?? [];
}

/**
 * Hook to fetch and cache AI insights.
 *
 * - `staleTime: 2 * 60_000` — consider data fresh for 2 minutes
 * - `gcTime: 5 * 60_000` — keep in cache for 5 minutes after unmount
 * - Real-time subscription auto-invalidates the query on INSERT
 */
export function useInsights() {
  const qc = useQueryClient();

  const query = useQuery<Insight[], Error>({
    queryKey: QUERY_KEYS.aiInsight,
    queryFn: fetchInsights,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
  });

  // Real-time: listen for new insights and invalidate
  useEffect(() => {
    const channel = supabase
      .channel('insights-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_insights' },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.aiInsight });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}
