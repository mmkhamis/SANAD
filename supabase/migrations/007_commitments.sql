-- 007_commitments.sql
-- Recurring planned expenses / commitments (bills, subscriptions, etc.)

create type public.recurrence_type as enum ('monthly', 'quarterly', 'yearly', 'custom');

create table public.commitments (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references public.profiles(id) on delete cascade,
  name                       text not null,
  category_id                uuid references public.categories(id) on delete set null,
  category_name              text,
  category_icon              text,
  category_color             text,
  amount                     numeric(12, 2) not null check (amount > 0),
  currency_code              text not null default 'SAR',
  recurrence_type            public.recurrence_type not null default 'monthly',
  recurrence_interval_months integer not null default 1,
  next_due_date              date not null,
  last_paid_date             date,
  is_fixed_amount            boolean not null default true,
  is_active                  boolean not null default true,
  notes                      text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

-- RLS
alter table public.commitments enable row level security;

create policy "Users can view own commitments"
  on public.commitments for select
  using (auth.uid() = user_id);

create policy "Users can insert own commitments"
  on public.commitments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own commitments"
  on public.commitments for update
  using (auth.uid() = user_id);

create policy "Users can delete own commitments"
  on public.commitments for delete
  using (auth.uid() = user_id);

-- Index for due date queries
create index idx_commitments_due on public.commitments (user_id, next_due_date)
  where is_active = true;
