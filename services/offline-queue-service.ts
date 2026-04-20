// ─── Phase-1 Offline Queue Service ──────────────────────────────────
// Stores pending mutations locally for replay when connectivity returns.
// Uses AsyncStorage (plain JSON) — not SecureStore — because these payloads
// are not credentials and SecureStore has 2 KB per-item limits.
//
// Phase-1 scope:
//   - manual_transaction  → maps to createTransaction()
//   - sms_transaction     → maps to createSMSTransaction()
//
// Phase-2 extension point: add more QueueItemType values here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';

import {
  createTransaction,
  createSMSTransaction,
  type CreateTransactionInput,
  type CreateSMSTransactionInput,
} from './transaction-service';
import { QUERY_KEYS } from '../lib/query-client';

// ─── Types ────────────────────────────────────────────────────────────

export type QueueItemType = 'manual_transaction' | 'sms_transaction';

interface QueueItemBase {
  /** Stable client-generated ID for dedup at the queue level */
  id: string;
  type: QueueItemType;
  queued_at: number;
  /** How many replay attempts have been made (including current, if in progress) */
  attempts: number;
}

interface ManualTransactionQueueItem extends QueueItemBase {
  type: 'manual_transaction';
  payload: CreateTransactionInput;
}

interface SMSTransactionQueueItem extends QueueItemBase {
  type: 'sms_transaction';
  payload: CreateSMSTransactionInput;
}

export type QueueItem = ManualTransactionQueueItem | SMSTransactionQueueItem;

// ─── Constants ───────────────────────────────────────────────────────

const QUEUE_STORAGE_KEY = 'offline_queue_v1';
const MAX_ATTEMPTS = 3;
const MAX_QUEUE_SIZE = 100;

// ─── In-memory guard against concurrent replay runs ──────────────────

let _replayInProgress = false;

// ─── Storage helpers ─────────────────────────────────────────────────

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage write failure — app can continue, item is just not persisted
    if (__DEV__) console.warn('[OfflineQueue] writeQueue failed');
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Enqueue a new pending action.
 * Idempotency:
 *   - For manual_transaction: caller must set `payload.idempotency_key` to a
 *     stable UUID generated at the moment the user submits the action. This key
 *     is passed through to `createTransaction` which checks the DB before insert.
 *   - For sms_transaction: `createSMSTransaction` uses notes-text dedup; no
 *     explicit idempotency_key is needed.
 */
export async function enqueue(item: Omit<QueueItem, 'queued_at' | 'attempts'>): Promise<void> {
  const items = await readQueue();

  // Prevent duplicate queue entries by checking item.id
  if (items.some((i) => i.id === item.id)) return;

  // Cap queue size — drop oldest if necessary
  const capped =
    items.length >= MAX_QUEUE_SIZE ? items.slice(items.length - MAX_QUEUE_SIZE + 1) : items;

  const newItem: QueueItem = {
    ...item,
    queued_at: Date.now(),
    attempts: 0,
  } as QueueItem;

  await writeQueue([...capped, newItem]);
}

/**
 * Return all queue items.
 */
export async function getPendingItems(): Promise<QueueItem[]> {
  return readQueue();
}

/**
 * Return the count of pending items without loading full payloads.
 */
export async function getPendingCount(): Promise<number> {
  const items = await readQueue();
  return items.length;
}

/**
 * Remove a single item by id.
 */
export async function removeItem(id: string): Promise<void> {
  const items = await readQueue();
  await writeQueue(items.filter((i) => i.id !== id));
}

/**
 * Replay all queued items sequentially.
 * - Safe to call multiple times: guarded by `_replayInProgress` flag.
 * - After MAX_ATTEMPTS failures, item is discarded to prevent queue bloat.
 * - After each successful item, relevant TanStack Query caches are invalidated.
 *
 * @param queryClient  The app's QueryClient for cache invalidation.
 * @param onProgress   Optional callback: (remaining: number) => void
 */
export async function replayQueue(
  queryClient: QueryClient,
  onProgress?: (remaining: number) => void,
): Promise<void> {
  if (_replayInProgress) return;
  _replayInProgress = true;

  try {
    const items = await readQueue();
    if (items.length === 0) return;

    for (const item of items) {
      // Re-read queue before each item in case a previous replay already cleared it
      const current = await readQueue();
      const still = current.find((i) => i.id === item.id);
      if (!still) continue;

      // Increment attempt counter
      const updated: QueueItem = { ...still, attempts: still.attempts + 1 } as QueueItem;
      await writeQueue(current.map((i) => (i.id === updated.id ? updated : i)));

      try {
        if (updated.type === 'manual_transaction') {
          await createTransaction(updated.payload);
        } else if (updated.type === 'sms_transaction') {
          await createSMSTransaction(updated.payload);
        }

        // Success — remove from queue
        await removeItem(updated.id);

        // Invalidate affected queries
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.transactions }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.accounts }),
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreviewedTransactions }),
        ]);

        if (__DEV__) console.log(`[OfflineQueue] replayed ${updated.type} id=${updated.id}`);
      } catch (err) {
        if (__DEV__) console.warn(`[OfflineQueue] replay failed id=${updated.id} attempt=${updated.attempts}`, err);

        // Discard after MAX_ATTEMPTS to prevent unbounded queue
        if (updated.attempts >= MAX_ATTEMPTS) {
          await removeItem(updated.id);
          if (__DEV__) console.warn(`[OfflineQueue] discarded id=${updated.id} after ${MAX_ATTEMPTS} attempts`);
        }
        // For network errors, keep item in queue — retry on next reconnect
      }

      const remaining = (await readQueue()).length;
      onProgress?.(remaining);
    }
  } finally {
    _replayInProgress = false;
  }
}

/**
 * Returns whether a replay is currently in progress.
 * Used by `useOfflineQueue` to expose `isReplaying` state.
 */
export function isReplayInProgress(): boolean {
  return _replayInProgress;
}
