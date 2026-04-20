import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ArrowLeft, RotateCcw, Trash2, Receipt, Coins } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { useT, tFormat } from '../../lib/i18n';
import { formatAmount } from '../../utils/currency';
import { formatTimeAgo } from '../../utils/locale-format';
import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import {
  useTrashedTransactions,
  useTrashedAssets,
  useRestoreTransaction,
  useRestoreAsset,
  usePermanentlyDeleteTransaction,
  usePermanentlyDeleteAsset,
} from '../../hooks/useTrash';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import type { Transaction, UserAsset } from '../../types/index';

// ─── Unified trash item ──────────────────────────────────────────────

type TrashItem =
  | { kind: 'transaction'; data: Transaction; deletedAt: string }
  | { kind: 'asset'; data: UserAsset; deletedAt: string };

export default function TrashScreen(): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL } = useRTL();
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: trashedTx, isLoading: txLoading } = useTrashedTransactions();
  const { data: trashedAssets, isLoading: assetLoading } = useTrashedAssets();
  const { mutateAsync: restoreTx } = useRestoreTransaction();
  const { mutateAsync: restoreAs } = useRestoreAsset();
  const { mutateAsync: permDeleteTx } = usePermanentlyDeleteTransaction();
  const { mutateAsync: permDeleteAs } = usePermanentlyDeleteAsset();
  const [busyId, setBusyId] = useState<string | null>(null);

  const isLoading = txLoading || assetLoading;

  // Merge and sort by deletedAt descending
  const items: TrashItem[] = React.useMemo(() => {
    const txItems: TrashItem[] = (trashedTx ?? []).map((t) => ({
      kind: 'transaction' as const,
      data: t,
      deletedAt: t.deleted_at ?? t.updated_at,
    }));
    const asItems: TrashItem[] = (trashedAssets ?? []).map((a) => ({
      kind: 'asset' as const,
      data: a,
      deletedAt: a.deleted_at ?? a.updated_at,
    }));
    return [...txItems, ...asItems].sort(
      (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime(),
    );
  }, [trashedTx, trashedAssets]);

  const handleRestore = useCallback(async (item: TrashItem) => {
    setBusyId(item.kind === 'transaction' ? item.data.id : item.data.id);
    impactMedium();
    try {
      if (item.kind === 'transaction') {
        await restoreTx(item.data.id);
      } else {
        await restoreAs(item.data.id);
      }
      notifySuccess();
    } catch {
      notifyError();
    } finally {
      setBusyId(null);
    }
  }, [restoreTx, restoreAs]);

  const handlePermanentDelete = useCallback((item: TrashItem) => {
    const label = item.kind === 'transaction'
      ? `"${(item.data as Transaction).description}"`
      : `"${(item.data as UserAsset).display_name}"`;

    Alert.alert(
      t('TRASH_DELETE_PERMANENTLY' as any),
      tFormat('TRASH_DELETE_CONFIRM_TEMPLATE', { label }),
      [
        { text: t('CANCEL'), style: 'cancel' },
        {
          text: t('DELETE'),
          style: 'destructive',
          onPress: async () => {
            setBusyId(item.data.id);
            impactMedium();
            try {
              if (item.kind === 'transaction') {
                await permDeleteTx(item.data.id);
              } else {
                await permDeleteAs(item.data.id);
              }
              notifySuccess();
            } catch {
              notifyError();
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }, [permDeleteTx, permDeleteAs]);

  if (isLoading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 pb-3"
        style={{
          paddingTop: insets.top + 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <Pressable onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
          <ArrowLeft size={22} color={colors.textPrimary} strokeWidth={2} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
        </Pressable>
        <View className="flex-1">
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>
            {t('TRASH_HEADER' as any)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>
            {t('TRASH_SUBTITLE' as any)}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title={t('TRASH_EMPTY_TITLE' as any)}
          description={t('TRASH_EMPTY_DESC' as any)}
          icon={<Trash2 size={48} color={colors.textTertiary} strokeWidth={1.5} />}
        />
      ) : (
        <FlashList<TrashItem>
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.data.id}`}
          style={{ paddingTop: 8, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => {
            const isBusy = busyId === item.data.id;
            const isTransaction = item.kind === 'transaction';
            const tx = isTransaction ? (item.data as Transaction) : null;
            const asset = !isTransaction ? (item.data as UserAsset) : null;
            const timeAgo = formatTimeAgo(new Date(item.deletedAt));

            return (
              <View
                className="mx-4 mb-2 rounded-xl p-3 flex-row items-center"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                  opacity: isBusy ? 0.5 : 1,
                }}
              >
                {/* Icon */}
                <View
                  className="h-10 w-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isTransaction ? colors.expenseBg : colors.primary + '12' }}
                >
                  {isTransaction ? (
                    <Receipt size={18} color={colors.expense} strokeWidth={2} />
                  ) : (
                    <Coins size={18} color={colors.primary} strokeWidth={2} />
                  )}
                </View>

                {/* Details */}
                <View className="flex-1 mr-2">
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                    {tx ? tx.description : asset!.display_name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textTertiary }}>
                    {tx ? formatAmount(tx.amount) : `${asset!.quantity} ${asset!.unit}`}
                    {' · '}
                    {timeAgo}
                  </Text>
                </View>

                {/* Actions */}
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View className="flex-row" style={{ gap: 8 }}>
                    <Pressable
                      onPress={() => { impactLight(); handleRestore(item); }}
                      className="h-9 w-9 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.incomeBg }}
                    >
                      <RotateCcw size={16} color={colors.income} strokeWidth={2} />
                    </Pressable>
                    <Pressable
                      onPress={() => { impactLight(); handlePermanentDelete(item); }}
                      className="h-9 w-9 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.expenseBg }}
                    >
                      <Trash2 size={16} color={colors.expense} strokeWidth={2} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
    </ErrorBoundary>
  );
}
