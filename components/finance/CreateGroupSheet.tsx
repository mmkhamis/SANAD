import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { CategoryIcon } from '../ui/CategoryIcon';

import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { useCreateCategoryGroup } from '../../hooks/useCategories';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import type { TransactionType, Category } from '../../types/index';

// ─── Preset icon/color grid ─────────────────────────────────────────

const PRESET_ICONS = [
  '🛒', '🏠', '🚗', '✈️', '🎓', '🏥', '🍽️', '💳',
  '🎬', '👕', '🐾', '💼', '🕌', '📦', '🎁', '💰',
  '🔧', '📱', '⚡', '☕', '🏋️', '🎨', '🌿', '👶',
];

const PRESET_COLORS = [
  '#8B5CF6', '#6366F1', '#3B82F6', '#0EA5E9',
  '#14B8A6', '#22C55E', '#EAB308', '#F97316',
  '#EF4444', '#EC4899', '#F43F5E', '#78716C',
];

// ─── Sub-category draft ──────────────────────────────────────────────

interface SubDraft {
  id: string;
  name: string;
  icon: string;
}

// ─── Props ───────────────────────────────────────────────────────────

interface CreateGroupSheetProps {
  visible: boolean;
  type: TransactionType;
  onClose: () => void;
  /** Called after group+categories are saved. Provides the first category for immediate use. */
  onCreated?: (firstCategory: Category | null) => void;
}

export function CreateGroupSheet({
  visible,
  type,
  onClose,
  onCreated,
}: CreateGroupSheetProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { isRTL } = useRTL();
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;
  const insets = useSafeAreaInsets();
  const { mutateAsync, isPending } = useCreateCategoryGroup();

  // ─── Form state ──────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#8B5CF6');
  const [subs, setSubs] = useState<SubDraft[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [createdCategory, setCreatedCategory] = useState<Category | null>(null);

  const reset = useCallback((): void => {
    setName('');
    setIcon('📦');
    setColor('#8B5CF6');
    setSubs([]);
    setNewSubName('');
    setStep('form');
    setCreatedCategory(null);
  }, []);

  const handleClose = useCallback((): void => {
    reset();
    onClose();
  }, [reset, onClose]);

  const addSub = useCallback((): void => {
    const trimmed = newSubName.trim();
    if (!trimmed) return;
    impactLight();
    setSubs((prev) => [...prev, { id: `sub-${Date.now()}`, name: trimmed, icon }]);
    setNewSubName('');
  }, [newSubName, icon]);

  const removeSub = useCallback((id: string): void => {
    impactLight();
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!name.trim()) {
      notifyError();
      return;
    }
    impactMedium();
    try {
      const result = await mutateAsync({
        group: { name: name.trim(), icon, color, type },
        categories: subs.map((s) => ({ name: s.name, icon: s.icon, color })),
      });
      notifySuccess();
      setCreatedCategory(result.categories[0] ?? null);
      setStep('done');
    } catch {
      notifyError();
    }
  }, [name, icon, color, type, subs, mutateAsync]);

  const handleContinueToAdd = useCallback((): void => {
    impactLight();
    const cat = createdCategory;
    reset();
    onClose();
    onCreated?.(cat);
  }, [createdCategory, reset, onClose, onCreated]);

  const handleDismiss = useCallback((): void => {
    const cat = createdCategory;
    reset();
    onClose();
    onCreated?.(cat);
  }, [createdCategory, reset, onClose, onCreated]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: colors.background }}
      >
        {/* ─── Header ─────────────────────────────────────────── */}
        <View
          className="flex-row items-center justify-between px-4 pb-3"
          style={{
            paddingTop: insets.top + 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={handleClose} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            New Category Group
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {step === 'form' ? (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: insets.bottom + 20,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Group Name ──────────────────────────────────── */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
              Group Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('CREATE_GROUP_PLACEHOLDER' as any)}
              placeholderTextColor={colors.textTertiary}
              autoFocus
              className="rounded-xl px-4 mb-5"
              style={{
                height: 48,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />

            {/* ─── Icon Picker ─────────────────────────────────── */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
              Icon
            </Text>
            <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
              {PRESET_ICONS.map((emoji) => {
                const isActive = icon === emoji;
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => { impactLight(); setIcon(emoji); }}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive ? color + '18' : colors.surfaceSecondary,
                      borderWidth: 1.5,
                      borderColor: isActive ? color : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ─── Color Picker ────────────────────────────────── */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 }}>
              Color
            </Text>
            <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
              {PRESET_COLORS.map((c) => {
                const isActive = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => { impactLight(); setColor(c); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: c,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isActive ? 3 : 0,
                      borderColor: colors.background,
                      // outer ring via shadow
                      shadowColor: isActive ? c : 'transparent',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: isActive ? 0.6 : 0,
                      shadowRadius: 6,
                    }}
                  >
                    {isActive ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {/* ─── Subcategories ────────────────────────────────── */}
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>
              Subcategories{' '}
              <Text style={{ fontSize: 12, color: colors.textTertiary }}>(optional — add later too)</Text>
            </Text>

            {subs.map((s) => (
              <View
                key={s.id}
                className="flex-row items-center rounded-xl px-3 py-2.5 mb-2"
                style={{
                  backgroundColor: color + '10',
                  borderWidth: 1,
                  borderColor: color + '25',
                }}
              >
                <View style={{ marginRight: 8 }}><CategoryIcon name={s.icon} size={18} color={color} /></View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>
                  {s.name}
                </Text>
                <Pressable onPress={() => removeSub(s.id)} hitSlop={8}>
                  <Trash2 size={16} color={colors.textTertiary} strokeWidth={2} />
                </Pressable>
              </View>
            ))}

            <View className="flex-row items-center mb-8" style={{ gap: 8 }}>
              <TextInput
                value={newSubName}
                onChangeText={setNewSubName}
                placeholder={t('SUBCATEGORY_PLACEHOLDER' as any)}
                placeholderTextColor={colors.textTertiary}
                onSubmitEditing={addSub}
                returnKeyType="done"
                className="flex-1 rounded-xl px-4"
                style={{
                  height: 44,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              />
              <Pressable
                onPress={addSub}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.primary,
                }}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            </View>

            {/* ─── Save Button ─────────────────────────────────── */}
            <Pressable
              onPress={handleSave}
              disabled={isPending || !name.trim()}
              className="rounded-xl items-center justify-center"
              style={{
                backgroundColor: name.trim() ? colors.primary : colors.border,
                height: 52,
                opacity: isPending ? 0.7 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                {isPending ? 'Saving...' : 'Create Group'}
              </Text>
            </Pressable>
          </ScrollView>
        ) : (
          /* ─── Success step ─────────────────────────────────── */
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 32,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: color + '18',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 36 }}>{icon}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
              {name} created!
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 }}>
              {subs.length > 0
                ? `${subs.length} subcategor${subs.length === 1 ? 'y' : 'ies'} added.`
                : 'You can add subcategories later.'}
            </Text>

            {/* CTA: continue to add transaction */}
            <Pressable
              onPress={handleContinueToAdd}
              className="flex-row items-center justify-center rounded-xl"
              style={{
                width: '100%',
                height: 52,
                backgroundColor: colors.primary,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                {t('CREATE_GROUP_ADD_TX_CTA')}
              </Text>
              <ForwardArrow size={18} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              style={{ marginTop: 14, padding: 8 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textTertiary }}>
                Done for now
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
