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
import { Users, Plus, ChevronRight, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useRTL } from '../../hooks/useRTL';
import { useT } from '../../lib/i18n';
import { SmartInputButton } from '../../components/ui/SmartInputButton';
import {
  useCommunities,
  useCreateCommunity,
} from '../../hooks/useCommunity';
import { impactLight, notifySuccess, notifyError } from '../../utils/haptics';
import type { CommunityWithMembers } from '../../types/index';


// ─── Community Card ───────────────────────────────────────────────────

function CommunityCard({
  community,
  onPress,
}: {
  community: CommunityWithMembers;
  onPress: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL } = useRTL();
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.glassBg,
        borderWidth: 1,
        borderColor: colors.glassBorder,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: colors.isDark ? 0.15 : 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: colors.isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceSecondary,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 14,
        }}
      >
        <Text style={{ fontSize: 22 }}>{community.icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 }}>
          {community.name}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 13, marginTop: 3, fontWeight: '500' }}>
          {community.members.length} {community.members.length !== 1 ? t('MEMBERS') : t('MEMBER')}
          <Text style={{ color: colors.textDim }}> · </Text>
          <Text style={{ color: community.my_role === 'admin' ? colors.primary : colors.textDim }}>
            {community.my_role === 'admin' ? t('ADMIN') : t('MEMBER_ROLE')}
          </Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', marginRight: 8 }}>
        {community.members.slice(0, 3).map((m, i) => (
          <View
            key={m.id}
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 2, borderColor: colors.background,
              alignItems: 'center', justifyContent: 'center',
              marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i,
            }}
          >
            {m.avatar_url ? (
              <Image source={{ uri: m.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
            ) : (
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>
                {m.full_name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        ))}
        {community.members.length > 3 && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryDark, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>+{community.members.length - 3}</Text>
          </View>
        )}
      </View>
      <ChevronRight size={16} color={colors.textDim} style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }} />
    </Pressable>
  );
}

// ─── Create Community Modal ───────────────────────────────────────────

function CreateCommunityModal({ visible, onClose }: { visible: boolean; onClose: () => void }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const [name, setName] = useState('');
  const { mutateAsync: create, isPending } = useCreateCommunity();

  const handleCreate = async (): Promise<void> => {
    if (!name.trim()) return;
    try {
      await create({ name: name.trim(), icon: '👥' });
      notifySuccess();
      setName('');
      onClose();
    } catch {
      notifyError();
      Alert.alert(t('ERROR_TITLE'), t('ERROR_CREATE_COMMUNITY'));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>{t('NEW_COMMUNITY')}</Text>
          <Pressable onPress={onClose} hitSlop={8} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 24 }}>
          <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' }}>{t('COMMUNITY_NAME')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t('COMMUNITY_NAME_PLACEHOLDER')} placeholderTextColor={colors.textDim} style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.textPrimary }} autoFocus />
        </ScrollView>
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Pressable onPress={handleCreate} disabled={!name.trim() || isPending} style={{ backgroundColor: name.trim() ? '#8B5CF6' : colors.surfaceSecondary, borderRadius: 10, paddingVertical: 16, alignItems: 'center' }}>
            {isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{t('CREATE_COMMUNITY')}</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────

function EmptyState({ onCreatePress }: { onCreatePress: () => void }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryDark + '18', borderWidth: 1, borderColor: colors.primary + '30', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Users size={34} color={colors.primary} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 }}>{t('NO_COMMUNITIES')}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>{t('NO_COMMUNITIES_DESC')}</Text>
      <Pressable onPress={onCreatePress} style={{ backgroundColor: colors.primaryDark, borderRadius: 10, paddingHorizontal: 28, paddingVertical: 13 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('CREATE_COMMUNITY')}</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function CommunityScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const router = useRouter();
  const { hPad } = useResponsive();
  const [showCreate, setShowCreate] = useState(false);
  const { data: communities, isLoading, isError, refetch } = useCommunities();

  const handleCommunityPress = (community: CommunityWithMembers): void => {
    impactLight();
    router.push({ pathname: '/(tabs)/community-detail', params: { id: community.id } });
  };

  return (
    <ErrorBoundary>
    <AppScreen backgroundColor={colors.background} noKeyboard horizontalPadding={0}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: hPad, paddingTop: 8, paddingBottom: 16 }}>
        <View>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }}>{t('COMMUNITY')}</Text>
          <Text style={{ color: colors.textDim, fontSize: 13, marginTop: 2, fontWeight: '500' }}>{t('COMMUNITY_SUBTITLE')}</Text>
        </View>
        <Pressable onPress={() => { impactLight(); setShowCreate(true); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <Text style={{ color: colors.textTertiary, fontSize: 15, textAlign: 'center', marginBottom: 16 }}>{t('COULD_NOT_LOAD_COMMUNITIES')}</Text>
          <Pressable onPress={() => refetch()} style={{ backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 14 }}>{t('RETRY')}</Text>
          </Pressable>
        </View>
      ) : !communities || communities.length === 0 ? (
        <EmptyState onCreatePress={() => setShowCreate(true)} />
      ) : (
        <FlashList<CommunityWithMembers>
          data={communities}
          keyExtractor={(item) => item.id}
          style={{ paddingHorizontal: hPad, paddingBottom: 24 }}
          renderItem={({ item }: ListRenderItemInfo<CommunityWithMembers>) => (
            <CommunityCard community={item} onPress={() => handleCommunityPress(item)} />
          )}
        />
      )}

      <CreateCommunityModal visible={showCreate} onClose={() => setShowCreate(false)} />

      {/* Smart Input Button */}
      <View style={{ position: 'absolute', right: 12, bottom: 108 }}>
        <SmartInputButton
          onPress={() => {
            impactLight();
            router.push('/(tabs)/smart-input');
          }}
        />
      </View>
    </AppScreen>
    </ErrorBoundary>
  );
}
