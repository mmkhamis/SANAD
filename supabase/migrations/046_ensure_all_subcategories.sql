-- Migration 046: Ensure ALL canonical subcategories exist for every user
--
-- Previous migrations may have left gaps: subcategories that were retired
-- AND deleted, or never created at all. This migration creates any missing
-- subcategories under the user's canonical group, using Lucide icons.

BEGIN;

CREATE OR REPLACE FUNCTION _ensure_subcats() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _uid uuid;
  _gid uuid;
  _color text;
BEGIN
  FOR _uid IN SELECT DISTINCT user_id FROM category_groups WHERE retired_at IS NULL
  LOOP

    -- ═══ FOOD & DINING ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'food_dining' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one(_uid, _gid, _color, 'Groceries',         'shopping-cart',   'groceries',       'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Bakery',            'croissant',       'bakery',          'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Meat & Seafood',    'fish',            'meat_seafood',    'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Restaurants',       'chef-hat',        'restaurants',     'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Cafes & Coffee',    'coffee',          'cafes_coffee',    'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Food Delivery',     'bike',            'food_delivery',   'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Snacks & Sweets',   'ice-cream-cone',  'snacks_sweets',   'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Water & Beverages', 'cup-soda',        'water_beverages', 'expense');
    END IF;

    -- ═══ TRANSPORT ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transport' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one(_uid, _gid, _color, 'Fuel',                    'fuel',            'fuel',                  'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Uber / Taxi',             'car-taxi-front',  'uber_taxi',             'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Public Transport',        'bus',             'public_transport',      'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Parking',                 'parking-circle',  'parking',               'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Tolls',                   'road',            'tolls',                 'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Car Maintenance',         'wrench',          'car_maintenance',       'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Car Insurance',           'shield-check',    'car_insurance',         'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Registration & Licensing','file-badge',      'registration_licensing','expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Car Rental',              'car-front',       'car_rental',            'expense');
    END IF;

    -- ═══ SHOPPING ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'shopping' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one(_uid, _gid, _color, 'Fashion',          'shirt',      'fashion',          'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Shoes',            'footprints', 'shoes',            'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Bags & Accessories','briefcase', 'bags_accessories', 'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Jewelry',          'gem',        'jewelry',          'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Watches',          'watch',      'watches',          'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Electronics',      'smartphone', 'electronics',      'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'General Shopping',  'package',   'general_shopping',  'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Gifts',            'gift',       'gifts',            'expense');
    END IF;

    -- ═══ HEALTH & MEDICAL ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'health_medical' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one(_uid, _gid, _color, 'Doctor Visits',      'stethoscope',  'doctor_visits',   'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Medicines',          'pill',         'medicines',       'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Lab Tests',          'flask-conical','lab_tests',       'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Hospital',           'hospital',     'hospital',        'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Dental',             'smile-plus',   'dental',          'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Therapy & Fitness',  'activity',     'therapy_fitness',  'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Health Insurance',   'shield-plus',  'health_insurance', 'expense');
    END IF;

    -- ═══ ENTERTAINMENT & LIFESTYLE ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'entertainment_lifestyle' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one(_uid, _gid, _color, 'Cinema & Events',    'ticket',        'cinema_events',    'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Gaming',             'gamepad-2',     'gaming',           'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Hobbies',            'palette',       'hobbies',          'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Beauty & Grooming',  'sparkles',      'beauty_grooming',  'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Sports Clubs',       'dumbbell',      'sports_clubs',     'expense');
      PERFORM _ensure_one(_uid, _gid, _color, 'Social Outings',     'party-popper',  'social_outings',   'expense');
    END IF;

  END LOOP;
END;
$$;

-- Helper: create a single subcategory if it doesn't already exist (active) for the user
CREATE OR REPLACE FUNCTION _ensure_one(
  _uid   uuid,
  _gid   uuid,
  _color text,
  _name  text,
  _icon  text,
  _tk    text,
  _type  text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- If an active category with this taxonomy_key already exists, skip
  IF EXISTS (
    SELECT 1 FROM categories
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NULL
  ) THEN
    RETURN;
  END IF;

  -- If a retired one exists, un-retire it and fix its group/icon
  IF EXISTS (
    SELECT 1 FROM categories
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL
  ) THEN
    UPDATE categories
    SET retired_at = NULL,
        group_id = _gid,
        icon = _icon,
        name = _name,
        color = _color
    WHERE user_id = _uid
      AND taxonomy_key = _tk
      AND retired_at IS NOT NULL
      AND id = (
        SELECT id FROM categories
        WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL
        ORDER BY created_at DESC LIMIT 1
      );
    RETURN;
  END IF;

  -- Otherwise create it fresh
  INSERT INTO categories (id, user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
  VALUES (gen_random_uuid(), _uid, _name, _icon, _color, _type::transaction_type, true, _gid, _tk);
END;
$$;

-- Run it
SELECT _ensure_subcats();

-- Clean up
DROP FUNCTION IF EXISTS _ensure_subcats();
DROP FUNCTION IF EXISTS _ensure_one(uuid, uuid, text, text, text, text, text);

COMMIT;
