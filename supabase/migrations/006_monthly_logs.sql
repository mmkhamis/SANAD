-- ─── Monthly Fixed Logs (Installments / Recurring) ───────────────────

CREATE TABLE IF NOT EXISTS public.monthly_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'expense',
  category_name text NULL,
  category_icon text NULL,
  category_color text NULL,
  day_of_month integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT log_type_check CHECK (type IN ('income', 'expense')),
  CONSTRAINT day_of_month_check CHECK (day_of_month >= 1 AND day_of_month <= 31)
);

CREATE INDEX IF NOT EXISTS idx_monthly_logs_user_id ON public.monthly_logs(user_id);

ALTER TABLE public.monthly_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
  ON public.monthly_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON public.monthly_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs"
  ON public.monthly_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs"
  ON public.monthly_logs FOR DELETE USING (auth.uid() = user_id);
