import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeOnboarding } from '../services/auth-service';
import { seedDefaultCategories } from '../services/category-service';
import { seedDefaultAccounts } from '../services/account-service';
import { useAuthStore } from '../store/auth-store';
import { QUERY_KEYS } from '../lib/query-client';
import type { OnboardingData } from '../types/index';

interface UseCompleteOnboardingResult {
  mutate: (data: OnboardingData) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useCompleteOnboarding(): UseCompleteOnboardingResult {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: async (data: OnboardingData) => {
      if (!user) {
        throw new Error('No authenticated user');
      }
      const profile = await completeOnboarding(user.id, data);
      // Seed default categories and accounts for the new user (idempotent)
      await seedDefaultCategories();
      await seedDefaultAccounts();
      return profile;
    },
    onSuccess: (updatedProfile) => {
      setUser(updatedProfile);
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.accounts });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
    },
  });

  return { mutate, isPending, isError, error: error as Error | null };
}
