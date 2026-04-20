import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown } from 'lucide-react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { useRTL } from '../../hooks/useRTL';
import { useCommodityPrices } from '../../hooks/useWatchlist';
import { AssetSparkline } from '../charts/AssetSparkline';
import type { CommodityPrice } from '../../services/watchlist-service';

// ─── Single commodity row ────────────────────────────────────────────

function CommodityRow({ item }: { item: CommodityPrice }): React.ReactElement {
  const colors = useThemeColors();
  const { rowDir } = useRTL();
  const isPositive = item.change >= 0;
  const changeColor = isPositive ? '#34C759' : '#FF3B30';
  const hasChange = item.change_percent !== 0;

  return (
    <View
      style={{
        flexDirection: rowDir,
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
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
          marginHorizontal: 12,
        }}
      >
        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
      </View>

      {/* Name + code */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 1,
          }}
        >
          {item.code === 'XAU' ? 'Troy Ounce' : item.code === 'XAG' ? 'Troy Ounce' : item.code}
        </Text>
      </View>

      {/* Mini sparkline */}
      <View style={{ marginHorizontal: 12 }}>
        <AssetSparkline
          assetCode={item.code}
          color={hasChange ? changeColor : colors.textTertiary}
          width={50}
          height={24}
        />
      </View>

      {/* Price + change */}
      <View style={{ alignItems: 'flex-end', minWidth: 85 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.textPrimary,
          }}
        >
          ${item.price.toLocaleString('en-US', {
            minimumFractionDigits: item.price >= 100 ? 0 : 2,
            maximumFractionDigits: item.price >= 100 ? 0 : 2,
          })}
        </Text>
        {hasChange ? (
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
              {isPositive ? '+' : ''}
              {item.change_percent.toFixed(2)}%
            </Text>
          </View>
        ) : null}
      </View>
    </View>
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
        marginLeft: 68,
      }}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function CommodityPrices(): React.ReactElement {
  const colors = useThemeColors();
  const t = useT();
  const { textAlign } = useRTL();
  const { data: commodities, isLoading } = useCommodityPrices();

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
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 4,
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: colors.textPrimary,
            letterSpacing: -0.4,
            textAlign,
          }}
        >
          {t('ASSETS_COMMODITIES_CRYPTO' as any)}
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            marginTop: 2,
            textAlign,
          }}
        >
          {t('ASSETS_LIVE_PRICES' as any)}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        (commodities ?? []).map((item, index) => (
          <React.Fragment key={item.code}>
            {index > 0 ? <Separator /> : null}
            <CommodityRow item={item} />
          </React.Fragment>
        ))
      )}
        </View>
      </LinearGradient>
    </View>
  );
}
