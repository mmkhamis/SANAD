import React from 'react';
import { View, Text, Pressable } from 'react-native';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

/**
 * Section header matching Claude Design:
 *
 * RTL: title + optional icon on RIGHT, action button on LEFT
 * LTR: title + optional icon on LEFT, action button on RIGHT
 *
 * title: 15px, fontWeight 600
 * action: 13px, fontWeight 500, p-200 color
 */
export const SectionHeader = React.memo(function SectionHeader({
  title,
  action,
  onAction,
  icon,
}: SectionHeaderProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir } = useRTL();

  return (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 2,
      }}
    >
      <View style={{ flexDirection: rowDir, gap: 8, alignItems: 'center' }}>
        {icon}
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.isDark ? COLORS.claude.fg : colors.textPrimary,
          }}
        >
          {title}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={onAction}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: colors.isDark ? COLORS.claude.p200 : COLORS.primary,
            }}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});
