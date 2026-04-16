import { supabase } from '../lib/supabase';
import type {
  Community,
  CommunityWithMembers,
  CommunityMember,
  SplitEvent,
  SplitEventDetail,
  SplitItem,
  SplitAssignment,
  SplitSettlement,
} from '../types/index';

// ─── Communities ─────────────────────────────────────────────────────

export async function fetchMyCommunities(): Promise<CommunityWithMembers[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch communities where the user is a member
  const { data: memberRows, error: memberError } = await supabase
    .from('community_members')
    .select('community_id, role')
    .eq('user_id', user.id);

  if (memberError) throw new Error(memberError.message);
  if (!memberRows || memberRows.length === 0) return [];

  const communityIds = memberRows.map((r) => r.community_id);
  const roleMap = new Map(memberRows.map((r) => [r.community_id, r.role as 'admin' | 'member']));

  const { data: communities, error: comError } = await supabase
    .from('communities')
    .select('*')
    .in('id', communityIds)
    .order('created_at', { ascending: false });

  if (comError) throw new Error(comError.message);

  // Fetch all member profiles for these communities
  const { data: allMembers, error: membersError } = await supabase
    .from('community_members')
    .select('id, community_id, user_id, role, joined_at, profiles(full_name, avatar_url, email)')
    .in('community_id', communityIds);

  if (membersError) throw new Error(membersError.message);

  return (communities ?? []).map((c) => {
    const members: CommunityMember[] = (allMembers ?? [])
      .filter((m) => m.community_id === c.id)
      .map((m) => {
        const profile = (m.profiles as unknown as { full_name: string; avatar_url: string | null; email: string } | null);
        return {
          id: m.id,
          community_id: m.community_id,
          user_id: m.user_id,
          role: m.role as 'admin' | 'member',
          joined_at: m.joined_at,
          full_name: profile?.full_name ?? '',
          avatar_url: profile?.avatar_url ?? null,
          email: profile?.email ?? '',
        };
      });

    return {
      ...c,
      members,
      my_role: roleMap.get(c.id) ?? 'member',
    } as CommunityWithMembers;
  });
}

export async function createCommunity(name: string, icon: string = '👥'): Promise<Community> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: community, error: comError } = await supabase
    .from('communities')
    .insert({ name, icon, created_by: user.id })
    .select()
    .single();

  if (comError) throw new Error(comError.message);

  // Creator becomes admin
  const { error: memberError } = await supabase
    .from('community_members')
    .insert({ community_id: community.id, user_id: user.id, role: 'admin' });

  if (memberError) throw new Error(memberError.message);

  return community as Community;
}

export async function searchUserByUsername(query: string): Promise<{ id: string; full_name: string; email: string; avatar_url: string | null }[]> {
  // Sanitize query to prevent PostgREST filter injection
  const sanitized = query.replace(/[%_,()]/g, '');
  if (!sanitized.trim()) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .or(`full_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`)
    .limit(10);

  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; full_name: string; email: string; avatar_url: string | null }[];
}

export async function addMemberToCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .insert({ community_id: communityId, user_id: userId, role: 'member' });

  if (error) throw new Error(error.message);
}

