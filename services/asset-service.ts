import { supabase } from '../lib/supabase';
import { getActiveCurrency } from '../utils/currency';
import type {
  UserAsset,
  AssetPriceCache,
  AssetType,
  PortfolioSummary,
} from '../types/index';

// ─── Fetch user assets ───────────────────────────────────────────────

export async function getUserAssets(): Promise<UserAsset[]> {
  const { data, error } = await supabase
    .from('user_assets')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    // Table may not exist yet — return empty instead of crashing
    if (error.message.includes('schema cache') || error.code === '42P01') {
      return [];
    }
    throw new Error(error.message);
  }
  return (data as UserAsset[]) ?? [];
}

// ─── Create asset ────────────────────────────────────────────────────

export interface CreateAssetInput {
  asset_type: AssetType;
  asset_code: string;
  display_name: string;
  quantity: number;
  unit: string;
  avg_buy_price?: number | null;
  currency_code?: string;
}

export async function createAsset(input: CreateAssetInput): Promise<UserAsset> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const { data, error } = await supabase
    .from('user_assets')
    .insert({
      user_id: session.user.id,
      asset_type: input.asset_type,
      asset_code: input.asset_code,
      display_name: input.display_name,
      quantity: input.quantity,
      unit: input.unit,
      avg_buy_price: input.avg_buy_price ?? null,
      currency_code: input.currency_code ?? getActiveCurrency(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserAsset;
}

// ─── Update asset ────────────────────────────────────────────────────

export interface UpdateAssetInput {
  id: string;
  quantity?: number;
  avg_buy_price?: number | null;
}

export async function updateAsset(input: UpdateAssetInput): Promise<UserAsset> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.quantity !== undefined) payload.quantity = input.quantity;
  if (input.avg_buy_price !== undefined) payload.avg_buy_price = input.avg_buy_price;

  const { data, error } = await supabase
    .from('user_assets')
    .update(payload)
    .eq('id', input.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as UserAsset;
}

// ─── Soft-delete asset (moves to trash) ──────────────────────────────

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Trash: list recently deleted assets (last 7 days) ───────────────

export async function fetchTrashedAssets(): Promise<UserAsset[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('user_assets')
    .select('*')
    .not('deleted_at', 'is', null)
    .gte('deleted_at', sevenDaysAgo)
    .order('deleted_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as UserAsset[]) ?? [];
}

// ─── Restore a soft-deleted asset ────────────────────────────────────

export async function restoreAsset(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_assets')
    .update({ deleted_at: null })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Permanently delete asset ────────────────────────────────────────

export async function permanentlyDeleteAsset(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_assets')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Fetch asset prices (from cache or trigger edge function) ────────

interface FetchedPrice {
  asset_code: string;
  price_per_gram: number;
  price_per_ounce: number;
  price_per_unit: number; // BTC = per BTC
  currency_code: string;
  source: string;
}

const GRAMS_PER_OUNCE = 31.1035;
const STOCK_CODES = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL'] as const;
const STOCK_FALLBACK_PRICES: Record<string, number> = {
  AAPL: 208,
  MSFT: 430,
  NVDA: 980,
  TSLA: 190,
  GOOGL: 170,
};

function readUsdPrice(data: unknown, key: string): number | null {
  if (!data || typeof data !== 'object') return null;
  const row = (data as Record<string, unknown>)[key];
  if (!row || typeof row !== 'object') return null;
  const usd = (row as Record<string, unknown>).usd;
  return typeof usd === 'number' ? usd : null;
}

function readMetalsLivePrice(data: unknown): number | null {
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === 'object') {
      const price = (first as Record<string, unknown>).price;
      if (typeof price === 'number') return price;
    }
  }
  if (data && typeof data === 'object') {
    const price = (data as Record<string, unknown>).price;
    if (typeof price === 'number') return price;
  }
  return null;
}

function readExchangeRate(data: unknown, userCurrency: string): number | null {
  if (!data || typeof data !== 'object') return null;
  const usd = (data as Record<string, unknown>).usd;
  if (!usd || typeof usd !== 'object') return null;
  const rate = (usd as Record<string, unknown>)[userCurrency.toLowerCase()];
  return typeof rate === 'number' ? rate : null;
}

async function fetchStockQuote(symbol: string): Promise<number | null> {
  try {
    // Yahoo Finance chart API (unofficial, no key required).
    // Returns JSON with current price in meta.regularMarketPrice.
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    );
    if (!res.ok) return null;
    const json = await res.json() as {
      chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
    };
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
    return price;
  } catch {
    return null;
  }
}

async function fetchPricesFromAPIs(): Promise<FetchedPrice[]> {
  const prices: FetchedPrice[] = [];

  // Fetch BTC, Gold (PAXG), Silver (SLV approximation via silver token), ETH, Platinum
  // CoinGecko IDs: bitcoin, pax-gold, ethereum
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold,ethereum&vs_currencies=usd',
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = await res.json();

      // BTC
      const btcPrice = readUsdPrice(data, 'bitcoin');
      if (btcPrice != null) {
        prices.push({
          asset_code: 'BTC',
          price_per_gram: btcPrice,
          price_per_ounce: btcPrice,
          price_per_unit: btcPrice,
          currency_code: 'USD',
          source: 'coingecko',
        });
      }

      // ETH
      const ethPrice = readUsdPrice(data, 'ethereum');
      if (ethPrice != null) {
        prices.push({
          asset_code: 'ETH',
          price_per_gram: ethPrice,
          price_per_ounce: ethPrice,
          price_per_unit: ethPrice,
          currency_code: 'USD',
          source: 'coingecko',
        });
      }

      // Gold (PAXG = 1 troy ounce of gold)
      const goldPerOz = readUsdPrice(data, 'pax-gold');
      if (goldPerOz != null) {
        prices.push({
          asset_code: 'XAU',
          price_per_gram: goldPerOz / GRAMS_PER_OUNCE,
          price_per_ounce: goldPerOz,
          price_per_unit: goldPerOz / GRAMS_PER_OUNCE,
          currency_code: 'USD',
          source: 'coingecko-paxg',
        });
      }
    }
  } catch {
    // CoinGecko unavailable
  }

  // Silver 999 — fetch directly from metals API for accurate pricing
  try {
    const silverRes = await fetch(
      'https://api.metals.live/v1/spot/silver',
      { headers: { Accept: 'application/json' } },
    );
    if (silverRes.ok) {
      const silverData = await silverRes.json();
      const silverPrice = readMetalsLivePrice(silverData);

      if (silverPrice && typeof silverPrice === 'number') {
        prices.push({
          asset_code: 'XAG',
          price_per_gram: silverPrice / GRAMS_PER_OUNCE,
          price_per_ounce: silverPrice,
          price_per_unit: silverPrice / GRAMS_PER_OUNCE,
          currency_code: 'USD',
          source: 'metals-live',
        });
      }
    }
  } catch {
    // Silver API unavailable — fall through to fallback
  }

  // Platinum — try metals API
  try {
    const ptRes = await fetch(
      'https://api.metals.live/v1/spot/platinum',
      { headers: { Accept: 'application/json' } },
    );
    if (ptRes.ok) {
      const ptData = await ptRes.json();
      const ptPrice = readMetalsLivePrice(ptData);

      if (ptPrice && typeof ptPrice === 'number') {
        prices.push({
          asset_code: 'XPT',
          price_per_gram: ptPrice / GRAMS_PER_OUNCE,
          price_per_ounce: ptPrice,
          price_per_unit: ptPrice / GRAMS_PER_OUNCE,
          currency_code: 'USD',
          source: 'metals-live',
        });
      }
    }
  } catch {
    // Platinum API unavailable
  }

  // Stocks — live US quotes (AAPL and peers)
  try {
    const stockRows = await Promise.all(
      STOCK_CODES.map(async (code) => ({
        code,
        price: await fetchStockQuote(code),
      })),
    );

    for (const row of stockRows) {
      if (!row.price) continue;
      prices.push({
        asset_code: row.code,
        price_per_gram: row.price,
        price_per_ounce: row.price,
        price_per_unit: row.price, // per share
        currency_code: 'USD',
        source: 'yahoo',
      });
    }
  } catch {
    // Stock API unavailable
  }

  // Fallbacks for any missing prices
  if (!prices.find((p) => p.asset_code === 'XAU')) {
    const goldPerOz = 4650;
    prices.push({
      asset_code: 'XAU',
      price_per_gram: goldPerOz / GRAMS_PER_OUNCE,
      price_per_ounce: goldPerOz,
      price_per_unit: goldPerOz / GRAMS_PER_OUNCE,
      currency_code: 'USD',
      source: 'fallback',
    });
  }
  if (!prices.find((p) => p.asset_code === 'XAG')) {
    // Silver 999 spot ~ $73.83/oz as of April 2026
    const silverPerOz = 73.83;
    prices.push({
      asset_code: 'XAG',
      price_per_gram: silverPerOz / GRAMS_PER_OUNCE,
      price_per_ounce: silverPerOz,
      price_per_unit: silverPerOz / GRAMS_PER_OUNCE,
      currency_code: 'USD',
      source: 'fallback',
    });
  }
  if (!prices.find((p) => p.asset_code === 'BTC')) {
    prices.push({
      asset_code: 'BTC',
      price_per_gram: 69000,
      price_per_ounce: 69000,
      price_per_unit: 69000,
      currency_code: 'USD',
      source: 'fallback',
    });
  }
  if (!prices.find((p) => p.asset_code === 'ETH')) {
    prices.push({
      asset_code: 'ETH',
      price_per_gram: 3500,
      price_per_ounce: 3500,
      price_per_unit: 3500,
      currency_code: 'USD',
      source: 'fallback',
    });
  }
  if (!prices.find((p) => p.asset_code === 'XPT')) {
    prices.push({
      asset_code: 'XPT',
      price_per_gram: 1050 / GRAMS_PER_OUNCE,
      price_per_ounce: 1050,
      price_per_unit: 1050 / GRAMS_PER_OUNCE,
      currency_code: 'USD',
      source: 'fallback',
    });
  }
  for (const code of STOCK_CODES) {
    if (!prices.find((p) => p.asset_code === code)) {
      const fallback = STOCK_FALLBACK_PRICES[code];
      prices.push({
        asset_code: code,
        price_per_gram: fallback,
        price_per_ounce: fallback,
        price_per_unit: fallback,
        currency_code: 'USD',
        source: 'fallback',
      });
    }
  }

  return prices;
}

