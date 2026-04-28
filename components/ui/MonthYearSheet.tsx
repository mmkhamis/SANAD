/**
 * MonthYearSheet — clean modal sheet for picking a year + month.
 *
 * Layout:
 *   [×]                                         [Pick month]
 *   ─────────────────────────────────────────────────────
 *      … 2024  2025  2026  2027 …       (snappy chip strip)
 *   ─────────────────────────────────────────────────────
 *      Jan  Feb  Mar  Apr
 *      May  Jun  Jul  Aug
 *      Sep  Oct  Nov  Dec               (3-row grid, full names)
 *   ─────────────────────────────────────────────────────
 *               This month               (subtle text shortcut)
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { X } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { impactLight } from '../../utils/haptics';
import { useT } from '../../lib/i18n';

const MONTH_KEYS = [
  'MONTH_JAN', 'MONTH_FEB', 'MONTH_MAR', 'MONTH_APR',
  'MONTH_MAY', 'MONTH_JUN', 'MONTH_JUL', 'MONTH_AUG',
  'MONTH_SEP', 'MONTH_OCT', 'MONTH_NOV', 'MONTH_DEC',
] as const;

interface MonthYearSheetProps {
  visible: boolean;
  /** Currently-selected month in YYYY-MM format, or null for none. */
  currentMonth: string | null;
  onClose: () => void;
  onPick: (month: string) => void;
  /** Allow picking future months. Defaults to true. */
  allowFuture?: boolean;
  title?: string;
}

const YEAR_RANGE_BACK = 6;
const YEAR_RANGE_FORWARD = 5;

export function MonthYearSheet({
  visible,
  currentMonth,
  onClose,
  onPick,
  allowFuture = true,
  title,
}: MonthYearSheetProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL } = useRTL();
  const today = new Date();
  const todayMonth = format(today, 'yyyy-MM');
  const todayYear = today.getFullYear();
  const todayMonthIdx = today.getMonth();

  const initialYear = currentMonth
    ? parseInt(currentMonth.slice(0, 4), 10) || todayYear
    : todayYear;
  const [year, setYear] = useState(initialYear);
  const yearScrollRef = useRef<ScrollView | null>(null);

  // Reset and scroll the year strip to center each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const next = currentMonth ? parseInt(currentMonth.slice(0, 4), 10) || todayYear : todayYear;
    setYear(next);
    requestAnimationFrame(() => {
      const idx = next - (todayYear - YEAR_RANGE_BACK);
      const offset = Math.max(0, idx * 76 - 110);
      yearScrollRef.current?.scrollTo({ x: offset, animated: false });
    });
  }, [visible, currentMonth, todayYear]);

  const months = useMemo(
    () => MONTH_KEYS.map((k, i) => ({ key: k, label: t(k as any), idx: i })),
    [t],
  );

  const years = useMemo(
    () => Array.from({ length: YEAR_RANGE_BACK + YEAR_RANGE_FORWARD + 1 }, (_, i) => todayYear - YEAR_RANGE_BACK + i),
    [todayYear],
  );
  const monthCellWidth = isRTL ? '31.5%' : '23.5%';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.55)',
          }}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: 12,
            paddingBottom: 26,
            paddingHorizontal: 22,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -8 },
            shadowOpacity: colors.isDark ? 0.5 : 0.12,
            shadowRadius: 24,
          }}
        >
          {/* Drag handle */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.border,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 22,
            }}
          >
            <Pressable
              onPress={() => { impactLight(); onClose(); }}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <X size={15} color={colors.textSecondary} strokeWidth={2.2} />
            </Pressable>

            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.textPrimary,
                letterSpacing: -0.2,
              }}
            >
              {title ?? t('PICK_MONTH' as any)}
            </Text>
          </View>

          {/* Year strip — single source of truth, no redundant arrows */}
          <ScrollView
            ref={yearScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 4,
              paddingVertical: 4,
            }}
            style={{ marginBottom: 20, marginHorizontal: -4 }}
          >
            {years.map((y) => {
              const active = y === year;
              const isCurrentYear = y === todayYear;
              return (
                <Pressable
                  key={y}
                  onPress={() => { impactLight(); setYear(y); }}
                  style={{
                    minWidth: 64,
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 12,
                    backgroundColor: active
                      ? colors.primary
                      : isCurrentYear
                        ? colors.primary + '14'
                        : 'transparent',
                    borderWidth: 1,
                    borderColor: active
                      ? colors.primary
                      : isCurrentYear
                        ? colors.primary + '40'
                        : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: active ? '700' : '600',
                      color: active
                        ? '#fff'
                        : isCurrentYear
                          ? colors.primary
                          : colors.textSecondary,
                      fontVariant: ['tabular-nums'],
                      letterSpacing: 0.3,
                    }}
                  >
                    {y}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Month grid — Arabic keeps full month names, English stays compact. */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              rowGap: 8,
            }}
          >
            {months.map((m) => {
              const monthStr = `${year}-${String(m.idx + 1).padStart(2, '0')}`;
              const isSelected = monthStr === currentMonth;
              const isCurrent = monthStr === todayMonth;
              const isFuture = !allowFuture && (year > todayYear || (year === todayYear && m.idx > todayMonthIdx));

              const display = isRTL
                ? m.label
                : m.label.length > 4
                  ? m.label.slice(0, 3)
                  : m.label;

              return (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    if (isFuture) return;
                    impactLight();
                    onPick(monthStr);
                  }}
                  disabled={isFuture}
                  style={{
                    width: monthCellWidth,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected
                      ? colors.primary
                      : isCurrent
                        ? colors.primary + '12'
                        : colors.surfaceSecondary,
                    borderWidth: isCurrent && !isSelected ? 1 : 0,
                    borderColor: isCurrent && !isSelected ? colors.primary + '50' : 'transparent',
                    opacity: isFuture ? 0.35 : 1,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                    style={{
                      fontSize: isRTL ? 12.5 : 13.5,
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected
                        ? '#fff'
                        : isCurrent
                          ? colors.primary
                          : colors.textPrimary,
                      letterSpacing: isRTL ? 0 : 0.1,
                      textAlign: 'center',
                    }}
                  >
                    {display}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* This-month shortcut — subtle, only shown if not already there */}
          {currentMonth !== todayMonth ? (
            <Pressable
              onPress={() => { impactLight(); onPick(todayMonth); }}
              style={({ pressed }) => ({
                marginTop: 18,
                alignSelf: 'center',
                paddingVertical: 8,
                paddingHorizontal: 16,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.primary,
                  letterSpacing: 0.2,
                }}
              >
                {t('THIS_MONTH' as any)}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
