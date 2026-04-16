import React, { useState, useCallback, useMemo } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Lightbulb,
} from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { formatAmount } from '../../utils/currency';
import {
  usePortfolioSummary,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from '../../hooks/useAssets';
import { AssetBarChart } from '../../components/charts/AssetBarChart';
import { AssetSparkline } from '../../components/charts/AssetSparkline';
import { StockWatchlist } from '../../components/finance/StockWatchlist';
import { CommodityPrices } from '../../components/finance/CommodityPrices';
import { EmptyState } from '../../components/ui/EmptyState';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useSubscription } from '../../hooks/useSubscription';
import { __dev_resetSubscription } from '../../services/billing-service';
import type { AssetType, PortfolioSummary } from '../../types/index';

// ─── Asset presets (Gold, Silver, BTC, ETH) ──────────────────────────

const ASSET_PRESETS: {
  asset_type: AssetType;
  asset_code: string;
  display_name: string;
  units: string[];
  icon: string;
}[] = [
  { asset_type: 'gold', asset_code: 'XAU', display_name: 'Gold', units: ['gram', 'ounce'], icon: '🥇' },
  { asset_type: 'silver', asset_code: 'XAG', display_name: 'Silver 999', units: ['gram', 'ounce'], icon: '🥈' },
  { asset_type: 'crypto', asset_code: 'BTC', display_name: 'Bitcoin', units: ['BTC'], icon: '₿' },
  { asset_type: 'crypto', asset_code: 'ETH', display_name: 'Ethereum', units: ['ETH'], icon: 'Ξ' },
];

// ─── DEV: Trial Test Panel (remove before production) ────────────────

function TrialTestPanel(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { entitlement, trialConfig, startTrial, isStartingTrial, startTrialError, refetch } = useSubscription();
  const [resetting, setResetting] = React.useState(false);

  const handleReset = React.useCallback(async () => {
    setResetting(true);
    try {
      await __dev_resetSubscription();
      refetch();
    } catch (e) {
      Alert.alert(t('ASSET_RESET_FAILED' as any), e instanceof Error ? e.message : t('UNKNOWN_ERROR' as any));
    } finally {
      setResetting(false);
    }
  }, [refetch]);

  const btnStyle = (bg: string) => ({
    backgroundColor: bg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center' as const,
    opacity: isStartingTrial || resetting ? 0.5 : 1,
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.isDark ? 'rgba(255,59,48,0.08)' : '#FFF5F5',
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(255,59,48,0.25)' : '#FFD4D4',
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FF3B30', marginBottom: 4 }}>
        DEV — Trial Test Panel
      </Text>
      <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 4 }}>
        Plan: {entitlement.effectivePlan.toUpperCase()}  •  Status: {entitlement.status}
        {entitlement.isTrialing ? `  •  ${entitlement.trialDaysLeft}d left` : ''}
      </Text>
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 12 }}>
        Config: Pro={trialConfig.pro_trial_days}d  •  Max={trialConfig.max_trial_days}d (from DB)
      </Text>
      {startTrialError ? (
        <Text style={{ fontSize: 11, color: '#FF3B30', marginBottom: 8 }}>{startTrialError}</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          style={btnStyle('#6366F1')}
          onPress={() => startTrial('pro')}
          disabled={isStartingTrial || resetting}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Pro Trial {trialConfig.pro_trial_days} day</Text>
        </Pressable>
        <Pressable
          style={btnStyle('#8B5CF6')}
          onPress={() => startTrial('max')}
          disabled={isStartingTrial || resetting}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Max Trial {trialConfig.max_trial_days} day</Text>
        </Pressable>
        <Pressable
          style={btnStyle('#6B7280')}
          onPress={handleReset}
          disabled={isStartingTrial || resetting}
        >
          <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '600' }}>Reset Free</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────

