-- Migration 049: Prevent duplicate groups/subcategories from recurring
-- Adds partial unique indexes so the same taxonomy_key can't appear twice
-- per user while active (retired_at IS NULL).

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_groups_user_taxonomy
  ON category_groups (user_id, taxonomy_key)
  WHERE retired_at IS NULL AND taxonomy_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_taxonomy
  ON categories (user_id, taxonomy_key)
  WHERE retired_at IS NULL AND taxonomy_key IS NOT NULL;
