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

export function useSubscriptions(): {
  data: Subscription[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isError, error, refetch } = useQuery<Subscription[], Error>({
    queryKey: QUERY_KEYS.subscriptions,
    queryFn: fetchSubscriptions,
    enabled: useAuthStore.getState().isAuthenticated,
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
    onSuccess: () => {
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
