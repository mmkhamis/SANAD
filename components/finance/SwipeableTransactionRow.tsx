import React, { useCallback } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Pencil, Trash2, Split } from 'lucide-react-native';

import { TransactionRow } from './TransactionRow';
import { COLORS } from '../../constants/colors';
import { impactMedium, notifyError } from '../../utils/haptics';
import { useT } from '../../lib/i18n';
import type { Transaction } from '../../types/index';

interface SwipeableTransactionRowProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  onSplit?: (transaction: Transaction) => void;
}

// ─── Transaction row with long-press actions ─────────────────────────
// Replaced swipe gestures with long-press → action sheet.
// Tap = edit, Long press = edit/delete/split choice.
// This eliminates all RNGH/Reanimated timing issues.

export const SwipeableTransactionRow = React.memo(function SwipeableTransactionRow({
  transaction,
  onEdit,
  onDelete,
  onSplit,
}: SwipeableTransactionRowProps): React.ReactElement {
  const t = useT();

  const handleLongPress = useCallback(() => {
    impactMedium();
    const buttons: { text: string; onPress?: () => void; style?: 'destructive' | 'cancel' }[] = [
      {
        text: t('ACTION_EDIT' as any),
        onPress: () => onEdit(transaction),
      },
    ];

    if (onSplit) {
      buttons.push({
        text: t('ACTION_SPLIT_BILL' as any),
        onPress: () => onSplit(transaction),
      });
    }

    buttons.push(
      {
        text: t('ACTION_DELETE' as any),
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            t('DELETE_TRANSACTION' as any),
            `${transaction.description}`,
            [
              { text: t('CANCEL'), style: 'cancel' },
              {
                text: t('DELETE'),
                style: 'destructive',
                onPress: () => {
                  notifyError();
                  onDelete(transaction.id);
                },
              },
            ],
          );
        },
      },
      { text: t('CANCEL'), style: 'cancel' },
    );

    Alert.alert(
      transaction.description,
      undefined,
      buttons,
    );
  }, [transaction, onEdit, onDelete, onSplit, t]);

  return (
    <TransactionRow
      transaction={transaction}
      onPress={onEdit}
      onLongPress={handleLongPress}
    />
  );
});
