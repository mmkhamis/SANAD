import { requireNativeModule, Platform } from 'expo-modules-core';

interface WidgetSharedDataNative {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  reloadAllTimelines(): Promise<void>;
  reloadTimeline(kind: string): Promise<void>;
  setSupabaseConfig(url: string, anonKey: string): Promise<void>;
  setSupabaseSession(json: string): Promise<void>;
  clearSupabaseSession(): Promise<void>;
}

const noop: WidgetSharedDataNative = {
  setItem: async () => {},
  getItem: async () => null,
  removeItem: async () => {},
  reloadAllTimelines: async () => {},
  reloadTimeline: async () => {},
  setSupabaseConfig: async () => {},
  setSupabaseSession: async () => {},
  clearSupabaseSession: async () => {},
};

function loadNativeModule(): WidgetSharedDataNative {
  if (Platform.OS !== 'ios') return noop;
  try {
    return requireNativeModule('WidgetSharedData');
  } catch {
    // Native module unavailable (Expo Go / dev client without prebuild)
    return noop;
  }
}

const NativeModule: WidgetSharedDataNative = loadNativeModule();

/** Write a JSON-serializable value to the shared App Group container. */
export async function setWidgetData<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  await NativeModule.setItem(key, json);
}

/** Read a JSON value from the shared App Group container. */
export async function getWidgetData<T>(key: string): Promise<T | null> {
  const json = await NativeModule.getItem(key);
  if (!json) return null;
  return JSON.parse(json) as T;
}

/** Remove a key from the shared App Group container. */
export async function removeWidgetData(key: string): Promise<void> {
  await NativeModule.removeItem(key);
}

/** Reload all widget timelines (triggers widget refresh). */
export async function reloadAllWidgets(): Promise<void> {
  await NativeModule.reloadAllTimelines();
}

/** Reload a specific widget timeline by its kind identifier. */
export async function reloadWidget(kind: string): Promise<void> {
  await NativeModule.reloadTimeline(kind);
}

// ─── Supabase native bridge (used by the iOS App Intent) ────────────

export interface NativeSupabaseSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
  userId: string;
}

/** Publish the Supabase URL + anon key to the App Group so the App Intent can read them. */
export async function setSupabaseConfigNative(
  url: string,
  anonKey: string,
): Promise<void> {
  await NativeModule.setSupabaseConfig(url, anonKey);
}

/** Publish the current Supabase session to the shared Keychain. */
export async function setSupabaseSessionNative(
  session: NativeSupabaseSession,
): Promise<void> {
  await NativeModule.setSupabaseSession(JSON.stringify(session));
}

/** Wipe the shared Keychain session (called on sign-out). */
export async function clearSupabaseSessionNative(): Promise<void> {
  await NativeModule.clearSupabaseSession();
}
