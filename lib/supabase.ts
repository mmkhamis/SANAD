import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Ensure the Supabase client holds a fresh (non-expired) access token.
 * Call this before every edge-function invocation.
 *
 * Returns the fresh access token directly — do NOT call getSession()
 * afterwards because the cache may be stale (supabase-js v2.64+ behavior).
 */
export async function ensureFreshSession(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not logged in. Please sign in again.');
  }

  const expiresAt = session.expires_at ?? 0; // unix seconds
  const now = Math.floor(Date.now() / 1000);

  // Refresh if token is expired or will expire within 5 minutes.
  if (expiresAt - now < 300) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      throw new Error('Session expired. Please sign in again.');
    }
    return data.session.access_token;
  }

  return session.access_token;
}

/**
 * Invoke a Supabase edge function with automatic JWT-refresh retry.
 * If the first call fails with an auth error (401 / "Invalid JWT"),
 * the session is refreshed and the call is retried once.
 */
export async function invokeWithRetry<T = unknown>(
  functionName: string,
  options: { body: Record<string, unknown>; headers?: Record<string, string> },
): Promise<T> {
  const attempt = async (accessToken: string): Promise<T> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (error) {
      // In supabase-js v2.101+, FunctionsHttpError.context is the raw
      // Response object. We need to parse it to get the actual error body.
      const err = error as { message?: string; name?: string; context?: unknown };
      let msg = err.message ?? '';
      let httpStatus = 0;

      const ctx = err.context;
      if (ctx && typeof ctx === 'object') {
        // ctx might be a Response object (has .status and .json/text) or a plain object
        const maybeResponse = ctx as { status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> };
        if (typeof maybeResponse.status === 'number') {
          httpStatus = maybeResponse.status;
        }
        if (typeof maybeResponse.json === 'function') {
          try {
            const body = await maybeResponse.json() as { error?: string; message?: string };
            msg = body.error ?? body.message ?? msg;
          } catch {
            // If JSON parsing fails, try text
            try {
              if (typeof maybeResponse.text === 'function') {
                msg = await maybeResponse.text() || msg;
              }
            } catch {
              // ignore
            }
          }
        } else {
          // Plain object (older supabase-js behavior)
          const body = ctx as { error?: string; message?: string };
          msg = body.error ?? body.message ?? msg;
        }
      }

      const wrapped = new Error(msg || 'Edge function error');
      if (err.name) (wrapped as { name: string }).name = err.name;
      (wrapped as { httpStatus?: number }).httpStatus = httpStatus;
      throw wrapped;
    }
    return data as T;
  };

  try {
    const accessToken = await ensureFreshSession();
    return await attempt(accessToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const httpStatus = (err as { httpStatus?: number }).httpStatus ?? 0;

    // Only treat as auth error if it's specifically a 401 or auth-related message.
    // Do NOT treat all FunctionsHttpError as auth errors.
    const isAuthError =
      httpStatus === 401 ||
      /invalid jwt|invalid.*token|unauthorized|expired.*token|token.*expired/i.test(msg);
    if (!isAuthError) throw err;

    // Auth error → force a hard refresh and retry once
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      // Last resort: sign out so user is prompted to log in fresh
      await supabase.auth.signOut();
      throw new Error('Session expired. Please sign in again.');
    }
    return await attempt(refreshData.session.access_token);
  }
}
