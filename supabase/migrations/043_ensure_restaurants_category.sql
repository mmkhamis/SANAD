-- Migration 043: Ensure "Restaurants" subcategory exists under Food & Dining
-- for all users, and un-retire it if it was previously retired.

DO $$
DECLARE
  r record;
  _gid uuid;
  _color text;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM category_groups LOOP
    -- Find the Food & Dining group
    SELECT id, color INTO _gid, _color
      FROM category_groups
     WHERE user_id = r.user_id AND taxonomy_key = 'food_dining'
     LIMIT 1;

    IF _gid IS NULL THEN CONTINUE; END IF;

    -- Un-retire if exists but retired
    UPDATE categories
       SET retired_at = NULL
     WHERE user_id = r.user_id
       AND taxonomy_key = 'restaurants'
       AND retired_at IS NOT NULL;

    -- Insert if doesn't exist at all
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
    SELECT r.user_id, 'Restaurants', 'chef-hat', _color, 'expense', true, _gid, 'restaurants'
    WHERE NOT EXISTS (
      SELECT 1 FROM categories c
       WHERE c.user_id = r.user_id AND c.taxonomy_key = 'restaurants'
    );
  END LOOP;
END;
$$;
