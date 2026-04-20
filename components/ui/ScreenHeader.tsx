import React from 'react';
import { View, Text } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { TYPOGRAPHY } from '../../constants/typography';
import { BackButton } from './BackButton';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Accessory slot on the trailing edge. */
  right?: React.ReactNode;
  /** Show a leading back affordance. */
  backable?: boolean;
  /** Override back button behavior. */
  onBack?: () => void;
  /** 'large' uses h1; 'inline' uses h2. */
  variant?: 'large' | 'inline';
}

/**
 * RTL-aware screen header with optional back button + title + right accessory.
 * Lays out using `row-reverse` in Arabic so the back button sits on the
 * user's leading side (physical right).
 */
export const ScreenHeader = React.memo(function ScreenHeader({
  title,
  subtitle,
  right,
  backable = false,
  onBack,
  variant = 'large',
}: ScreenHeaderProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign } = useRTL();
  const titleStyle = variant === 'large' ? TYPOGRAPHY.h1 : TYPOGRAPHY.h2;

  return (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 12, flexShrink: 1 }}>
        {backable ? <BackButton onPress={onBack} /> : null}
        <View style={{ flexShrink: 1 }}>
          {title ? (
            <Text
              style={{ ...titleStyle, color: colors.textPrimary, textAlign, writingDirection: textAlign === 'right' ? 'rtl' : 'ltr' }}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={{ ...TYPOGRAPHY.body, color: colors.textSecondary, marginTop: 2, textAlign }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
});
