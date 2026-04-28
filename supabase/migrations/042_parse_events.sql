-- 042_parse_events.sql
-- Parser telemetry for SMS + smart input parsing quality/cost tracking.

create table if not exists public.parse_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  ingest_source  text not null
                  check (ingest_source in ('ingest_sms', 'sms_webhook', 'parse_transaction')),
  parser_source  text,
  message_class  text,
  confidence     numeric(4, 3),
  review_flags   jsonb not null default '[]'::jsonb,
  ai_used        boolean not null default false,
  ai_cost_usd    numeric(12, 6) not null default 0,
  status         text not null
                  check (status in ('created', 'duplicate', 'no_amount', 'offer', 'dropped', 'error')),
  dedup_hit      boolean not null default false,
  needs_review   boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_parse_events_user_created
  on public.parse_events (user_id, created_at desc);

create index if not exists idx_parse_events_source_created
  on public.parse_events (ingest_source, created_at desc);

create index if not exists idx_parse_events_status_created
  on public.parse_events (status, created_at desc);

alter table public.parse_events enable row level security;

drop policy if exists "parse_events_select_own" on public.parse_events;
create policy "parse_events_select_own"
  on public.parse_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "parse_events_insert_own" on public.parse_events;
create policy "parse_events_insert_own"
  on public.parse_events
  for insert
  with check (auth.uid() = user_id);

-- Minimal analytics view used by dashboards/admin checks.
create or replace view public.parse_events_daily
with (security_invoker = true) as
select
  user_id,
  date_trunc('day', created_at)::date as day,
  ingest_source,
  parser_source,
  count(*) as total_events,
  count(*) filter (where ai_used) as ai_events,
  coalesce(sum(ai_cost_usd), 0)::numeric(12, 6) as ai_cost_usd,
  avg(confidence)::numeric(4, 3) as avg_confidence,
  count(*) filter (where needs_review) as needs_review_events,
  count(*) filter (where dedup_hit) as dedup_events,
  count(*) filter (where status = 'error') as error_events
from public.parse_events
group by
  user_id,
  date_trunc('day', created_at)::date,
  ingest_source,
  parser_source;
