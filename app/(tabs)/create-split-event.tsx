import React, { useState } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Trash2, Camera, Receipt, Search, X, UserPlus } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'expo-image';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useCreateSplitEvent, useSearchUsers } from '../../hooks/useCommunity';
import { createCommunity, addMemberToCommunity } from '../../services/community-service';
import { impactLight, impactMedium, notifySuccess, notifyError } from '../../utils/haptics';
import { invokeWithRetry } from '../../lib/supabase';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { useT } from '../../lib/i18n';


interface LineItem {
  id: string;
  name: string;
  quantity: string;
  unit_price: string;
}

function newItem(): LineItem {
  return { id: Math.random().toString(36).slice(2), name: '', quantity: '1', unit_price: '' };
}

// ─── OCR Receipt Helper ───────────────────────────────────────────────

interface OcrItem {
  name: string;
  quantity: number;
  unit_price: number;
}

interface OcrResult {
  items?: OcrItem[];
  subtotal?: number;
  tax?: number;
  service_fee?: number;
  tip?: number;
  discount?: number;
  total?: number;
  currency?: string;
}

async function runReceiptOcr(uri: string): Promise<OcrResult> {
  // Downscale to 1024px wide and compress for faster upload & processing
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (compressed.uri) FileSystem.deleteAsync(compressed.uri, { idempotent: true }).catch(() => {});
  if (!compressed.base64) throw new Error('Failed to compress image');

  const result = await invokeWithRetry<OcrResult>('ocr-receipt', {
    body: { image_base64: compressed.base64, structured: true },
  });
  return result;
}

// ─── Main Screen ──────────────────────────────────────────────────────

// ─── Person type for inline people picker ────────────────────────────

interface SelectedPerson {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

// ─── Main Screen ──────────────────────────────────────────────────────

export default function CreateSplitEventScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { communityId, prefillTitle, prefillAmount } = useLocalSearchParams<{
    communityId: string;
    prefillTitle?: string;
    prefillAmount?: string;
  }>();
  const router = useRouter();

  const isStandalone = !communityId;

  const [title, setTitle] = useState(prefillTitle ?? '');
  const [currency, setCurrency] = useState('EGP');
  const [tax, setTax] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [items, setItems] = useState<LineItem[]>(() => {
    if (prefillTitle && prefillAmount) {
      return [{
        id: Math.random().toString(36).slice(2),
        name: prefillTitle,
        quantity: '1',
        unit_price: prefillAmount,
      }];
    }
    return [newItem()];
  });
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ─── Inline people picker (standalone mode) ──────────────────────
  const [peopleQuery, setPeopleQuery] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<SelectedPerson[]>([]);
  const { data: searchResults } = useSearchUsers(peopleQuery);

  const addPerson = (person: SelectedPerson): void => {
    if (selectedPeople.some((p) => p.id === person.id)) return;
    impactLight();
    setSelectedPeople((prev) => [...prev, person]);
    setPeopleQuery('');
  };

