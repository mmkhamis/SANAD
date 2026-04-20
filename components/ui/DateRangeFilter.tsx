import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subMonths,
  addMonths,
  parseISO,
  isSameDay,
  isWithinInterval,
  isBefore,
  isAfter,
  getDay,
  getDaysInMonth,
} from 'date-fns';
import { Calendar, X, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { impactLight } from '../../utils/haptics';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { formatMonthYear, formatShortDate, formatFullDate, getDayLabels } from '../../utils/locale-format';

// ─── Types ───────────────────────────────────────────────────────────

export type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'year_to_date' | 'custom';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  preset: DatePreset;
  label: string;
}

// ─── Preset computations ─────────────────────────────────────────────

function computePreset(preset: Exclude<DatePreset, 'custom'>): DateRange {
  const now = new Date();
  switch (preset) {
    case 'today':
      return {
        start: format(startOfDay(now), 'yyyy-MM-dd'),
        end: format(endOfDay(now), 'yyyy-MM-dd'),
        preset: 'today',
        label: 'Today',
      };
    case 'this_week':
      return {
        start: format(startOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd'),
        preset: 'this_week',
        label: 'This Week',
      };
    case 'this_month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
        preset: 'this_month',
        label: 'This Month',
      };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return {
        start: format(startOfMonth(prev), 'yyyy-MM-dd'),
        end: format(endOfMonth(prev), 'yyyy-MM-dd'),
        preset: 'last_month',
        label: 'Last Month',
      };
    }
    case 'last_3_months': {
      const threeAgo = subMonths(now, 2);
      return {
        start: format(startOfMonth(threeAgo), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
        preset: 'last_3_months',
        label: 'Last 3 Months',
      };
    }
    case 'year_to_date':
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfDay(now), 'yyyy-MM-dd'),
        preset: 'year_to_date',
        label: 'Year to Date',
      };
  }
}

export function getDefaultRange(): DateRange {
  return computePreset('this_month');
}

// ─── Preset definitions ──────────────────────────────────────────────

const PRESETS: { key: Exclude<DatePreset, 'custom'>; labelKey: string }[] = [
  { key: 'today', labelKey: 'DATE_TODAY' },
  { key: 'this_week', labelKey: 'DATE_THIS_WEEK' },
  { key: 'this_month', labelKey: 'DATE_THIS_MONTH' },
  { key: 'last_month', labelKey: 'DATE_LAST_MONTH' },
  { key: 'last_3_months', labelKey: 'DATE_LAST_3_MONTHS' },
  { key: 'year_to_date', labelKey: 'DATE_YEAR_TO_DATE' },
];

// ─── Calendar Grid ───────────────────────────────────────────────────

const DAY_LABELS = getDayLabels(); // Week starts Saturday (MENA)

