import React, { useState } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppScreen } from '../../components/ui/AppScreen';
import { useResponsive } from '../../hooks/useResponsive';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ArrowLeft, Plus, UserPlus, ChevronLeft, ChevronRight, X, Search, CheckCircle2, Clock } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { useT } from '../../lib/i18n';
import {
  useCommunities,
  useSplitEvents,
  useSearchUsers,
  useAddMember,
} from '../../hooks/useCommunity';
import { formatAmount } from '../../utils/currency';
import { formatFullDate } from '../../utils/locale-format';
import { impactLight, notifySuccess, notifyError } from '../../utils/haptics';
import type { SplitEvent, CommunityWithMembers } from '../../types/index';


// ─── Split Event Card ─────────────────────────────────────────────────

function SplitEventCard({ event, onPress }: { event: SplitEvent; onPress: () => void }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL, rowDir } = useRTL();
  const ForwardChevron = isRTL ? ChevronLeft : ChevronRight;
  const isSettled = event.status === 'settled';
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.cardBg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: rowDir,
        alignItems: 'center',
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSettled ? colors.income + '18' : colors.primaryDark + '18', borderWidth: 1, borderColor: isSettled ? colors.income + '30' : colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginEnd: 14 }}>
        {isSettled ? <CheckCircle2 size={20} color={colors.income} /> : <Clock size={20} color={colors.primary} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', letterSpacing: -0.2 }}>{event.title}</Text>
        <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 3, fontWeight: '500' }}>
          {formatFullDate(new Date(event.date))}
          <Text style={{ color: colors.textDim }}> · </Text>
          <Text style={{ color: isSettled ? colors.income : colors.primary }}>{isSettled ? t('SPLIT_STATUS_SETTLED') : t('SPLIT_STATUS_OPEN')}</Text>
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '700', letterSpacing: -0.3 }}>{formatAmount(event.total, { currency: event.currency })}</Text>
      </View>
      <ForwardChevron size={14} color={colors.textDim} style={{ marginStart: 8 }} />
    </Pressable>
  );
}

// ─── Add Member Modal ─────────────────────────────────────────────────

function AddMemberModal({ visible, communityId, existingUserIds, onClose }: { visible: boolean; communityId: string; existingUserIds: string[]; onClose: () => void }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const [query, setQuery] = useState('');
  const { data: results, isFetching } = useSearchUsers(query);
  const { mutateAsync: addMember, isPending } = useAddMember();

  const handleAdd = async (userId: string): Promise<void> => {
    try {
      await addMember({ communityId, userId });
      notifySuccess();
      impactLight();
    } catch {
      notifyError();
      Alert.alert(t('ERROR_TITLE'), t('ALERT_ADD_MEMBER_FAILED' as any));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>{t('ADD_MEMBER' as any)}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={colors.textTertiary} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12 }}>
            <Search size={16} color={colors.textDim} />
            <TextInput value={query} onChangeText={setQuery} placeholder={t('ADD_MEMBER_SEARCH' as any)} placeholderTextColor={colors.textDim} style={{ flex: 1, paddingVertical: 12, marginLeft: 8, fontSize: 15, color: colors.textPrimary }} autoFocus />
            {isFetching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {(results ?? []).map((user) => {
            const already = existingUserIds.includes(user.id);
            return (
              <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{user.full_name.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 15 }}>{user.full_name}</Text>
                  <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 1 }}>{user.email}</Text>
                </View>
                {already ? (
                  <View style={{ backgroundColor: colors.income + '18', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: colors.income, fontSize: 12, fontWeight: '600' }}>{t('ADDED_BADGE' as any)}</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => handleAdd(user.id)} disabled={isPending} style={{ backgroundColor: colors.primaryDark, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{t('ADD')}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
          {query.trim().length >= 2 && !isFetching && (results ?? []).length === 0 && (
            <Text style={{ color: colors.textDim, textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>{t('NO_USERS_FOUND' as any)} "{query}"</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function CommunityDetailScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { textAlign, isRTL } = useRTL();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showAddMember, setShowAddMember] = useState(false);

  const { data: communities, isLoading: comLoading } = useCommunities();
  const community = communities?.find((c) => c.id === id);
  const { data: events, isLoading: evLoading } = useSplitEvents(id ?? '');
  const isLoading = comLoading || evLoading;
  const { hPad } = useResponsive();

  if (isLoading || !community) {
    return (
      <AppScreen backgroundColor={colors.background} contentStyle={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </AppScreen>
    );
  }

  const existingUserIds = community.members.map((m) => m.user_id);

  return (
    <ErrorBoundary>
    <AppScreen backgroundColor={colors.background} noKeyboard horizontalPadding={0}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: hPad, paddingVertical: 16 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={18} color={colors.textPrimary} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
        </Pressable>
        <Text style={{ fontSize: 24, marginRight: 8 }}>{community.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.5, textAlign }}>{community.name}</Text>
          <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 2, fontWeight: '500', textAlign }}>{community.members.length} {t('MEMBERS')}</Text>
        </View>
        <Pressable onPress={() => { impactLight(); setShowAddMember(true); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <UserPlus size={16} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/create-split-event', params: { communityId: id } }); }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Members row */}
      <View style={{ paddingHorizontal: hPad, paddingBottom: 16 }}>
        <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {community.members.map((member) => (
              <View key={member.id} style={{ alignItems: 'center', marginRight: 16, width: 52 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
                  {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                  ) : (
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>{member.full_name.charAt(0).toUpperCase()}</Text>
                  )}
                </View>
                <Text numberOfLines={1} style={{ color: colors.textTertiary, fontSize: 10, marginTop: 4, fontWeight: '500', textAlign: 'center' }}>{member.full_name.split(' ')[0]}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Section label */}
      <View style={{ paddingHorizontal: hPad, paddingBottom: 10 }}>
        <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('SPLIT_EVENTS' as any)}</Text>
      </View>

      {/* Events list */}
      {!events || events.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 15, textAlign: 'center', marginBottom: 6 }}>{t('NO_SPLIT_EVENTS' as any)}</Text>
          <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center' }}>{t('NO_SPLIT_EVENTS_DESC' as any)}</Text>
        </View>
      ) : (
        <FlashList<SplitEvent>
          data={events}
          keyExtractor={(item) => item.id}
          style={{ paddingHorizontal: hPad, paddingBottom: 24 }}
          renderItem={({ item }: ListRenderItemInfo<SplitEvent>) => (
            <SplitEventCard event={item} onPress={() => { impactLight(); router.push({ pathname: '/(tabs)/split-event', params: { eventId: item.id } }); }} />
          )}
        />
      )}

      <AddMemberModal visible={showAddMember} communityId={id ?? ''} existingUserIds={existingUserIds} onClose={() => setShowAddMember(false)} />
    </AppScreen>
    </ErrorBoundary>
  );
}
