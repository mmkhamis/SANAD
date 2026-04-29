import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '../store/auth-store';
import { supabase } from '../lib/supabase';

export interface Offer {
  id: string;
  received_at: string;
  institution_name: string | null;
  body: string;
  cta_url: string | null;
  confidence: number;
}

const QUERY_KEY = ['offers'] as const;

async function fetchOffers(): Promise<Offer[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('offers')
    .select('id, received_at, institution_name, body, cta_url, confidence')
    .eq('user_id', user.id)
    .order('received_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as Offer[];
}

export function useOffers() {
  return useQuery<Offer[], Error>({
    queryKey: QUERY_KEY,
    queryFn: fetchOffers,
    staleTime: 10 * 60 * 1000,
    enabled: useAuthStore.getState().isAuthenticated,
  });
}

export { QUERY_KEY as OFFERS_QUERY_KEY };
