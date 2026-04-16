-- Stock watchlist: users can add their favorite stocks to track live prices
CREATE TABLE IF NOT EXISTS stock_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,            -- e.g. AAPL, MSFT, TSLA
  company_name TEXT NOT NULL,      -- e.g. Apple Inc., Microsoft Corp.
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent duplicate symbols per user
CREATE UNIQUE INDEX idx_stock_watchlist_user_symbol
  ON stock_watchlist (user_id, symbol);

CREATE INDEX idx_stock_watchlist_user
  ON stock_watchlist (user_id);

-- RLS
ALTER TABLE stock_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watchlist"
  ON stock_watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON stock_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON stock_watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON stock_watchlist FOR DELETE
  USING (auth.uid() = user_id);