export async function removeMemberFromCommunity(communityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('community_members')
    .delete()
    .eq('community_id', communityId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

// ─── Split Events ─────────────────────────────────────────────────────

export async function fetchSplitEvents(communityId: string): Promise<SplitEvent[]> {
  const { data, error } = await supabase
    .from('split_events')
    .select('*')
    .eq('community_id', communityId)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as SplitEvent[];
}

export interface CreateSplitEventInput {
  communityId: string;
  title: string;
  date?: string;
  currency?: string;
  tax?: number;
  service_fee?: number;
  discount?: number;
  items: { name: string; quantity: number; unit_price: number }[];
}

export async function createSplitEvent(input: CreateSplitEventInput): Promise<SplitEvent> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const tax = input.tax ?? 0;
  const service_fee = input.service_fee ?? 0;
  const discount = input.discount ?? 0;
  const total = subtotal + tax + service_fee - discount;

  const { data: event, error: evError } = await supabase
    .from('split_events')
    .insert({
      community_id: input.communityId,
      title: input.title,
      date: input.date ?? new Date().toISOString().slice(0, 10),
      currency: input.currency ?? 'EGP',
      subtotal,
      tax,
      service_fee,
      discount,
      total,
      created_by: user.id,
    })
    .select()
    .single();

  if (evError) throw new Error(evError.message);

  // Insert items
  if (input.items.length > 0) {
    const itemRows = input.items.map((i) => ({
      event_id: event.id,
      name: i.name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      total_price: i.quantity * i.unit_price,
    }));

    const { error: itemError } = await supabase.from('split_items').insert(itemRows);
    if (itemError) throw new Error(itemError.message);
  }

  return event as SplitEvent;
}

export async function fetchSplitEventDetail(eventId: string): Promise<SplitEventDetail> {
  const { data: event, error: evError } = await supabase
    .from('split_events')
    .select('*, communities(*)')
    .eq('id', eventId)
    .single();

  if (evError) throw new Error(evError.message);

  const { data: items, error: itemError } = await supabase
    .from('split_items')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (itemError) throw new Error(itemError.message);

  // Fetch assignments for all items
  const itemIds = (items ?? []).map((i) => i.id);
  let assignments: SplitAssignment[] = [];
  if (itemIds.length > 0) {
    const { data: assignData, error: assignError } = await supabase
      .from('split_assignments')
      .select('*, profiles(full_name, avatar_url)')
      .in('item_id', itemIds);

    if (assignError) throw new Error(assignError.message);

    assignments = (assignData ?? []).map((a) => ({
      id: a.id,
      item_id: a.item_id,
      user_id: a.user_id,
      share_count: a.share_count,
      created_at: a.created_at,
      full_name: (a.profiles as { full_name: string; avatar_url: string | null })?.full_name ?? '',
      avatar_url: (a.profiles as { full_name: string; avatar_url: string | null })?.avatar_url ?? null,
    }));
  }

  const itemsWithAssignments: SplitItem[] = (items ?? []).map((item) => ({
    ...item,
    assignments: assignments.filter((a) => a.item_id === item.id),
  }));

  // Fetch settlements
  const { data: settleData, error: settleError } = await supabase
    .from('split_settlements')
    .select('*, profiles(full_name, avatar_url)')
    .eq('event_id', eventId);

  if (settleError) throw new Error(settleError.message);

  const settlements: SplitSettlement[] = (settleData ?? []).map((s) => ({
    id: s.id,
    event_id: s.event_id,
    user_id: s.user_id,
    items_total: s.items_total,
    extras_share: s.extras_share,
    amount_owed: s.amount_owed,
    is_paid: s.is_paid,
    created_at: s.created_at,
    updated_at: s.updated_at,
    full_name: (s.profiles as { full_name: string; avatar_url: string | null })?.full_name ?? '',
    avatar_url: (s.profiles as { full_name: string; avatar_url: string | null })?.avatar_url ?? null,
  }));

  return {
    ...event,
    community: event.communities as Community,
    items: itemsWithAssignments,
    settlements,
  } as SplitEventDetail;
}

// ─── Assignments ─────────────────────────────────────────────────────

export interface AssignItemInput {
  itemId: string;
  userIds: string[]; // all users who share this item (including caller)
}

export async function setItemAssignments(input: AssignItemInput): Promise<void> {
  // Delete existing assignments for this item
  const { error: delError } = await supabase
    .from('split_assignments')
    .delete()
    .eq('item_id', input.itemId);

  if (delError) throw new Error(delError.message);

  if (input.userIds.length === 0) return;

  const shareCount = input.userIds.length;
  const rows = input.userIds.map((userId) => ({
    item_id: input.itemId,
    user_id: userId,
    share_count: shareCount,
  }));

  const { error: insError } = await supabase.from('split_assignments').insert(rows);
  if (insError) throw new Error(insError.message);
}

// ─── Settlement Calculation ───────────────────────────────────────────

export async function computeAndSaveSettlements(eventId: string): Promise<SplitSettlement[]> {
  const detail = await fetchSplitEventDetail(eventId);
  const { items, tax, service_fee, discount, subtotal } = detail;

  // Per-user items total (their share of each item they're assigned)
  const userItemsTotal = new Map<string, number>();
  for (const item of items) {
    for (const assignment of item.assignments) {
      const perPersonShare = item.total_price / assignment.share_count;
      userItemsTotal.set(
        assignment.user_id,
        (userItemsTotal.get(assignment.user_id) ?? 0) + perPersonShare,
      );
    }
  }

  // Extras (tax + service_fee - discount) distributed proportionally to subtotal share
  const extras = (tax ?? 0) + (service_fee ?? 0) - (discount ?? 0);

  const settlements: { user_id: string; items_total: number; extras_share: number; amount_owed: number }[] = [];

  for (const [userId, itemsTotal] of userItemsTotal.entries()) {
    const proportion = subtotal > 0 ? itemsTotal / subtotal : 0;
    const extrasShare = proportion * extras;
    settlements.push({
      user_id: userId,
      items_total: Math.round(itemsTotal * 100) / 100,
      extras_share: Math.round(extrasShare * 100) / 100,
      amount_owed: Math.round((itemsTotal + extrasShare) * 100) / 100,
    });
  }

  // Upsert settlements
  if (settlements.length > 0) {
    const rows = settlements.map((s) => ({
      event_id: eventId,
      ...s,
    }));

    const { error } = await supabase
      .from('split_settlements')
      .upsert(rows, { onConflict: 'event_id,user_id' });

    if (error) throw new Error(error.message);
  }

  // Re-fetch updated settlements with profiles
  const { data: settleData, error: fetchError } = await supabase
    .from('split_settlements')
    .select('*, profiles(full_name, avatar_url)')
    .eq('event_id', eventId);

  if (fetchError) throw new Error(fetchError.message);

  return (settleData ?? []).map((s) => ({
    id: s.id,
    event_id: s.event_id,
    user_id: s.user_id,
    items_total: s.items_total,
    extras_share: s.extras_share,
    amount_owed: s.amount_owed,
    is_paid: s.is_paid,
    created_at: s.created_at,
    updated_at: s.updated_at,
    full_name: (s.profiles as { full_name: string; avatar_url: string | null })?.full_name ?? '',
    avatar_url: (s.profiles as { full_name: string; avatar_url: string | null })?.avatar_url ?? null,
  }));
}

export async function markSettlementPaid(eventId: string, userId: string, isPaid: boolean): Promise<void> {
  const { error } = await supabase
    .from('split_settlements')
    .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

export async function updateSplitEventExtras(
  eventId: string,
  extras: { tax?: number; service_fee?: number; discount?: number },
): Promise<void> {
  const { data: event, error: fetchError } = await supabase
    .from('split_events')
    .select('subtotal, tax, service_fee, discount')
    .eq('id', eventId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const tax = extras.tax ?? event.tax;
  const service_fee = extras.service_fee ?? event.service_fee;
  const discount = extras.discount ?? event.discount;
  const total = event.subtotal + tax + service_fee - discount;

  const { error } = await supabase
    .from('split_events')
    .update({ tax, service_fee, discount, total, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) throw new Error(error.message);
}
