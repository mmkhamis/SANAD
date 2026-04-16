import { useMutation, useQueryClient } from '@tanstack/react-query';

import { register } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import type { RegisterCredentials } from '../types/index';

interface UseRegisterResult {
  mutate: (credentials: RegisterCredentials) => void;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

export function useRegister(): UseRegisterResult {
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();

  const { mutate, isPending, isError, error, reset } = useMutation({
    mutationFn: register,
    onSuccess: (profile) => {
      setUser(profile);
      // Auth boundary: wipe all prior-user cache to prevent stale data leaks
      qc.clear();
    },
  });

  return { mutate, isPending, isError, error: error as Error | null, reset };
}
