import { requireNativeModule, Platform } from 'expo-modules-core';

interface WidgetSharedDataNative {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  reloadAllTimelines(): Promise<void>;
  reloadTimeline(kind: string): Promise<void>;
}

const noop: WidgetSharedDataNative = {
  setItem: async () => {},
  getItem: async () => null,
  removeItem: async () => {},
  reloadAllTimelines: async () => {},
  reloadTimeline: async () => {},
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
