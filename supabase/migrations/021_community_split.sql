-- Community & Split Bill feature
-- Groups of users that can split receipts and expenses

-- 1. Communities (groups)
CREATE TABLE IF NOT EXISTS public.communities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  icon        text DEFAULT '👥',
  created_by  uuid NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Community members
CREATE TABLE IF NOT EXISTS public.community_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id),
  role          text NOT NULL DEFAULT 'member', -- admin | member
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- 3. Split events (a dinner, trip, party — within a community)
CREATE TABLE IF NOT EXISTS public.split_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id  uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  title         text NOT NULL,
  date          date NOT NULL DEFAULT CURRENT_DATE,
  currency      text NOT NULL DEFAULT 'EGP',
  subtotal      numeric(12,2) NOT NULL DEFAULT 0,  -- sum of items
  tax           numeric(12,2) NOT NULL DEFAULT 0,
  service_fee   numeric(12,2) NOT NULL DEFAULT 0,   -- tip / service charge
  discount      numeric(12,2) NOT NULL DEFAULT 0,
  total         numeric(12,2) NOT NULL DEFAULT 0,   -- subtotal + tax + service_fee - discount
  status        text NOT NULL DEFAULT 'open',        -- open | settled
  created_by    uuid NOT NULL REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. Split items (line items from receipt or manual entry)
CREATE TABLE IF NOT EXISTS public.split_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.split_events(id) ON DELETE CASCADE,
  name          text NOT NULL,
  quantity      integer NOT NULL DEFAULT 1,
  unit_price    numeric(12,2) NOT NULL,
  total_price   numeric(12,2) NOT NULL, -- quantity * unit_price
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 5. Split assignments (who pays for each item — supports shared)
-- If an item is shared by 3 people, there are 3 rows with share_count=3
CREATE TABLE IF NOT EXISTS public.split_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       uuid NOT NULL REFERENCES public.split_items(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id),
  share_count   integer NOT NULL DEFAULT 1, -- how many people share this item
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, user_id)
);

-- 6. Split settlements — computed: what each user owes for the event
CREATE TABLE IF NOT EXISTS public.split_settlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.split_events(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id),
  items_total   numeric(12,2) NOT NULL DEFAULT 0,  -- user's share of items
  extras_share  numeric(12,2) NOT NULL DEFAULT 0,  -- proportional tax + service - discount
  amount_owed   numeric(12,2) NOT NULL DEFAULT 0,  -- items_total + extras_share
  is_paid       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_members_community ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_split_events_community ON public.split_events(community_id);
CREATE INDEX IF NOT EXISTS idx_split_items_event ON public.split_items(event_id);
CREATE INDEX IF NOT EXISTS idx_split_assignments_item ON public.split_assignments(item_id);
CREATE INDEX IF NOT EXISTS idx_split_settlements_event ON public.split_settlements(event_id);

-- RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_settlements ENABLE ROW LEVEL SECURITY;

-- Helper: security-definer function to avoid infinite recursion in RLS policies
-- (RLS on community_members cannot SELECT community_members in its own policy)
CREATE OR REPLACE FUNCTION public.get_my_community_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT community_id FROM community_members WHERE user_id = auth.uid();
$$;

-- ─── communities ─────────────────────────────────────────────────────
CREATE POLICY "Members can view community"
  ON public.communities FOR SELECT
  USING (id IN (SELECT get_my_community_ids()) OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update community"
  ON public.communities FOR UPDATE
  USING (id IN (SELECT get_my_community_ids()));

-- ─── community_members ───────────────────────────────────────────────
CREATE POLICY "Members can view all community members"
  ON public.community_members FOR SELECT
  USING (community_id IN (SELECT get_my_community_ids()));

CREATE POLICY "Users can add self or admin can add"
  ON public.community_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR community_id IN (SELECT get_my_community_ids())
  );

CREATE POLICY "Admins can update members"
  ON public.community_members FOR UPDATE
  USING (community_id IN (SELECT get_my_community_ids()));

CREATE POLICY "Admins can remove members"
  ON public.community_members FOR DELETE
  USING (community_id IN (SELECT get_my_community_ids()));

-- ─── split_events ────────────────────────────────────────────────────
CREATE POLICY "Members can view events"
  ON public.split_events FOR SELECT
  USING (community_id IN (SELECT get_my_community_ids()));

CREATE POLICY "Members can create events"
  ON public.split_events FOR INSERT
  WITH CHECK (community_id IN (SELECT get_my_community_ids()));

CREATE POLICY "Event creator can update"
  ON public.split_events FOR UPDATE
  USING (created_by = auth.uid());

-- ─── split_items ─────────────────────────────────────────────────────
CREATE POLICY "Members can view items"
  ON public.split_items FOR SELECT
  USING (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

CREATE POLICY "Members can insert items"
  ON public.split_items FOR INSERT
  WITH CHECK (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

CREATE POLICY "Members can update items"
  ON public.split_items FOR UPDATE
  USING (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

CREATE POLICY "Members can delete items"
  ON public.split_items FOR DELETE
  USING (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

-- ─── split_assignments ───────────────────────────────────────────────
CREATE POLICY "Members can view assignments"
  ON public.split_assignments FOR SELECT
  USING (item_id IN (SELECT id FROM split_items WHERE event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids()))));

CREATE POLICY "Members can insert assignments"
  ON public.split_assignments FOR INSERT
  WITH CHECK (item_id IN (SELECT id FROM split_items WHERE event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids()))));

CREATE POLICY "Members can update assignments"
  ON public.split_assignments FOR UPDATE
  USING (item_id IN (SELECT id FROM split_items WHERE event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids()))));

CREATE POLICY "Members can delete assignments"
  ON public.split_assignments FOR DELETE
  USING (item_id IN (SELECT id FROM split_items WHERE event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids()))));

-- ─── split_settlements ───────────────────────────────────────────────
CREATE POLICY "Members can view settlements"
  ON public.split_settlements FOR SELECT
  USING (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

CREATE POLICY "Members can insert settlements"
  ON public.split_settlements FOR INSERT
  WITH CHECK (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

CREATE POLICY "Members can update settlements"
  ON public.split_settlements FOR UPDATE
  USING (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));

CREATE POLICY "Members can delete settlements"
  ON public.split_settlements FOR DELETE
  USING (event_id IN (SELECT id FROM split_events WHERE community_id IN (SELECT get_my_community_ids())));
