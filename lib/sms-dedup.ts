// ─── Persistent SMS dedup store with TTL ─────────────────────────────
// Prevents the same SMS deep link from being processed twice.
// Uses SecureStore for persistence across app restarts.
// Each dedup key has a 7-day TTL to prevent unbounded growth.

import * as SecureStore from 'expo-secure-store';

const DEDUP_STORAGE_KEY = 'sms_dedup_hashes';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_ENTRIES = 200; // Cap to prevent unbounded storage growth

interface DedupEntry {
  timestamp: number;
}

type DedupStore = Record<string, DedupEntry>;

let cache: DedupStore | null = null;

async function load(): Promise<DedupStore> {
  if (cache) return cache;
  try {
    const raw = await SecureStore.getItemAsync(DEDUP_STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as DedupStore) : {};
  } catch {
    cache = {};
  }
  // Prune expired entries
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(cache!)) {
    if (now - cache![key].timestamp > TTL_MS) {
      delete cache![key];
      changed = true;
    }
  }
  // Cap the number of entries
  const keys = Object.keys(cache!);
  if (keys.length > MAX_ENTRIES) {
    // Remove oldest entries
    const sorted = keys.sort((a, b) => cache![a].timestamp - cache![b].timestamp);
    for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) {
      delete cache![sorted[i]];
    }
    changed = true;
  }
  if (changed) {
    await SecureStore.setItemAsync(DEDUP_STORAGE_KEY, JSON.stringify(cache));
  }
  return cache;
}

async function save(): Promise<void> {
  if (!cache) return;
  await SecureStore.setItemAsync(DEDUP_STORAGE_KEY, JSON.stringify(cache));
}

export const smsDedup = {
  async has(key: string): Promise<boolean> {
    const store = await load();
    const entry = store[key];
    if (!entry) return false;
    // Check TTL
    if (Date.now() - entry.timestamp > TTL_MS) {
      delete store[key];
      await save();
      return false;
    }
    return true;
  },
  async add(key: string): Promise<void> {
    const store = await load();
    store[key] = { timestamp: Date.now() };
    await save();
  },
  /** Initialize the store on app start to prune expired entries */
  async init(): Promise<void> {
    await load();
  },
};
