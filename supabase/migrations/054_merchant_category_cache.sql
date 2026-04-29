-- Merchant → taxonomy_key cache table.
-- Populated by AI fallback results, queried before calling AI to save costs.
-- One row per unique merchant_key (lowercased, trimmed merchant name).

CREATE TABLE IF NOT EXISTS merchant_category_cache (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_key text NOT NULL,
  taxonomy_key text NOT NULL,
  merchant_raw text,
  source       text NOT NULL DEFAULT 'ai',  -- 'ai' | 'user_correction' | 'seed'
  hit_count    int  NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_category_cache_merchant_key_unique UNIQUE (merchant_key)
);

-- Index for fast lookups by merchant_key
CREATE INDEX IF NOT EXISTS idx_merchant_category_cache_key
  ON merchant_category_cache (merchant_key);

-- Index for analytics: most-used merchants
CREATE INDEX IF NOT EXISTS idx_merchant_category_cache_hits
  ON merchant_category_cache (hit_count DESC);

-- RLS: service role only (Edge Functions use service_role key)
ALTER TABLE merchant_category_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (Edge Functions)
CREATE POLICY "service_role_full_access"
  ON merchant_category_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed common Saudi merchants to bootstrap the cache
INSERT INTO merchant_category_cache (merchant_key, taxonomy_key, merchant_raw, source) VALUES
  -- Food delivery
  ('hungerstation', 'hungerstation', 'HungerStation', 'seed'),
  ('هنقرستيشن', 'hungerstation', 'هنقرستيشن', 'seed'),
  ('jahez', 'jahez', 'Jahez', 'seed'),
  ('جاهز', 'jahez', 'جاهز', 'seed'),
  ('marsool', 'marsool', 'Marsool', 'seed'),
  ('مرسول', 'marsool', 'مرسول', 'seed'),
  ('talabat', 'talabat', 'Talabat', 'seed'),
  ('طلبات', 'talabat', 'طلبات', 'seed'),
  ('the chefz', 'food_delivery', 'The Chefz', 'seed'),
  ('wssel', 'food_delivery', 'Wssel', 'seed'),
  -- Ride-hailing
  ('uber', 'uber_taxi', 'Uber', 'seed'),
  ('اوبر', 'uber_taxi', 'اوبر', 'seed'),
  ('careem', 'careem', 'Careem', 'seed'),
  ('كريم', 'careem', 'كريم', 'seed'),
  ('bolt', 'uber_taxi', 'Bolt', 'seed'),
  ('bolt sa', 'uber_taxi', 'BOLT SA', 'seed'),
  ('jeeny', 'uber_taxi', 'Jeeny', 'seed'),
  ('leem', 'uber_taxi', 'Leem', 'seed'),
  -- Groceries
  ('danube', 'groceries', 'Danube', 'seed'),
  ('الدانوب', 'groceries', 'الدانوب', 'seed'),
  ('panda', 'groceries', 'Panda', 'seed'),
  ('بندة', 'groceries', 'بندة', 'seed'),
  ('tamimi', 'groceries', 'Tamimi', 'seed'),
  ('التميمي', 'groceries', 'التميمي', 'seed'),
  ('othaim', 'groceries', 'Othaim', 'seed'),
  ('العثيم', 'groceries', 'العثيم', 'seed'),
  ('bindawood', 'groceries', 'Bindawood', 'seed'),
  ('بن داود', 'groceries', 'بن داود', 'seed'),
  ('nana', 'groceries', 'Nana', 'seed'),
  ('farm', 'groceries', 'Farm Superstores', 'seed'),
  -- Restaurants
  ('albaik', 'restaurants', 'AlBaik', 'seed'),
  ('البيك', 'restaurants', 'البيك', 'seed'),
  ('herfy', 'restaurants', 'Herfy', 'seed'),
  ('هرفي', 'restaurants', 'هرفي', 'seed'),
  ('kudu', 'restaurants', 'Kudu', 'seed'),
  ('كودو', 'restaurants', 'كودو', 'seed'),
  ('mcdonalds', 'restaurants', 'McDonalds', 'seed'),
  ('kfc', 'restaurants', 'KFC', 'seed'),
  ('burger king', 'restaurants', 'Burger King', 'seed'),
  -- Cafes
  ('starbucks', 'cafes_coffee', 'Starbucks', 'seed'),
  ('ستاربكس', 'cafes_coffee', 'ستاربكس', 'seed'),
  ('barn', 'cafes_coffee', 'Barn', 'seed'),
  ('dose', 'cafes_coffee', 'Dose', 'seed'),
  -- Shopping
  ('noon', 'general_shopping', 'Noon', 'seed'),
  ('نون', 'general_shopping', 'نون', 'seed'),
  ('amazon', 'general_shopping', 'Amazon', 'seed'),
  ('jarir', 'general_shopping', 'Jarir', 'seed'),
  ('جرير', 'general_shopping', 'جرير', 'seed'),
  ('saco', 'general_shopping', 'SACO', 'seed'),
  ('ساكو', 'general_shopping', 'ساكو', 'seed'),
  ('extra', 'general_shopping', 'Extra', 'seed'),
  ('اكسترا', 'general_shopping', 'اكسترا', 'seed'),
  -- Fashion
  ('zara', 'fashion', 'Zara', 'seed'),
  ('h&m', 'fashion', 'H&M', 'seed'),
  -- Pharmacy
  ('nahdi', 'medicines', 'Nahdi', 'seed'),
  ('النهدي', 'medicines', 'النهدي', 'seed'),
  ('al dawaa', 'medicines', 'Al Dawaa', 'seed'),
  ('الدواء', 'medicines', 'الدواء', 'seed'),
  -- Digital
  ('netflix', 'netflix', 'Netflix', 'seed'),
  ('spotify', 'spotify', 'Spotify', 'seed'),
  ('chatgpt', 'chatgpt_ai_tools', 'ChatGPT', 'seed'),
  ('icloud', 'icloud_storage', 'iCloud', 'seed'),
  -- Flights
  ('saudia', 'flights', 'Saudia', 'seed'),
  ('flynas', 'flights', 'Flynas', 'seed'),
  ('flyadeal', 'flights', 'Flyadeal', 'seed'),
  -- Fuel
  ('aldrees', 'fuel', 'Aldrees', 'seed'),
  ('petromin', 'fuel', 'Petromin', 'seed'),
  ('naft', 'fuel', 'Naft', 'seed'),
  -- Telecom
  ('stc', 'mobile', 'STC', 'seed'),
  ('mobily', 'mobile', 'Mobily', 'seed'),
  ('zain', 'mobile', 'Zain', 'seed'),
  -- Home
  ('ikea', 'home_appliances', 'IKEA', 'seed'),
  ('ايكيا', 'home_appliances', 'ايكيا', 'seed'),
  -- Shipping
  ('aramex', 'shipping_logistics', 'Aramex', 'seed'),
  ('smsa', 'shipping_logistics', 'SMSA', 'seed'),
  ('dhl', 'shipping_logistics', 'DHL', 'seed')
ON CONFLICT (merchant_key) DO NOTHING;
