import { useMutation } from '@tanstack/react-query';

import { sendPasswordReset } from '../services/auth-service';

export function useForgotPassword(): {
  mutate: (email: string) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { mutate, isPending, isSuccess, error, reset } = useMutation<void, Error, string>({
    mutationFn: sendPasswordReset,
  });

  return { mutate, isPending, isSuccess, error, reset };
}
