-- Migration 051: Replace migration 050's car_fines with full Fines & Violations group
-- Creates standalone fines group, retires old fines_penalties from miscellaneous

BEGIN;

CREATE OR REPLACE FUNCTION _add_fines_group() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _uid uuid;
  _gid uuid;
  _color text := '#DC2626';
BEGIN
  FOR _uid IN SELECT DISTINCT user_id FROM category_groups WHERE retired_at IS NULL
  LOOP
    -- Skip if fines group already exists
    IF EXISTS (
      SELECT 1 FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'fines' AND retired_at IS NULL
    ) THEN
      SELECT id INTO _gid FROM category_groups
        WHERE user_id = _uid AND taxonomy_key = 'fines' AND retired_at IS NULL LIMIT 1;
    ELSE
      INSERT INTO category_groups (id, user_id, name, icon, color, sort_order, taxonomy_key, type)
      VALUES (gen_random_uuid(), _uid, 'Fines & Violations', 'siren', _color, 95, 'fines', 'expense')
      RETURNING id INTO _gid;
    END IF;

    -- Create subcategories
    PERFORM _ensure_fine_sub(_uid, _gid, _color, 'Traffic Fines',           'car',              'traffic_fines');
    PERFORM _ensure_fine_sub(_uid, _gid, _color, 'Parking Fines',           'parking-circle',   'parking_fines');
    PERFORM _ensure_fine_sub(_uid, _gid, _color, 'Government Fines',        'landmark',         'government_fines');
    PERFORM _ensure_fine_sub(_uid, _gid, _color, 'Late Payment Penalties',  'clock',            'late_payment_fines');
    PERFORM _ensure_fine_sub(_uid, _gid, _color, 'Other Fines',             'octagon-alert',    'other_fines');

    -- Retire old fines_penalties from miscellaneous
    UPDATE categories
    SET retired_at = NOW()
    WHERE user_id = _uid AND taxonomy_key = 'fines_penalties' AND retired_at IS NULL;

    -- Retire car_fines from transport (from migration 050)
    UPDATE categories
    SET retired_at = NOW()
    WHERE user_id = _uid AND taxonomy_key = 'car_fines' AND retired_at IS NULL;

  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION _ensure_fine_sub(
  _uid uuid, _gid uuid, _color text, _name text, _icon text, _tk text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM categories WHERE user_id=_uid AND taxonomy_key=_tk AND retired_at IS NULL) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM categories WHERE user_id=_uid AND taxonomy_key=_tk AND retired_at IS NOT NULL) THEN
    UPDATE categories SET retired_at=NULL, group_id=_gid, icon=_icon, name=_name, color=_color
    WHERE user_id=_uid AND taxonomy_key=_tk AND retired_at IS NOT NULL;
    RETURN;
  END IF;
  INSERT INTO categories (id, user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
  VALUES (gen_random_uuid(), _uid, _name, _icon, _color, 'expense', true, _gid, _tk);
END;
$$;

SELECT _add_fines_group();
DROP FUNCTION IF EXISTS _add_fines_group();
DROP FUNCTION IF EXISTS _ensure_fine_sub(uuid, uuid, text, text, text, text);

COMMIT;
