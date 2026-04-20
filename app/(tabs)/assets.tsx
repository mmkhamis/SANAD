import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  InteractionManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Search,
  Coins,
  LineChart,
  Star,
} from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { formatAmount } from '../../utils/currency';
import { getActiveCurrency } from '../../utils/currency';
import { toArabicDigits } from '../../utils/locale-format';
import { useRTL } from '../../hooks/useRTL';
import {
  usePortfolioSummary,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
} from '../../hooks/useAssets';
import { useCommodityPrices, useStockQuotes } from '../../hooks/useWatchlist';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { HeroCard } from '../../components/ui/HeroCard';
import { FeatureGate } from '../../components/ui/FeatureGate';
import { CurrencyIcon, hasCurrencyIcon } from '../../components/ui/CurrencyIcon';
import { COLORS } from '../../constants/colors';
import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import { useSettingsStore } from '../../store/settings-store';
import { useStockFavoritesStore } from '../../store/stock-favorites-store';
import { searchStockCatalog, type StockCatalogEntry } from '../../services/watchlist-service';
import type { AssetType, PortfolioSummary, WatchlistStock, StockQuote } from '../../types/index';

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

// ─── Breakdown color palette (matches Claude design) ─────────────────

const BREAKDOWN_COLORS = {
  stock: '#38BDF8',
  gold: '#F0B90B',
  crypto: '#F97316',
  silver: '#94A3B8',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────

function getAssetIcon(asset: PortfolioSummary['assets'][number]): string {
  const preset = ASSET_PRESETS.find((p) => p.asset_code === asset.asset_code);
  if (preset) return preset.icon;
  if (asset.asset_type === 'stock') return asset.asset_code.slice(0, 2);
  return '💰';
}

/** Formats a signed amount with Arabic-aware sign placement:
 * Arabic: negative sign on RIGHT, currency stays on LEFT of number.
 * English: default `+ / -` prefix. */
function formatSignedAmount(value: number, isRTL: boolean, hidden: boolean): string {
  const abs = formatAmount(Math.abs(value));
  const raw = value < 0 ? (isRTL ? `${abs}-` : `-${abs}`) : value > 0 ? `+${abs}` : abs;
  return maskIfHidden(isRTL ? toArabicDigits(raw) : raw, hidden);
}

/** Runs a string through Arabic-Indic digit conversion when the app is RTL. */
function ard(s: string | number, isRTL: boolean): string {
  return isRTL ? toArabicDigits(s) : String(s);
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>
              {t('ENTER_PRICE_IN')}
            </Text>
            <CurrencyGlyph
              currency={getActiveCurrency()}
              size={12}
              color={colors.textTertiary}
              fallbackStyle={{ fontSize: 11, fontWeight: '700' }}
            />
          </View>
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

// ─── Add Stock Holding Modal ─────────────────────────────────────────

function AddStockHoldingModal({
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

  const [selected, setSelected] = useState<StockCatalogEntry | null>(null);
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const results = useMemo(() => searchStockCatalog(query), [query]);

  const reset = (): void => {
    setSelected(null);
    setQuery('');
    setQuantity('');
    setBuyPrice('');
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handleSave = async (): Promise<void> => {
    if (!selected) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    impactMedium();
    const bp = parseFloat(buyPrice);
    await createAsync({
      asset_type: 'stock',
      asset_code: selected.symbol,
      display_name: selected.company_name,
      quantity: qty,
      unit: 'shares',
      avg_buy_price: isNaN(bp) ? null : bp,
      currency_code: 'USD',
    });
    notifySuccess();
    reset();
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
          <Pressable onPress={handleClose} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {t('STOCK_ADD' as never)}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {!selected ? (
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                margin: 16,
                paddingHorizontal: 12,
                height: 44,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <Search size={18} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('STOCK_SEARCH' as never)}
                placeholderTextColor={colors.textTertiary}
                autoFocus
                style={{ flex: 1, marginLeft: 8, fontSize: 16, color: colors.textPrimary }}
              />
            </View>
            <ScrollView
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {results.map((entry) => (
                <Pressable
                  key={entry.symbol}
                  onPress={() => {
                    impactLight();
                    setSelected(entry);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    opacity: pressed ? 0.6 : 1,
                    borderBottomWidth: 0.5,
                    borderBottomColor: colors.borderLight,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.3 }}>
                      {entry.symbol}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                      {entry.company_name}
                    </Text>
                  </View>
                  <Plus size={20} color={colors.primary} strokeWidth={2} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
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
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderLight }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: BREAKDOWN_COLORS.stock + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: BREAKDOWN_COLORS.stock }}>
                  {selected.symbol.slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  {selected.symbol}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                  {selected.company_name}
                </Text>
              </View>
              <Pressable onPress={() => setSelected(null)} hitSlop={8}>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                  {t('CHANGE' as never) || 'Change'}
                </Text>
              </Pressable>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>
              {t('STOCK_NUM_SHARES' as never)}
            </Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 10"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
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

            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 4 }}>
              {t('STOCK_AVG_BUY' as never)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                {t('ENTER_PRICE_IN')}
              </Text>
              <CurrencyGlyph
                currency={getActiveCurrency()}
                size={12}
                color={colors.textTertiary}
                fallbackStyle={{ fontSize: 11, fontWeight: '700' }}
              />
            </View>
            <TextInput
              value={buyPrice}
              onChangeText={setBuyPrice}
              placeholder={t('SMART_INPUT_AMOUNT_PLACEHOLDER')}
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
                  {t('STOCK_ADD_PORTFOLIO' as never)}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Chooser Sheet ───────────────────────────────────────────────

function AddChooserSheet({
  visible,
  onClose,
  onPickAsset,
  onPickStock,
}: {
  visible: boolean;
  onClose: () => void;
  onPickAsset: () => void;
  onPickStock: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { textAlign, rowDir } = useRTL();

  const ChooserItem = ({
    Icon,
    title,
    subtitle,
    tint,
    onPress,
  }: {
    Icon: typeof Coins;
    title: string;
    subtitle: string;
    tint: string;
    onPress: () => void;
  }): React.ReactElement => (
    <Pressable
      onPress={() => {
        impactLight();
        onPress();
      }}
      style={({ pressed }) => ({
        flexDirection: rowDir,
        alignItems: 'center',
        gap: 14,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderLight,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: tint + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} color={tint} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 16,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: 12,
            }}
          />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            {t('ADD_HOLDING_PROMPT')}
          </Text>
          <View style={{ gap: 10 }}>
            <ChooserItem
              Icon={Coins}
              title={t('ADD_ASSET')}
              subtitle={t('ADD_HOLDING_ASSET_DESC')}
              tint="#F0B90B"
              onPress={() => {
                onClose();
                onPickAsset();
              }}
            />
            <ChooserItem
              Icon={LineChart}
              title={t('STOCK_ADD' as never)}
              subtitle={t('ADD_HOLDING_STOCK_DESC')}
              tint={BREAKDOWN_COLORS.stock}
              onPress={() => {
                onClose();
                onPickStock();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Portfolio Trend Chart (light line — exactly the Claude design) ──
//
// Static SVG curve at low opacity sitting *inside* the hero card's
// background. No circles, no derived per-asset jitter — just the calm
// growing line from `Wallet Claude design/components/assets.jsx`.

const HERO_CHART_PATH =
  'M0,180 C50,160 80,190 120,150 C160,110 180,140 220,100 C260,60 300,90 340,50 L400,40';

function PortfolioTrendChart(): React.ReactElement {
  const colors = useThemeColors();
  const stroke = colors.isDark ? COLORS.claude.p200 : colors.primary;
  const areaPath = `${HERO_CHART_PATH} L400,250 L0,250 Z`;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.22 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 250" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="hero-chart-g" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity="0.6" />
            <Stop offset="1" stopColor={stroke} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#hero-chart-g)" />
        <Path d={HERO_CHART_PATH} stroke={stroke} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

// ─── Summary Hero ────────────────────────────────────────────────────

function HeroSkeleton(): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <View
        style={{
          borderRadius: 24,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          padding: 20,
          height: 220,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: 140,
            height: 12,
            borderRadius: 6,
            backgroundColor: colors.surfaceSecondary,
          }}
        />
        <View
          style={{
            width: 200,
            height: 40,
            borderRadius: 10,
            backgroundColor: colors.surfaceSecondary,
            marginTop: 12,
          }}
        />
        <View
          style={{
            width: 100,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.surfaceSecondary,
            marginTop: 10,
          }}
        />
        <View
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.surfaceSecondary,
            marginTop: 22,
          }}
        />
      </View>
    </View>
  );
}

function SummaryHero({ portfolio }: { portfolio: PortfolioSummary }): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { textAlign, isRTL, rowDir } = useRTL();
  const hidden = usePrivacyStore((s) => s.hidden);

  const totalGain = portfolio.assets.reduce((sum, a) => sum + (a.gain_loss ?? 0), 0);
  const totalCostBasis = portfolio.assets.reduce(
    (sum, a) => sum + (a.avg_buy_price != null ? a.avg_buy_price * a.quantity : 0),
    0,
  );
  const gainPct = totalCostBasis > 0 ? (totalGain / totalCostBasis) * 100 : 0;
  const isPositive = totalGain >= 0;
  const gainColor = isPositive ? '#34C759' : '#FF3B30';

  // Distribution bar — segmented colored line split by asset-type share.
  const distribution = useMemo(() => {
    const total = portfolio.total_value || 0;
    if (total <= 0) return [];
    const byType: Record<string, number> = {};
    for (const a of portfolio.assets) {
      byType[a.asset_type] = (byType[a.asset_type] ?? 0) + a.total_value;
    }
    const labelKey: Record<string, 'DIST_STOCKS' | 'DIST_GOLD' | 'DIST_CRYPTO' | 'DIST_SILVER'> = {
      stock: 'DIST_STOCKS',
      gold: 'DIST_GOLD',
      crypto: 'DIST_CRYPTO',
      silver: 'DIST_SILVER',
    };
    return Object.entries(byType)
      .map(([type, value]) => ({
        type,
        pct: (value / total) * 100,
        color: BREAKDOWN_COLORS[type as keyof typeof BREAKDOWN_COLORS] ?? '#94A3B8',
        label: (labelKey[type] ?? 'DIST_OTHER') as
          | 'DIST_STOCKS'
          | 'DIST_GOLD'
          | 'DIST_CRYPTO'
          | 'DIST_SILVER'
          | 'DIST_OTHER',
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [portfolio.assets, portfolio.total_value]);

  const currency = getActiveCurrency();
  const amountText = maskIfHidden(
    ard(formatAmount(portfolio.total_value, { integer: true }), isRTL),
    hidden,
  );

  return (
    <HeroCard
      noPadding
      noMargin
      noRings
      style={{ marginHorizontal: 16, marginTop: 12, overflow: 'hidden' }}
    >
      {/* Background spark chart — fills the full card */}
      <PortfolioTrendChart />

      <View style={{ position: 'relative', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20 }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: colors.isDark ? COLORS.claude.fg3 : colors.textSecondary,
            textAlign,
          }}
        >
          {t('TOTAL_ASSET_VALUE')}
        </Text>

        {/* Amount row: currency glyph flips side by direction (RTL = left, LTR = right).
            Use center alignment so the SVG glyph sits visually on the number's midline
            rather than its baseline. */}
        <View
          style={{
            flexDirection: rowDir,
            alignItems: 'center',
            gap: 10,
            marginTop: 6,
            justifyContent: 'flex-start',
          }}
        >
          {/* Order in source = [number, glyph]. With flexDirection=rowDir,
              LTR puts number on the left and glyph on the right;
              RTL (row-reverse) puts number on the right and glyph on the left.
              This matches the requested bilingual placement exactly. */}
          <Text
            style={{
              fontSize: 40,
              fontWeight: '700',
              color: colors.isDark ? COLORS.claude.p200 : colors.primary,
              letterSpacing: -1,
              lineHeight: 44,
            }}
          >
            {amountText}
          </Text>
          <CurrencyGlyph
            currency={currency}
            size={30}
            color={colors.isDark ? COLORS.claude.p200 : colors.primary}
          />
        </View>

        {totalGain !== 0 && totalCostBasis > 0 ? (
          <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 8, marginTop: 10 }}>
            <View
              style={{
                flexDirection: rowDir,
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: gainColor + '1A',
              }}
            >
              {isPositive ? (
                <TrendingUp size={11} color={gainColor} strokeWidth={2.5} />
              ) : (
                <TrendingDown size={11} color={gainColor} strokeWidth={2.5} />
              )}
              <Text style={{ fontSize: 12, fontWeight: '700', color: gainColor }}>
                {formatSignedAmount(totalGain, isRTL, hidden)} · {isPositive ? '+' : ''}
                {ard(gainPct.toFixed(1), isRTL)}%
              </Text>
            </View>
          </View>
        ) : null}

        {/* Distribution bar — colored segments sized by holding share */}
        {distribution.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <View
              style={{
                flexDirection: 'row',
                height: 8,
                borderRadius: 6,
                overflow: 'hidden',
                gap: 2,
              }}
            >
              {distribution.map((d) => (
                <View key={d.type} style={{ flex: d.pct, backgroundColor: d.color }} />
              ))}
            </View>
            <View
              style={{
                flexDirection: rowDir,
                justifyContent: 'space-between',
                marginTop: 10,
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {distribution.map((d) => (
                <View
                  key={d.type}
                  style={{ flexDirection: rowDir, alignItems: 'center', gap: 5 }}
                >
                  <View
                    style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: d.color }}
                  />
                  <Text style={{ fontSize: 10.5, color: colors.textTertiary }}>{t(d.label)}</Text>
                  <Text
                    style={{
                      fontSize: 10.5,
                      color: colors.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    {ard(d.pct.toFixed(0), isRTL)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </HeroCard>
  );
}

// ─── Holding Row ─────────────────────────────────────────────────────

function HoldingRow({
  asset,
  onPress,
}: {
  asset: PortfolioSummary['assets'][number];
  onPress: (asset: PortfolioSummary['assets'][number]) => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const { isRTL, rowDir, textAlign } = useRTL();
  const hidden = usePrivacyStore((s) => s.hidden);
  const hasGain = asset.gain_loss != null;
  const isPositive = (asset.gain_loss ?? 0) >= 0;
  const changeColor = hasGain ? (isPositive ? '#34C759' : '#FF3B30') : colors.textTertiary;

  const costBasis = asset.avg_buy_price != null ? asset.avg_buy_price * asset.quantity : 0;
  const pct = costBasis > 0 && asset.gain_loss != null ? (asset.gain_loss / costBasis) * 100 : 0;
  const icon = getAssetIcon(asset);
  const isTextIcon = icon.length <= 2;

  return (
    <Pressable
      onPress={() => {
        impactLight();
        onPress(asset);
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        {/* Icon chip */}
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            backgroundColor: colors.surfaceSecondary,
            borderWidth: 1,
            borderColor: colors.borderLight,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginEnd: 12,
          }}
        >
          <Text
            style={{
              fontSize: isTextIcon ? 14 : 18,
              fontWeight: isTextIcon ? '800' : '400',
              color: isTextIcon ? colors.textPrimary : undefined,
            }}
          >
            {icon}
          </Text>
        </View>

        {/* Name + subtitle — flex:1 with minWidth:0 so it shrinks before the price wraps */}
        <View style={{ flex: 1, flexShrink: 1, minWidth: 0, marginEnd: 12 }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign }}
          >
            {asset.asset_type === 'stock' ? asset.asset_code : asset.display_name}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1, textAlign }}
          >
            {asset.asset_type === 'stock' ? asset.display_name : asset.asset_code} ·{' '}
            {ard(Number(asset.quantity.toFixed(4)), isRTL)} {asset.unit}
          </Text>
        </View>

        {/* Value + change — fixed on the opposite end */}
        <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flexShrink: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}
          >
            {maskIfHidden(
              ard(formatAmount(asset.total_value, { integer: true }), isRTL),
              hidden,
            )}
          </Text>
          {hasGain ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
              <Text style={{ fontSize: 10, color: changeColor, fontWeight: '700' }}>
                {isPositive ? '▲' : '▼'}
              </Text>
              <Text style={{ fontSize: 11, color: changeColor, fontWeight: '600' }}>
                {ard(Math.abs(pct).toFixed(2), isRTL)}%
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
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

  const icon = getAssetIcon(asset);
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
            <Text style={{ fontSize: 32, marginRight: 12 }}>{icon}</Text>
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

// ─── Insights Card (premium, minimal — no top performer, no AI tile) ─

function InsightsCard({ portfolio }: { portfolio: PortfolioSummary }): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign, isRTL } = useRTL();

  const stats = useMemo(() => {
    const assets = portfolio.assets;
    if (assets.length === 0) return null;

    const total = assets.reduce((s, a) => s + a.total_value, 0);

    let topAsset = assets[0];
    for (const a of assets) {
      if (a.total_value > topAsset.total_value) topAsset = a;
    }
    const concentrationPct = total > 0 ? (topAsset.total_value / total) * 100 : 0;

    let totalGain = 0;
    let totalCost = 0;
    let bestGainer: { name: string; pct: number } | null = null;
    for (const a of assets) {
      if (a.avg_buy_price == null || a.avg_buy_price <= 0 || a.gain_loss == null) continue;
      const cost = a.avg_buy_price * a.quantity;
      totalGain += a.gain_loss;
      totalCost += cost;
      const pct = (a.gain_loss / cost) * 100;
      if (!bestGainer || pct > bestGainer.pct) {
        bestGainer = { name: a.display_name, pct };
      }
    }
    const overallReturnPct = totalCost > 0 ? (totalGain / totalCost) * 100 : null;

    return { topAsset, concentrationPct, overallReturnPct, bestGainer };
  }, [portfolio.assets]);

  if (!stats) return null;

  const { topAsset, concentrationPct, overallReturnPct, bestGainer } = stats;

  // Severity: >60% warning, >40% caution, else neutral.
  const concentrationHigh = concentrationPct > 60;
  const concentrationMed = concentrationPct > 40;
  const concentrationTone = concentrationHigh
    ? '#FF9500'
    : concentrationMed
      ? '#FFCC00'
      : colors.primary;

  // Fill a template like "{pct}% of your portfolio is concentrated in {name}."
  const fillTemplate = (
    template: string,
    parts: Record<string, { text: string; color?: string; weight?: '400' | '600' | '700' }>,
  ): React.ReactNode => {
    const nodes: React.ReactNode[] = [];
    let remaining = template;
    let key = 0;
    // naive split on {token} tokens
    while (remaining.length > 0) {
      const open = remaining.indexOf('{');
      if (open === -1) {
        nodes.push(
          <Text key={`t-${key++}`} style={{ color: colors.textPrimary }}>
            {remaining}
          </Text>,
        );
        break;
      }
      if (open > 0) {
        nodes.push(
          <Text key={`t-${key++}`} style={{ color: colors.textPrimary }}>
            {remaining.slice(0, open)}
          </Text>,
        );
      }
      const close = remaining.indexOf('}', open);
      if (close === -1) {
        nodes.push(
          <Text key={`t-${key++}`} style={{ color: colors.textPrimary }}>
            {remaining.slice(open)}
          </Text>,
        );
        break;
      }
      const token = remaining.slice(open + 1, close);
      const part = parts[token];
      if (part) {
        nodes.push(
          <Text
            key={`t-${key++}`}
            style={{ color: part.color ?? colors.textPrimary, fontWeight: part.weight ?? '700' }}
          >
            {part.text}
          </Text>,
        );
      }
      remaining = remaining.slice(close + 1);
    }
    return nodes;
  };

  const Sentence = ({
    iconBg,
    iconColor,
    Icon,
    children,
  }: {
    iconBg: string;
    iconColor: string;
    Icon: typeof TrendingUp;
    children: React.ReactNode;
  }): React.ReactElement => (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'flex-start',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBg,
          marginTop: 1,
        }}
      >
        <Icon size={16} color={iconColor} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 13.5,
            lineHeight: 20,
            color: colors.textPrimary,
            textAlign,
          }}
        >
          {children}
        </Text>
      </View>
    </View>
  );

  // Concentration sentence — warning sentence appended if high
  const concentrationSentence = fillTemplate(t('INSIGHT_CONCENTRATION_SENTENCE'), {
    pct: { text: ard(concentrationPct.toFixed(0), isRTL), color: concentrationTone },
    name: { text: topAsset.display_name, color: colors.textPrimary },
  });

  // Overall return sentence
  let returnSentence: React.ReactNode;
  if (overallReturnPct == null) {
    returnSentence = (
      <Text style={{ color: colors.textSecondary, fontWeight: '500' }}>
        {t('INSIGHT_NO_BUY_PRICES')}
      </Text>
    );
  } else {
    const up = overallReturnPct >= 0;
    const color = up ? '#34C759' : '#FF3B30';
    returnSentence = fillTemplate(
      t(up ? 'INSIGHT_OVERALL_UP_SENTENCE' : 'INSIGHT_OVERALL_DOWN_SENTENCE'),
      {
        pct: { text: ard(Math.abs(overallReturnPct).toFixed(1), isRTL), color },
      },
    );
  }

  // Best gainer sentence
  const showGainer = bestGainer && bestGainer.pct > 0;
  const gainerSentence = showGainer
    ? fillTemplate(t('INSIGHT_BEST_GAINER_SENTENCE'), {
        name: { text: bestGainer.name, color: colors.textPrimary },
        pct: { text: ard(bestGainer.pct.toFixed(1), isRTL), color: '#34C759' },
      })
    : null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <View
        style={{
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          overflow: 'hidden',
        }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <Text
            style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign }}
          >
            {t('SMART_INSIGHTS')}
          </Text>
        </View>

        <Sentence iconBg={concentrationTone + '1A'} iconColor={concentrationTone} Icon={Coins}>
          {concentrationSentence}
          {concentrationHigh ? (
            <Text style={{ color: colors.textSecondary }}> {t('INSIGHT_CONCENTRATION_WARN')}</Text>
          ) : null}
        </Sentence>

        <View style={{ height: 0.5, backgroundColor: colors.borderLight, marginHorizontal: 12 }} />

        <Sentence
          iconBg={
            (overallReturnPct == null
              ? colors.textTertiary
              : overallReturnPct >= 0
                ? '#34C759'
                : '#FF3B30') + '1A'
          }
          iconColor={
            overallReturnPct == null
              ? colors.textTertiary
              : overallReturnPct >= 0
                ? '#34C759'
                : '#FF3B30'
          }
          Icon={overallReturnPct != null && overallReturnPct < 0 ? TrendingDown : TrendingUp}
        >
          {returnSentence}
        </Sentence>

        {showGainer ? (
          <>
            <View
              style={{ height: 0.5, backgroundColor: colors.borderLight, marginHorizontal: 12 }}
            />
            <Sentence iconBg={'#34C759' + '1A'} iconColor="#34C759" Icon={TrendingUp}>
              {gainerSentence}
            </Sentence>
          </>
        ) : null}
      </View>
    </View>
  );
}

// ─── Currency glyph (SVG when available, text fallback) ─────────────
//
// Renders the official SVG glyph for supported currencies (SAR = Riyal,
// EGP = ج, USD = $, EUR, GBP, AED, KWD). Falls back to the code as text
// for currencies without a dedicated icon. Never render raw "SAR" text.

function CurrencyGlyph({
  currency,
  size = 14,
  color,
  fallbackStyle,
}: {
  currency: string;
  size?: number;
  color: string;
  fallbackStyle?: { fontSize?: number; fontWeight?: '400' | '500' | '600' | '700' };
}): React.ReactElement {
  if (hasCurrencyIcon(currency)) {
    return <CurrencyIcon currency={currency} size={size} color={color} />;
  }
  return (
    <Text
      style={{
        fontSize: fallbackStyle?.fontSize ?? size * 0.85,
        fontWeight: fallbackStyle?.fontWeight ?? '700',
        color,
      }}
    >
      {currency}
    </Text>
  );
}

// ─── Live price row (shared by both tables) ──────────────────────────
//
// Layout: [icon] [name + subtitle on the START side] ... [price on the END side]
// In RTL, rowDir flips automatically so name+icon end up on the right and
// price on the left — matching the user's requested behavior.

function LivePriceRow({
  icon,
  name,
  subtitle,
  price,
  changePct,
  iconBg,
  iconColor,
  isTextIcon = true,
  currencyLabel,
  priceLoading = false,
  trailing,
}: {
  icon: string;
  name: string;
  subtitle?: string;
  price: number;
  changePct: number;
  iconBg: string;
  iconColor?: string;
  isTextIcon?: boolean;
  currencyLabel?: string;
  priceLoading?: boolean;
  trailing?: React.ReactNode;
}): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir, textAlign, isRTL } = useRTL();
  const positive = changePct >= 0;
  const color = positive ? '#34C759' : '#FF3B30';
  return (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBg,
          flexShrink: 0,
        }}
      >
        <Text
          style={{
            fontSize: isTextIcon ? 14 : 18,
            fontWeight: isTextIcon ? '800' : '400',
            color: iconColor,
          }}
        >
          {icon}
        </Text>
      </View>

      {/* Name + ticker — name and price MUST stay on the same row */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, textAlign }}
        >
          {name}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{ fontSize: 11, color: colors.textTertiary, marginTop: 1, textAlign }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Price block — opposite end from name */}
      <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end', flexShrink: 0 }}>
        {priceLoading ? (
          <>
            <View
              style={{
                width: 52,
                height: 13,
                borderRadius: 4,
                backgroundColor: colors.surfaceSecondary,
              }}
            />
            <View
              style={{
                width: 36,
                height: 10,
                borderRadius: 4,
                backgroundColor: colors.surfaceSecondary,
                marginTop: 4,
              }}
            />
          </>
        ) : (
          <>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
                {ard(formatAmount(price), isRTL)}
              </Text>
              {currencyLabel ? (
                <CurrencyGlyph
                  currency={currencyLabel}
                  size={11}
                  color={colors.textTertiary}
                  fallbackStyle={{ fontSize: 10, fontWeight: '600' }}
                />
              ) : null}
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color, marginTop: 2 }}>
              {positive ? '▲' : '▼'} {ard(Math.abs(changePct).toFixed(2), isRTL)}%
            </Text>
          </>
        )}
      </View>

      {trailing ?? null}
    </View>
  );
}

