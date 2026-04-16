-- 027_user_subscriptions.sql
-- Plan, trial & billing state — single row per user.
-- Backend is the source of truth. Frontend only reads.

-- ─── Table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                text NOT NULL DEFAULT 'free'
                        CHECK (plan IN ('free', 'pro', 'max')),
  status              text NOT NULL DEFAULT 'free'
                        CHECK (status IN ('free', 'trialing', 'active', 'expired', 'canceled')),
  provider            text NOT NULL DEFAULT 'internal'
                        CHECK (provider IN ('apple', 'google', 'web', 'internal')),
  trial_plan          text CHECK (trial_plan IS NULL OR trial_plan IN ('pro', 'max')),
  trial_start_at      timestamptz,
  trial_end_at        timestamptz,
  has_used_pro_trial  boolean NOT NULL DEFAULT false,
  has_used_max_trial  boolean NOT NULL DEFAULT false,
  current_period_end  timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ─── App Config (single-row, DB-driven settings) ────────────────────

CREATE TABLE IF NOT EXISTS public.app_config (
  id               boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  pro_trial_days   integer NOT NULL DEFAULT 14,
  max_trial_days   integer NOT NULL DEFAULT 14,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_config (pro_trial_days, max_trial_days)
VALUES (14, 14)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app config"
  ON public.app_config FOR SELECT USING (true);

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users may read their own row.
CREATE POLICY "Users can read own subscription"
  ON public.user_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- No direct INSERT/UPDATE/DELETE for authenticated role.
-- All writes go through SECURITY DEFINER functions (below) which run
-- with full privileges regardless of RLS.

-- ─── Auto-create row on profile creation ─────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- ─── RPC: start_trial ────────────────────────────────────────────────
-- Atomic, eligibility-checked trial activation.
-- Reads duration from app_config (pro_trial_days / max_trial_days).

CREATE OR REPLACE FUNCTION public.start_trial(
  p_user_id    uuid,
  p_trial_plan text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub   user_subscriptions;
  v_days  integer;
BEGIN
  -- Validate plan
  IF p_trial_plan NOT IN ('pro', 'max') THEN
    RAISE EXCEPTION 'invalid_plan: %', p_trial_plan;
  END IF;

  -- Read duration from config
  SELECT CASE WHEN p_trial_plan = 'pro' THEN pro_trial_days
              ELSE max_trial_days END
  INTO v_days
  FROM app_config
  LIMIT 1;

  -- Fallback if config missing
  IF v_days IS NULL THEN v_days := 14; END IF;

  -- Upsert subscription row (idempotent for users created before migration)
  INSERT INTO user_subscriptions (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row
  SELECT * INTO v_sub
  FROM user_subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Eligibility checks
  IF v_sub.status = 'active' THEN
    RAISE EXCEPTION 'already_active';
  END IF;

  IF p_trial_plan = 'pro' AND v_sub.has_used_pro_trial THEN
    RAISE EXCEPTION 'pro_trial_used';
  END IF;

  IF p_trial_plan = 'max' AND v_sub.has_used_max_trial THEN
    RAISE EXCEPTION 'max_trial_used';
  END IF;

  -- Activate trial
  UPDATE user_subscriptions
  SET
    plan               = p_trial_plan,
    status             = 'trialing',
    provider           = 'internal',
    trial_plan         = p_trial_plan,
    trial_start_at     = now(),
    trial_end_at       = now() + (v_days || ' days')::interval,
    has_used_pro_trial = CASE WHEN p_trial_plan = 'pro' THEN true ELSE has_used_pro_trial END,
    has_used_max_trial = CASE WHEN p_trial_plan = 'max' THEN true ELSE has_used_max_trial END,
    updated_at         = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_sub;

  RETURN to_jsonb(v_sub);
END;
$$;

-- ─── RPC: expire_trial ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.expire_trial(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_subscriptions
  SET
    plan       = 'free',
    status     = 'expired',
    trial_plan = NULL,
    updated_at = now()
  WHERE user_id = p_user_id
    AND status  = 'trialing'
    AND trial_end_at < now();
END;
$$;

-- ─── RPC: reset_subscription (DEV/TEST only) ────────────────────────

CREATE OR REPLACE FUNCTION public.reset_subscription(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_subscriptions
  SET
    plan               = 'free',
    status             = 'free',
    provider           = 'internal',
    trial_plan         = NULL,
    trial_start_at     = NULL,
    trial_end_at       = NULL,
    has_used_pro_trial = false,
    has_used_max_trial = false,
    current_period_end = NULL,
    updated_at         = now()
  WHERE user_id = p_user_id;
END;
$$;

-- ─── Backfill existing users ─────────────────────────────────────────

INSERT INTO user_subscriptions (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ─── Index ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions (status)
  WHERE status IN ('trialing', 'active');
