-- 037_subscription_plan_catalog.sql
-- Public catalog of subscription provider plans, region- and plan-type-aware.
-- Powers Plan Savings insights in Analytics. Read-only for clients; writes go
-- through service role (weekly ingestion job, manual seeding, etc.).
--
-- Key design choices:
--   * One row per (provider, region, plan_type, billing_cycle, variant).
--   * Prices stored in their native currency (no FX at write time).
--   * `source` lets us distinguish manual seeds from automated ingestion.
--   * `effective_at` + `superseded_at` keep history so we can recompute
--     savings even when the catalog refreshes.

CREATE TABLE IF NOT EXISTS public.subscription_plan_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_key    text NOT NULL,             -- canonical lower-snake key e.g. 'netflix'
  provider_name   text NOT NULL,             -- display name e.g. 'Netflix'
  category        text NOT NULL DEFAULT 'Streaming',

  region          text NOT NULL              -- ISO-3166 alpha-2 (SA, EG, AE, …)
                    CHECK (char_length(region) = 2),
  currency        text NOT NULL              -- ISO-4217 (SAR, EGP, USD, …)
                    CHECK (char_length(currency) = 3),

  plan_type       text NOT NULL DEFAULT 'individual'
                    CHECK (plan_type IN ('individual','family','student','bundle','duo','basic','standard','premium')),
  billing_cycle   text NOT NULL DEFAULT 'monthly'
                    CHECK (billing_cycle IN ('monthly','quarterly','yearly')),
  variant         text,                      -- free-form modifier e.g. '4 screens'

  price           numeric(12,2) NOT NULL CHECK (price >= 0),

  source          text NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','ingest','user_report')),
  effective_at    timestamptz NOT NULL DEFAULT now(),
  superseded_at   timestamptz,
  is_active       boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plan_catalog_unique_active
  ON public.subscription_plan_catalog (provider_key, region, plan_type, billing_cycle, COALESCE(variant, ''))
  WHERE is_active;

CREATE INDEX IF NOT EXISTS subscription_plan_catalog_by_provider_region
  ON public.subscription_plan_catalog (provider_key, region) WHERE is_active;

ALTER TABLE public.subscription_plan_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plan_catalog_read_all" ON public.subscription_plan_catalog;
CREATE POLICY "subscription_plan_catalog_read_all"
  ON public.subscription_plan_catalog
  FOR SELECT
  USING (is_active = true);

-- ─── Seed data ──────────────────────────────────────────────────────────
-- Reference prices captured 2026-04 from each provider's regional storefront.
-- The weekly ingestion job will UPDATE these rows (mark old row superseded,
-- INSERT new row) — never mutate prices in-place.

INSERT INTO public.subscription_plan_catalog
  (provider_key, provider_name, category, region, currency, plan_type, billing_cycle, variant, price, source)
VALUES
  -- Netflix Saudi Arabia
  ('netflix','Netflix','Streaming','SA','SAR','basic','monthly',NULL,29.00,'manual'),
  ('netflix','Netflix','Streaming','SA','SAR','standard','monthly',NULL,49.00,'manual'),
  ('netflix','Netflix','Streaming','SA','SAR','premium','monthly',NULL,69.00,'manual'),
  ('netflix','Netflix','Streaming','SA','SAR','premium','yearly',NULL,690.00,'manual'),
  -- Netflix Egypt
  ('netflix','Netflix','Streaming','EG','EGP','basic','monthly',NULL,100.00,'manual'),
  ('netflix','Netflix','Streaming','EG','EGP','standard','monthly',NULL,165.00,'manual'),
  ('netflix','Netflix','Streaming','EG','EGP','premium','monthly',NULL,225.00,'manual'),

  -- Spotify Saudi Arabia
  ('spotify','Spotify','Music','SA','SAR','individual','monthly',NULL,21.99,'manual'),
  ('spotify','Spotify','Music','SA','SAR','duo','monthly',NULL,27.99,'manual'),
  ('spotify','Spotify','Music','SA','SAR','family','monthly',NULL,32.99,'manual'),
  ('spotify','Spotify','Music','SA','SAR','student','monthly',NULL,10.99,'manual'),
  ('spotify','Spotify','Music','SA','SAR','individual','yearly',NULL,219.00,'manual'),
  -- Spotify Egypt
  ('spotify','Spotify','Music','EG','EGP','individual','monthly',NULL,89.99,'manual'),
  ('spotify','Spotify','Music','EG','EGP','family','monthly',NULL,149.99,'manual'),
  ('spotify','Spotify','Music','EG','EGP','student','monthly',NULL,49.99,'manual'),

  -- YouTube Premium Saudi Arabia
  ('youtube_premium','YouTube Premium','Streaming','SA','SAR','individual','monthly',NULL,23.99,'manual'),
  ('youtube_premium','YouTube Premium','Streaming','SA','SAR','family','monthly',NULL,42.99,'manual'),
  ('youtube_premium','YouTube Premium','Streaming','SA','SAR','student','monthly',NULL,12.99,'manual'),
  -- YouTube Premium Egypt
  ('youtube_premium','YouTube Premium','Streaming','EG','EGP','individual','monthly',NULL,79.99,'manual'),
  ('youtube_premium','YouTube Premium','Streaming','EG','EGP','family','monthly',NULL,129.99,'manual'),

  -- Shahid VIP Saudi Arabia
  ('shahid_vip','Shahid VIP','Streaming','SA','SAR','individual','monthly',NULL,29.00,'manual'),
  ('shahid_vip','Shahid VIP','Streaming','SA','SAR','individual','yearly',NULL,290.00,'manual'),

  -- Disney+ Saudi Arabia
  ('disney_plus','Disney+','Streaming','SA','SAR','individual','monthly',NULL,29.99,'manual'),
  ('disney_plus','Disney+','Streaming','SA','SAR','individual','yearly',NULL,299.99,'manual'),

  -- Apple Music
  ('apple_music','Apple Music','Music','SA','SAR','individual','monthly',NULL,19.99,'manual'),
  ('apple_music','Apple Music','Music','SA','SAR','family','monthly',NULL,29.99,'manual'),
  ('apple_music','Apple Music','Music','SA','SAR','student','monthly',NULL,9.99,'manual'),

  -- Anghami
  ('anghami','Anghami','Music','SA','SAR','individual','monthly',NULL,19.99,'manual'),
  ('anghami','Anghami','Music','SA','SAR','family','monthly',NULL,29.99,'manual'),
  ('anghami','Anghami','Music','EG','EGP','individual','monthly',NULL,49.99,'manual')
ON CONFLICT DO NOTHING;
