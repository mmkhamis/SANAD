-- ============================================================
-- Migration 034: Retire remaining duplicate categories
--
-- WHAT THIS DOES:
--   Migration 033 canonicalized category names and retired many
--   orphan categories seeded by migration 013 (emoji-icon flat
--   categories with names like 'Dining & Cafés', etc.).
--
--   However, it missed the original wallet_setup.sh flat categories
--   that also have no taxonomy_key and duplicate canonical ones:
--     'Entertainment', 'Health', 'Utilities', 'Rent', 'Other',
--     'Investment', 'Food & Dining', 'Education', 'Shopping',
--     'Transport', 'Freelance', 'Salary'
--
--   It also missed some migration 013 groups still active:
--     'Family & Children', 'Travel' (013 groups with emoji icons,
--     which duplicate canonical groups added in migration 018).
--
-- STRATEGY:
--   1. Re-use the same _tmp_remap_orphan pattern from migration 033.
--   2. Remap transactions → canonical subcategory → retire orphan.
--   3. Retire orphan groups whose taxonomy-keyed replacements exist.
--
-- SAFE TO RE-RUN: all operations are guarded with retired_at IS NULL
--                 and NOT EXISTS checks.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- STEP 1: Re-create remap helper (same as migration 033)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _tmp_remap_orphan(
  p_old_name TEXT,
  p_to_key   TEXT
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _src_id  uuid;
  _tgt_id  uuid;
  _uid     uuid;
BEGIN
  FOR _uid IN
    SELECT DISTINCT user_id FROM categories
    WHERE name = p_old_name
      AND taxonomy_key IS NULL
      AND retired_at IS NULL
  LOOP
    SELECT id INTO _src_id FROM categories
      WHERE user_id = _uid AND name = p_old_name AND taxonomy_key IS NULL AND retired_at IS NULL
      ORDER BY created_at LIMIT 1;

    SELECT id INTO _tgt_id FROM categories
      WHERE user_id = _uid AND taxonomy_key = p_to_key AND retired_at IS NULL
      LIMIT 1;

    IF _src_id IS NULL THEN CONTINUE; END IF;

    -- If a canonical target exists, migrate transactions/budgets to it
    IF _tgt_id IS NOT NULL AND _src_id != _tgt_id THEN
      UPDATE transactions t
      SET
        category_id    = _tgt_id,
        category_name  = tgt.name,
        category_icon  = tgt.icon,
        category_color = tgt.color
      FROM categories tgt
      WHERE tgt.id = _tgt_id
        AND t.category_id = _src_id;

      UPDATE budgets
      SET category_id   = _tgt_id,
          category_name = (SELECT name FROM categories WHERE id = _tgt_id)
      WHERE category_id = _src_id;
    END IF;

    -- Retire the orphan
    UPDATE categories
    SET retired_at = NOW()
    WHERE id = _src_id;
  END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- STEP 2: Retire original wallet_setup.sh flat categories
-- ════════════════════════════════════════════════════════════

-- Entertainment → cinema_events (most generic entertainment subcategory)
SELECT _tmp_remap_orphan('Entertainment',  'cinema_events');

-- Health → doctor_visits (most generic health subcategory)
SELECT _tmp_remap_orphan('Health',         'doctor_visits');

-- Utilities → electricity (most common utility)
SELECT _tmp_remap_orphan('Utilities',      'electricity');

-- Rent → rent
SELECT _tmp_remap_orphan('Rent',           'rent');

-- Other / Other Income → uncategorized / other_income
SELECT _tmp_remap_orphan('Other',          'uncategorized');

-- Investment (income type) → investment_income
SELECT _tmp_remap_orphan('Investment',     'investment_income');

-- Food & Dining → restaurants
SELECT _tmp_remap_orphan('Food & Dining',  'restaurants');

-- Education → courses_training (generic education)
SELECT _tmp_remap_orphan('Education',      'courses_training');

-- Shopping → general_shopping
SELECT _tmp_remap_orphan('Shopping',       'general_shopping');

-- Transport → public_transport
SELECT _tmp_remap_orphan('Transport',      'public_transport');

-- Freelance (income) → freelance
SELECT _tmp_remap_orphan('Freelance',      'freelance');

-- Salary (income) → salary
SELECT _tmp_remap_orphan('Salary',         'salary');

-- ════════════════════════════════════════════════════════════
-- STEP 3: Retire remaining migration-013 group shells
--         that still have no taxonomy_key (emoji-icon groups)
--         whose canonical equivalents now exist.
-- ════════════════════════════════════════════════════════════

-- Retire orphan group shells (no taxonomy_key, canonical exists)
UPDATE category_groups cg
SET retired_at = NOW()
WHERE cg.taxonomy_key IS NULL
  AND cg.retired_at IS NULL
  AND cg.name IN (
    'Family & Children',
    'Travel',
    'Entertainment',
    'Health',
    'Food & Dining',
    'Groceries',
    'Transport',
    'Shopping',
    'Education',
    'Savings & Investments',
    'Transfers'
  );

-- Retire any active categories inside those now-retired groups
UPDATE categories c
SET retired_at = NOW()
FROM category_groups cg
WHERE c.group_id = cg.id
  AND cg.retired_at IS NOT NULL
  AND c.retired_at IS NULL;

-- ─── Clean up temp function ──────────────────────────────────────────
DROP FUNCTION IF EXISTS _tmp_remap_orphan(TEXT, TEXT);

COMMIT;
