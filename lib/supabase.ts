import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Supabase env vars missing: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
  );
}

/**
 * Chunked SecureStore adapter.
 *
 * expo-secure-store warns (and may in future reject) values larger than 2048 bytes.
 * Supabase sessions routinely exceed that (access + refresh + user JSON), so we
 * split the value into N chunks stored under `<key>.0`, `<key>.1`, ... plus a
 * header at `<key>` recording the chunk count. Reads transparently re-assemble
 * the chunks, so the caller sees a single string.
 *
 * Backward compatible: if a legacy, unchunked value is already at `<key>`, we
 * return it as-is and it gets re-chunked on the next write.
 */
const CHUNK_SIZE = 1800; // keep well under the 2048 byte soft limit
const HEADER_PREFIX = '__chunked__:';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const header = await SecureStore.getItemAsync(key);
    if (!header) return null;

    if (!header.startsWith(HEADER_PREFIX)) {
      // Legacy unchunked value — return as-is.
      return header;
    }

    const count = parseInt(header.slice(HEADER_PREFIX.length), 10);
    if (!Number.isFinite(count) || count <= 0) return null;

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part === null) return null; // corrupted — force re-auth
      parts.push(part);
    }
    return parts.join('');
  },
  setItem: async (key: string, value: string): Promise<void> => {
    // Clean any existing chunks first so we don't leak stale ones.
    const prevHeader = await SecureStore.getItemAsync(key);
    if (prevHeader?.startsWith(HEADER_PREFIX)) {
      const prevCount = parseInt(prevHeader.slice(HEADER_PREFIX.length), 10);
      if (Number.isFinite(prevCount)) {
        for (let i = 0; i < prevCount; i++) {
          await SecureStore.deleteItemAsync(`${key}.${i}`).catch(() => {});
        }
      }
    }

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
    }
    await SecureStore.setItemAsync(key, `${HEADER_PREFIX}${chunks.length}`);
  },
  removeItem: async (key: string): Promise<void> => {
    const header = await SecureStore.getItemAsync(key);
    if (header?.startsWith(HEADER_PREFIX)) {
      const count = parseInt(header.slice(HEADER_PREFIX.length), 10);
      if (Number.isFinite(count)) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}.${i}`).catch(() => {});
        }
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Implicit flow for Expo Go OAuth:
    // PKCE requires the code-verifier to survive in SecureStore between the moment
    // signInWithOAuth() is called and the moment the browser redirects back. In Expo Go
    // the module sandbox can be re-evaluated (fast-refresh / Metro reload) between those
    // two events, producing a fresh Supabase instance that has never seen the verifier.
    // Implicit flow avoids that entirely: access_token + refresh_token arrive directly
    // in the URL hash fragment — no stored state needed.
    flowType: 'implicit',
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
      // Wipe the invalid token from SecureStore so it isn't retried on next launch.
      // scope: 'local' avoids a network call (the token is already dead on the server).
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      throw new Error('Session expired. Please sign in again.');
    }
    return data.session.access_token;
  }

  return session.access_token;
}

/**
 * Invoke a Supabase edge function with automatic JWT-refresh retry.
 *
 * Uses direct fetch() to ${SUPABASE_URL}/functions/v1/${functionName}
 * instead of supabase.functions.invoke() to bypass the gateway's
 * JWT algorithm validation (ES256 not supported by relay layer).
 */
export async function invokeWithRetry<T = unknown>(
  functionName: string,
  options: { body: Record<string, unknown>; headers?: Record<string, string> },
): Promise<T> {
  const attempt = async (accessToken: string): Promise<T> => {
    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
        ...(options.headers ?? {}),
      },
      body: JSON.stringify(options.body),
    });

    if (!res.ok) {
      let msg = '';
      try {
        const body = await res.json() as { error?: string; message?: string };
        msg = body.error ?? body.message ?? '';
      } catch {
        try { msg = await res.text(); } catch { /* ignore */ }
      }

      const wrapped = new Error(msg || `Edge function error: ${res.status}`);
      (wrapped as { httpStatus?: number }).httpStatus = res.status;
      throw wrapped;
    }

    return await res.json() as T;
  };

  try {
    const accessToken = await ensureFreshSession();
    return await attempt(accessToken);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    const httpStatus = (err as { httpStatus?: number }).httpStatus ?? 0;

    const isAuthError =
      httpStatus === 401 ||
      /invalid jwt|invalid.*token|unauthorized|expired.*token|token.*expired/i.test(msg);
    if (!isAuthError) throw err;

    // Auth error → force a hard refresh and retry once
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      throw new Error('Session expired. Please sign in again.');
    }
    return await attempt(refreshData.session.access_token);
  }
}
