import React, { useState } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import {
  View,
  Text as BaseText,
  type TextProps,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen } from '../../components/ui/AppScreen';
import { useResponsive } from '../../hooks/useResponsive';
import { ArrowLeft, Calculator, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import {
  useSplitEventDetail,
  useSetItemAssignments,
  useComputeSettlements,
  useMarkSettlementPaid,
  useUpdateEventExtras,
  useCommunities,
} from '../../hooks/useCommunity';
import { formatAmount } from '../../utils/currency';
import { impactLight, notifySuccess, notifyError } from '../../utils/haptics';
import type { SplitItem, CommunityMember, SplitSettlement } from '../../types/index';

// RTL-aware Text wrapper: every <Text> in this file auto-aligns to the
// active language's start edge (right in Arabic, left in English).
function Text({ style, ...rest }: TextProps): React.ReactElement {
  const { textAlign } = useRTL();
  return <BaseText style={[{ textAlign }, style]} {...rest} />;
}


// ─── Avatar ───────────────────────────────────────────────────────────

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }): React.ReactElement {
  const colors = useThemeColors();
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: size * 0.4 }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

// ─── Assign Item Modal ────────────────────────────────────────────────

function AssignItemModal({
  item,
  members,
  visible,
  onClose,
}: {
  item: SplitItem;
  members: CommunityMember[];
  visible: boolean;
  onClose: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set(item.assignments.map((a) => a.user_id)));
  const { mutateAsync: setAssignments, isPending } = useSetItemAssignments();

  const toggle = (userId: string): void => {
    impactLight();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      await setAssignments({ itemId: item.id, userIds: Array.from(selected) });
      notifySuccess();
      onClose();
    } catch {
      notifyError();
      Alert.alert(t('ERROR_TITLE'), t('SPLIT_SAVE_FAILED' as any));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 }}>{t('SPLIT_WHO_ORDERED' as any)} {item.name}?</Text>
          <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 4 }}>{t('SPLIT_SHARE_HINT' as any)}</Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
          {members.map((member) => {
            const isSelected = selected.has(member.user_id);
            return (
              <Pressable key={member.user_id} onPress={() => toggle(member.user_id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <Avatar name={member.full_name} avatarUrl={member.avatar_url} />
                <Text style={{ flex: 1, marginLeft: 12, color: colors.textPrimary, fontWeight: '500', fontSize: 15 }}>{member.full_name}</Text>
                {isSelected ? <CheckCircle2 size={22} color={colors.primary} /> : <Circle size={22} color={colors.textDim} />}
              </Pressable>
            );
          })}
          {selected.size > 0 && (
            <View style={{ marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: colors.primaryDark + '15' }}>
              <Text style={{ color: colors.primary, fontSize: 14, textAlign: 'center' }}>
                {t('SPLIT_EACH_PAYS' as any)} <Text style={{ fontWeight: '700' }}>{formatAmount(item.total_price / selected.size)}</Text>
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}>
          <Pressable onPress={handleSave} disabled={isPending} style={{ borderRadius: 10, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primaryDark }}>
            {isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{t('SPLIT_SAVE_ASSIGNMENT' as any)}</Text>}
          </Pressable>
          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: colors.textDim, fontSize: 14 }}>{t('CANCEL')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────

function ItemRow({ item, members, onAssign }: { item: SplitItem; members: CommunityMember[]; onAssign: () => void }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const assignedNames = item.assignments.map((a) => a.full_name).join(', ');
  const isAssigned = item.assignments.length > 0;

  return (
    <Pressable onPress={onAssign} style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: isAssigned ? colors.borderLight : '#e5484d30', borderRadius: 10, padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>
            {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.name}
          </Text>
          {isAssigned ? (
            <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2 }}>{assignedNames}</Text>
          ) : (
            <Text style={{ color: '#e5484d', fontSize: 12, marginTop: 2 }}>{t('SPLIT_TAP_ASSIGN' as any)}</Text>
          )}
        </View>
        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>{formatAmount(item.total_price)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Settlement Row ───────────────────────────────────────────────────

function SettlementRow({ settlement, onTogglePaid }: { settlement: SplitSettlement; onTogglePaid: (isPaid: boolean) => void }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  return (
    <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
      <Avatar name={settlement.full_name} avatarUrl={settlement.avatar_url} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>{settlement.full_name}</Text>
        <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 2 }}>
          {t('SPLIT_ITEMS_LABEL' as any)} {formatAmount(settlement.items_total)} + {t('SPLIT_EXTRAS_LABEL' as any)} {formatAmount(settlement.extras_share)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 15, color: settlement.is_paid ? colors.income : '#e5484d' }}>{formatAmount(settlement.amount_owed)}</Text>
      </View>
      <Switch value={settlement.is_paid} onValueChange={onTogglePaid} trackColor={{ false: colors.border, true: colors.income }} thumbColor="#fff" />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function SplitEventScreen(): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL } = useRTL();
  const t = useT();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const [assigningItem, setAssigningItem] = useState<SplitItem | null>(null);
  const [showSettlements, setShowSettlements] = useState(false);

  const insets = useSafeAreaInsets();
  const { data: detail, isLoading, isError, refetch } = useSplitEventDetail(eventId ?? '');
  const { data: communities } = useCommunities();
  const { mutateAsync: computeSettlements, isPending: isComputing } = useComputeSettlements();
  const { mutateAsync: markPaid } = useMarkSettlementPaid();

  const community = communities?.find((c) => c.id === detail?.community_id);
  const members = community?.members ?? [];
  const { hPad } = useResponsive();

  const handleCompute = async (): Promise<void> => {
    if (!eventId) return;
    impactLight();
    try {
      await computeSettlements(eventId);
      notifySuccess();
      setShowSettlements(true);
    } catch {
      notifyError();
      Alert.alert(t('ERROR_TITLE'), t('SPLIT_SETTLE_FAILED' as any));
    }
  };

  const handleTogglePaid = async (settlement: SplitSettlement, isPaid: boolean): Promise<void> => {
    impactLight();
    try {
      await markPaid({ eventId: settlement.event_id, userId: settlement.user_id, isPaid });
    } catch {
      notifyError();
    }
  };

  if (isLoading) {
    return (
      <AppScreen backgroundColor={colors.background} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </AppScreen>
    );
  }

  if (isError || !detail) {
    return (
      <AppScreen backgroundColor={colors.background} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textTertiary, fontSize: 15 }}>{t('SPLIT_COULD_NOT_LOAD' as any)}</Text>
        <Pressable onPress={() => refetch()} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primaryDark }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{t('RETRY')}</Text>
        </Pressable>
      </AppScreen>
    );
  }

  const unassignedCount = detail.items.filter((i) => i.assignments.length === 0).length;
  const hasSettlements = detail.settlements.length > 0;

  return (
    <ErrorBoundary>
    <AppScreen backgroundColor={colors.background} noKeyboard horizontalPadding={0}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hPad, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>{detail.title}</Text>
          <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2, fontWeight: '500' }}>{detail.date} · {detail.currency}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: hPad }} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Summary Card */}
        <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          {[
            { label: t('SPLIT_SUBTOTAL' as any), value: detail.subtotal, show: true },
            { label: t('SPLIT_TAX' as any), value: detail.tax, show: detail.tax > 0 },
            { label: t('SPLIT_SERVICE_FEE' as any), value: detail.service_fee, show: detail.service_fee > 0 },
          ].filter((r) => r.show).map(({ label, value }) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>{label}</Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>{formatAmount(value)}</Text>
            </View>
          ))}
          {detail.discount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>{t('SPLIT_DISCOUNT' as any)}</Text>
              <Text style={{ color: colors.income, fontWeight: '600', fontSize: 14 }}>- {formatAmount(detail.discount)}</Text>
            </View>
          )}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>{t('SPLIT_TOTAL' as any)}</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 20, letterSpacing: -0.3 }}>{formatAmount(detail.total)}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('SPLIT_ITEMS' as any)} ({detail.items.length})</Text>
          {unassignedCount > 0 && <Text style={{ color: '#e5484d', fontSize: 12, fontWeight: '500' }}>{unassignedCount} {t('SPLIT_UNASSIGNED' as any)}</Text>}
        </View>

        {detail.items.map((item) => (
          <ItemRow key={item.id} item={item} members={members} onAssign={() => { impactLight(); setAssigningItem(item); }} />
        ))}

        {/* Calculate Button */}
        <Pressable onPress={handleCompute} disabled={isComputing || unassignedCount > 0} style={{ borderRadius: 10, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 16, backgroundColor: unassignedCount > 0 ? colors.surfaceSecondary : colors.primaryDark }}>
          {isComputing ? <ActivityIndicator color="#fff" /> : (
            <>
              <Calculator size={18} color={unassignedCount > 0 ? colors.textDim : '#fff'} />
              <Text style={{ color: unassignedCount > 0 ? colors.textDim : '#fff', fontWeight: '700', fontSize: 15, marginLeft: 8 }}>
                {unassignedCount > 0 ? `${t('SPLIT_ASSIGN_MORE' as any)} ${unassignedCount} ${t('SPLIT_MORE_ITEMS' as any)}` : t('SPLIT_CALCULATE' as any)}
              </Text>
            </>
          )}
        </Pressable>

        {/* Settlements */}
        {hasSettlements && (
          <View style={{ marginBottom: 24 }}>
            <Pressable onPress={() => { impactLight(); setShowSettlements((v) => !v); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('SPLIT_SETTLEMENTS' as any)} ({detail.settlements.length})</Text>
              {showSettlements ? <ChevronUp size={16} color={colors.textDim} /> : <ChevronDown size={16} color={colors.textDim} />}
            </Pressable>

            {showSettlements && detail.settlements.map((s) => (
              <SettlementRow key={s.id} settlement={s} onTogglePaid={(isPaid) => handleTogglePaid(s, isPaid)} />
            ))}

            {showSettlements && (
              <View style={{ padding: 12, borderRadius: 10, marginTop: 4, backgroundColor: colors.income + '15' }}>
                <Text style={{ color: colors.income, fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
                  {detail.settlements.filter((s) => s.is_paid).length}/{detail.settlements.length} {t('SPLIT_PAID_COUNT' as any)}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Assign Item Modal */}
      {assigningItem && (
        <AssignItemModal item={assigningItem} members={members} visible={!!assigningItem} onClose={() => { setAssigningItem(null); refetch(); }} />
      )}
    </AppScreen>
    </ErrorBoundary>
  );
}
