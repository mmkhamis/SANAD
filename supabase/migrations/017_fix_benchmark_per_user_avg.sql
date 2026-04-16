-- ============================================================
-- Migration 017: Fix benchmark to average PER-USER totals
--
-- Previous version computed AVG(t.amount) across all individual
-- transaction rows. This means a user with 10 small grocery
-- purchases gets 10x the weight of a user with 1 large purchase.
--
-- Fix: first SUM each user's spending per category, then compute
-- AVG and MEDIAN across those per-user totals.
-- ============================================================

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

  -- Step 1: Compute per-user total spending per category
  -- Step 2: Aggregate across users (AVG / MEDIAN of user totals)
  INSERT INTO spending_benchmarks
    (month, age_band, country_code, region_name, category_name,
     average_spend, median_spend, sample_size)
  SELECT
    target_month,
    ut.age_band,
    ut.country_code,
    ut.region_name,
    ut.category_name,
    ROUND(AVG(ut.user_total)::numeric, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ut.user_total)::numeric, 2),
    COUNT(*)
  FROM (
    -- Per-user total for each category
    SELECT
      t.user_id,
      p.age_band,
      p.country_code,
      p.region_name,
      t.category_name,
      SUM(t.amount) AS user_total
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
    GROUP BY t.user_id, p.age_band, p.country_code, p.region_name, t.category_name
  ) ut
  GROUP BY ut.age_band, ut.country_code, ut.region_name, ut.category_name
  HAVING COUNT(*) >= 3;
END;
$$;