  const removePerson = (id: string): void => {
    impactLight();
    setSelectedPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const { mutateAsync: createEvent } = useCreateSplitEvent();

  const subtotal = items.reduce((sum, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const price = parseFloat(i.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const taxNum = parseFloat(tax) || 0;
  const feeNum = parseFloat(serviceFee) || 0;
  const discNum = parseFloat(discount) || 0;
  const total = subtotal + taxNum + feeNum - discNum;

  const updateItem = (id: string, field: keyof LineItem, value: string): void => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const addItem = (): void => {
    impactLight();
    setItems((prev) => [...prev, newItem()]);
  };

  const removeItem = (id: string): void => {
    impactLight();
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleScanReceipt = async (): Promise<void> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('ALERT_PERMISSION_REQUIRED' as any), t('SPLIT_CAMERA_NEEDED' as any));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setReceiptUri(uri);
    await processReceiptImage(uri);
  };

  const handlePickReceipt = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setReceiptUri(uri);
    await processReceiptImage(uri);
  };

  const processReceiptImage = async (uri: string): Promise<void> => {
    setIsOcrLoading(true);
    try {
      const ocrResult = await runReceiptOcr(uri);
      if (ocrResult.items && ocrResult.items.length > 0) {
        const parsed: LineItem[] = ocrResult.items.map((item) => ({
          id: Math.random().toString(36).slice(2),
          name: item.name ?? '',
          quantity: String(item.quantity ?? 1),
          unit_price: String(item.unit_price ?? 0),
        }));
        setItems(parsed);
      }
      if (ocrResult.tax) setTax(String(ocrResult.tax));
      if (ocrResult.service_fee || ocrResult.tip) setServiceFee(String(ocrResult.service_fee ?? ocrResult.tip ?? 0));
      if (ocrResult.discount) setDiscount(String(ocrResult.discount));
      if (ocrResult.currency) setCurrency(ocrResult.currency);
      notifySuccess();
    } catch {
      notifyError();
      Alert.alert(t('SPLIT_OCR_FAILED' as any), t('SPLIT_OCR_FAILED_MSG' as any));
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleCreate = async (): Promise<void> => {
    if (!title.trim()) {
      Alert.alert(t('SPLIT_MISSING_TITLE' as any), t('SPLIT_MISSING_TITLE_MSG' as any));
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && parseFloat(i.unit_price) > 0);
    if (validItems.length === 0) {
      Alert.alert(t('SPLIT_NO_ITEMS' as any), t('SPLIT_NO_ITEMS_MSG' as any));
      return;
    }

    if (isStandalone && selectedPeople.length === 0) {
      Alert.alert(t('SPLIT_ADD_PEOPLE' as any), t('SPLIT_ADD_PEOPLE_MSG' as any));
      return;
    }

    impactMedium();
    setIsCreating(true);

    try {
      let targetCommunityId = communityId ?? '';

      // Standalone: auto-create community + add members
      if (isStandalone) {
        const community = await createCommunity(title.trim(), '🍽️');
        targetCommunityId = community.id;
        // Add all selected people as members
        await Promise.all(
          selectedPeople.map((p) => addMemberToCommunity(targetCommunityId, p.id)),
        );
      }

      const event = await createEvent({
        communityId: targetCommunityId,
        title: title.trim(),
        currency,
        tax: taxNum,
        service_fee: feeNum,
        discount: discNum,
        items: validItems.map((i) => ({
          name: i.name.trim(),
          quantity: parseFloat(i.quantity) || 1,
          unit_price: parseFloat(i.unit_price) || 0,
        })),
      });
      notifySuccess();
      router.replace({ pathname: '/(tabs)/split-event', params: { eventId: event.id } });
    } catch {
      notifyError();
      Alert.alert(t('ERROR_TITLE'), t('SPLIT_CREATE_FAILED' as any));
    } finally {
      setIsCreating(false);
    }
  };

  const isPending = isCreating;

  return (
    <ErrorBoundary>
    <FeatureGate feature="billSplit">
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={18} color={colors.textPrimary} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 20, fontWeight: '700', letterSpacing: -0.5 }}>{ t('SPLIT_NEW')}</Text>
          <Pressable onPress={handleCreate} disabled={isPending} style={{ backgroundColor: colors.primaryDark, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
            {isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{t('SPLIT_CREATE' as any)}</Text>}
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
          {/* Event title */}
          <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 }}>{t('SPLIT_EVENT_NAME' as any)}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('SPLIT_EVENT_PLACEHOLDER' as any)}
            placeholderTextColor={colors.textDim}
            style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary, marginBottom: 16 }}
          />

