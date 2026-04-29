// ─── Offline queue management hook ──────────────────────────────────
// Exposes the queue's pending count and replaying state to the UI,
// and triggers replay when connectivity returns.
//
// The replay logic itself lives in `services/offline-queue-service.ts`
// so it can also be called outside React (e.g. from sms.tsx utility code).

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useNetworkStatus } from './useNetworkStatus';
import {
  getPendingCount,
  replayQueue,
  isReplayInProgress,
  clearQueue as clearQueueStorage,
} from '../services/offline-queue-service';

export interface OfflineQueueState {
  /** Number of mutations waiting to be replayed */
  pendingCount: number;
  /** True while a replay run is in progress */
  isReplaying: boolean;
  /** Manually trigger a replay (safe to call while already replaying) */
  triggerReplay: () => void;
  /** Clear all pending items from the queue */
  clearQueue: () => void;
}

export function useOfflineQueue(): OfflineQueueState {
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const prevIsOnlineRef = useRef<boolean | null>(null);

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  // ─── Refresh pending count ─────────────────────────────────────────
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // non-fatal
    }
  }, []);

  // ─── Run replay ───────────────────────────────────────────────────
  const triggerReplay = useCallback(async () => {
    if (isReplayInProgress()) return;
    setIsReplaying(true);
    try {
      await replayQueue(qc, (remaining) => {
        setPendingCount(remaining);
      });
    } finally {
      setIsReplaying(false);
      await refreshCount();
    }
  }, [qc, refreshCount]);

  // ─── Replay on reconnect ──────────────────────────────────────────
  useEffect(() => {
    const wasOffline = prevIsOnlineRef.current === false;
    const justCameOnline = isOnline && wasOffline;

    prevIsOnlineRef.current = isOnline;

    if (justCameOnline) {
      triggerReplay();
    }
  }, [isOnline, triggerReplay]);

  // ─── Refresh count on mount and after replay ──────────────────────
  useEffect(() => {
    refreshCount();
  }, [refreshCount, isReplaying]);

  const clearQueue = useCallback(async () => {
    await clearQueueStorage();
    setPendingCount(0);
  }, []);

  return { pendingCount, isReplaying, triggerReplay, clearQueue };
}
