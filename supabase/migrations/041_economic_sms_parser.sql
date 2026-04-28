-- ─── Economic Hybrid SMS Parser — schema foundation ─────────────────
-- Adds the columns and tables the new shared parser-v2 module needs.
-- All adds are nullable so backfill is a no-op; behavior changes ship
-- behind the parser-v2 PRs that follow this migration.
--
-- Touches:
--   • accounts: 3 nullable last4 columns + partial-unique indexes
--   • transactions: 11 nullable columns for canonical ParseResult fields
--   • offers (new): non-transactional promo SMS (schema-only this milestone)
--   • promo_keywords (new): hot-patchable promo classifier seed list
-- ──────────────────────────────────────────────────────────────────────

-- ─── 1. accounts: optional last4 anchors for SMS ownership matching ─

alter table public.accounts
  add column if not exists account_last4 text,
  add column if not exists card_last4    text,
  add column if not exists iban_last4    text;

-- Constrain to exactly 4 digits so the parser doesn't have to defend
-- against "1234-5678" or "***1234" being stored unmasked.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'accounts_account_last4_4digits') then
    alter table public.accounts
      add constraint accounts_account_last4_4digits
      check (account_last4 is null or account_last4 ~ '^[0-9]{4}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_card_last4_4digits') then
    alter table public.accounts
      add constraint accounts_card_last4_4digits
      check (card_last4 is null or card_last4 ~ '^[0-9]{4}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'accounts_iban_last4_4digits') then
    alter table public.accounts
      add constraint accounts_iban_last4_4digits
      check (iban_last4 is null or iban_last4 ~ '^[0-9]{4}$');
  end if;
end $$;

-- One last4 per kind per user. Two accounts ending in the same 4 digits
-- on the same kind would make ownership matching ambiguous.
create unique index if not exists accounts_user_account_last4_uniq
  on public.accounts (user_id, account_last4)
  where account_last4 is not null;
create unique index if not exists accounts_user_card_last4_uniq
  on public.accounts (user_id, card_last4)
  where card_last4 is not null;
create unique index if not exists accounts_user_iban_last4_uniq
  on public.accounts (user_id, iban_last4)
  where iban_last4 is not null;

-- ─── 2. transactions: canonical ParseResult fields ──────────────────

alter table public.transactions
  add column if not exists merchant_raw        text,
  add column if not exists merchant_normalized text,
  add column if not exists parser_source       text,
  add column if not exists from_account_id     uuid references public.accounts(id) on delete set null,
  add column if not exists to_account_id       uuid references public.accounts(id) on delete set null,
  add column if not exists from_last4          text,
  add column if not exists to_last4            text,
  add column if not exists institution_name    text,
  add column if not exists channel             text,
  add column if not exists descriptor          text,
  add column if not exists ignored_values      jsonb not null default '[]'::jsonb;

-- Constrain parser_source so callers can't drift.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_parser_source_enum') then
    alter table public.transactions
      add constraint transactions_parser_source_enum
      check (parser_source is null
             or parser_source in ('rules', 'ai_fallback', 'rules_then_ai',
                                  'manual', 'voice', 'ocr', 'whatsapp'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_channel_enum') then
    alter table public.transactions
      add constraint transactions_channel_enum
      check (channel is null
             or channel in ('apple_pay', 'google_pay', 'mada', 'stc_pay',
                            'urpay', 'iban', 'card'));
  end if;
end $$;

-- Indexes for the most common queries: filter/aggregate by parser path
-- (telemetry), browse merchants by their normalized form (analytics),
-- list transfers between two accounts.
create index if not exists idx_transactions_parser_source
  on public.transactions (parser_source)
  where parser_source is not null;
create index if not exists idx_transactions_merchant_normalized
  on public.transactions (merchant_normalized)
  where merchant_normalized is not null;
create index if not exists idx_transactions_from_account
  on public.transactions (from_account_id)
  where from_account_id is not null;
create index if not exists idx_transactions_to_account
  on public.transactions (to_account_id)
  where to_account_id is not null;

-- ─── 3. offers: parked non-transactional SMS (promos, cashback) ─────
-- Schema-only this milestone. Parser-v2 writes here; the Offers tab
-- UI ships in a follow-up PR.

create table if not exists public.offers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  received_at       timestamptz not null default now(),
  institution_name  text,
  body              text not null,             -- already redacted (no last4)
  body_hash         text not null,             -- sha1(body) — for dedup
  cta_url           text,
  expires_at        timestamptz,
  read_at           timestamptz,
  parser_source     text not null default 'rules',
  confidence        numeric(3, 2) not null default 0.00 check (confidence >= 0 and confidence <= 1),
  created_at        timestamptz not null default now()
);

create index if not exists idx_offers_user_received
  on public.offers (user_id, received_at desc);

-- Per-user dedup: same SMS body shouldn't land twice within a 90-day window.
create unique index if not exists offers_user_body_hash_uniq
  on public.offers (user_id, body_hash);

alter table public.offers enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_select_own') then
    create policy offers_select_own on public.offers for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_insert_own') then
    create policy offers_insert_own on public.offers for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_update_own') then
    create policy offers_update_own on public.offers for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='offers' and policyname='offers_delete_own') then
    create policy offers_delete_own on public.offers for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── 4. promo_keywords: hot-patchable promo classifier seed list ────
