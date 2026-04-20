// ─── Network status hook ─────────────────────────────────────────────
// Wraps @react-native-community/netinfo to provide a reactive `isOnline`
// boolean that is safe to read at any point in the component tree.
//
// Also wires TanStack Query's `onlineManager.setEventListener` so that:
//   - queries automatically pause when the device goes offline
//   - queries automatically retry / refetch when connectivity returns
//
// This wiring is done once at module level (outside React) to avoid
// registering multiple listeners across re-renders.

import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// ─── Wire TanStack onlineManager once at module load ─────────────────
// setEventListener receives a callback `setOnline` which must be called
// whenever connectivity changes. It returns an unsubscribe function.

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state: NetInfoState) => {
    const connected = state.isConnected === true && state.isInternetReachable !== false;
    setOnline(connected);
  });
});

// ─── Hook ─────────────────────────────────────────────────────────────

export interface NetworkStatus {
  /** True if the device currently has internet connectivity */
  isOnline: boolean;
  /** True while the initial NetInfo.fetch() probe is in-flight */
  isCheckingConnectivity: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  // Start with `true` so we don't flash an offline banner on app launch
  // before the first NetInfo probe completes.
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    // Initial probe — required for cold-start offline detection
    NetInfo.fetch().then((state) => {
      if (cancelled) return;
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(connected);
      setIsCheckingConnectivity(false);
    }).catch(() => {
      if (!cancelled) setIsCheckingConnectivity(false);
    });

    // Subscribe to subsequent changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (cancelled) return;
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(connected);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { isOnline, isCheckingConnectivity };
}