export async function getAssetPrices(): Promise<AssetPriceCache[]> {
  // Try DB cache first
  try {
    const { data, error } = await supabase
      .from('asset_price_cache')
      .select('*');

    if (!error && data && data.length > 0) {
      const prices = data as AssetPriceCache[];
      const fifteenMin = 15 * 60 * 1000;
      const isStale = prices.some(
        (p) => Date.now() - new Date(p.last_updated_at).getTime() > fifteenMin,
      );

      if (!isStale) return prices;
    }
  } catch {
    // Cache table might not exist yet, fall through to API
  }

  // Fetch fresh prices from public APIs
  const fetched = await fetchPricesFromAPIs();

  // Try to update cache (best-effort)
  try {
    const now = new Date().toISOString();
    const rows = fetched.map((p) => ({
      asset_code: p.asset_code,
      price: p.price_per_unit,
      currency_code: p.currency_code,
      last_updated_at: now,
      source: p.source,
    }));
    await supabase.from('asset_price_cache').upsert(rows, { onConflict: 'asset_code' });
  } catch {
    // Non-critical
  }

  // Return as AssetPriceCache shape (price = per gram for metals, per BTC for crypto)
  return fetched.map((p) => ({
    asset_code: p.asset_code,
    price: p.price_per_unit,
    currency_code: p.currency_code,
    last_updated_at: new Date().toISOString(),
    source: p.source,
  }));
}