-- Lives in DB so we can add new telecom/wallet promo wording without a
-- deploy. Parser-v2 caches this list at function-cold-start.

create table if not exists public.promo_keywords (
  id          uuid primary key default gen_random_uuid(),
  keyword     text not null,                                   -- exact substring (lowercased compare)
  language    text not null check (language in ('ar', 'en')),
  weight      numeric(3, 2) not null default 1.00 check (weight > 0 and weight <= 1),
  active      boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

create unique index if not exists promo_keywords_keyword_lang_uniq
  on public.promo_keywords (keyword, language);

create index if not exists promo_keywords_active_lookup
  on public.promo_keywords (active) where active;

-- Seed the classifier with the keywords used by the parser-v2 default
-- list. Idempotent via ON CONFLICT.
insert into public.promo_keywords (keyword, language, weight, notes) values
  ('discount',       'en', 1.00, 'standard promo word'),
  ('% off',          'en', 1.00, 'percentage promo'),
  ('free',           'en', 0.70, 'weak alone; combine with other signals'),
  ('redeem',         'en', 1.00, 'rewards/points redemption'),
  ('points',         'en', 0.85, 'rewards programs'),
  ('gift',           'en', 0.80, NULL),
  ('cashback offer', 'en', 1.00, NULL),
  ('voucher',        'en', 1.00, NULL),
  ('promo code',     'en', 1.00, NULL),
  ('coupon',         'en', 1.00, NULL),
  ('عرض',            'ar', 1.00, 'standard promo word'),
  ('خصم',            'ar', 1.00, 'discount'),
  ('استرداد',         'ar', 0.95, 'cashback / refund offer'),
  ('هدية',            'ar', 0.85, 'gift'),
  ('نقاط',            'ar', 0.85, 'points'),
  ('قسيمة',           'ar', 1.00, 'voucher'),
  ('كوبون',           'ar', 1.00, 'coupon'),
  ('مجاني',           'ar', 0.70, 'free'),
  ('بدون رسوم',       'ar', 0.80, 'no fees promo')
on conflict (keyword, language) do nothing;

alter table public.promo_keywords enable row level security;

-- Read-only for all authenticated users (it's classifier config, not user data).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='promo_keywords' and policyname='promo_keywords_read_authenticated') then
    create policy promo_keywords_read_authenticated on public.promo_keywords
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

-- ─── 5. transaction.source enum widening ────────────────────────────
-- The Transaction.source field already accepts 'sms', but we add the
-- finer-grained parser_source above. No enum change needed because the
-- transactions table uses text not an enum; the existing constraint
-- (if any) is permissive.
