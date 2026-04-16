-- ============================================================
-- Migration 014: Age-and-region benchmark analytics
--
-- 1. Adds optional demographic fields to profiles (date_of_birth,
--    age_band, country_code, region_name) for voluntary opt-in.
-- 2. Creates spending_benchmarks table that stores pre-computed
--    anonymized aggregate spending benchmarks per age_band ×
--    country_code × region_name × category × month.
-- 3. Creates a Postgres function to refresh benchmarks from
--    anonymized internal Wallet user spending data.
--
-- PRIVACY: No individual user data is exposed. Benchmarks are
-- aggregated only when sample_size >= 5 to prevent de-anonymization.
-- ============================================================

-- ── 1. Profile demographic fields (all optional) ────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS age_band text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS region_name text;

-- ── 2. Spending benchmarks table ─────────────────────────────────────
-- Stores pre-computed anonymized aggregate data from Wallet users.

CREATE TABLE IF NOT EXISTS spending_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text NOT NULL,             -- YYYY-MM
  age_band text NOT NULL,          -- '18-24','25-34','35-44','45-54','55+'
  country_code text NOT NULL,      -- ISO 3166-1 alpha-2 (e.g. 'EG','SA','AE')
  region_name text NOT NULL,       -- City/governorate (e.g. 'Cairo','Riyadh')
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  average_spend numeric NOT NULL DEFAULT 0,
  median_spend numeric NOT NULL DEFAULT 0,
  sample_size int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (month, age_band, country_code, region_name, category_id)
);

-- RLS: users can only read benchmarks, never write directly
ALTER TABLE spending_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read benchmarks"
  ON spending_benchmarks FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policies — only server-side refresh.

-- ── 3. Function to refresh benchmarks from anonymized user data ──────
-- This function aggregates spending across users who have opted in
-- (have age_band + country_code + region_name set). Benchmarks are
-- only computed when the anonymized cohort has >= 5 users to prevent
-- any single user's data from being identifiable.

CREATE OR REPLACE FUNCTION refresh_spending_benchmarks(target_month text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _start date;
  _end   date;
BEGIN
  _start := (target_month || '-01')::date;
  _end   := (_start + INTERVAL '1 month' - INTERVAL '1 day')::date;

  -- Delete existing benchmarks for this month (full refresh)
  DELETE FROM spending_benchmarks WHERE month = target_month;

  -- Aggregate anonymized spending data from opted-in users
  INSERT INTO spending_benchmarks (month, age_band, country_code, region_name, category_id, average_spend, median_spend, sample_size)
  SELECT
    target_month,
    p.age_band,
    p.country_code,
    p.region_name,
    t.category_id,
    ROUND(AVG(t.amount)::numeric, 2) AS average_spend,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.amount)::numeric, 2) AS median_spend,
    COUNT(DISTINCT t.user_id) AS sample_size
  FROM transactions t
  JOIN profiles p ON p.id = t.user_id
  WHERE
    t.type = 'expense'
    AND t.deleted_at IS NULL
    AND t.date >= _start::text
    AND t.date <= _end::text
    AND t.category_id IS NOT NULL
    AND p.age_band IS NOT NULL
    AND p.country_code IS NOT NULL
    AND p.region_name IS NOT NULL
  GROUP BY p.age_band, p.country_code, p.region_name, t.category_id
  HAVING COUNT(DISTINCT t.user_id) >= 5;  -- privacy threshold
END;
$$;

-- ── 4. Index for fast benchmark lookups ──────────────────────────────

CREATE INDEX IF NOT EXISTS idx_benchmarks_lookup
  ON spending_benchmarks (month, age_band, country_code, region_name);

CREATE INDEX IF NOT EXISTS idx_profiles_demographics
  ON profiles (age_band, country_code, region_name)
  WHERE age_band IS NOT NULL AND country_code IS NOT NULL AND region_name IS NOT NULL;
