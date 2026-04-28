import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { useLanguageStore } from '../../store/language-store';
import { formatMonthName, toArabicDigits } from '../../utils/locale-format';
import { MonthYearSheet } from './MonthYearSheet';

export type HorizonMonths = 1 | 2 | 3 | 6 | 'custom';

const OPTION_KEYS: Record<Exclude<HorizonMonths, 'custom'>, string> = {
  1: 'HORIZON_1_MO',
  2: 'HORIZON_2_MO',
  3: 'HORIZON_3_MO',
  6: 'HORIZON_6_MO',
};

const OPTION_VALUES: Exclude<HorizonMonths, 'custom'>[] = [1, 2, 3, 6];

interface HorizonSelectorProps {
  selected: HorizonMonths;
  onChange: (value: HorizonMonths) => void;
  /** Custom horizon target in YYYY-MM. Required when selecting 'custom'. */
  customMonth?: string | null;
  onCustomMonthChange?: (month: string) => void;
}

export function HorizonSelector({
  selected,
  onChange,
  customMonth = null,
  onCustomMonthChange,
}: HorizonSelectorProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir } = useRTL();
  const language = useLanguageStore((s) => s.language);
  const [pickerOpen, setPickerOpen] = useState(false);
  const currentMonth = format(new Date(), 'yyyy-MM');
  const resolvedCustomMonth = customMonth ?? currentMonth;

  const handleCustomPress = (): void => {
    impactLight();
    setPickerOpen(true);
  };

  const isCustomActive = selected === 'custom';
  const customLabel = isCustomActive
    ? formatShortMonthYear(resolvedCustomMonth, language)
    : t('HORIZON_CUSTOM' as any);

  return (
    <>
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

        {/* Custom — opens the month sheet; shows the chosen month when active */}
        <Pressable
          onPress={handleCustomPress}
          className="flex-1 items-center py-2"
          style={{
            backgroundColor: isCustomActive ? colors.primary : 'transparent',
            borderRadius: 10,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <Calendar
            size={12}
            color={isCustomActive ? '#FFFFFF' : colors.textSecondary}
            strokeWidth={2.2}
          />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: isCustomActive ? '#FFFFFF' : colors.textSecondary,
            }}
            numberOfLines={1}
          >
            {customLabel}
          </Text>
        </Pressable>
      </View>

      <MonthYearSheet
        visible={pickerOpen}
        currentMonth={resolvedCustomMonth}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          onCustomMonthChange?.(picked);
          onChange('custom');
          setPickerOpen(false);
        }}
        title={t('PICK_HORIZON_MONTH' as any)}
      />
    </>
  );
}

function formatShortMonthYear(month: string, language: string): string {
  // YYYY-MM → "MMM yy"  (e.g. "Aug '26" / "أغس ٢٦")
  try {
    const d = new Date(`${month}-01`);
    if (language === 'ar') {
      return `${formatMonthName(d)} ${toArabicDigits(String(d.getFullYear()).slice(-2))}`;
    }
    return format(d, "MMM ''yy");
  } catch {
    return month;
  }
}
