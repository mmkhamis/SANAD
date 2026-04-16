import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X, Search, TrendingUp, TrendingDown } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useWatchlist, useStockQuotes, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { useCreateAsset } from '../../hooks/useAssets';
import { searchStockCatalog, type StockCatalogEntry } from '../../services/watchlist-service';
import { formatAmount } from '../../utils/currency';
import { AssetSparkline } from '../charts/AssetSparkline';
import { impactLight, impactMedium, notifySuccess } from '../../utils/haptics';
import { usePrivacyStore, maskIfHidden } from '../../store/privacy-store';
import type { StockQuote, WatchlistStock, PortfolioSummary } from '../../types/index';

// ─── Stock Row ───────────────────────────────────────────────────────

function StockRow({
  quote,
  watchlistItem,
  ownedAsset,
  onLongPress,
  onBuyPress,
}: {
  quote: StockQuote;
  watchlistItem: WatchlistStock | undefined;
  ownedAsset?: PortfolioSummary['assets'][number];
  onLongPress: (item: WatchlistStock) => void;
  onBuyPress: (quote: StockQuote) => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const isPositive = quote.change >= 0;
  const changeColor = isPositive ? '#34C759' : '#FF3B30';

  return (
    <Pressable
      onLongPress={() => {
        if (watchlistItem) {
          impactMedium();
          onLongPress(watchlistItem);
        }
      }}
      onPress={() => {
        if (!ownedAsset && watchlistItem) {
          impactLight();
          onBuyPress(quote);
        }
      }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* LEFT: Name */}
      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          {quote.symbol}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 12, color: colors.textSecondary, flexShrink: 1 }}
          >
            {quote.company_name}
          </Text>
          {ownedAsset ? (
            <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.isDark ? 'rgba(52,211,153,0.15)' : '#34D39912' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.income }}>{t('STOCK_OWNED' as any)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* CENTER: Sparkline */}
      <View style={{ marginRight: 12 }}>
        <AssetSparkline
          assetCode={quote.symbol}
          color={changeColor}
          width={50}
          height={24}
        />
      </View>

      {/* RIGHT: Price + change */}
      <View style={{ alignItems: 'flex-end', minWidth: 85 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          ${quote.price.toFixed(2)}
        </Text>
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
            {isPositive ? '+' : ''}{quote.change_percent.toFixed(2)}%
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Separator ───────────────────────────────────────────────────────

function Separator(): React.ReactElement {
  const colors = useThemeColors();
  return (
    <View
      style={{
        height: 0.5,
        backgroundColor: colors.borderLight,
        marginLeft: 16,
      }}
    />
  );
}

// ─── Buy Shares Modal ────────────────────────────────────────────────

function BuySharesModal({
  visible,
  stock,
  onClose,
}: {
  visible: boolean;
  stock: StockQuote | null;
  onClose: () => void;
}): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { mutate: createAsset, isPending } = useCreateAsset();
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');

  const reset = (): void => {
    setQuantity('');
    setBuyPrice('');
  };

  const handleSave = (): void => {
    if (!stock) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    impactMedium();
    const bp = parseFloat(buyPrice);
    createAsset({
      asset_type: 'stock',
      asset_code: stock.symbol,
      display_name: stock.company_name,
      quantity: qty,
      unit: 'shares',
      avg_buy_price: isNaN(bp) ? stock.price : bp,
      currency_code: 'USD',
    });
    notifySuccess();
    reset();
    onClose();
  };

  if (!stock) return <></>;

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
          <Pressable onPress={() => { reset(); onClose(); }} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {t('STOCK_OWN' as any)} {stock.symbol}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stock info */}
          <View
            className="flex-row items-center rounded-xl p-4 mb-6"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderLight,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: '#38BDF818',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#38BDF8' }}>
                {stock.symbol.slice(0, 2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                {stock.company_name}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                {t('STOCK_CURRENT_PRICE' as any)}: ${stock.price.toFixed(2)}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary, marginBottom: 8 }}>
            {t('STOCK_NUM_SHARES' as any)}
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
            {t('STOCK_AVG_BUY' as any)}{' '}
            <Text style={{ fontSize: 12, color: colors.textTertiary }}>({t('STOCK_DEFAULTS_CURRENT' as any)})</Text>
          </Text>
          <TextInput
            value={buyPrice}
            onChangeText={setBuyPrice}
            placeholder={`$${stock.price.toFixed(2)}`}
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

          {/* Value preview */}
          {quantity && parseFloat(quantity) > 0 ? (
            <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.surfaceSecondary }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary }}>
                {t('STOCK_ESTIMATED_VALUE' as any)}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginTop: 2 }}>
                ${(parseFloat(quantity) * stock.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          ) : null}

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
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
              {isPending ? t('STOCK_ADDING' as any) : t('STOCK_ADD_PORTFOLIO' as any)}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add Stock Modal ─────────────────────────────────────────────────