// ─── USD ↔ local currency toggle ─────────────────────────────────────
//
// Pure-UI toggle for the live-price tables. Uses a small fallback table
// of approximate USD→currency rates (same numbers used by
// services/asset-service.ts). Online conversion lives in the asset
// service for actual portfolio valuation — this is just for display
// preference on the live tables.

const USD_FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EGP: 54.4,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.376,
  OMR: 0.385,
  JOD: 0.709,
  EUR: 0.92,
  GBP: 0.79,
};

function useUsdToLocalRate(): { rate: number; localCurrency: string; hasLocal: boolean } {
  const localCurrency = useSettingsStore((s) => s.activeCurrency);
  const rate = USD_FALLBACK_RATES[localCurrency] ?? null;
  return {
    rate: rate ?? 1,
    localCurrency,
    hasLocal: rate != null && localCurrency !== 'USD',
  };
}

function CurrencyToggle({
  mode,
  onChange,
  hasLocal,
  localLabel,
}: {
  mode: 'usd' | 'local';
  onChange: (m: 'usd' | 'local') => void;
  hasLocal: boolean;
  localLabel: string;
}): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  if (!hasLocal) return null;
  const Pill = ({
    value,
    children,
  }: {
    value: 'usd' | 'local';
    children: React.ReactNode;
  }) => {
    const active = mode === value;
    return (
      <Pressable
        onPress={() => {
          impactLight();
          onChange(value);
        }}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: active ? colors.primary + '18' : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {typeof children === 'string' ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: active ? colors.primary : colors.textTertiary,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  };
  const activeColor = (active: boolean): string =>
    active ? colors.primary : colors.textTertiary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        padding: 2,
        borderRadius: 999,
        backgroundColor: colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: colors.borderLight,
      }}
    >
      <Pill value="usd">{t('CURRENCY_TOGGLE_USD')}</Pill>
      <Pill value="local">
        <CurrencyGlyph
          currency={localLabel}
          size={13}
          color={activeColor(mode === 'local')}
          fallbackStyle={{ fontSize: 11, fontWeight: '700' }}
        />
      </Pill>
    </View>
  );
}

