-- 003_sms_auto_save.sql
-- Allow SMS transactions to be saved without a category (needs_review flow).

-- Make category_id nullable for auto-saved SMS transactions
alter table public.transactions
  alter column category_id drop not null;

-- Add needs_review flag for SMS transactions pending categorization
alter table public.transactions
  add column needs_review boolean not null default false;

-- Index for quick lookup of unreviewed transactions
create index idx_transactions_needs_review
  on public.transactions(user_id)
  where needs_review = true;