function CalendarMonth({
  month,
  selectedStart,
  selectedEnd,
  onDayPress,
}: {
  month: Date;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  onDayPress: (date: Date) => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const dayLabels = getDayLabels();
  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(month);
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    // getDay: 0=Sun…6=Sat  → shift so Sat=0
    const startOffset = (getDay(firstDay) + 1) % 7;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    }
    return cells;
  }, [month]);

  const today = new Date();

  return (
    <View>
      {/* Day-of-week header */}
      <View className="flex-row mb-1">
        {dayLabels.map((d, i) => (
          <View key={`${d}-${i}`} className="flex-1 items-center py-1">
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textTertiary }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View className="flex-row flex-wrap">
        {days.map((day, idx) => {
          if (!day) {
            return <View key={`blank-${idx}`} style={{ width: '14.28%', height: 40 }} />;
          }

          const isStart = selectedStart && isSameDay(day, selectedStart);
          const isEnd = selectedEnd && isSameDay(day, selectedEnd);
          const isInRange =
            selectedStart && selectedEnd && !isBefore(selectedEnd, selectedStart)
              ? isWithinInterval(day, { start: selectedStart, end: selectedEnd })
              : false;
          const isToday = isSameDay(day, today);
          const isSelected = isStart || isEnd;

          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onDayPress(day)}
              style={{
                width: '14.28%',
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected
                    ? colors.primary
                    : isInRange
                    ? colors.primary + '15'
                    : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSelected || isToday ? '700' : '400',
                    color: isSelected
                      ? '#FFFFFF'
                      : isToday
                      ? colors.primary
                      : colors.textPrimary,
                  }}
                >
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Custom Range Calendar Modal ─────────────────────────────────────

function CustomRangeModal({
  visible,
  onClose,
  onApply,
  initialStart,
  initialEnd,
}: {
  visible: boolean;
  onClose: () => void;
  onApply: (start: string, end: string) => void;
  initialStart: string;
  initialEnd: string;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseISO(initialStart);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [startDate, setStartDate] = useState<Date | null>(() => parseISO(initialStart));
  const [endDate, setEndDate] = useState<Date | null>(() => parseISO(initialEnd));
  const [selectingEnd, setSelectingEnd] = useState(false);

  const handleDayPress = (day: Date): void => {
    impactLight();
    if (!selectingEnd || !startDate) {
      // Selecting start date
      setStartDate(day);
      setEndDate(null);
      setSelectingEnd(true);
    } else {
      // Selecting end date
      if (isBefore(day, startDate)) {
        // Tapped before start — swap
        setEndDate(startDate);
        setStartDate(day);
      } else {
        setEndDate(day);
      }
      setSelectingEnd(false);
    }
  };

  const canApply = startDate && endDate && !isAfter(startDate, endDate);

  const handleApply = (): void => {
    if (startDate && endDate) {
      onApply(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 pb-3"
          style={{ paddingTop: insets.top + 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
        >
          <Pressable onPress={onClose} hitSlop={12} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary }}>
            {t('DATE_SELECT_RANGE' as any)}
          </Text>
          <Pressable
            onPress={handleApply}
            hitSlop={12}
            style={{ padding: 4, opacity: canApply ? 1 : 0.3 }}
            disabled={!canApply}
          >
            <Check size={22} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Selection summary */}
          <View className="flex-row gap-3 px-5 py-4">
            <View
              className="flex-1 rounded-xl p-3"
              style={{
                backgroundColor: selectingEnd && !startDate ? colors.primary + '10' : colors.surface,
                borderWidth: 1.5,
                borderColor: !selectingEnd ? colors.primary : colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 2 }}>{t('DATE_FROM' as any)}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: startDate ? colors.textPrimary : colors.textTertiary }}>
                {startDate ? formatFullDate(startDate) : t('DATE_SELECT' as any)}
              </Text>
            </View>
            <View
              className="flex-1 rounded-xl p-3"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1.5,
                borderColor: selectingEnd ? colors.primary : colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 2 }}>{t('DATE_TO' as any)}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: endDate ? colors.textPrimary : colors.textTertiary }}>
                {endDate ? formatFullDate(endDate) : t('DATE_SELECT' as any)}
              </Text>
            </View>
          </View>

          {/* Month navigation */}
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Pressable onPress={() => setViewMonth((m) => addMonths(m, isRTL ? 1 : -1))} hitSlop={12}>
              <ChevronLeft size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
              {formatMonthYear(viewMonth)}
            </Text>
            <Pressable onPress={() => setViewMonth((m) => addMonths(m, isRTL ? -1 : 1))} hitSlop={12}>
              <ChevronRight size={20} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Calendar grid */}
          <View className="px-3">
            <CalendarMonth
              month={viewMonth}
              selectedStart={startDate}
              selectedEnd={endDate}
              onDayPress={handleDayPress}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main DateRangeFilter Component ──────────────────────────────────

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (key: Exclude<DatePreset, 'custom'>): void => {
    impactLight();
    onChange(computePreset(key));
  };

  const handleCustomApply = (start: string, end: string): void => {
    impactLight();
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const label = `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
    onChange({ start, end, preset: 'custom', label });
    setShowCustom(false);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
      >
        {/* Custom button first */}
        <Pressable
          onPress={() => { impactLight(); setShowCustom(true); }}
          className="rounded-full px-3 py-1.5 flex-row items-center"
          style={{
            backgroundColor: value.preset === 'custom' ? colors.primary : colors.surfaceSecondary,
          }}
        >
          <Calendar size={12} color={value.preset === 'custom' ? '#FFFFFF' : colors.textSecondary} strokeWidth={2} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: value.preset === 'custom' ? '#FFFFFF' : colors.textSecondary,
              marginLeft: 4,
            }}
          >
            {value.preset === 'custom' ? value.label : t('DATE_CUSTOM' as any)}
          </Text>
        </Pressable>

        {PRESETS.map((p) => {
          const isActive = value.preset === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => handlePreset(p.key)}
              className="rounded-full px-3 py-1.5"
              style={{
                backgroundColor: isActive ? colors.primary : colors.surfaceSecondary,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: isActive ? '#FFFFFF' : colors.textSecondary,
                }}
              >
                {t(p.labelKey as any)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <CustomRangeModal
        visible={showCustom}
        onClose={() => setShowCustom(false)}
        onApply={handleCustomApply}
        initialStart={value.start}
        initialEnd={value.end}
      />
    </>
  );
}
