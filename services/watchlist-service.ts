import { supabase } from '../lib/supabase';
import type { WatchlistStock, StockQuote } from '../types/index';

// ─── Default popular stocks (shown when watchlist is empty) ──────────

export const DEFAULT_POPULAR_STOCKS: Array<{ symbol: string; company_name: string }> = [
  { symbol: 'AAPL', company_name: 'Apple Inc.' },
  { symbol: 'MSFT', company_name: 'Microsoft Corp.' },
  { symbol: 'GOOGL', company_name: 'Alphabet Inc.' },
  { symbol: 'AMZN', company_name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', company_name: 'NVIDIA Corp.' },
];

// ─── Popular stocks catalog (user can search and add) ────────────────

export interface StockCatalogEntry {
  symbol: string;
  company_name: string;
  sector: string;
}

export const STOCK_CATALOG: StockCatalogEntry[] = [
  { symbol: 'AAPL', company_name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', company_name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'GOOGL', company_name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMZN', company_name: 'Amazon.com Inc.', sector: 'Consumer' },
  { symbol: 'NVDA', company_name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'META', company_name: 'Meta Platforms Inc.', sector: 'Technology' },
  { symbol: 'TSLA', company_name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'BRK.B', company_name: 'Berkshire Hathaway', sector: 'Finance' },
  { symbol: 'JPM', company_name: 'JPMorgan Chase & Co.', sector: 'Finance' },
  { symbol: 'V', company_name: 'Visa Inc.', sector: 'Finance' },
  { symbol: 'JNJ', company_name: 'Johnson & Johnson', sector: 'Healthcare' },
  { symbol: 'WMT', company_name: 'Walmart Inc.', sector: 'Retail' },
  { symbol: 'MA', company_name: 'Mastercard Inc.', sector: 'Finance' },
  { symbol: 'PG', company_name: 'Procter & Gamble', sector: 'Consumer' },
  { symbol: 'DIS', company_name: 'Walt Disney Co.', sector: 'Entertainment' },
  { symbol: 'NFLX', company_name: 'Netflix Inc.', sector: 'Entertainment' },
  { symbol: 'AMD', company_name: 'Advanced Micro Devices', sector: 'Technology' },
  { symbol: 'INTC', company_name: 'Intel Corp.', sector: 'Technology' },
  { symbol: 'CRM', company_name: 'Salesforce Inc.', sector: 'Technology' },
  { symbol: 'BA', company_name: 'Boeing Co.', sector: 'Aerospace' },
  { symbol: 'KO', company_name: 'Coca-Cola Co.', sector: 'Consumer' },
  { symbol: 'PEP', company_name: 'PepsiCo Inc.', sector: 'Consumer' },
  { symbol: 'ADBE', company_name: 'Adobe Inc.', sector: 'Technology' },
  { symbol: 'PYPL', company_name: 'PayPal Holdings', sector: 'Finance' },
  { symbol: 'UBER', company_name: 'Uber Technologies', sector: 'Technology' },
  { symbol: 'SQ', company_name: 'Block Inc.', sector: 'Finance' },
  { symbol: 'SPOT', company_name: 'Spotify Technology', sector: 'Entertainment' },
  { symbol: 'SNAP', company_name: 'Snap Inc.', sector: 'Technology' },
  { symbol: 'COIN', company_name: 'Coinbase Global', sector: 'Finance' },
  { symbol: 'PLTR', company_name: 'Palantir Technologies', sector: 'Technology' },
];

// ─── Fetch user watchlist ────────────────────────────────────────────

export async function getWatchlist(): Promise<WatchlistStock[]> {
  const { data, error } = await supabase
    .from('stock_watchlist')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    if (error.message.includes('schema cache') || error.code === '42P01') {
      return [];
    }
    throw new Error(error.message);
  }
  return (data as WatchlistStock[]) ?? [];
}

// ─── Add stock to watchlist ──────────────────────────────────────────

