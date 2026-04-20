import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';

import {
  getSession,
  fetchUserProfile,
  fetchOrCreateProfile,
  handleOAuthRedirect,
  onAuthStateChange,
} from '../services/auth-service';
import { seedDefaultCategories } from '../services/category-service';
import { seedDefaultAccounts } from '../services/account-service';
import { useAuthStore } from '../store/auth-store';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/query-client';

/**
 * Bootstraps the auth session on app launch.
 * - Checks for an existing Supabase session in SecureStore
 * - Fetches the user profile if a session exists
 * - Subscribes to auth state changes (token refresh, sign out from another device)
 *
 * This is NOT a TanStack Query hook because session state is synchronous UI-critical
 * state that determines which route group to render. Zustand is the right choice here.
 */
export function useAuthBootstrap(): void {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);
  const clearUser = useAuthStore((s) => s.clearUser);
  const hasBooted = useRef(false);

  useEffect(() => {
    if (hasBooted.current) return;
    hasBooted.current = true;

    let unsubscribe: (() => void) | undefined;

    const bootstrap = async (): Promise<void> => {
      try {
        const initialUrl = await Linking.getInitialURL().catch(() => null);
        await handleOAuthRedirect(initialUrl);

        const session = await getSession();

        if (session) {
          const profile = await fetchUserProfile(session.userId);
          setUser(profile);
          // Ensure default categories and accounts exist (idempotent)
          if (profile.onboarding_completed) {
            seedDefaultCategories().catch(() => {});
            seedDefaultAccounts().catch(() => {});
          }
        } else {
          clearUser();
        }
      } catch {
        // Session is invalid or network is down — wipe any stale token and send to login
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        clearUser();
      } finally {
        // Guarantee loading state is cleared even if setUser/clearUser
        // are refactored to stop setting isLoading internally.
        setLoading(false);
      }
    };

    bootstrap();

    // Listen for auth changes (sign-out from another tab, token expiry, etc.)
    const listener = onAuthStateChange((event, userId) => {
      if (event === 'SIGNED_OUT') {
        // Explicit sign-out — wipe local state
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        clearUser();
        queryClient.clear();
      }
      if (event === 'SIGNED_IN' && userId) {
        // During signup the profile row may not exist yet (register() inserts it
        // after signUp()). Google OAuth users also need auto-creation.
        // fetchOrCreateProfile is idempotent — safe to call on every SIGNED_IN.
        fetchOrCreateProfile(userId)
          .then((profile) => {
            setUser(profile);
            if (profile.onboarding_completed) {
              seedDefaultCategories().catch(() => {});
              seedDefaultAccounts().catch(() => {});
            }
          })
          .catch(() => {
            // Profile may not exist yet — retry after a brief pause
            setTimeout(() => {
              fetchOrCreateProfile(userId)
                .then((profile) => {
                  setUser(profile);
                  if (profile.onboarding_completed) {
                    seedDefaultCategories().catch(() => {});
                    seedDefaultAccounts().catch(() => {});
                  }
                })
                .catch(() => {
                  // Still no profile — mutation onSuccess will handle it
                });
            }, 1500);
          });
      }
    });

    unsubscribe = listener.unsubscribe;

    return () => {
      unsubscribe?.();
    };
  }, [setUser, setLoading, clearUser]);
}