// ─── Live Metal + Crypto Table (PRO) ─────────────────────────────────

function LiveMetalCryptoTable(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign } = useRTL();
  const { data, isLoading } = useCommodityPrices();
  const { rate, localCurrency, hasLocal } = useUsdToLocalRate();
  const [mode, setMode] = useState<'usd' | 'local'>('usd');

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <FeatureGate feature="goldSilverTracking" mode="card">
        <View
          style={{
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderLight,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: rowDir,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign }}
            >
              {t('LIVE_METAL_CRYPTO_PRICES')}
            </Text>
            <CurrencyToggle
              mode={mode}
              onChange={setMode}
              hasLocal={hasLocal}
              localLabel={localCurrency}
            />
          </View>
          {isLoading && !data ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            (data ?? []).map((c, i) => {
              const isCrypto = c.code === 'BTC' || c.code === 'ETH';
              const bg = isCrypto
                ? BREAKDOWN_COLORS.crypto + '22'
                : c.code === 'XAU'
                  ? BREAKDOWN_COLORS.gold + '22'
                  : BREAKDOWN_COLORS.silver + '22';
              const displayPrice = mode === 'local' ? c.price * rate : c.price;
              const displayCurrency = mode === 'local' ? localCurrency : 'USD';
              return (
                <React.Fragment key={c.code}>
                  {i > 0 ? (
                    <View
                      style={{
                        height: 0.5,
                        backgroundColor: colors.borderLight,
                        marginHorizontal: 12,
                      }}
                    />
                  ) : null}
                  <LivePriceRow
                    icon={c.icon}
                    name={c.name}
                    subtitle={c.code}
                    price={displayPrice}
                    changePct={c.change_percent}
                    iconBg={bg}
                    currencyLabel={displayCurrency}
                  />
                </React.Fragment>
              );
            })
          )}
        </View>
      </FeatureGate>
    </View>
  );
}

