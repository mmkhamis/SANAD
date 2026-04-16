-- 012_category_groups.sql
-- Adds hierarchical categories: category_groups (parents) + categories (children).
-- Existing flat categories are reorganized under groups per user.

-- ─── category_groups table ───────────────────────────────────────────

CREATE TABLE public.category_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  icon        text NOT NULL,
  color       text NOT NULL,
  type        public.transaction_type NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own category groups"
  ON public.category_groups
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_category_groups_user ON public.category_groups(user_id);

-- ─── Add group_id to categories ──────────────────────────────────────

ALTER TABLE public.categories
  ADD COLUMN group_id uuid REFERENCES public.category_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_categories_group ON public.categories(group_id);

-- ─── Migrate existing default categories into groups ─────────────────
-- For each user that has categories, create default groups and assign.

DO $$
DECLARE
  u record;
  g_id uuid;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.categories LOOP
    -- ── Expense groups ───────────────────────────────────────────
    -- Bills
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Bills', '🧾', '#6366F1', 'expense', 1, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Electricity', 'Water', 'Gas', 'Internet', 'Mobile / Phone', 'Subscriptions');

    -- Home
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Home', '🏠', '#14B8A6', 'expense', 2, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Housing / Rent', 'Home Supplies');

    -- Food
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Food', '🍽️', '#F43F5E', 'expense', 3, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Groceries', 'Dining / Food');

    -- Transport
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Transport', '🚌', '#F97316', 'expense', 4, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Transportation', 'Fuel', 'Travel');

    -- Shopping
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Shopping', '🛍️', '#EC4899', 'expense', 5, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Shopping');

    -- Health
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Health', '🏥', '#EF4444', 'expense', 6, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Healthcare', 'Personal Care');

    -- Entertainment
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Entertainment', '🎬', '#A855F7', 'expense', 7, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Entertainment');

    -- Education
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Education', '🎓', '#6366F1', 'expense', 8, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Education');

    -- Financial
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Financial', '💳', '#DC2626', 'expense', 9, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Savings', 'Investments', 'Debt / Loans', 'Charity');

    -- Other
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Other', '📦', '#94A3B8', 'expense', 10, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND name IN ('Family', 'Miscellaneous')
      AND group_id IS NULL;

    -- ── Income group ─────────────────────────────────────────────
    INSERT INTO public.category_groups (user_id, name, icon, color, type, sort_order, is_default)
    VALUES (u.user_id, 'Income', '💰', '#10B981', 'income', 1, true) RETURNING id INTO g_id;
    UPDATE public.categories SET group_id = g_id
    WHERE user_id = u.user_id AND type = 'income';

  END LOOP;
END $$;