          {/* People picker (standalone mode — no existing community) */}
          {isStandalone && (
            <>
              <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{t('SPLIT_WITH' as any)}</Text>

              {/* Selected people chips */}
              {selectedPeople.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {selectedPeople.map((p) => (
                    <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '18', borderRadius: 20, paddingLeft: 12, paddingRight: 6, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primary, marginRight: 4 }}>{p.full_name}</Text>
                      <Pressable onPress={() => removePerson(p.id)} hitSlop={6}>
                        <X size={14} color={colors.primary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Search input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 6 }}>
                <Search size={16} color={colors.textDim} />
                <TextInput
                  value={peopleQuery}
                  onChangeText={setPeopleQuery}
                  placeholder={t('SPLIT_SEARCH_PEOPLE' as any)}
                  placeholderTextColor={colors.textDim}
                  style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: colors.textPrimary }}
                  autoCapitalize="none"
                />
              </View>

              {/* Search results dropdown */}
              {searchResults && searchResults.length > 0 && peopleQuery.length >= 2 && (
                <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                  {searchResults
                    .filter((u) => !selectedPeople.some((p) => p.id === u.id))
                    .slice(0, 5)
                    .map((user, i, arr) => (
                      <Pressable
                        key={user.id}
                        onPress={() => addPerson(user)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          backgroundColor: pressed ? colors.surfaceTertiary : 'transparent',
                          borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          borderBottomColor: colors.borderLight,
                        })}
                      >
                        <UserPlus size={16} color={colors.textTertiary} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{user.full_name}</Text>
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{user.email}</Text>
                        </View>
                      </Pressable>
                    ))}
                </View>
              )}

              <View style={{ height: 10 }} />
            </>
          )}

          {/* Scan receipt */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <Pressable onPress={handleScanReceipt} disabled={isOcrLoading} style={{ flex: 1, borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryDark + '18', borderWidth: 1, borderColor: colors.primary + '30' }}>
              {isOcrLoading ? <ActivityIndicator color={colors.primary} size="small" /> : (
                <>
                  <Camera size={16} color={colors.primary} />
                  <Text style={{ marginLeft: 8, fontWeight: '600', color: colors.primary, fontSize: 13 }}>{t('SPLIT_SCAN_RECEIPT' as any)}</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={handlePickReceipt} disabled={isOcrLoading} style={{ flex: 1, borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.borderLight }}>
              <Receipt size={16} color={colors.textTertiary} />
              <Text style={{ marginLeft: 8, fontWeight: '600', color: colors.textTertiary, fontSize: 13 }}>{t('SPLIT_FROM_GALLERY' as any)}</Text>
            </Pressable>
          </View>

          {receiptUri && (
            <Image source={{ uri: receiptUri }} style={{ width: '100%', height: 140, borderRadius: 12, marginBottom: 16 }} contentFit="cover" />
          )}

          {/* Items */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' }}>{t('SPLIT_ITEMS' as any)}</Text>
            <Pressable onPress={addItem} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Plus size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontWeight: '600', marginLeft: 4, color: colors.primary }}>{t('SPLIT_ADD_ITEM' as any)}</Text>
            </Pressable>
          </View>

          {items.map((item, index) => (
            <View key={item.id} style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 10, padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <TextInput
                  value={item.name}
                  onChangeText={(v) => updateItem(item.id, 'name', v)}
                  placeholder={`Item ${index + 1} name`}
                  placeholderTextColor={colors.textDim}
                  style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}
                />
                <Pressable onPress={() => removeItem(item.id)} hitSlop={8} style={{ marginLeft: 8 }}>
                  <Trash2 size={16} color="#e5484d" />
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                  <Text style={{ color: colors.textDim, fontSize: 11, marginRight: 4 }}>{t('SPLIT_QTY' as any)}</Text>
                  <TextInput value={item.quantity} onChangeText={(v) => updateItem(item.id, 'quantity', v)} keyboardType="numeric" style={{ width: 36, fontSize: 14, color: colors.textPrimary, textAlign: 'center' }} />
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
                  <Text style={{ color: colors.textDim, fontSize: 11, marginRight: 4 }}>{t('SPLIT_PRICE' as any)}</Text>
                  <TextInput value={item.unit_price} onChangeText={(v) => updateItem(item.id, 'unit_price', v)} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textDim} style={{ flex: 1, fontSize: 14, color: colors.textPrimary }} />
                </View>
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.surfaceSecondary }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Extras */}
          <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 16, marginBottom: 12 }}>{t('SPLIT_EXTRAS' as any)}</Text>
          <View style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderLight, borderRadius: 12, padding: 16, marginBottom: 24 }}>
            {[
              { label: t('SPLIT_TAX' as any), value: tax, setValue: setTax },
              { label: t('SPLIT_SERVICE_FEE' as any), value: serviceFee, setValue: setServiceFee },
              { label: t('SPLIT_DISCOUNT' as any), value: discount, setValue: setDiscount },
            ].map(({ label, value, setValue }, i) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: colors.borderLight }}>
                <Text style={{ color: colors.textTertiary, fontSize: 14 }}>{label}</Text>
                <TextInput value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textDim} style={{ fontSize: 14, color: colors.textPrimary, textAlign: 'right', width: 100 }} />
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>{t('SPLIT_TOTAL')}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{total.toFixed(2)} {currency}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </FeatureGate>
    </ErrorBoundary>
  );
}
