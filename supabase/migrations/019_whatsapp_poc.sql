-- PoC only — not production ready
-- WhatsApp integration: event log table + extend source enum

-- 1. Add 'whatsapp' to the transaction_source enum
ALTER TYPE public.transaction_source ADD VALUE IF NOT EXISTS 'whatsapp';

-- 2. Create whatsapp_events table for inbound message logging + dedup
CREATE TABLE IF NOT EXISTS public.whatsapp_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_number text NOT NULL,
  raw_text    text,                                    -- may be null for voice/image-only messages
  message_sid text UNIQUE NOT NULL,                    -- Twilio MessageSid for dedup
  media_url   text,                                    -- Twilio MediaUrl0 (voice/image)
  media_type  text,                                    -- e.g. audio/ogg, image/jpeg
  status      text NOT NULL DEFAULT 'pending',         -- pending | processing | completed | failed
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for processor polling (pending events)
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_status
  ON public.whatsapp_events (status) WHERE status = 'pending';

-- RLS: service-role only (edge functions use SERVICE_ROLE_KEY)
ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;
