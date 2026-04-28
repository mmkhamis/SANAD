import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { CheckCheck } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
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
  const { rowDir, textAlign, isRTL } = useRTL();

  if (totalCount <= 1) return null;

  const isTop = position === 'top';
  const disabled = readyCount === 0 || isSaving;
  const activeBackground = isTop ? colors.warning : colors.primary;
  const inactiveBackground = isTop ? colors.warningBg : colors.surfaceSecondary;
  const activeBorder = isTop ? colors.warning : colors.primary;
  const inactiveBorder = isTop ? colors.warning + '45' : colors.border;
  const activeText = isTop ? colors.textPrimary : colors.textInverse;
  const inactiveText = isTop ? colors.warning : colors.textSecondary;
  const inactiveSubtitle = isTop ? colors.warning : colors.textTertiary;

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
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: disabled ? inactiveBackground : activeBackground,
          borderWidth: 1,
          borderColor: disabled ? inactiveBorder : activeBorder,
          opacity: disabled && !isSaving ? 0.85 : 1,
          ...(isTop
            ? {
              shadowColor: colors.warning,
              shadowOpacity: 0.25,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 3,
            }
            : null),
        }}
      >
        <View style={{ flexDirection: rowDir, alignItems: 'center', flex: 1 }}>
          {isSaving ? (
            <ActivityIndicator
              size="small"
              color={disabled ? inactiveText : activeText}
            />
          ) : (
            <CheckCheck
              size={18}
              color={disabled ? inactiveText : activeText}
              strokeWidth={2.5}
            />
          )}
          <View style={{ marginStart: 10, flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: disabled ? inactiveText : activeText,
                textAlign,
                writingDirection: isRTL ? 'rtl' : 'ltr',
              }}
            >
              {t('REVIEW_SAVE_ALL' as any)}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: '500',
                color: disabled ? inactiveSubtitle : activeText,
                opacity: disabled ? 1 : 0.85,
                marginTop: 1,
                textAlign,
                writingDirection: isRTL ? 'rtl' : 'ltr',
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
