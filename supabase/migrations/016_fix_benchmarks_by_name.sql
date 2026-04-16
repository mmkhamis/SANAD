-- ============================================================
-- Migration 016: Fix benchmarks to aggregate by category_name
--
-- The original design grouped by category_id, but each user has
-- their own category UUIDs. That means GROUP BY category_id
-- always yields sample_size = 1, so no benchmarks are ever
-- produced.  Fix: aggregate by category_name instead, which is
-- the shared label stored on every transaction.
-- ============================================================

-- 1. Drop old FK + unique constraint (they reference category_id)
ALTER TABLE spending_benchmarks
  DROP CONSTRAINT IF EXISTS spending_benchmarks_category_id_fkey;

ALTER TABLE spending_benchmarks
  DROP CONSTRAINT IF EXISTS spending_benchmarks_month_age_band_country_code_region_nam_key;

-- 2. Add category_name column, migrate data, drop category_id
ALTER TABLE spending_benchmarks
  ADD COLUMN IF NOT EXISTS category_name text;

-- Backfill from categories table (best effort — table likely empty)
UPDATE spending_benchmarks sb
SET category_name = c.name
FROM categories c
WHERE sb.category_id = c.id
  AND sb.category_name IS NULL;

ALTER TABLE spending_benchmarks
  DROP COLUMN IF EXISTS category_id;

ALTER TABLE spending_benchmarks
  ALTER COLUMN category_name SET NOT NULL;

-- 3. New unique constraint
ALTER TABLE spending_benchmarks
  ADD CONSTRAINT uq_benchmarks_cohort_category
  UNIQUE (month, age_band, country_code, region_name, category_name);

-- 4. Recreate refresh function — now groups by category_name
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

  -- Aggregate by category_name so transactions from different
  -- users (each with their own category UUIDs) are grouped.
  INSERT INTO spending_benchmarks
    (month, age_band, country_code, region_name, category_name,
     average_spend, median_spend, sample_size)
  SELECT
    target_month,
    p.age_band,
    p.country_code,
    p.region_name,
    t.category_name,
    ROUND(AVG(t.amount)::numeric, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.amount)::numeric, 2),
    COUNT(DISTINCT t.user_id)
  FROM transactions t
  JOIN profiles p ON p.id = t.user_id
  WHERE
    t.type = 'expense'
    AND t.deleted_at IS NULL
    AND t.date >= _start
    AND t.date <= _end
    AND t.category_name IS NOT NULL
    AND p.age_band IS NOT NULL
    AND p.country_code IS NOT NULL
    AND p.region_name IS NOT NULL
  GROUP BY p.age_band, p.country_code, p.region_name, t.category_name
  HAVING COUNT(DISTINCT t.user_id) >= 3;
  -- Lowered from 5 → 3 for early-stage usage; raise later
END;
$$;

-- 5. Re-index
DROP INDEX IF EXISTS idx_benchmarks_lookup;
CREATE INDEX idx_benchmarks_lookup
  ON spending_benchmarks (month, age_band, country_code, region_name);
