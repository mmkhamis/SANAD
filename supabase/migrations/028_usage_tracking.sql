-- 028_usage_tracking.sql
-- Per-user usage event tracking for quota enforcement.
--
-- Design: append-only event log. Current-period counts are derived at
-- query time using date boundaries — no fragile cron resets needed.
--
-- Supported periods: daily, weekly, monthly.
-- Period boundaries use the user's local midnight approximation via
-- server time (UTC). Adjust if per-user timezone support is needed later.

-- ─── Table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  usage_key   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────

-- Fast lookup: user + key + time range (covers all period queries)
CREATE INDEX IF NOT EXISTS idx_usage_events_user_key_created
  ON public.usage_events (user_id, usage_key, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events
DROP POLICY IF EXISTS "Users can read own usage" ON public.usage_events;
CREATE POLICY "Users can read own usage"
  ON public.usage_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own events (metered at app layer)
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_events;
CREATE POLICY "Users can insert own usage"
  ON public.usage_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE — append-only log

-- ─── RPC: get_usage_counts ───────────────────────────────────────────
-- Returns current-period counts for all tracked keys in one call.
-- Period boundaries are computed server-side from the key suffix:
--   *PerDay   → start of current UTC day
--   *PerWeek  → start of current ISO week (Monday)
--   *PerMonth → start of current UTC month

CREATE OR REPLACE FUNCTION public.get_usage_counts(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today      date := CURRENT_DATE;
  v_week_start date := date_trunc('week', CURRENT_DATE)::date;  -- Monday
  v_month_start date := date_trunc('month', CURRENT_DATE)::date;
  v_result     jsonb := '{}'::jsonb;
  v_row        record;
BEGIN
  -- Daily keys
  FOR v_row IN
    SELECT usage_key, count(*)::int AS cnt
    FROM usage_events
    WHERE user_id = p_user_id
      AND usage_key IN ('aiChatPerDay', 'voiceTrackingPerDay')
      AND created_at >= v_today::timestamptz
    GROUP BY usage_key
  LOOP
    v_result := v_result || jsonb_build_object(v_row.usage_key, v_row.cnt);
  END LOOP;

  -- Weekly keys
  FOR v_row IN
    SELECT usage_key, count(*)::int AS cnt
    FROM usage_events
    WHERE user_id = p_user_id
      AND usage_key IN ('deepAnalyticsPerWeek', 'insightsPerWeek')
      AND created_at >= v_week_start::timestamptz
    GROUP BY usage_key
  LOOP
    v_result := v_result || jsonb_build_object(v_row.usage_key, v_row.cnt);
  END LOOP;

  -- Monthly keys
  FOR v_row IN
    SELECT usage_key, count(*)::int AS cnt
    FROM usage_events
    WHERE user_id = p_user_id
      AND usage_key IN ('customCategoriesPerMonth')
      AND created_at >= v_month_start::timestamptz
    GROUP BY usage_key
  LOOP
    v_result := v_result || jsonb_build_object(v_row.usage_key, v_row.cnt);
  END LOOP;

  RETURN v_result;
END;
$$;

-- ─── RPC: record_usage ──────────────────────────────────────────────
-- Atomic insert that returns updated count for the relevant period.
-- Enforces the limit server-side if p_limit is provided (> 0 and finite).
-- Returns { allowed: bool, used: int }

CREATE OR REPLACE FUNCTION public.record_usage(
  p_user_id   uuid,
  p_usage_key text,
  p_limit     integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz;
  v_current_count integer;
BEGIN
  -- Determine period start based on key suffix
  IF p_usage_key LIKE '%PerDay' THEN
    v_period_start := CURRENT_DATE::timestamptz;
  ELSIF p_usage_key LIKE '%PerWeek' THEN
    v_period_start := date_trunc('week', CURRENT_DATE)::timestamptz;
  ELSIF p_usage_key LIKE '%PerMonth' THEN
    v_period_start := date_trunc('month', CURRENT_DATE)::timestamptz;
  ELSE
    -- Unknown period — default to daily
    v_period_start := CURRENT_DATE::timestamptz;
  END IF;

  -- Count current usage in the active period
  SELECT count(*)::int INTO v_current_count
  FROM usage_events
  WHERE user_id = p_user_id
    AND usage_key = p_usage_key
    AND created_at >= v_period_start;

  -- Enforce limit if provided (NULL or 0 = no server enforcement)
  IF p_limit IS NOT NULL AND p_limit > 0 AND v_current_count >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'used', v_current_count);
  END IF;

  -- Record the event
  INSERT INTO usage_events (user_id, usage_key)
  VALUES (p_user_id, p_usage_key);

  RETURN jsonb_build_object('allowed', true, 'used', v_current_count + 1);
END;
$$;

-- ─── Cleanup: old events (optional, run periodically) ────────────────
-- Not auto-scheduled. Can be called from a cron or admin function later.
-- Keeps data lean by removing events older than 90 days.

CREATE OR REPLACE FUNCTION public.cleanup_old_usage_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM usage_events
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
