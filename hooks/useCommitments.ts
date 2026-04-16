import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { QUERY_KEYS } from '../lib/query-client';
import {
  fetchCommitments,
  fetchCommitmentsDue,
  createCommitment,
  updateCommitment,
  markCommitmentPaid,
  deleteCommitment,
} from '../services/commitment-service';
import type { CreateCommitmentInput, UpdateCommitmentInput } from '../services/commitment-service';
import type { Commitment, CommitmentsDueSummary } from '../types/index';

// ─── All active commitments ──────────────────────────────────────────

export function useCommitments(): {
  data: Commitment[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, isError, error, refetch } = useQuery<Commitment[], Error>({
    queryKey: QUERY_KEYS.commitments,
    queryFn: fetchCommitments,
    staleTime: 1000 * 60 * 5,
  });

  return { data, isLoading, isError, error, refetch };
}

// ─── Commitments due for a specific month ────────────────────────────

export function useCommitmentsDue(month?: string): {
  data: CommitmentsDueSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} {
  const resolvedMonth = month ?? format(new Date(), 'yyyy-MM');

  const { data, isLoading, isError, error } = useQuery<CommitmentsDueSummary, Error>({
    queryKey: QUERY_KEYS.commitmentsDue(resolvedMonth),
    queryFn: () => fetchCommitmentsDue(resolvedMonth),
    staleTime: 1000 * 60 * 5,
  });

  return { data, isLoading, isError, error };
}

// ─── Mutations ───────────────────────────────────────────────────────

export function useCreateCommitment(): {
  mutateAsync: (input: CreateCommitmentInput) => Promise<Commitment>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation<Commitment, Error, CreateCommitmentInput>({
    mutationFn: createCommitment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.commitments });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

export function useUpdateCommitment(): {
  mutateAsync: (input: UpdateCommitmentInput) => Promise<Commitment>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation<Commitment, Error, UpdateCommitmentInput>({
    mutationFn: updateCommitment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.commitments });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

export function useMarkCommitmentPaid(): {
  mutateAsync: (id: string) => Promise<Commitment>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation<Commitment, Error, string>({
    mutationFn: markCommitmentPaid,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.commitments });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}

export function useDeleteCommitment(): {
  mutateAsync: (id: string) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();

  const { mutateAsync, isPending } = useMutation<void, Error, string>({
    mutationFn: deleteCommitment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.commitments });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
    },
  });

  return { mutateAsync, isPending };
}
