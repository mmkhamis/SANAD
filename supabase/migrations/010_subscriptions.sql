-- 010_subscriptions.sql
-- Subscriptions table for tracking recurring app/service payments.

CREATE TABLE public.subscriptions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name               text NOT NULL,
  icon               text NOT NULL DEFAULT '📱',
  color              text NOT NULL DEFAULT '#6B7280',
  amount             numeric(12, 2) NOT NULL CHECK (amount > 0),
  billing_cycle      text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
  next_billing_date  date NOT NULL,
  category           text NOT NULL DEFAULT 'Other',
  is_active          boolean NOT NULL DEFAULT true,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_next_billing ON public.subscriptions(user_id, next_billing_date) WHERE is_active = true;
