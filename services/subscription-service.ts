import { supabase } from '../lib/supabase';

// ─── Subscription types ──────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

export interface Subscription {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionInput {
  name: string;
  icon: string;
  color: string;
  amount: number;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: string;
  notes?: string | null;
}

// ─── Preset subscriptions for Egypt & Saudi ──────────────────────────

export interface SubscriptionPreset {
  name: string;
  icon: string;
  logo: string | null;
  color: string;
  category: string;
}

export const SUBSCRIPTION_PRESETS: SubscriptionPreset[] = [
  // Streaming
  { name: 'Netflix', icon: '🎬', logo: 'https://cdn.simpleicons.org/netflix/E50914', color: '#E50914', category: 'Streaming' },
  { name: 'Shahid VIP', icon: '📺', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Shahid_Logo.svg/512px-Shahid_Logo.svg.png', color: '#6C3EC1', category: 'Streaming' },
  { name: 'Disney+', icon: '🏰', logo: 'https://cdn.simpleicons.org/disneyplus/113CCF', color: '#113CCF', category: 'Streaming' },
  { name: 'YouTube Premium', icon: '▶️', logo: 'https://cdn.simpleicons.org/youtube/FF0000', color: '#FF0000', category: 'Streaming' },
  { name: 'Spotify', icon: '🎵', logo: 'https://cdn.simpleicons.org/spotify/1DB954', color: '#1DB954', category: 'Music' },
  { name: 'Apple Music', icon: '🎧', logo: 'https://cdn.simpleicons.org/applemusic/FC3C44', color: '#FC3C44', category: 'Music' },
  { name: 'Anghami', icon: '🎶', logo: 'https://cdn.simpleicons.org/anghami/6236FF', color: '#6236FF', category: 'Music' },
  { name: 'OSN+', icon: '📡', logo: null, color: '#1A1A2E', category: 'Streaming' },
  { name: 'STARZPLAY', icon: '⭐', logo: null, color: '#0D0E13', category: 'Streaming' },
  // Telecom — Egypt
  { name: 'Vodafone Egypt', icon: '📱', logo: 'https://cdn.simpleicons.org/vodafone/E60000', color: '#E60000', category: 'Telecom' },
  { name: 'Orange Egypt', icon: '📱', logo: 'https://cdn.simpleicons.org/orange/FF6600', color: '#FF6600', category: 'Telecom' },
  { name: 'Etisalat (e&)', icon: '📱', logo: null, color: '#5F259F', category: 'Telecom' },
  { name: 'WE Egypt', icon: '📱', logo: null, color: '#6B2D8B', category: 'Telecom' },
  // Telecom — Saudi
  { name: 'STC', icon: '📱', logo: null, color: '#4F008C', category: 'Telecom' },
  { name: 'Mobily', icon: '📱', logo: null, color: '#00A651', category: 'Telecom' },
  { name: 'Zain SA', icon: '📱', logo: null, color: '#6B2574', category: 'Telecom' },
  // Cloud & Productivity
  { name: 'iCloud+', icon: '☁️', logo: 'https://cdn.simpleicons.org/icloud/3693F3', color: '#3693F3', category: 'Cloud' },
  { name: 'Google One', icon: '☁️', logo: 'https://cdn.simpleicons.org/google/4285F4', color: '#4285F4', category: 'Cloud' },
  { name: 'Microsoft 365', icon: '💼', logo: 'https://cdn.simpleicons.org/microsoft/D83B01', color: '#D83B01', category: 'Productivity' },
  { name: 'Notion', icon: '📝', logo: 'https://cdn.simpleicons.org/notion/000000', color: '#000000', category: 'Productivity' },
  // Gaming
  { name: 'PlayStation Plus', icon: '🎮', logo: 'https://cdn.simpleicons.org/playstation/003791', color: '#003791', category: 'Gaming' },
  { name: 'Xbox Game Pass', icon: '🎮', logo: 'https://cdn.simpleicons.org/xbox/107C10', color: '#107C10', category: 'Gaming' },
  { name: 'Apple Arcade', icon: '🕹️', logo: 'https://cdn.simpleicons.org/apple/007AFF', color: '#007AFF', category: 'Gaming' },
  // Shopping
  { name: 'Amazon Prime', icon: '📦', logo: 'https://cdn.simpleicons.org/amazon/FF9900', color: '#FF9900', category: 'Shopping' },
  { name: 'Noon VIP', icon: '🛒', logo: null, color: '#FEEE00', category: 'Shopping' },
  // Fitness
  { name: 'Gym Membership', icon: '💪', logo: null, color: '#FF5722', category: 'Fitness' },
  { name: 'Apple Fitness+', icon: '🏃', logo: null, color: '#A2D729', category: 'Fitness' },
  // VPN
  { name: 'NordVPN', icon: '🔒', logo: 'https://cdn.simpleicons.org/nordvpn/4687FF', color: '#4687FF', category: 'Security' },
  { name: 'ExpressVPN', icon: '🔐', logo: null, color: '#DA3940', category: 'Security' },
];

export const SUBSCRIPTION_CATEGORIES = [
  'Streaming', 'Music', 'Telecom', 'Cloud', 'Productivity',
  'Gaming', 'Shopping', 'Fitness', 'Security', 'Other',
];

// ─── CRUD ────────────────────────────────────────────────────────────

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('next_billing_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Subscription[]) ?? [];
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      user_id: session.user.id,
      name: input.name,
      icon: input.icon,
      color: input.color,
      amount: input.amount,
      billing_cycle: input.billing_cycle,
      next_billing_date: input.next_billing_date,
      category: input.category,
      notes: input.notes ?? null,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subscription;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function toggleSubscription(
  id: string,
  isActive: boolean,
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subscription;
}

/** Advance next_billing_date by the subscription's billing cycle. */
export async function markSubscriptionPaid(id: string): Promise<Subscription> {
  // Fetch current subscription to compute the next date
  const { data: sub, error: fetchErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !sub) throw new Error(fetchErr?.message ?? 'Subscription not found');

  const current = new Date(sub.next_billing_date);
  let next: Date;
  switch (sub.billing_cycle as BillingCycle) {
    case 'monthly':
      next = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
      break;
    case 'quarterly':
      next = new Date(current.getFullYear(), current.getMonth() + 3, current.getDate());
      break;
    case 'yearly':
      next = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
      break;
  }

  const pad = (n: number): string => String(n).padStart(2, '0');
  const nextStr = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ next_billing_date: nextStr, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Subscription;
}
