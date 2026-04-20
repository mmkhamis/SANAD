import { useEffect } from 'react';
import * as Linking from 'expo-linking';

import { handleOAuthRedirect } from '../services/auth-service';

export function useOAuthRedirect(): void {
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      handleOAuthRedirect(event.url).catch(() => {
        // Suppress — auth callback failures should surface through the login flow,
        // not crash the app when the browser hands control back to us.
      });
    });

    return () => subscription.remove();
  }, []);
}
