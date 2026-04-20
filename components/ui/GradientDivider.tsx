import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS } from '../../constants/colors';
import { useThemeColors } from '../../hooks/useThemeColors';

interface GradientDividerProps {
  style?: ViewStyle;
}

/**
 * Thin gradient divider matching Claude Design:
 * height: 1px
 * background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)
 */
export const GradientDivider = React.memo(function GradientDivider({
  style,
}: GradientDividerProps): React.ReactElement {
  const colors = useThemeColors();

  return (
    <View style={[{ height: 1 }, style]}>
      <LinearGradient
        colors={
          colors.isDark
            ? ['transparent', COLORS.claude.stroke, 'transparent']
            : ['transparent', 'rgba(0,0,0,0.08)', 'transparent']
        }
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </View>
  );
});
