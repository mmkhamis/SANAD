-- 002_accounts.sql
-- Simple accounts: cash, bank, savings, credit card.

create type public.account_type as enum ('cash', 'bank', 'savings', 'credit_card');

create table public.accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  type              public.account_type not null,
  opening_balance   numeric(12, 2) not null default 0,
  current_balance   numeric(12, 2) not null default 0,
  include_in_total  boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_accounts_user on public.accounts(user_id);

alter table public.accounts enable row level security;

create policy "accounts: select own"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "accounts: insert own"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "accounts: update own"
  on public.accounts for update
  using (auth.uid() = user_id);

create policy "accounts: delete own"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- Add optional account_id to transactions
alter table public.transactions
  add column account_id uuid references public.accounts(id) on delete set null;

create index idx_transactions_account on public.transactions(account_id);
