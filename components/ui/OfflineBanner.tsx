// ─── OfflineBanner ───────────────────────────────────────────────────
// Lightweight single-line banner that slides in from the top when:
//   - the device is offline
//   - the offline queue is replaying after reconnect
//
// Renders as a zero-height view when online and no pending items —
// completely cost-free in the normal (online) path.

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useThemeColors } from '../../hooks/useThemeColors';

const BANNER_HEIGHT = 36;
const ANIMATION_DURATION = 260;

export function OfflineBanner(): React.ReactElement | null {
  const { isOnline } = useNetworkStatus();
  const { pendingCount, isReplaying, clearQueue } = useOfflineQueue();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isVisible = !isOnline || isReplaying || pendingCount > 0;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 1 : 0,
      duration: ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  }, [isVisible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(BANNER_HEIGHT + insets.top), 0],
  });

  // ─── Label ─────────────────────────────────────────────────────────
  let label: string;
  if (!isOnline) {
    label =
      pendingCount > 0
        ? `Offline — ${pendingCount} pending${pendingCount === 1 ? '' : ''}`
        : 'No internet connection';
  } else if (isReplaying) {
    label =
      pendingCount > 0
        ? `Syncing ${pendingCount} pending item${pendingCount === 1 ? '' : 's'}…`
        : 'Syncing…';
  } else if (pendingCount > 0) {
    label = `${pendingCount} item${pendingCount === 1 ? '' : 's'} pending sync — tap to dismiss`;
  } else {
    label = '';
  }

  // ─── Banner color ──────────────────────────────────────────────────
  const bgColor = !isOnline ? colors.expense : colors.warning;
  const textColor = '#FFFFFF';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: [{ translateY }],
      }}
      accessibilityLiveRegion="polite"
      accessibilityLabel={isVisible ? label : undefined}
    >
      <Pressable
        onPress={() => {
          if (isOnline && !isReplaying && pendingCount > 0) {
            clearQueue();
          }
        }}
        style={{
          height: BANNER_HEIGHT + insets.top,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 6,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            color: textColor,
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 0.2,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
