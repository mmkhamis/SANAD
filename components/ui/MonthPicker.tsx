import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { impactLight } from '../../utils/haptics';
import { formatMonthYear } from '../../utils/locale-format';
import { useT } from '../../lib/i18n';
import { MonthYearSheet } from './MonthYearSheet';

interface MonthPickerProps {
  /** Current month in YYYY-MM format */
  month: string;
  onMonthChange: (month: string) => void;
}

export function MonthPicker({ month, onMonthChange }: MonthPickerProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL } = useRTL();
  const [pickerOpen, setPickerOpen] = useState(false);
  const monthDate = new Date(`${month}-01`);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const isCurrentMonth = month === currentMonth;

  const goBack = (): void => {
    impactLight();
    onMonthChange(format(subMonths(monthDate, 1), 'yyyy-MM'));
  };

  const goForward = (): void => {
    impactLight();
    onMonthChange(format(addMonths(monthDate, 1), 'yyyy-MM'));
  };

  const onPressLeft = isRTL ? goForward : goBack;
  const onPressRight = isRTL ? goBack : goForward;

  return (
    <>
      <View className="flex-row items-center justify-center gap-4 py-2 px-4">
        <Pressable onPress={onPressLeft} hitSlop={12} className="p-1">
          <ChevronLeft size={20} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={() => { impactLight(); setPickerOpen(true); }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('PICK_MONTH' as any)}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isCurrentMonth ? colors.textPrimary : colors.primary,
              minWidth: 140,
              textAlign: 'center',
            }}
          >
            {formatMonthYear(monthDate)}
          </Text>
        </Pressable>

        <Pressable onPress={onPressRight} hitSlop={12} className="p-1">
          <ChevronRight size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <MonthYearSheet
        visible={pickerOpen}
        currentMonth={month}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          onMonthChange(picked);
          setPickerOpen(false);
        }}
      />
    </>
  );
}