function AddStockModal({
  visible,
  onClose,
  existingSymbols,
}: {
  visible: boolean;
  onClose: () => void;
  existingSymbols: Set<string>;
}): React.ReactElement {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { mutateAsync, isPending } = useAddToWatchlist();
  const [searchQuery, setSearchQuery] = useState('');

  const results = searchStockCatalog(searchQuery).filter(
    (s) => !existingSymbols.has(s.symbol),
  );

  const handleAdd = async (entry: StockCatalogEntry): Promise<void> => {
    impactMedium();
    try {
      await mutateAsync({ symbol: entry.symbol, company_name: entry.company_name });
      notifySuccess();
      onClose();
      setSearchQuery('');
    } catch {
      // handled by hook
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          paddingTop: insets.top,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 4 }}>
            <X size={22} color={colors.textSecondary} strokeWidth={2} />
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
            {t('STOCK_ADD' as any)}
          </Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Search bar */}
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
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('STOCK_SEARCH' as any)}
            placeholderTextColor={colors.textTertiary}
            autoFocus
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />
        </View>

        {/* Results */}
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {results.map((entry) => (
            <Pressable
              key={entry.symbol}
              onPress={() => handleAdd(entry)}
              disabled={isPending}
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
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    letterSpacing: 0.3,
                  }}
                >
                  {entry.symbol}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {entry.company_name}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textTertiary,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                {entry.sector}
              </Text>
              <Plus
                size={20}
                color={colors.primary}
                strokeWidth={2}
                style={{ marginLeft: 12 }}
              />
            </Pressable>
          ))}

          {results.length === 0 && searchQuery.length > 0 ? (
            <Text
              style={{
                textAlign: 'center',
                marginTop: 40,
                fontSize: 14,
                color: colors.textTertiary,
              }}
            >
              {t('STOCK_NO_RESULTS' as any)} "{searchQuery}"
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main StockWatchlist Component ───────────────────────────────────

interface StockWatchlistProps {
  /** Portfolio assets that are stocks — used to show owned shares inline. */
  ownedStockAssets?: PortfolioSummary['assets'];
}

export function StockWatchlist({ ownedStockAssets }: StockWatchlistProps): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { data: watchlist, isLoading: loadingWatchlist } = useWatchlist();
  const { data: quotes, isLoading: loadingQuotes } = useStockQuotes(watchlist);
  const { mutateAsync: removeAsync } = useRemoveFromWatchlist();
  const [showAdd, setShowAdd] = useState(false);
  const [buyStock, setBuyStock] = useState<StockQuote | null>(null);

  const existingSymbols = new Set((watchlist ?? []).map((w) => w.symbol));
  const hasUserStocks = existingSymbols.size > 0;

  // Build a lookup: symbol → owned asset
  const ownedBySymbol = new Map(
    (ownedStockAssets ?? []).map((a) => [a.asset_code, a]),
  );

  const handleLongPress = useCallback(
    (item: WatchlistStock) => {
      Alert.alert(
        `${t('STOCK_REMOVE_TITLE' as any)} ${item.symbol}?`,
        `${item.company_name} ${t('STOCK_REMOVE_DESC' as any)}`,
        [
          { text: t('CANCEL'), style: 'cancel' },
          {
            text: t('STOCK_REMOVE' as any),
            style: 'destructive',
            onPress: async () => {
              impactMedium();
              try {
                await removeAsync(item.id);
                notifySuccess();
              } catch {
                // handled
              }
            },
          },
        ],
      );
    },
    [removeAsync],
  );

  const isLoading = loadingWatchlist || loadingQuotes;
  const sortedQuotes = (quotes ?? []).sort((a, b) => {
    if (!hasUserStocks) return 0; // keep default order for popular stocks
    const aIdx = (watchlist ?? []).findIndex((w) => w.symbol === a.symbol);
    const bIdx = (watchlist ?? []).findIndex((w) => w.symbol === b.symbol);
    return aIdx - bIdx;
  });

  return (
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
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
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
            Stocks
          </Text>
          {!hasUserStocks ? (
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
              Popular · Add your favorites
            </Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => {
            impactLight();
            setShowAdd(true);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            backgroundColor: '#8B5CF6',
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

      {/* Loading state */}
      {isLoading && sortedQuotes.length === 0 ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#8B5CF6" />
        </View>
      ) : null}

      {/* Stock rows */}
      {sortedQuotes.map((quote, index) => {
        const watchlistItem = (watchlist ?? []).find((w) => w.symbol === quote.symbol);
        const ownedAsset = ownedBySymbol.get(quote.symbol);
        return (
          <React.Fragment key={quote.symbol}>
            {index > 0 ? <Separator /> : null}
            <StockRow
              quote={quote}
              watchlistItem={watchlistItem}
              ownedAsset={ownedAsset}
              onLongPress={handleLongPress}
              onBuyPress={setBuyStock}
            />
          </React.Fragment>
        );
      })}

      <AddStockModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        existingSymbols={existingSymbols}
      />

      <BuySharesModal
        visible={buyStock != null}
        stock={buyStock}
        onClose={() => setBuyStock(null)}
      />
        </View>
      </LinearGradient>
    </View>
  );
}
