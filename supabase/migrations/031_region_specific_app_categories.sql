-- Migration 031: Add region-specific app categories for existing users
-- Seeds popular local app subcategories (HungerStation, Jahez, Talabat, Careem, etc.)
-- based on each user's country_code in their profile.

-- Helper: seed a subcategory under an existing group (by taxonomy_key) for a user
CREATE OR REPLACE FUNCTION _seed_sub(
  _user_id  uuid,
  _group_tk text,   -- parent group taxonomy_key
  _name     text,
  _icon     text,
  _tk       text,   -- subcategory taxonomy_key
  _type     transaction_type DEFAULT 'expense'
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _gid uuid;
  _color text;
BEGIN
  -- Find the user's group by taxonomy_key
  SELECT id, color INTO _gid, _color
    FROM category_groups
   WHERE user_id = _user_id AND taxonomy_key = _group_tk
   LIMIT 1;

  IF _gid IS NULL THEN RETURN; END IF;

  -- Insert only if not already present
  INSERT INTO categories (id, user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
  VALUES (gen_random_uuid(), _user_id, _name, _icon, _color, _type, true, _gid, _tk)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── Saudi Arabia (KSA) users ──────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM profiles WHERE country_code = 'SA'
  LOOP
    -- Food delivery apps
    PERFORM _seed_sub(r.id, 'food_dining', 'HungerStation', '📲', 'hungerstation');
    PERFORM _seed_sub(r.id, 'food_dining', 'Jahez',         '🛵', 'jahez');
    PERFORM _seed_sub(r.id, 'food_dining', 'Marsool',       '📦', 'marsool');
    PERFORM _seed_sub(r.id, 'food_dining', 'Talabat',       '🛍️', 'talabat');
    -- Rideshare
    PERFORM _seed_sub(r.id, 'transport', 'Careem', '🚕', 'careem');
    -- Government apps
    PERFORM _seed_sub(r.id, 'bills_utilities', 'Absher / Gov Apps', '📱', 'absher');
    -- BNPL
    PERFORM _seed_sub(r.id, 'debt_obligations', 'Tabby',  '📲', 'tabby');
    PERFORM _seed_sub(r.id, 'debt_obligations', 'Tamara', '📲', 'tamara');
  END LOOP;
END;
$$;

-- ─── Gulf countries (AE, KW, QA, BH, OM) ──────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM profiles WHERE country_code IN ('AE', 'KW', 'QA', 'BH', 'OM')
  LOOP
    -- Food delivery apps
    PERFORM _seed_sub(r.id, 'food_dining', 'Talabat', '🛍️', 'talabat');
    -- Rideshare
    PERFORM _seed_sub(r.id, 'transport', 'Careem', '🚕', 'careem');
    -- BNPL
    PERFORM _seed_sub(r.id, 'debt_obligations', 'Tabby',  '📲', 'tabby');
    PERFORM _seed_sub(r.id, 'debt_obligations', 'Tamara', '📲', 'tamara');
  END LOOP;
END;
$$;

-- ─── Egypt (EG) users ──────────────────────────────────────────────

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM profiles WHERE country_code = 'EG'
  LOOP
    -- Food delivery apps
    PERFORM _seed_sub(r.id, 'food_dining', 'Talabat', '🛍️', 'talabat');
    PERFORM _seed_sub(r.id, 'food_dining', 'elmenus', '🍽️', 'elmenus');
    -- Rideshare
    PERFORM _seed_sub(r.id, 'transport', 'Careem', '🚕', 'careem');
    -- Government / payments
    PERFORM _seed_sub(r.id, 'bills_utilities', 'Fawry',         '🧾', 'fawry');
    PERFORM _seed_sub(r.id, 'bills_utilities', 'Digital Egypt',  '🏛️', 'e_gov_egypt');
  END LOOP;
END;
$$;

-- Clean up helper
DROP FUNCTION IF EXISTS _seed_sub;
