import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateProfile, type UpdateProfileInput } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import { setActiveCurrency } from '../utils/currency';
import { useSettingsStore } from '../store/settings-store';
import { QUERY_KEYS } from '../lib/query-client';
import type { UserProfile } from '../types/index';

export function useUpdateProfile() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const qc = useQueryClient();

  const mutation = useMutation<UserProfile, Error, UpdateProfileInput>({
    mutationFn: (input: UpdateProfileInput) => {
      if (!user) {
        throw new Error('No authenticated user');
      }
      return updateProfile(user.id, input);
    },
    onMutate: async (input) => {
      // Optimistic update — apply immediately so the UI reflects the change
      // without waiting for the network round-trip.
      if (user) {
        // If currency or locale changed, update the active currency immediately
        if (input.currency || input.locale) {
          const currency = input.currency ?? user.currency;
          const locale = input.locale ?? user.locale;
          setActiveCurrency(currency, locale);
          useSettingsStore.getState().setCurrency(currency, locale);
        }
        updateUser({ ...input, updated_at: new Date().toISOString() } as Partial<UserProfile>);
      }
    },
    onSuccess: (updatedProfile) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
      // Only invalidate expensive queries if the update actually succeeded
      qc.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.transactions });
    },
    onError: () => {
      // Revert optimistic update by refreshing the server state
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
    },
  });

  return mutation;
}
