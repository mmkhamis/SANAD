-- ─── Silent SMS webhook tokens + push tokens ──────────────────────────
-- Enables the iOS Shortcuts "Get Contents of URL" flow:
--   https://<project>.supabase.co/functions/v1/sms-webhook?token=<uuid>&text=<SMS>
-- The token maps to a user without a bearer JWT (safe to embed in a
-- Shortcut because it's rotatable). Expo push token is used by the edge
-- function to deliver a local-style notification back to the device.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_webhook_token uuid DEFAULT gen_random_uuid() NOT NULL,
  ADD COLUMN IF NOT EXISTS expo_push_token   text;

-- Each user's sms token must be unique (it's the auth key).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_sms_webhook_token_key
  ON public.profiles (sms_webhook_token);

-- Fast lookup by push token (rare, but used by cleanup jobs).
CREATE INDEX IF NOT EXISTS profiles_expo_push_token_lookup
  ON public.profiles (expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- Backfill any existing rows with a random token (DEFAULT only applies
-- to future inserts).
UPDATE public.profiles
   SET sms_webhook_token = gen_random_uuid()
 WHERE sms_webhook_token IS NULL;

-- RLS: users can read & rotate their own token, and update their own
-- push token. They cannot read anyone else's.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'profiles'
       AND policyname = 'profiles_select_self_tokens'
  ) THEN
    -- Existing profile policies already cover SELECT/UPDATE self; we
    -- rely on them. This block is a safety no-op placeholder.
    NULL;
  END IF;
END $$;
