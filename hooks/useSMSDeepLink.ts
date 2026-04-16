import { useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/auth-store';
import { useQueryClient } from '@tanstack/react-query';

// ─── Deep link handler — auto-saves SMS transactions ─────────────────
// NOTE: The /sms route screen now has its own processing pipeline with
// debug UI. This hook handles the case where the app is ALREADY open
// and receives a deep link (Linking 'url' event). The /sms screen
// handles cold-start deep links via useLocalSearchParams.
//
// To avoid double-processing, this hook skips URLs that will route to
// the /sms screen (those are handled by the screen itself).

export function useSMSDeepLink(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const handleURL = useCallback(
    async (url: string) => {
      if (!isAuthenticated) return;

      const parsed = Linking.parse(url);

      const path = parsed.path ?? '';
      const isSmsLink = path === 'sms' || path === '--/sms' || path.endsWith('/sms');

      // Skip — the /sms screen will handle this with its debug UI
      if (isSmsLink) return;
    },
    [isAuthenticated, qc],
  );

  useEffect(() => {
    // Handle app opened via deep link
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          void handleURL(url);
        }
      })
      .catch(() => {
        // Suppress — URL handling errors must never surface a red box
      });

    // Handle deep links while app is open
    const subscription = Linking.addEventListener('url', (event) => {
      handleURL(event.url).catch(() => {
        // Suppress — URL handling errors must never surface a red box
      });
    });

    return () => subscription.remove();
  }, [handleURL]);
}
