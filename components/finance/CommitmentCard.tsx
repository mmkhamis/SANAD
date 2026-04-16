import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { format, differenceInDays, parseISO } from 'date-fns';
import { CalendarClock, Check } from 'lucide-react-native';
import { CategoryIcon } from '../ui/CategoryIcon';

import { useThemeColors } from '../../hooks/useThemeColors';
import { formatAmount } from '../../utils/currency';
import { useT } from '../../lib/i18n';
import { formatShortDate } from '../../utils/locale-format';
import type { Commitment } from '../../types/index';

interface CommitmentCardProps {
  commitment: Commitment;
  onMarkPaid?: (id: string) => void;
  isPaying?: boolean;
}

export function CommitmentCard({
  commitment,
  onMarkPaid,
  isPaying,
}: CommitmentCardProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const dueDate = parseISO(commitment.next_due_date);
  const daysUntil = differenceInDays(dueDate, new Date());

  const urgencyColor =
    daysUntil < 0
      ? colors.expense
      : daysUntil <= 3
        ? colors.warning
        : daysUntil <= 7
          ? colors.info
          : colors.textSecondary;

  const urgencyLabel =
    daysUntil < 0
      ? `${Math.abs(daysUntil)}${t('DUE_OVERDUE_DAYS' as any)}`
      : daysUntil === 0
        ? t('DUE_TODAY_LABEL' as any)
        : daysUntil === 1
          ? t('DUE_TOMORROW_LABEL' as any)
          : `${daysUntil}${t('DUE_DAYS_LEFT' as any)}`;

  return (
    <View
      className="mx-4 mb-2 rounded-xl p-3 flex-row items-center"
      style={{ backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder }}
    >
      {/* Icon */}
      <View
        className="h-10 w-10 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: commitment.category_color ? `${commitment.category_color}20` : colors.surfaceSecondary }}
      >
        {commitment.category_icon ? (
          <CategoryIcon
            name={commitment.category_icon}
            size={18}
            color={commitment.category_color ?? colors.primary}
          />
        ) : (
          <CalendarClock size={18} color={colors.primary} />
        )}
      </View>

      {/* Info */}
      <View className="flex-1">
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
        >
          {commitment.name}
        </Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          <Text style={{ fontSize: 12, color: urgencyColor, fontWeight: '500' }}>
            {urgencyLabel}
          </Text>
          <Text style={{ fontSize: 11, color: colors.textTertiary }}>
            {formatShortDate(dueDate)} · {commitment.recurrence_type}
          </Text>
        </View>
      </View>

      {/* Amount + Pay */}
      <View className="items-end gap-1">
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.expense }}>
          {formatAmount(commitment.amount)}
        </Text>
        {onMarkPaid && (
          <Pressable
            onPress={() => onMarkPaid(commitment.id)}
            disabled={isPaying}
            className="flex-row items-center gap-1 px-2 py-0.5 rounded-md"
            style={{ backgroundColor: colors.income + '20' }}
          >
            <Check size={12} color={colors.income} />
            <Text style={{ fontSize: 11, color: colors.income, fontWeight: '600' }}>{t('MARK_PAID')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
