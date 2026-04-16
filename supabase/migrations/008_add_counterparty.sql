-- 008_add_counterparty.sql
-- Add counterparty column for P2P transactions (person name, not a merchant).

alter table public.transactions
  add column counterparty text;

-- Index for filtering by counterparty
create index idx_transactions_counterparty on public.transactions (user_id, counterparty)
  where counterparty is not null;
