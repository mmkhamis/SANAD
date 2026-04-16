-- Add exclude_from_insights flag to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS exclude_from_insights BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering in dashboard/analytics queries
CREATE INDEX IF NOT EXISTS idx_transactions_exclude_insights
  ON transactions (exclude_from_insights)
  WHERE exclude_from_insights = false;
