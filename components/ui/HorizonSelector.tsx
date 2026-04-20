import React from 'react';
import { View, Text, Pressable } from 'react-native';

import { impactLight } from '../../utils/haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';

export type HorizonMonths = 1 | 2 | 3 | 6;

const OPTION_KEYS: Record<HorizonMonths, string> = {
  1: 'HORIZON_1_MO',
  2: 'HORIZON_2_MO',
  3: 'HORIZON_3_MO',
  6: 'HORIZON_6_MO',
};

const OPTION_VALUES: HorizonMonths[] = [1, 2, 3, 6];

interface HorizonSelectorProps {
  selected: HorizonMonths;
  onChange: (value: HorizonMonths) => void;
}

export function HorizonSelector({ selected, onChange }: HorizonSelectorProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir } = useRTL();
  return (
    <View
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: colors.surfaceSecondary, flexDirection: rowDir }}
    >
      {OPTION_VALUES.map((value) => {
        const isActive = value === selected;
        return (
          <Pressable
            key={value}
            onPress={() => { impactLight(); onChange(value); }}
            className="flex-1 items-center py-2"
            style={{
              backgroundColor: isActive ? colors.primary : 'transparent',
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: isActive ? '#FFFFFF' : colors.textSecondary,
              }}
            >
              {t(OPTION_KEYS[value] as any)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
