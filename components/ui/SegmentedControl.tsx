import React from 'react';
import { View, Pressable, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { impactLight } from '../../utils/haptics';

interface SegmentOption {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (key: string) => void;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

/**
 * Pill-shaped segmented control matching Claude Design exactly:
 *
 * container: bg rgba(0,0,0,0.25), border stroke, borderRadius 999, padding 3, gap 2
 * inactive: transparent bg, fg-3 text, 13px/500
 * active: linearGradient(p-500 → p-700), white text, boxShadow 0 4px 14px p-glow
 */
export const SegmentedControl = React.memo(function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: SegmentedControlProps): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir } = useRTL();
  const height = size === 'sm' ? 32 : 40;
  const fontSize = size === 'sm' ? 12 : 13;

  return (
    <View
      style={[
        {
          flexDirection: rowDir,
          gap: 2,
          height,
          padding: 3,
          borderRadius: 9999,
          backgroundColor: colors.isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.05)',
          borderWidth: 1,
          borderColor: colors.isDark ? COLORS.claude.stroke : 'rgba(0,0,0,0.08)',
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => {
              if (!active) {
                impactLight();
                onChange(opt.key);
              }
            }}
            style={{
              flex: 1,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              // Purple glow on active tab
              ...(active && colors.isDark
                ? {
                    shadowColor: COLORS.claude.p500,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                  }
                : {}),
            }}
          >
            {active ? (
              <LinearGradient
                colors={[COLORS.claude.p500, COLORS.claude.p700]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  borderRadius: 9999,
                }}
              />
            ) : null}
            <Text
              style={{
                fontSize,
                fontWeight: TYPOGRAPHY.semibold,
                color: active
                  ? '#FFFFFF'
                  : colors.isDark
                    ? COLORS.claude.fg3
                    : colors.textTertiary,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});
