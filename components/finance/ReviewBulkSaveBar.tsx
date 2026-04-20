import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CheckCheck } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { impactMedium } from '../../utils/haptics';

interface ReviewBulkSaveBarProps {
  /** How many rows currently have a category selected (i.e. ready to save). */
  readyCount: number;
  /** Total visible review rows. */
  totalCount: number;
  /** True while a bulk save is in flight. */
  isSaving: boolean;
  /** Optional progress for the in-flight bulk save. */
  progress?: { done: number; total: number };
  /** Triggered when the user taps "Save all". */
  onSaveAll: () => void;
  /** "top" sticks under the header, "bottom" pins above safe area. */
  position: 'top' | 'bottom';
}

export function ReviewBulkSaveBar({
  readyCount,
  totalCount,
  isSaving,
  progress,
  onSaveAll,
  position,
}: ReviewBulkSaveBarProps): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();

  if (totalCount <= 1) return null;

  const disabled = readyCount === 0 || isSaving;
  const subtitle = isSaving
    ? `${t('REVIEW_SAVE_ALL_PROGRESS' as any)} ${progress?.done ?? 0}/${progress?.total ?? readyCount}`
    : readyCount > 0
      ? `${readyCount}/${totalCount} ${t('REVIEW_SAVE_ALL_READY' as any)}`
      : t('REVIEW_SAVE_ALL_NONE_READY' as any);

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: position === 'top' ? 12 : 0,
        marginBottom: position === 'bottom' ? 12 : 8,
      }}
    >
      <Pressable
        onPress={() => {
          if (disabled) return;
          impactMedium();
          onSaveAll();
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        className="flex-row items-center justify-between rounded-2xl px-4 py-3"
        style={{
          backgroundColor: disabled ? colors.surfaceSecondary : colors.primary,
          borderWidth: 1,
          borderColor: disabled ? colors.border : colors.primary,
          opacity: disabled && !isSaving ? 0.85 : 1,
        }}
      >
        <View className="flex-row items-center" style={{ flex: 1 }}>
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color={disabled ? colors.textSecondary : colors.textInverse}
            />
          ) : (
            <CheckCheck
              size={18}
              color={disabled ? colors.textSecondary : colors.textInverse}
              strokeWidth={2.5}
            />
          )}
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: disabled ? colors.textSecondary : colors.textInverse,
              }}
            >
              {t('REVIEW_SAVE_ALL' as any)}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: disabled ? colors.textTertiary : colors.textInverse,
                opacity: disabled ? 1 : 0.85,
                marginTop: 1,
              }}
            >
              {subtitle}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
