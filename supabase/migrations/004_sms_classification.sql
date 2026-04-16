-- ─── SMS Classification Fields ───────────────────────────────────────
-- Adds transaction_type, source_type, parse_confidence, and review_reason
-- to support enhanced SMS classification and review workflow.

-- transaction_type: income | expense | transfer
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense';

-- source_type: manual | sms | ocr | recurring
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual';

-- Confidence score from SMS parser (0.0 – 1.0)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS parse_confidence numeric NULL;

-- Human-readable reason the transaction was flagged for review
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS review_reason text NULL;

-- Constraint: only valid transaction types
ALTER TABLE public.transactions
ADD CONSTRAINT transaction_type_check
CHECK (transaction_type IN ('income', 'expense', 'transfer'));
