import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '../lib/query-client';
import { useAuthStore } from '../store/auth-store';
import {
  fetchSubscriptions,
  createSubscription,
  deleteSubscription,
  toggleSubscription,
  markSubscriptionPaid,
  type Subscription,
  type CreateSubscriptionInput,
} from '../services/subscription-service';

// ─── Fetch all subscriptions ─────────────────────────────────────────

export function useSubscriptions(enabled = true): {
  data: Subscription[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isError, error, refetch } = useQuery<Subscription[], Error>({
    queryKey: QUERY_KEYS.subscriptions,
    queryFn: fetchSubscriptions,
    // Subscriptions only change via explicit user mutation (which invalidates
    // this key). Allow a long stale window so revisiting the home tab does
    // not trigger needless background refetches.
    staleTime: 30 * 60 * 1000,
    enabled: enabled && useAuthStore.getState().isAuthenticated,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Create subscription ─────────────────────────────────────────────

export function useCreateSubscription(): {
  mutateAsync: (input: CreateSubscriptionInput) => Promise<Subscription>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.subscriptions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

// ─── Delete subscription ─────────────────────────────────────────────

export function useDeleteSubscription(): {
  mutateAsync: (id: string) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteSubscription,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QUERY_KEYS.subscriptions });
      const prev = qc.getQueryData(QUERY_KEYS.subscriptions);
      qc.setQueryData(QUERY_KEYS.subscriptions, (old: any) =>
        Array.isArray(old) ? old.filter((s: any) => s.id !== id) : old,
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(QUERY_KEYS.subscriptions, context.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.subscriptions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

// ─── Toggle subscription active/inactive ─────────────────────────────

export function useToggleSubscription(): {
  mutateAsync: (params: { id: string; isActive: boolean }) => Promise<Subscription>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSubscription(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.subscriptions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

// ─── Mark subscription as paid (advance next billing date) ───────────

export function useMarkSubscriptionPaid(): {
  mutateAsync: (id: string) => Promise<Subscription>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: markSubscriptionPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.subscriptions });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}
