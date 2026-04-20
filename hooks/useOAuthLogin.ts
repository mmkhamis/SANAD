import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

import { loginWithGoogle, loginWithApple } from '../services/auth-service';

export type OAuthProvider = 'google' | 'apple';

export function useOAuthLogin(): {
  mutate: (provider: OAuthProvider) => void;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
} {
  const { mutate, isPending, error, reset } = useMutation<void, Error, OAuthProvider>({
    mutationFn: (provider: OAuthProvider) => {
      if (provider === 'google') return loginWithGoogle();
      if (provider === 'apple') {
        if (Platform.OS !== 'ios') {
          return Promise.reject(new Error('Apple Sign In is only available on iOS'));
        }
        return loginWithApple();
      }
      return Promise.reject(new Error('Unknown provider'));
    },
  });

  return { mutate, isPending, error, reset };
}