export async function addToWatchlist(
  symbol: string,
  company_name: string,
): Promise<WatchlistStock> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('No authenticated session');

  const { data, error } = await supabase
    .from('stock_watchlist')
    .insert({
      user_id: session.user.id,
      symbol,
      company_name,
      sort_order: Date.now(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as WatchlistStock;
}

// ─── Remove stock from watchlist ─────────────────────────────────────

export async function removeFromWatchlist(id: string): Promise<void> {
  const { error } = await supabase
    .from('stock_watchlist')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Fetch live stock quotes ─────────────────────────────────────────

const QUOTE_CACHE = new Map<string, { quote: StockQuote; fetchedAt: number }>();
const QUOTE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

async function fetchStooqQuote(symbol: string): Promise<{ close: number; prevClose: number } | null> {
  try {
    const cleanSymbol = symbol.replace('.', '-');
    const res = await fetch(
      `https://stooq.com/q/l/?s=${cleanSymbol.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`,
      { headers: { Accept: 'text/csv' } },
    );
    if (!res.ok) return null;
    const csv = await res.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return null;
    const values = lines[1].split(',');
    if (values.length < 7) return null;
    const open = parseFloat(values[3].replace(/"/g, '').trim());
    const close = parseFloat(values[6].replace(/"/g, '').trim());
    if (!Number.isFinite(close) || close <= 0) return null;
    const prevClose = Number.isFinite(open) && open > 0 ? open : close;
    return { close, prevClose };
  } catch {
    return null;
  }
}

export async function fetchStockQuotes(
  stocks: Array<{ symbol: string; company_name: string }>,
): Promise<StockQuote[]> {
  const results: StockQuote[] = [];
  const toFetch: Array<{ symbol: string; company_name: string }> = [];

  // Check cache first
  for (const stock of stocks) {
    const cached = QUOTE_CACHE.get(stock.symbol);
    if (cached && Date.now() - cached.fetchedAt < QUOTE_CACHE_TTL) {
      results.push(cached.quote);
    } else {
      toFetch.push(stock);
    }
  }

  // Fetch uncached in parallel
  if (toFetch.length > 0) {
    const fetched = await Promise.all(
      toFetch.map(async (stock) => {
        const quote = await fetchStooqQuote(stock.symbol);
        if (!quote) return null;

        const change = quote.close - quote.prevClose;
        const changePct = quote.prevClose > 0 ? (change / quote.prevClose) * 100 : 0;

        const result: StockQuote = {
          symbol: stock.symbol,
          company_name: stock.company_name,
          price: quote.close,
          change,
          change_percent: changePct,
          currency: 'USD',
        };

        QUOTE_CACHE.set(stock.symbol, { quote: result, fetchedAt: Date.now() });
        return result;
      }),
    );

    for (const q of fetched) {
      if (q) results.push(q);
    }
  }

  return results;
}

// ─── Commodity live prices (Gold, Silver, BTC, ETH) ──────────────────

export interface CommodityPrice {
  code: string;
  name: string;
  icon: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
}

const COMMODITY_CACHE: { data: CommodityPrice[] | null; fetchedAt: number } = {
  data: null,
  fetchedAt: 0,
};
const COMMODITY_CACHE_TTL = 3 * 60 * 1000; // 3 min

export async function fetchCommodityPrices(): Promise<CommodityPrice[]> {
  if (
    COMMODITY_CACHE.data &&
    Date.now() - COMMODITY_CACHE.fetchedAt < COMMODITY_CACHE_TTL
  ) {
    return COMMODITY_CACHE.data;
  }

  const commodities: CommodityPrice[] = [];

  // Fetch crypto (BTC, ETH) from CoinGecko with 24h change
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, Record<string, number>>;

      if (data.bitcoin) {
        const price = data.bitcoin.usd;
        const changePct = data.bitcoin.usd_24h_change ?? 0;
        commodities.push({
          code: 'BTC',
          name: 'Bitcoin',
          icon: '₿',
          price,
          change: price * (changePct / 100),
          change_percent: changePct,
          currency: 'USD',
        });
      }

      if (data.ethereum) {
        const price = data.ethereum.usd;
        const changePct = data.ethereum.usd_24h_change ?? 0;
        commodities.push({
          code: 'ETH',
          name: 'Ethereum',
          icon: 'Ξ',
          price,
          change: price * (changePct / 100),
          change_percent: changePct,
          currency: 'USD',
        });
      }
    }
  } catch {
    // fallback below
  }

  // Fetch gold from CoinGecko (PAX-Gold = 1oz gold)
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true',
      { headers: { Accept: 'application/json' } },
    );
    if (res.ok) {
      const data = (await res.json()) as Record<string, Record<string, number>>;
      if (data['pax-gold']) {
        const price = data['pax-gold'].usd;
        const changePct = data['pax-gold'].usd_24h_change ?? 0;
        commodities.push({
          code: 'XAU',
          name: 'Gold',
          icon: '🥇',
          price,
          change: price * (changePct / 100),
          change_percent: changePct,
          currency: 'USD',
        });
      }
    }
  } catch {
    // fallback
  }

  // Fetch silver from metals API
  try {
    const silverRes = await fetch(
      'https://api.metals.live/v1/spot/silver',
      { headers: { Accept: 'application/json' } },
    );
    if (silverRes.ok) {
      const silverData = (await silverRes.json()) as Array<{ price?: number }> | { price?: number };
      const price = Array.isArray(silverData) && silverData[0]?.price
        ? silverData[0].price
        : !Array.isArray(silverData) && typeof silverData?.price === 'number'
          ? silverData.price
          : null;

      if (price) {
        commodities.push({
          code: 'XAG',
          name: 'Silver',
          icon: '🥈',
          price,
          change: 0,
          change_percent: 0,
          currency: 'USD',
        });
      }
    }
  } catch {
    // fallback
  }

  // Fallbacks for anything missing
  const codes = new Set(commodities.map((c) => c.code));
  if (!codes.has('XAU')) {
    commodities.push({ code: 'XAU', name: 'Gold', icon: '🥇', price: 4650, change: 0, change_percent: 0, currency: 'USD' });
  }
  if (!codes.has('XAG')) {
    commodities.push({ code: 'XAG', name: 'Silver', icon: '🥈', price: 73.83, change: 0, change_percent: 0, currency: 'USD' });
  }
  if (!codes.has('BTC')) {
    commodities.push({ code: 'BTC', name: 'Bitcoin', icon: '₿', price: 69000, change: 0, change_percent: 0, currency: 'USD' });
  }
  if (!codes.has('ETH')) {
    commodities.push({ code: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 3500, change: 0, change_percent: 0, currency: 'USD' });
  }

  // Sort: Gold, Silver, BTC, ETH
  const order = ['XAU', 'XAG', 'BTC', 'ETH'];
  commodities.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));

  COMMODITY_CACHE.data = commodities;
  COMMODITY_CACHE.fetchedAt = Date.now();

  return commodities;
}

// ─── Search catalog ──────────────────────────────────────────────────

export function searchStockCatalog(query: string): StockCatalogEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return STOCK_CATALOG.slice(0, 10);

  return STOCK_CATALOG.filter(
    (s) =>
      s.symbol.toLowerCase().includes(q) ||
      s.company_name.toLowerCase().includes(q),
  ).slice(0, 15);
}
