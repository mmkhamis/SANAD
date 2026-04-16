-- PoC only — not production ready
-- Add whatsapp_number to profiles for phone → user mapping

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number text;

-- Unique index for fast lookup in process-whatsapp function
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_whatsapp_number
  ON public.profiles (whatsapp_number) WHERE whatsapp_number IS NOT NULL;