// ─── Live Stock Table (MAX) ──────────────────────────────────────────
//
// Always populated. Shows the user's holdings if any, otherwise the
// top 20 popular stocks. Defaults to a compact 5-row view with a
// "Show all" expander.

const TOP_20_STOCKS: Array<{ symbol: string; company_name: string }> = [
  { symbol: 'AAPL', company_name: 'Apple Inc.' },
  { symbol: 'MSFT', company_name: 'Microsoft Corp.' },
  { symbol: 'NVDA', company_name: 'NVIDIA Corp.' },
  { symbol: 'GOOGL', company_name: 'Alphabet Inc.' },
  { symbol: 'AMZN', company_name: 'Amazon.com Inc.' },
  { symbol: 'META', company_name: 'Meta Platforms' },
  { symbol: 'TSLA', company_name: 'Tesla Inc.' },
  { symbol: 'BRK.B', company_name: 'Berkshire Hathaway' },
  { symbol: 'JPM', company_name: 'JPMorgan Chase' },
  { symbol: 'V', company_name: 'Visa Inc.' },
  { symbol: 'JNJ', company_name: 'Johnson & Johnson' },
  { symbol: 'WMT', company_name: 'Walmart Inc.' },
  { symbol: 'MA', company_name: 'Mastercard Inc.' },
  { symbol: 'PG', company_name: 'Procter & Gamble' },
  { symbol: 'DIS', company_name: 'Walt Disney' },
  { symbol: 'NFLX', company_name: 'Netflix Inc.' },
  { symbol: 'AMD', company_name: 'AMD' },
  { symbol: 'INTC', company_name: 'Intel Corp.' },
  { symbol: 'CRM', company_name: 'Salesforce' },
  { symbol: 'KO', company_name: 'Coca-Cola Co.' },
];

