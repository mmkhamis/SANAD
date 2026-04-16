-- 001_initial_schema.sql
-- Extensions, tables, foreign keys, and basic constraints only.

-- ─── Extensions ──────────────────────────────────────────────────────

create extension if not exists "pgcrypto" with schema extensions;

-- ─── ENUMs ───────────────────────────────────────────────────────────

create type public.transaction_type   as enum ('income', 'expense', 'transfer');
create type public.transaction_source as enum ('manual', 'sms', 'ocr', 'recurring');
create type public.budget_period      as enum ('weekly', 'monthly', 'yearly');
create type public.ai_insight_type    as enum ('spending', 'saving', 'budget', 'trend');
create type public.ai_insight_priority as enum ('low', 'medium', 'high');

-- ─── profiles ────────────────────────────────────────────────────────

create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text not null,
  avatar_url            text,
  currency              text not null default 'SAR',
  locale                text not null default 'en-SA',
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── categories ──────────────────────────────────────────────────────

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  icon          text not null,
  color         text not null,
  type          public.transaction_type not null,
  budget_limit  numeric(12, 2),
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── transactions ────────────────────────────────────────────────────

create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  amount          numeric(12, 2) not null check (amount > 0),
  type            public.transaction_type not null,
  category_id     uuid not null references public.categories(id) on delete restrict,
  category_name   text not null,
  category_icon   text not null,
  category_color  text not null,
  description     text not null,
  merchant        text,
  date            date not null,
  source          public.transaction_source not null default 'manual',
  receipt_url     text,
  notes           text,
  is_recurring    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── budgets ─────────────────────────────────────────────────────────

create table public.budgets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  category_id    uuid not null references public.categories(id) on delete cascade,
  category_name  text not null,
  amount         numeric(12, 2) not null check (amount > 0),
  spent          numeric(12, 2) not null default 0,
  period         public.budget_period not null,
  start_date     date not null,
  end_date       date not null,
  created_at     timestamptz not null default now(),
  constraint budgets_dates_check check (end_date >= start_date)
);

-- ─── ai_insights ─────────────────────────────────────────────────────

create table public.ai_insights (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  message     text not null,
  type        public.ai_insight_type not null,
  priority    public.ai_insight_priority not null default 'low',
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────

create index idx_categories_user
  on public.categories(user_id);

create index idx_transactions_user_date
  on public.transactions(user_id, date desc);

create index idx_transactions_user_type_date
  on public.transactions(user_id, type, date);

create index idx_transactions_user_category
  on public.transactions(user_id, category_id);

create index idx_budgets_user
  on public.budgets(user_id);

create index idx_budgets_user_category
  on public.budgets(user_id, category_id);

create index idx_ai_insights_user_unread
  on public.ai_insights(user_id, is_read, created_at desc);

-- ─── Row Level Security ──────────────────────────────────────────────

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;
alter table public.ai_insights  enable row level security;

-- profiles

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- categories

create policy "categories: select own"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "categories: insert own"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "categories: update own"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "categories: delete own"
  on public.categories for delete
  using (auth.uid() = user_id);

-- transactions

create policy "transactions: select own"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "transactions: insert own"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "transactions: update own"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "transactions: delete own"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- budgets

create policy "budgets: select own"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "budgets: insert own"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "budgets: update own"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy "budgets: delete own"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- ai_insights (read + mark-as-read only; no client insert/delete)

create policy "ai_insights: select own"
  on public.ai_insights for select
  using (auth.uid() = user_id);

create policy "ai_insights: update own"
  on public.ai_insights for update
  using (auth.uid() = user_id);
