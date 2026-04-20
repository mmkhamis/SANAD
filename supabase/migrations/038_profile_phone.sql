-- 038_profile_phone.sql
-- Enable phone number on profiles.
--
-- Context:
--   * The sign-up screen (app/(auth)/login.tsx) now collects a phone number.
--   * services/auth-service.ts passes it to supabase.auth.signUp({ phone, ... })
--     AND writes it into public.profiles via upsert:
--         { ..., phone: credentials.phone, date_of_birth: ... }
--   * migration 014 already added `date_of_birth`, but there is no `phone`
--     column on `public.profiles` yet, so that upsert currently fails.
--   * migration 036 installed handle_new_user() which creates the profile
--     row on auth signup (SECURITY DEFINER). We extend it here to also copy
--     the phone from auth.users.raw_user_meta_data / auth.users.phone so the
--     column is populated even before the client upsert runs.

-- 1. Column ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

-- Lightweight format guard: allow digits, spaces, +, -, () and require
-- at least 7 digits overall. Keep permissive — we validate on the client.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format_chk
  CHECK (
    phone IS NULL
    OR (
      phone ~ '^[+\d\s\-()]+$'
      AND length(regexp_replace(phone, '\D', '', 'g')) >= 7
    )
  );

-- Case-insensitive uniqueness (partial: only when set) so two users cannot
-- register the same number. If you prefer non-unique phones, drop this.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_phone_lookup
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;

-- 2. Trigger — include phone on auto-profile creation ────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    name_ar,
    phone,
    currency,
    locale,
    onboarding_completed,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      'User'
    ),
    NEW.raw_user_meta_data ->> 'name_ar',
    COALESCE(
      NEW.raw_user_meta_data ->> 'phone',
      NEW.phone
    ),
    'SAR',
    'en-SA',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger already installed in 036; no need to recreate.
