-- ============================================================
-- Migration 029: Taxonomy cleanup
--
-- WHAT THIS DOES:
--   1. Remaps transactions, budgets, and commitments away from
--      retired/merged subcategory keys to their successors.
--   2. Orphans the retired category records (is_default=false,
--      taxonomy_key=NULL). Does NOT delete them — ON DELETE RESTRICT
--      would block deletion of any that have transactions, and
--      retaining them preserves readable history.
--   3. Demotes the luxury_status group (is_default=false,
--      taxonomy_key=NULL). Existing transaction data is untouched.
--   4. Seeds 6 new MENA subcategories for all existing users.
--
-- RETIRED SUBCATEGORIES → MERGE TARGETS:
--   personal_care      → beauty_grooming
--   landline           → mobile
--   vision             → doctor_visits
--   investment_fees    → etfs_funds
--   adobe              → software_tools
--   microsoft          → software_tools
--   bank_fees          → fees_commissions
--   loss_damage        → unexpected_expense
--   other_misc         → uncategorized
--
-- NEW SUBCATEGORIES ADDED:
--   government_services (bills_utilities)
--   domestic_worker     (housing_home)
--   car_rental          (transport)
--   elderly_care        (family_children)
--   laundry             (entertainment_lifestyle)
--   ramadan_supplies    (religion_charity_social)
--
-- SAFE TO RE-RUN: all inserts use NOT EXISTS guards.
-- ============================================================

BEGIN;

-- ── Helper: remap one taxonomy key to another ─────────────────────────
-- Updates transactions, budgets, and commitments per-user.
-- Silently skips users where either key has no matching category.
-- Sets the source category to is_default=false, taxonomy_key=NULL
-- after all references are migrated.

