// Supabase Edge Function: get-asset-prices
// Fetches live prices for BTC, Gold, and Silver, caches them in asset_price_cache.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth } from '../_shared/auth.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceResult {
  asset_code: string;
  price: number;
  currency_code: string;
  source: string;
}

async function fetchBtcPrice(): Promise<PriceResult> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  );
  if (!res.ok) throw new Error('CoinGecko API failed');
  const data = await res.json();
  return {
    asset_code: 'BTC',
    price: data.bitcoin.usd,
    currency_code: 'USD',
    source: 'coingecko',
  };
}

async function fetchMetalPrices(): Promise<PriceResult[]> {
  // Use metals.dev free API (no key required for basic tier)
  const res = await fetch('https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=gram');

  if (!res.ok) {
    // Fallback: return approximate prices if API fails
    return [
      { asset_code: 'XAU', price: 75, currency_code: 'USD', source: 'fallback' },
      { asset_code: 'XAG', price: 0.95, currency_code: 'USD', source: 'fallback' },
    ];
  }

  const data = await res.json();
  const results: PriceResult[] = [];

  if (data.metals?.gold) {
    results.push({
      asset_code: 'XAU',
      price: data.metals.gold,
      currency_code: 'USD',
      source: 'metals.dev',
    });
  }

  if (data.metals?.silver) {
    results.push({
      asset_code: 'XAG',
      price: data.metals.silver,
      currency_code: 'USD',
      source: 'metals.dev',
    });
  }

  return results;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  // Verify JWT
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  try {
    // Fetch all prices in parallel
    const [btc, metals] = await Promise.allSettled([
      fetchBtcPrice(),
      fetchMetalPrices(),
    ]);

    const prices: PriceResult[] = [];
    if (btc.status === 'fulfilled') prices.push(btc.value);
    if (metals.status === 'fulfilled') prices.push(...metals.value);

    if (prices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch any prices' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Update cache in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();
    const upsertRows = prices.map((p) => ({
      asset_code: p.asset_code,
      price: p.price,
      currency_code: p.currency_code,
      last_updated_at: now,
      source: p.source,
    }));

    await supabase
      .from('asset_price_cache')
      .upsert(upsertRows, { onConflict: 'asset_code' });

    return new Response(
      JSON.stringify({ prices, updated_at: now }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