function SummaryCard({ portfolio }: { portfolio: PortfolioSummary }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const hidden = usePrivacyStore((s) => s.hidden);

  return (
    <View
      className="mx-4 mt-3 rounded-2xl overflow-hidden"
      style={{
        borderWidth: 1,
        borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
        shadowColor: colors.isDark ? '#8B5CF6' : '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: colors.isDark ? 0.15 : 0.06,
        shadowRadius: 16,
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={colors.isDark
          ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
          : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20 }}
      >
        {/* Metallic sheen */}
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
            : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Subtle shimmer */}
        {colors.isDark ? (
          <LinearGradient
            colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
        {/* Content */}
        <View>
          <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>
            {t('TOTAL_ASSET_VALUE')}
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: 4 }}>
            {maskIfHidden(formatAmount(portfolio.total_value), hidden)}
          </Text>

          <View className="flex-row mt-4" style={{ gap: 10 }}>
            {portfolio.breakdown.gold > 0 ? (
              <BreakdownChip label={t('GOLD')} value={portfolio.breakdown.gold} color="#F0B90B" />
            ) : null}
            {portfolio.breakdown.silver > 0 ? (
              <BreakdownChip label={t('SILVER')} value={portfolio.breakdown.silver} color="#94A3B8" />
            ) : null}
            {portfolio.breakdown.crypto > 0 ? (
              <BreakdownChip label={t('CRYPTO')} value={portfolio.breakdown.crypto} color="#F97316" />
            ) : null}
            {portfolio.breakdown.stock > 0 ? (
              <BreakdownChip label={t('STOCKS')} value={portfolio.breakdown.stock} color="#38BDF8" />
            ) : null}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

function BreakdownChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}): React.ReactElement {
  const colors = useThemeColors();
  const hidden = usePrivacyStore((s) => s.hidden);

  return (
    <View className="rounded-lg px-3 py-1.5" style={{ backgroundColor: colors.isDark ? 'rgba(255,255,255,0.08)' : color + '12' }}>
      <Text style={{ fontSize: 11, color, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: '600', marginTop: 1 }}>
        {maskIfHidden(formatAmount(value, { compact: true }), hidden)}
      </Text>
    </View>
  );
}

// ─── Asset Row ───────────────────────────────────────────────────────

