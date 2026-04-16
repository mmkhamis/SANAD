-- 011_soft_delete.sql
-- Add soft-delete support to transactions and user_assets.
-- Items with deleted_at set are hidden from normal queries.
-- A cron or manual cleanup can hard-delete items older than 30 days.

alter table public.transactions
  add column if not exists deleted_at timestamptz default null;

alter table public.user_assets
  add column if not exists deleted_at timestamptz default null;

-- Index for efficient "trash" queries (only recently deleted)
create index if not exists idx_transactions_deleted
  on public.transactions(user_id, deleted_at)
  where deleted_at is not null;

create index if not exists idx_assets_deleted
  on public.user_assets(user_id, deleted_at)
  where deleted_at is not null;