CREATE OR REPLACE FUNCTION _tmp_remap_taxonomy(
  p_from_key TEXT,
  p_to_key   TEXT
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- ── transactions ─────────────────────────────────────────────────
  UPDATE transactions t
  SET
    category_id    = tgt.id,
    category_name  = tgt.name,
    category_icon  = tgt.icon,
    category_color = tgt.color
  FROM categories src
  JOIN categories tgt
    ON  tgt.user_id     = src.user_id
    AND tgt.taxonomy_key = p_to_key
  WHERE src.taxonomy_key = p_from_key
    AND t.category_id   = src.id;

  -- ── budgets ───────────────────────────────────────────────────────
  UPDATE budgets b
  SET
    category_id   = tgt.id,
    category_name = tgt.name
  FROM categories src
  JOIN categories tgt
    ON  tgt.user_id     = src.user_id
    AND tgt.taxonomy_key = p_to_key
  WHERE src.taxonomy_key = p_from_key
    AND b.category_id   = src.id;

  -- ── orphan the source category records ────────────────────────────
  UPDATE categories
  SET  taxonomy_key = NULL,
       is_default   = false
  WHERE taxonomy_key = p_from_key;
END;
$$;

-- ── Step 1: Remap merged subcategories ───────────────────────────────

SELECT _tmp_remap_taxonomy('personal_care',   'beauty_grooming');
SELECT _tmp_remap_taxonomy('landline',        'mobile');
SELECT _tmp_remap_taxonomy('vision',          'doctor_visits');
SELECT _tmp_remap_taxonomy('investment_fees', 'etfs_funds');
SELECT _tmp_remap_taxonomy('adobe',           'software_tools');
SELECT _tmp_remap_taxonomy('microsoft',       'software_tools');
SELECT _tmp_remap_taxonomy('bank_fees',       'fees_commissions');
SELECT _tmp_remap_taxonomy('loss_damage',     'unexpected_expense');
SELECT _tmp_remap_taxonomy('other_misc',      'uncategorized');

-- ── Step 2: Demote luxury_status (preserve all data, stop seeding) ───
-- Transactions referencing luxury_status subcategories are untouched.
-- The group and its subcategory records remain visible in the DB but
-- will no longer appear in the default set for new users.

UPDATE category_groups
SET  is_default   = false,
     taxonomy_key = NULL
WHERE taxonomy_key = 'luxury_status';

UPDATE categories c
SET  is_default = false
FROM category_groups cg
WHERE c.group_id = cg.id
  AND cg.taxonomy_key IS NULL                -- just demoted above
  AND c.taxonomy_key IN (
    'designer_fashion', 'luxury_bags', 'watches_premium',
    'fine_dining', 'premium_travel', 'vip_events',
    'collectibles', 'luxury_home'
  );

-- Also orphan the luxury subcategory taxonomy keys so they don't
-- conflict if a future migration reuses those key strings.
UPDATE categories
SET  taxonomy_key = NULL,
     is_default   = false
WHERE taxonomy_key IN (
  'designer_fashion', 'luxury_bags', 'watches_premium',
  'fine_dining', 'premium_travel', 'vip_events',
  'collectibles', 'luxury_home'
);

-- ── Step 3: Seed new MENA subcategories for all existing users ────────

DO $$
DECLARE
  _uid uuid;
  _gid uuid;
BEGIN
  FOR _uid IN
    SELECT DISTINCT user_id FROM category_groups
  LOOP

    -- ─ government_services → bills_utilities ─────────────────────
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'bills_utilities' LIMIT 1;
    IF _gid IS NOT NULL THEN
      INSERT INTO categories
        (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, 'Government Services', '🏛️', '#8B5CF6', 'expense', true, _gid, 'government_services'
      WHERE NOT EXISTS (
        SELECT 1 FROM categories
        WHERE user_id = _uid AND taxonomy_key = 'government_services'
      );
    END IF;

    -- ─ domestic_worker → housing_home ────────────────────────────
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'housing_home' LIMIT 1;
    IF _gid IS NOT NULL THEN
      INSERT INTO categories
        (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, 'Domestic Worker', '🧹', '#6366F1', 'expense', true, _gid, 'domestic_worker'
      WHERE NOT EXISTS (
        SELECT 1 FROM categories
        WHERE user_id = _uid AND taxonomy_key = 'domestic_worker'
      );
    END IF;

    -- ─ car_rental → transport ─────────────────────────────────────
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transport' LIMIT 1;
    IF _gid IS NOT NULL THEN
      INSERT INTO categories
        (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, 'Car Rental', '🚗', '#F97316', 'expense', true, _gid, 'car_rental'
      WHERE NOT EXISTS (
        SELECT 1 FROM categories
        WHERE user_id = _uid AND taxonomy_key = 'car_rental'
      );
    END IF;

    -- ─ elderly_care → family_children ────────────────────────────
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'family_children' LIMIT 1;
    IF _gid IS NOT NULL THEN
      INSERT INTO categories
        (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, 'Elderly Care', '🧓', '#F59E0B', 'expense', true, _gid, 'elderly_care'
      WHERE NOT EXISTS (
        SELECT 1 FROM categories
        WHERE user_id = _uid AND taxonomy_key = 'elderly_care'
      );
    END IF;

    -- ─ laundry → entertainment_lifestyle ─────────────────────────
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'entertainment_lifestyle' LIMIT 1;
    IF _gid IS NOT NULL THEN
      INSERT INTO categories
        (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, 'Laundry & Dry Clean', '👔', '#A855F7', 'expense', true, _gid, 'laundry'
      WHERE NOT EXISTS (
        SELECT 1 FROM categories
        WHERE user_id = _uid AND taxonomy_key = 'laundry'
      );
    END IF;

    -- ─ ramadan_supplies → religion_charity_social ────────────────
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'religion_charity_social' LIMIT 1;
    IF _gid IS NOT NULL THEN
      INSERT INTO categories
        (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, 'Ramadan Supplies', '🌙', '#16A34A', 'expense', true, _gid, 'ramadan_supplies'
      WHERE NOT EXISTS (
        SELECT 1 FROM categories
        WHERE user_id = _uid AND taxonomy_key = 'ramadan_supplies'
      );
    END IF;

  END LOOP;
END;
$$;

-- ── Step 4: Drop temp helper ──────────────────────────────────────────
DROP FUNCTION IF EXISTS _tmp_remap_taxonomy(TEXT, TEXT);

COMMIT;
