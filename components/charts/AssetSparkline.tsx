import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { useThemeColors } from '../../hooks/useThemeColors';

// ─── Fetch 7-day price history ──────────────────────────────────────

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
};

const YAHOO_COMMODITY_TICKERS: Record<string, string> = {
  XAU: 'GC=F',
  XAG: 'SI=F',
};

const KNOWN_STOCK_CODES = new Set(['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC', 'CRM', 'BA', 'JPM', 'V', 'MA', 'DIS', 'KO', 'PEP', 'ADBE', 'PYPL', 'UBER', 'SQ', 'SPOT', 'SNAP', 'COIN', 'PLTR', 'WMT', 'JNJ', 'PG', 'BRK.B']);
const HISTORY_CACHE_TTL_MS = 5 * 60 * 1000;
const priceHistoryCache = new Map<string, { values: number[]; fetchedAt: number }>();

function readHistoryFromCache(assetCode: string): number[] | null {
  const cached = priceHistoryCache.get(assetCode);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > HISTORY_CACHE_TTL_MS) {
    priceHistoryCache.delete(assetCode);
    return null;
  }
  return cached.values;
}

function saveHistoryToCache(assetCode: string, values: number[]): number[] {
  priceHistoryCache.set(assetCode, { values, fetchedAt: Date.now() });
  return values;
}

async function fetchCryptoOrMetalHistory(assetCode: string): Promise<number[]> {
  const coinId = COINGECKO_IDS[assetCode];
  if (!coinId) return [];

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { prices?: [number, number][] };
    if (!Array.isArray(data?.prices)) return [];
    return data.prices.map((p) => p[1]).filter((p) => Number.isFinite(p) && p > 0);
  } catch {
    return [];
  }
}

async function fetchStockHistory(assetCode: string): Promise<number[]> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(assetCode)}?interval=1d&range=7d`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    );
    if (!res.ok) return [];
    const json = await res.json() as {
      chart?: {
        result?: Array<{
          indicators?: { quote?: Array<{ close?: (number | null)[] }> };
        }>;
      };
    };
    const closes = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(closes)) return [];
    return closes.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  } catch {
    return [];
  }
}

async function fetchPriceHistory(assetCode: string): Promise<number[]> {
  const cached = readHistoryFromCache(assetCode);
  if (cached) return cached;

  const yahooTicker = YAHOO_COMMODITY_TICKERS[assetCode];
  const coinGeckoId = COINGECKO_IDS[assetCode];

  let values: number[];
  if (coinGeckoId) {
    values = await fetchCryptoOrMetalHistory(assetCode);
  } else {
    values = await fetchStockHistory(yahooTicker ?? assetCode);
  }

  return saveHistoryToCache(assetCode, values);
}

// ─── Sparkline Component ─────────────────────────────────────────────

interface AssetSparklineProps {
  assetCode: string;
  color: string;
  width?: number;
  height?: number;
}

export function AssetSparkline({
  assetCode,
  color,
  width = 100,
  height = 40,
}: AssetSparklineProps): React.ReactElement {
  const colors = useThemeColors();
  const [prices, setPrices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPriceHistory(assetCode).then((data) => {
      if (!cancelled) {
        setPrices(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [assetCode]);

  if (loading) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  if (prices.length < 2) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 10, color: colors.textTertiary }}>No data</Text>
      </View>
    );
  }

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#34D399' : '#FB7185';
  const lineData = prices.map((value) => ({ value }));

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <LineChart
        data={lineData}
        width={width}
        height={height}
        hideDataPoints
        hideYAxisText
        hideAxesAndRules
        color={lineColor}
        thickness={2.5}
        curved
        curvature={0.15}
        areaChart
        startFillColor={lineColor + '30'}
        endFillColor={lineColor + '05'}
        animationDuration={0}
        spacing={width / (prices.length - 1)}
        initialSpacing={0}
        endSpacing={0}
        adjustToWidth
        disableScroll
      />
    </View>
  );
}
