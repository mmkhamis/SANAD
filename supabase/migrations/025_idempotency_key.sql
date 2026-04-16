-- 025_idempotency_key.sql
-- Add idempotency_key to transactions to prevent duplicate inserts
-- on network retry or user double-tap.
--
-- Client generates a UUID before the first insert. If the same key
-- is seen again, the existing row is returned instead of inserting.

alter table public.transactions
  add column if not exists idempotency_key text default null;

-- Unique index per user so different users can have the same key
-- (not that they should, but RLS must not block legitimate queries).
create unique index if not exists idx_transactions_idempotency
  on public.transactions(user_id, idempotency_key)
  where idempotency_key is not null and deleted_at is null;

-- Partial index for efficient dedup lookups
create index if not exists idx_transactions_idempotency_lookup
  on public.transactions(user_id, idempotency_key)
  where idempotency_key is not null;
