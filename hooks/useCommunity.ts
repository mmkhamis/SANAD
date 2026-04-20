import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyCommunities,
  createCommunity,
  searchUserByUsername,
  addMemberToCommunity,
  removeMemberFromCommunity,
  fetchSplitEvents,
  createSplitEvent,
  fetchSplitEventDetail,
  setItemAssignments,
  computeAndSaveSettlements,
  markSettlementPaid,
  updateSplitEventExtras,
  type CreateSplitEventInput,
  type AssignItemInput,
} from '../services/community-service';

// ─── Query keys ───────────────────────────────────────────────────────

export const COMMUNITY_KEYS = {
  all: ['communities'] as const,
  list: () => [...COMMUNITY_KEYS.all, 'list'] as const,
  splitEvents: (communityId: string) => [...COMMUNITY_KEYS.all, 'events', communityId] as const,
  eventDetail: (eventId: string) => [...COMMUNITY_KEYS.all, 'event', eventId] as const,
  userSearch: (q: string) => [...COMMUNITY_KEYS.all, 'search', q] as const,
};

// ─── Communities ─────────────────────────────────────────────────────

export function useCommunities() {
  return useQuery({
    queryKey: COMMUNITY_KEYS.list(),
    queryFn: fetchMyCommunities,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, icon }: { name: string; icon?: string }) =>
      createCommunity(name, icon),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.list() });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.userSearch(query),
    queryFn: () => searchUserByUsername(query),
    enabled: query.trim().length >= 2,
    staleTime: 1000 * 30,
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, userId }: { communityId: string; userId: string }) =>
      addMemberToCommunity(communityId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.list() });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, userId }: { communityId: string; userId: string }) =>
      removeMemberFromCommunity(communityId, userId),
    onMutate: async ({ communityId }) => {
      await queryClient.cancelQueries({ queryKey: COMMUNITY_KEYS.list() });
      const prev = queryClient.getQueryData(COMMUNITY_KEYS.list());
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(COMMUNITY_KEYS.list(), ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.list() });
    },
  });
}

// ─── Split Events ─────────────────────────────────────────────────────

export function useSplitEvents(communityId: string) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.splitEvents(communityId),
    queryFn: () => fetchSplitEvents(communityId),
    enabled: !!communityId,
    staleTime: 1000 * 60,
  });
}

export function useCreateSplitEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSplitEventInput) => createSplitEvent(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: COMMUNITY_KEYS.splitEvents(variables.communityId),
      });
    },
  });
}

export function useSplitEventDetail(eventId: string) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.eventDetail(eventId),
    queryFn: () => fetchSplitEventDetail(eventId),
    enabled: !!eventId,
    staleTime: 500,
    refetchInterval: 1000,
    refetchIntervalInBackground: false,
  });
}

// ─── Assignments ─────────────────────────────────────────────────────

export function useSetItemAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignItemInput) => setItemAssignments(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
    },
  });
}

// ─── Settlements ──────────────────────────────────────────────────────

export function useComputeSettlements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => computeAndSaveSettlements(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.eventDetail(eventId) });
    },
  });
}

export function useMarkSettlementPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      userId,
      isPaid,
    }: {
      eventId: string;
      userId: string;
      isPaid: boolean;
    }) => markSettlementPaid(eventId, userId, isPaid),
    onMutate: async ({ eventId, userId, isPaid }) => {
      await queryClient.cancelQueries({ queryKey: COMMUNITY_KEYS.eventDetail(eventId) });
      const prev = queryClient.getQueryData(COMMUNITY_KEYS.eventDetail(eventId));
      queryClient.setQueryData(COMMUNITY_KEYS.eventDetail(eventId), (old: any) => {
        if (!old?.settlements) return old;
        return {
          ...old,
          settlements: old.settlements.map((s: any) =>
            s.user_id === userId ? { ...s, is_paid: isPaid } : s,
          ),
        };
      });
      return { prev };
    },
    onError: (_err, { eventId }, context) => {
      if (context?.prev) queryClient.setQueryData(COMMUNITY_KEYS.eventDetail(eventId), context.prev);
    },
    onSettled: (_, _err, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.eventDetail(eventId) });
    },
  });
}

export function useUpdateEventExtras() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      extras,
    }: {
      eventId: string;
      extras: { tax?: number; service_fee?: number; discount?: number };
    }) => updateSplitEventExtras(eventId, extras),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: COMMUNITY_KEYS.eventDetail(eventId) });
    },
  });
}