function LiveStockTable(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { rowDir, textAlign } = useRTL();
  const { rate, localCurrency, hasLocal } = useUsdToLocalRate();
  const [mode, setMode] = useState<'usd' | 'local'>('usd');
  const [showAll, setShowAll] = useState(false);

  const favorites = useStockFavoritesStore((s) => s.favorites);
  const toggleFavorite = useStockFavoritesStore((s) => s.toggle);

  // Always render all 20 rows immediately. Price data streams in.
  const watchlist = useMemo<WatchlistStock[]>(
    () =>
      TOP_20_STOCKS.map(
        (s, i): WatchlistStock => ({
          id: `top-${s.symbol}`,
          user_id: '',
          symbol: s.symbol,
          company_name: s.company_name,
          sort_order: i,
          created_at: '',
        }),
      ),
    [],
  );

  const { data, isLoading } = useStockQuotes(watchlist);

  // Build a quote lookup so each row knows its current price / change
  // without blocking the full list on the quote fetch.
  const quoteBySymbol = useMemo(() => {
    const map = new Map<string, StockQuote>();
    (data ?? []).forEach((q) => map.set(q.symbol, q));
    return map;
  }, [data]);

  // Order: favorites first (in the order the user pinned them), then
  // everything else in the canonical TOP_20 order.
  const orderedStocks = useMemo(() => {
    const favSet = new Set(favorites);
    const favRows = favorites
      .map((sym) => TOP_20_STOCKS.find((s) => s.symbol === sym))
      .filter((s): s is (typeof TOP_20_STOCKS)[number] => s != null);
    const rest = TOP_20_STOCKS.filter((s) => !favSet.has(s.symbol));
    return [...favRows, ...rest];
  }, [favorites]);

  const visibleStocks = showAll ? orderedStocks : orderedStocks.slice(0, 5);
  const canExpand = orderedStocks.length > 5;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <FeatureGate feature="stocksLive" mode="card">
        <View
          style={{
            borderRadius: 20,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderLight,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              flexDirection: rowDir,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
            }}
          >
            <Text
              style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary, textAlign }}
            >
              {t('LIVE_STOCK_PRICES')}
            </Text>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
              <CurrencyToggle
                mode={mode}
                onChange={setMode}
                hasLocal={hasLocal}
                localLabel={localCurrency}
              />
              {canExpand ? (
                <Pressable
                  onPress={() => {
                    impactLight();
                    setShowAll((v) => !v);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    {showAll ? t('SHOW_LESS') : t('SHOW_ALL')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {visibleStocks.map((stock, i) => {
            const quote = quoteBySymbol.get(stock.symbol);
            const hasQuote = quote != null;
            const price = hasQuote
              ? mode === 'local'
                ? quote.price * rate
                : quote.price
              : 0;
            const displayCurrency = mode === 'local' ? localCurrency : 'USD';
            const isFav = favorites.includes(stock.symbol);
            return (
              <React.Fragment key={stock.symbol}>
                {i > 0 ? (
                  <View
                    style={{
                      height: 0.5,
                      backgroundColor: colors.borderLight,
                      marginHorizontal: 12,
                    }}
                  />
                ) : null}
                <LivePriceRow
                  icon={stock.symbol.slice(0, 2)}
                  name={stock.symbol}
                  subtitle={stock.company_name}
                  price={price}
                  changePct={quote?.change_percent ?? 0}
                  iconBg={BREAKDOWN_COLORS.stock + '22'}
                  iconColor={BREAKDOWN_COLORS.stock}
                  currencyLabel={hasQuote ? displayCurrency : undefined}
                  priceLoading={!hasQuote && isLoading}
                  trailing={
                    <Pressable
                      onPress={() => {
                        impactLight();
                        toggleFavorite(stock.symbol);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={({ pressed }) => ({
                        marginStart: 10,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Star
                        size={18}
                        color={isFav ? '#F59E0B' : colors.textTertiary}
                        fill={isFav ? '#F59E0B' : 'transparent'}
                        strokeWidth={2}
                      />
                    </Pressable>
                  }
                />
              </React.Fragment>
            );
          })}
        </View>
      </FeatureGate>
    </View>
  );
}

// ─── Scroll-synced compact top bar with rotating asset pill ──────────

function CompactTopBar({
  scrollY,
  assets,
}: {
  scrollY: ReturnType<typeof useSharedValue<number>>;
  assets: PortfolioSummary['assets'];
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { rowDir, isRTL } = useRTL();

  const compactBarStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [160, 260], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [160, 260], [-8, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const rotatable = useMemo(() => assets.slice(0, 6), [assets]);
  const [idx, setIdx] = useState(0);
  const pillOpacity = useSharedValue(1);

  useEffect(() => {
    if (rotatable.length <= 1) return;
    const id = setInterval(() => {
      pillOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) {
          pillOpacity.value = withTiming(1, { duration: 220 });
        }
      });
      setTimeout(() => {
        setIdx((i) => (i + 1) % rotatable.length);
      }, 180);
    }, 3000);
    return () => clearInterval(id);
  }, [rotatable.length, pillOpacity]);

  const pillStyle = useAnimatedStyle(() => ({ opacity: pillOpacity.value }));

  const current = rotatable[idx];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          paddingTop: insets.top + 4,
          paddingBottom: 8,
          paddingHorizontal: 16,
          backgroundColor: colors.background + 'EE',
          borderBottomWidth: 0.5,
          borderBottomColor: colors.borderLight,
        },
        compactBarStyle,
      ]}
      pointerEvents="box-none"
    >
      <View
        style={{
          flexDirection: rowDir,
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 36,
        }}
      >
        <Text
          style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.3 }}
        >
          {t('ASSETS_TITLE')}
        </Text>
        {current ? (
          <Animated.View style={pillStyle}>
            <View
              style={{
                flexDirection: rowDir,
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.borderLight,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>
                {current.asset_type === 'stock' ? current.asset_code : current.display_name}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textSecondary }}>
                {ard(formatAmount(current.current_price), isRTL)}
              </Text>
              {(() => {
                const cost =
                  current.avg_buy_price != null ? current.avg_buy_price * current.quantity : 0;
                if (cost <= 0 || current.gain_loss == null) return null;
                const pct = (current.gain_loss / cost) * 100;
                const positive = pct >= 0;
                const color = positive ? '#34C759' : '#FF3B30';
                return (
                  <Text style={{ fontSize: 11, fontWeight: '700', color }}>
                    {positive ? '▲' : '▼'} {ard(Math.abs(pct).toFixed(1), isRTL)}%
                  </Text>
                );
              })()}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

// ─── Main Assets Screen ──────────────────────────────────────────────

export default function AssetsScreen(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { textAlign, rowDir } = useRTL();
  const insets = useSafeAreaInsets();
  const { data: portfolio, isLoading, isError, error, refetch } = usePortfolioSummary();

  const [showChooser, setShowChooser] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [editAsset, setEditAsset] = useState<EditableAsset | null>(null);

  // Scroll-driven compact top bar
  const scrollY = useSharedValue(0);
  const onScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.value = e.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  const openChooser = useCallback(() => {
    impactLight();
    setShowChooser(true);
  }, []);

  const openEdit = useCallback((asset: EditableAsset) => {
    setEditAsset(asset);
  }, []);

  const assets = portfolio?.assets ?? [];

  // Defer mounting heavy, data-driven sections (insights + live price tables)
  // until after the first paint + any in-flight gestures. This lets the shell
  // (header, hero slot, portfolio list) appear in the next frame while the
  // expensive subtrees hydrate silently in the background.
  const [deferredReady, setDeferredReady] = useState(false);
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setDeferredReady(true);
    });
    return () => handle.cancel();
  }, []);

  // Only the hard error case blocks the screen. A pending first load
  // renders the shell + skeletons so the tab paints in milliseconds.
  if (isError && !portfolio) {
    return <ErrorState message={error?.message ?? t('FAILED_LOAD_ASSETS')} onRetry={refetch} />;
  }

  return (
    <ErrorBoundary>
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 110,
            paddingTop: insets.top + 8,
          }}
        >
          {/* Title + subtitle */}
          <ScreenHeader title={t('ASSETS_TITLE')} subtitle={t('ASSETS_SUBTITLE')} />

          {/* Hero with growing-line chart */}
          {portfolio ? (
            <SummaryHero portfolio={portfolio} />
          ) : (
            <HeroSkeleton />
          )}

          {/* Portfolio card */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <View
              style={{
                borderRadius: 20,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderLight,
                overflow: 'hidden',
              }}
            >
              {/* Section header */}
              <View
                style={{
                  flexDirection: rowDir,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    textAlign,
                  }}
                >
                  {t('PORTFOLIO')}
                </Text>
                <Pressable
                  onPress={openChooser}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{
                    flexDirection: rowDir,
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 999,
                    backgroundColor: colors.primary + '15',
                  }}
                >
                  <Plus size={13} color={colors.primary} strokeWidth={2.5} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                    {t('ADD')}
                  </Text>
                </Pressable>
              </View>

              {/* Rows */}
              {!portfolio ? (
                <View style={{ paddingVertical: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: rowDir,
                        alignItems: 'center',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: colors.surfaceSecondary,
                          marginEnd: 12,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            width: '50%',
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors.surfaceSecondary,
                          }}
                        />
                        <View
                          style={{
                            width: '30%',
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: colors.surfaceSecondary,
                            marginTop: 6,
                          }}
                        />
                      </View>
                      <View
                        style={{
                          width: 60,
                          height: 14,
                          borderRadius: 7,
                          backgroundColor: colors.surfaceSecondary,
                        }}
                      />
                    </View>
                  ))}
                </View>
              ) : assets.length > 0 ? (
                assets.map((asset, i) => (
                  <React.Fragment key={asset.id}>
                    {i > 0 ? (
                      <View
                        style={{
                          height: 0.5,
                          backgroundColor: colors.borderLight,
                          marginHorizontal: 12,
                        }}
                      />
                    ) : null}
                    <HoldingRow asset={asset} onPress={openEdit} />
                  </React.Fragment>
                ))
              ) : (
                <View style={{ paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.textPrimary,
                      marginBottom: 4,
                      textAlign: 'center',
                    }}
                  >
                    {t('TRACK_ASSETS')}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 14,
                      textAlign: 'center',
                    }}
                  >
                    {t('TRACK_ASSETS_DESC')}
                  </Text>
                  <Pressable
                    onPress={openChooser}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                      {t('ADD')}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* Insights */}
          {deferredReady && portfolio ? <InsightsCard portfolio={portfolio} /> : null}

          {/* Live prices — PRO-gated metals + crypto */}
          {deferredReady ? <LiveMetalCryptoTable /> : null}

          {/* Live prices — MAX-gated stocks */}
          {deferredReady && portfolio ? <LiveStockTable /> : null}
        </Animated.ScrollView>

        {/* Scroll-synced compact top bar with rotating asset pill */}
        <CompactTopBar scrollY={scrollY} assets={assets} />

        {/* Modals */}
        <AddChooserSheet
          visible={showChooser}
          onClose={() => setShowChooser(false)}
          onPickAsset={() => setShowAddAsset(true)}
          onPickStock={() => setShowAddStock(true)}
        />
        <AddAssetModal visible={showAddAsset} onClose={() => setShowAddAsset(false)} />
        <AddStockHoldingModal visible={showAddStock} onClose={() => setShowAddStock(false)} />
        <EditAssetModal
          visible={editAsset != null}
          asset={editAsset}
          onClose={() => setEditAsset(null)}
        />
      </View>
    </ErrorBoundary>
  );
}
