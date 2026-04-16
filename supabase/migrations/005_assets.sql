-- ─── User Assets ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_code text NOT NULL,
  display_name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  avg_buy_price numeric NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  include_in_summary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT asset_type_check CHECK (asset_type IN ('gold', 'silver', 'crypto'))
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_assets_user_id ON public.user_assets(user_id);

-- RLS
ALTER TABLE public.user_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own assets"
  ON public.user_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assets"
  ON public.user_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON public.user_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON public.user_assets FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Asset Price Cache ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.asset_price_cache (
  asset_code text PRIMARY KEY,
  price numeric NOT NULL,
  currency_code text NOT NULL,
  last_updated_at timestamptz NOT NULL,
  source text
);

-- Allow all authenticated users to read prices (public cache)
ALTER TABLE public.asset_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read asset prices"
  ON public.asset_price_cache FOR SELECT
  TO authenticated
  USING (true);

-- Service role can upsert prices (used by edge function)
CREATE POLICY "Service role can manage asset prices"
  ON public.asset_price_cache FOR ALL
  TO service_role
  USING (true);