// ─── Exchange rate (USD → user currency) ─────────────────────────────

let _cachedRate: { currency: string; rate: number; fetchedAt: number } | null = null;

async function getUsdToUserRate(): Promise<number> {
  const userCurrency = getActiveCurrency();

  // Already in USD — no conversion needed
  if (userCurrency === 'USD') return 1;

  // Return cached rate if fresh (< 30 min) and same currency
  if (
    _cachedRate &&
    _cachedRate.currency === userCurrency &&
    Date.now() - _cachedRate.fetchedAt < 30 * 60 * 1000
  ) {
    return _cachedRate.rate;
  }

  // Fetch from a free CORS-friendly exchange rate API
  try {
    const res = await fetch(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json`,
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = await res.json();
      const rate = readExchangeRate(data, userCurrency);
      if (rate != null && rate > 0) {
        _cachedRate = { currency: userCurrency, rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch {
    // API unavailable
  }

  // Fallback rates for common MENA currencies
  const fallbackRates: Record<string, number> = {
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

  return fallbackRates[userCurrency] ?? 1;
}

// ─── Regional metal premiums ─────────────────────────────────────────
// Local precious-metal markets in some regions trade significantly above
// international spot due to import duties, VAT, refining premiums, and
// supply/demand dynamics.  Multiplier is applied on top of the
// spot-price-in-local-currency conversion.
const REGIONAL_METAL_PREMIUMS: Record<string, Record<string, number>> = {
  EGP: { XAU: 1.05, XPT: 1.10 },
};

// ─── Resolved prices map (handles unit conversion + currency) ────────

async function getResolvedPriceMap(): Promise<{
  unitPrices: Map<string, { gram: number; ounce: number; unit: number }>;
  userCurrency: string;
}> {
  const [fetched, rate] = await Promise.all([
    fetchPricesFromAPIs(),
    getUsdToUserRate(),
  ]);

  const userCurrency = getActiveCurrency();
  const premiums = REGIONAL_METAL_PREMIUMS[userCurrency] ?? {};
  const unitPrices = new Map<string, { gram: number; ounce: number; unit: number }>();

  for (const p of fetched) {
    const premium = premiums[p.asset_code] ?? 1;
    unitPrices.set(p.asset_code, {
      gram: p.price_per_gram * rate * premium,
      ounce: p.price_per_ounce * rate * premium,
      unit: p.price_per_unit * rate * premium,
    });
  }

  return { unitPrices, userCurrency };
}

// ─── Portfolio value computation ─────────────────────────────────────

export async function getPortfolioValue(): Promise<PortfolioSummary> {
  const [assets, { unitPrices }] = await Promise.all([
    getUserAssets(),
    getResolvedPriceMap(),
  ]);

  let totalValue = 0;
  const breakdown = { gold: 0, silver: 0, crypto: 0, stock: 0 };

  const enriched = assets.map((asset) => {
    const assetPrices = unitPrices.get(asset.asset_code);
    let currentPrice = 0;

    if (assetPrices) {
      // Pick the right price for the user's unit
      if (asset.unit === 'gram') {
        currentPrice = assetPrices.gram;
      } else if (asset.unit === 'ounce') {
        currentPrice = assetPrices.ounce;
      } else {
        // BTC or other — use unit price directly
        currentPrice = assetPrices.unit;
      }
    }

    const value = asset.quantity * currentPrice;
    totalValue += value;

    switch (asset.asset_type) {
      case 'gold':
        breakdown.gold += value;
        break;
      case 'silver':
        breakdown.silver += value;
        break;
      case 'crypto':
        breakdown.crypto += value;
        break;
      case 'stock':
        breakdown.stock += value;
        break;
    }

    const gainLoss = asset.avg_buy_price != null
      ? value - (asset.quantity * asset.avg_buy_price)
      : null;

    return {
      ...asset,
      current_price: currentPrice,
      total_value: value,
      gain_loss: gainLoss,
    };
  });

  return {
    total_value: totalValue,
    breakdown,
    assets: enriched,
  };
}