function AssetRow({
  asset,
  onPress,
}: {
  asset: PortfolioSummary['assets'][number];
  onPress: (asset: PortfolioSummary['assets'][number]) => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const hasGain = asset.gain_loss != null;
  const isPositive = (asset.gain_loss ?? 0) >= 0;
  const changeColor = hasGain ? (isPositive ? '#34C759' : '#FF3B30') : colors.textTertiary;
  const preset = ASSET_PRESETS.find((p) => p.asset_code === asset.asset_code);
  const hidden = usePrivacyStore((s) => s.hidden);

  return (
    <Pressable
      onPress={() => {
        impactLight();
        onPress(asset);
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Text style={{ fontSize: 20 }}>{preset?.icon ?? '💰'}</Text>
      </View>

      {/* Name + quantity */}
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          {asset.display_name}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 1,
          }}
        >
          {asset.quantity} {asset.unit}
        </Text>
      </View>

      {/* Mini sparkline */}
      <View style={{ marginRight: 12 }}>
        <AssetSparkline
          assetCode={asset.asset_code}
          color={changeColor}
          width={50}
          height={24}
        />
      </View>

      {/* Price + gain */}
      <View style={{ alignItems: 'flex-end', minWidth: 85 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          {maskIfHidden(formatAmount(asset.total_value), hidden)}
        </Text>
        {hasGain ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 3,
            }}
          >
            {isPositive ? (
              <TrendingUp size={10} color={changeColor} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={10} color={changeColor} strokeWidth={2.5} />
            )}
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: changeColor,
                marginLeft: 3,
              }}
            >
              {maskIfHidden(`${isPositive ? '+' : ''}${formatAmount(asset.gain_loss ?? 0)}`, hidden)}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Add Asset Modal ─────────────────────────────────────────────────

function AddAssetModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { mutateAsync: createAsync, isPending } = useCreateAsset();

  const [selectedPreset, setSelectedPreset] = useState(ASSET_PRESETS[0]);
  const [selectedUnit, setSelectedUnit] = useState(ASSET_PRESETS[0].units[0]);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const resetForm = (): void => {
    setSelectedPreset(ASSET_PRESETS[0]);
    setSelectedUnit(ASSET_PRESETS[0].units[0]);
    setQuantity('');
    setBuyPrice('');
  };

  const handleSave = (): void => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    impactMedium();
    const bp = parseFloat(buyPrice);
    createAsync({
      asset_type: selectedPreset.asset_type,
      asset_code: selectedPreset.asset_code,
      display_name: selectedPreset.display_name,
      quantity: qty,
      unit: selectedUnit,
      avg_buy_price: isNaN(bp) ? null : bp,
      currency_code: undefined,
    });
    notifySuccess();
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: colors.background }}
      >
        <View
          className="flex-row items-center justify-between px-4 pb-3"
          style={{
            paddingTop: insets.top + 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {t('ADD_ASSET')}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>
            {t('ASSET_TYPE')}
          </Text>
          <View className="flex-row flex-wrap mb-5" style={{ gap: 8 }}>
            {ASSET_PRESETS.map((preset) => {
              const isSelected = selectedPreset.asset_code === preset.asset_code;
              return (
                <Pressable
                  key={preset.asset_code}
                  onPress={() => {
                    impactLight();
                    setSelectedPreset(preset);
                    setSelectedUnit(preset.units[0]);
                  }}
                  className="items-center rounded-xl py-3"
                  style={{
                    width: '31%',
                    backgroundColor: isSelected ? colors.primary + '10' : colors.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{preset.icon}</Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: isSelected ? colors.primary : colors.textSecondary,
                      marginTop: 4,
                    }}
                  >
                    {preset.display_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedPreset.units.length > 1 ? (
            <>
              <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>
                {t('UNIT')}
              </Text>
              <View className="flex-row mb-5" style={{ gap: 8 }}>
                {selectedPreset.units.map((unit) => {
                  const isSelected = selectedUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => setSelectedUnit(unit)}
                      className="rounded-full px-4 py-2"
                      style={{
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSecondary,
                        borderWidth: 1,
                        borderColor: isSelected ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: isSelected ? colors.textInverse : colors.textSecondary,
                        }}
                      >
                        {unit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>
            {t('QUANTITY')}
          </Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder={`e.g. ${
              selectedPreset.asset_type === 'crypto'
                ? '0.5'
                : selectedPreset.asset_type === 'stock'
                  ? '10'
                  : '100'
            }`}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
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

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 4 }}>
            {t('AVG_BUY_PRICE')}{' '}
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>({t('OPTIONAL_PER')} {selectedUnit})</Text>
          </Text>
          <TextInput
            value={buyPrice}
            onChangeText={setBuyPrice}
            placeholder="e.g. 65.50"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            className="rounded-xl px-4 mb-8"
            style={{
              height: 48,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />

          <Pressable
            onPress={handleSave}
            disabled={isPending || !quantity || parseFloat(quantity) <= 0}
            className="rounded-xl items-center justify-center"
            style={{
              backgroundColor: quantity && parseFloat(quantity) > 0 ? colors.primary : colors.border,
              height: 52,
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textInverse }}>
                {t('ADD')} {selectedPreset.display_name}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Asset Modal ────────────────────────────────────────────────

type EditableAsset = PortfolioSummary['assets'][number];

function EditAssetModal({
  visible,
  asset,
  onClose,
}: {
  visible: boolean;
  asset: EditableAsset | null;
  onClose: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateAsset();
  const { mutateAsync: deleteAsync, isPending: isDeleting } = useDeleteAsset();

  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  React.useEffect(() => {
    if (asset) {
      setQuantity(String(asset.quantity));
      setBuyPrice(asset.avg_buy_price != null ? String(asset.avg_buy_price) : '');
    }
  }, [asset]);

  if (!asset) return <></>;

  const preset = ASSET_PRESETS.find((p) => p.asset_code === asset.asset_code);
  const isBusy = isUpdating || isDeleting;

  const handleUpdate = async (): Promise<void> => {
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    impactMedium();
    try {
      const bp = parseFloat(buyPrice);
      await updateAsync({
        id: asset.id,
        quantity: qty,
        avg_buy_price: isNaN(bp) || buyPrice.trim() === '' ? null : bp,
      });
      notifySuccess();
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  const handleDelete = (): void => {
    Alert.alert(
      t('DELETE_ASSET'),
      `${asset.display_name} — ${t('DELETE_ASSET_CONFIRM')}`,
      [
        { text: t('CANCEL'), style: 'cancel' },
        {
          text: t('DELETE'),
          style: 'destructive',
          onPress: async () => {
            impactMedium();
            try {
              await deleteAsync(asset.id);
              notifySuccess();
              onClose();
            } catch {
              // Error handled by hook
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: colors.background }}
      >
        <View
          className="flex-row items-center justify-between px-4 pb-3"
          style={{
            paddingTop: insets.top + 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {asset.display_name}
          </Text>
          <Pressable onPress={handleDelete} style={{ padding: 4 }}>
            <Trash2 size={20} color={colors.expense} strokeWidth={2} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            className="flex-row items-center rounded-xl p-4 mb-6"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
          >
            <Text style={{ fontSize: 32, marginRight: 12 }}>{preset?.icon ?? '💰'}</Text>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                {asset.display_name}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                {t('CURRENT_PRICE')}: {formatAmount(asset.current_price)}/{asset.unit}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>
            {t('QUANTITY')} ({asset.unit})
          </Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
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

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 4 }}>
            {t('AVG_BUY_PRICE')}{' '}
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>({t('OPTIONAL_PER')} {asset.unit})</Text>
          </Text>
          <TextInput
            value={buyPrice}
            onChangeText={setBuyPrice}
            placeholder={t('LEAVE_EMPTY_REMOVE')}
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            className="rounded-xl px-4 mb-6"
            style={{
              height: 48,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />

          <View className="rounded-xl p-4 mb-8" style={{ backgroundColor: colors.surfaceSecondary }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginBottom: 4 }}>
              {t('CURRENT_VALUE')}
            </Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary }}>
              {formatAmount((parseFloat(quantity) || 0) * asset.current_price)}
            </Text>
          </View>

          <Pressable
            onPress={handleUpdate}
            disabled={isBusy || !quantity || parseFloat(quantity) <= 0}
            className="rounded-xl items-center justify-center flex-row"
            style={{
              backgroundColor: quantity && parseFloat(quantity) > 0 ? colors.primary : colors.border,
              height: 52,
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <>
                <Pencil size={16} color={colors.textInverse} strokeWidth={2.5} />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: colors.textInverse,
                    marginLeft: 6,
                  }}
                >
                  {t('SAVE_CHANGES')}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={handleDelete}
            disabled={isBusy}
            className="rounded-xl items-center justify-center flex-row mt-3"
            style={{
              backgroundColor: colors.expenseBg,
              height: 48,
              opacity: isBusy ? 0.7 : 1,
            }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={colors.expense} />
            ) : (
              <>
                <Trash2 size={16} color={colors.expense} strokeWidth={2.5} />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: colors.expense,
                    marginLeft: 6,
                  }}
                >
                  {t('DELETE_ASSET')}
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Asset Insights ──────────────────────────────────────────────────

function generateAssetInsights(portfolio: PortfolioSummary, translate: (key: string) => string): string[] {
  const insights: string[] = [];
  const { breakdown, total_value, assets } = portfolio;

  if (total_value === 0) return insights;

  const goldPct = (breakdown.gold / total_value) * 100;
  const silverPct = (breakdown.silver / total_value) * 100;
  const cryptoPct = (breakdown.crypto / total_value) * 100;
  const stockPct = (breakdown.stock / total_value) * 100;

  if (goldPct > 80) {
    insights.push(translate('INSIGHT_GOLD_HEAVY'));
  }
  if (cryptoPct > 60) {
    insights.push(translate('INSIGHT_CRYPTO_HEAVY'));
  }
  if (stockPct > 70) {
    insights.push(translate('INSIGHT_STOCK_HEAVY'));
  }
  if (goldPct > 0 && silverPct > 0 && cryptoPct > 0 && stockPct > 0) {
    insights.push(translate('INSIGHT_DIVERSIFIED'));
  }

  const totalGain = assets.reduce((sum, a) => sum + (a.gain_loss ?? 0), 0);
  if (totalGain > 0) {
    insights.push(`${translate('INSIGHT_PORTFOLIO_UP')} ${formatAmount(totalGain)} ${translate('INSIGHT_FROM_BUY')}`);
  } else if (totalGain < 0) {
    insights.push(`${translate('INSIGHT_PORTFOLIO_DOWN')} ${formatAmount(Math.abs(totalGain))} ${translate('INSIGHT_HOLD_STEADY')}`);
  }

  const noBuyPrice = assets.filter((a) => a.avg_buy_price == null);
  if (noBuyPrice.length > 0) {
    insights.push(`${translate('INSIGHT_ADD_BUY_PRICE')} ${noBuyPrice.map((a) => a.display_name).join(', ')} ${translate('INSIGHT_TRACK_GAINS')}`);
  }

  return insights;
}

function InsightsCard({ insights }: { insights: string[] }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  if (insights.length === 0) return <></>;

  return (
    <View
      className="mx-4 mt-3 rounded-xl p-4"
      style={{
        backgroundColor: '#8B5CF610',
        borderWidth: 1,
        borderColor: '#8B5CF640',
      }}
    >
      <View className="flex-row items-center mb-2">
        <Lightbulb size={16} color="#8B5CF6" strokeWidth={2} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#7C3AED', marginLeft: 6 }}>
          {t('INSIGHTS')}
        </Text>
      </View>
      {insights.map((insight, i) => (
        <Text key={i} style={{ fontSize: 13, color: '#848E9C', marginTop: i > 0 ? 6 : 0, lineHeight: 18 }}>
          • {insight}
        </Text>
      ))}
    </View>
  );
}

// ─── Scroll collapse thresholds ──────────────────────────────────────

const COLLAPSE_START = 140;
const COLLAPSE_END = 260;

// ─── Main Assets Screen ──────────────────────────────────────────────

export default function AssetsScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { data: portfolio, isLoading, isError, error, refetch } = usePortfolioSummary();
  const [showAdd, setShowAdd] = useState(false);
  const [editAsset, setEditAsset] = useState<EditableAsset | null>(null);

  const openAdd = useCallback(() => {
    impactLight();
    setShowAdd(true);
  }, []);

  const openEdit = useCallback((asset: EditableAsset) => {
    setEditAsset(asset);
  }, []);

  const insights = useMemo(() => {
    if (!portfolio) return [];
    return generateAssetInsights(portfolio, t as (key: string) => string);
  }, [portfolio, t]);

  const assets = portfolio?.assets ?? [];
  const holdingAssets = useMemo(() => assets.filter((a) => a.asset_type !== 'stock'), [assets]);
  const stockAssets = useMemo(() => assets.filter((a) => a.asset_type === 'stock'), [assets]);

  const scrollY = useSharedValue(0);
  const hidden = usePrivacyStore((s) => s.hidden);

  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const compactBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [COLLAPSE_START, COLLAPSE_END], [-10, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  if (isLoading) return <LoadingScreen />;

  if (isError) {
    return (
      <ErrorState
        message={error?.message ?? t('FAILED_LOAD_ASSETS')}
        onRetry={refetch}
      />
    );
  }

  return (
    <ErrorBoundary>
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, paddingTop: insets.top + 16 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Large title */}
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary, paddingHorizontal: 20, marginBottom: 4 }}>
          {t('ASSETS_TITLE')}
        </Text>
        {/* ─── Summary Card ─────────────────────────────────────── */}
        {portfolio ? <SummaryCard portfolio={portfolio} /> : null}

        {/* ─── DEV: Trial Test (remove before production) ─────── */}
        <TrialTestPanel />

        {/* ─── Physical Assets (metals + crypto) ──────────────── */}
        {holdingAssets.length > 0 ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: colors.isDark ? 'rgba(139,92,246,0.15)' : 'rgba(203,213,225,0.5)',
              shadowColor: colors.isDark ? '#8B5CF6' : '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: colors.isDark ? 0.15 : 0.06,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={colors.isDark
                ? ['rgba(25,32,48,0.92)', 'rgba(18,26,42,0.96)', 'rgba(32,44,62,0.94)']
                : ['#FFFFFF', '#F4F6F8', '#EBEEF2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{}}
            >
              {/* Metallic sheen */}
              <LinearGradient
                colors={colors.isDark
                  ? ['rgba(255,255,255,0.04)', 'transparent', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(220,225,235,0.3)', 'rgba(255,255,255,0.6)', 'rgba(200,210,225,0.15)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              {colors.isDark ? (
                <LinearGradient
                  colors={['transparent', 'rgba(217,70,239,0.03)', 'rgba(139,92,246,0.08)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              ) : null}
              {/* Content */}
              <View>
                {/* Section Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 4,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: '700',
                        color: colors.textPrimary,
                        letterSpacing: -0.4,
                      }}
                    >
                      Physical Assets
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textTertiary,
                        marginTop: 2,
                      }}
                    >
                      Your holdings
                    </Text>
                  </View>
                  <Pressable
                    onPress={openAdd}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: '#FFFFFF',
                        marginLeft: 4,
                      }}
                    >
                      Add
                    </Text>
                  </Pressable>
                </View>

                {/* Asset rows */}
                {holdingAssets.map((asset, index) => (
                  <React.Fragment key={asset.id}>
                    {index > 0 ? (
                      <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginLeft: 68 }} />
                    ) : null}
                    <AssetRow asset={asset} onPress={openEdit} />
                  </React.Fragment>
                ))}
              </View>
            </LinearGradient>
          </View>
        ) : (
          /* Empty holdings — just a compact add button */
          <View
            className="mx-4 mt-3 rounded-xl p-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
                  {t('TRACK_ASSETS')}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {t('TRACK_ASSETS_DESC')}
                </Text>
              </View>
              <Pressable
                onPress={openAdd}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                }}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginLeft: 4 }}>
                  {t('ADD')}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── Stocks (watchlist + owned shares) ────────────────── */}
        <FeatureGate feature="stocksLive">
          <StockWatchlist ownedStockAssets={stockAssets} />
        </FeatureGate>

        {/* ─── Market Prices (commodity/crypto — informational) ── */}
        <FeatureGate feature="goldSilverTracking">
          <CommodityPrices />
        </FeatureGate>

        {/* ─── Breakdown Chart ──────────────────────────────────── */}
        {portfolio && portfolio.total_value > 0 ? <AssetBarChart portfolio={portfolio} /> : null}

        {/* ─── Insights ─────────────────────────────────────────── */}
        <InsightsCard insights={insights} />
      </Animated.ScrollView>

      {/* ─── Compact bar (fades in on scroll) ───────────────────── */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            paddingTop: insets.top + 4,
            paddingBottom: 10,
            paddingHorizontal: 20,
          },
          compactBarStyle,
        ]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={colors.isDark
            ? ['rgba(15,20,32,0.97)', 'rgba(15,20,32,0.92)', 'rgba(15,20,32,0)']
            : ['rgba(248,250,252,0.97)', 'rgba(248,250,252,0.92)', 'rgba(248,250,252,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: -12 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
            Assets
          </Text>
          {portfolio && portfolio.total_value > 0 ? (
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
              {maskIfHidden(formatAmount(portfolio.total_value, { compact: true }), hidden)}
            </Text>
          ) : null}
        </View>
        {portfolio && portfolio.total_value > 0 ? (
          <View style={{ flexDirection: 'row', marginTop: 4, gap: 8 }}>
            {portfolio.breakdown.gold > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 12 }}>🥇</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                  {maskIfHidden(formatAmount(portfolio.breakdown.gold, { compact: true }), hidden)}
                </Text>
              </View>
            ) : null}
            {portfolio.breakdown.silver > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 12 }}>🥈</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                  {maskIfHidden(formatAmount(portfolio.breakdown.silver, { compact: true }), hidden)}
                </Text>
              </View>
            ) : null}
            {portfolio.breakdown.crypto > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 12 }}>₿</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                  {maskIfHidden(formatAmount(portfolio.breakdown.crypto, { compact: true }), hidden)}
                </Text>
              </View>
            ) : null}
            {portfolio.breakdown.stock > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 12 }}>📈</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary }}>
                  {maskIfHidden(formatAmount(portfolio.breakdown.stock, { compact: true }), hidden)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Animated.View>

      <AddAssetModal visible={showAdd} onClose={() => setShowAdd(false)} />
      <EditAssetModal visible={editAsset != null} asset={editAsset} onClose={() => setEditAsset(null)} />
    </View>
    </ErrorBoundary>
  );
}
