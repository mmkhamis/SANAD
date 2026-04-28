-- Migration 044: Merchant → category cache
-- Stores AI-resolved taxonomy_key per merchant so we only call AI once per merchant.
-- Global cache (not per-user) since merchant→category is universal.

CREATE TABLE IF NOT EXISTS merchant_category_cache (
  merchant_key  text PRIMARY KEY,         -- lower-cased, trimmed merchant name
  taxonomy_key  text NOT NULL,            -- e.g. 'cafes_coffee', 'restaurants'
  merchant_raw  text,                     -- original merchant name for display
  source        text NOT NULL DEFAULT 'ai', -- 'ai' | 'manual' | 'rules'
  hit_count     integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_cache_taxonomy ON merchant_category_cache (taxonomy_key);

-- Pre-seed common merchants to avoid AI calls
INSERT INTO merchant_category_cache (merchant_key, taxonomy_key, merchant_raw, source) VALUES
  ('hungerstation', 'hungerstation', 'HungerStation', 'rules'),
  ('jahez', 'jahez', 'Jahez', 'rules'),
  ('marsool', 'marsool', 'Marsool', 'rules'),
  ('talabat', 'talabat', 'Talabat', 'rules'),
  ('careem', 'careem', 'Careem', 'rules'),
  ('uber', 'taxi_rideshare', 'Uber', 'rules'),
  ('starbucks', 'cafes_coffee', 'Starbucks', 'rules'),
  ('mcdonalds', 'restaurants', 'McDonalds', 'rules'),
  ('kfc', 'restaurants', 'KFC', 'rules'),
  ('albaik', 'restaurants', 'AlBaik', 'rules'),
  ('herfy', 'restaurants', 'Herfy', 'rules'),
  ('kudu', 'restaurants', 'Kudu', 'rules'),
  ('carrefour', 'groceries', 'Carrefour', 'rules'),
  ('danube', 'groceries', 'Danube', 'rules'),
  ('panda', 'groceries', 'Panda', 'rules'),
  ('tamimi', 'groceries', 'Tamimi', 'rules'),
  ('netflix', 'subscriptions', 'Netflix', 'rules'),
  ('spotify', 'subscriptions', 'Spotify', 'rules'),
  ('amazon', 'shopping', 'Amazon', 'rules'),
  ('noon', 'shopping', 'Noon', 'rules'),
  ('jarir', 'shopping', 'Jarir', 'rules'),
  ('nahdi', 'pharmacy', 'Nahdi', 'rules'),
  ('al dawaa', 'pharmacy', 'Al Dawaa', 'rules')
ON CONFLICT (merchant_key) DO NOTHING;
