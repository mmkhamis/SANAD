-- ============================================================
-- Migration 013: Expand to full 20-group MENA category taxonomy
-- Adds new category groups and subcategories for existing users.
-- Existing categories are NOT deleted — only new ones added.
-- ============================================================

DO $$
DECLARE
  _uid uuid;
  _gid uuid;
BEGIN
  -- Loop over every user that already has at least one category_group
  FOR _uid IN
    SELECT DISTINCT user_id FROM category_groups
  LOOP

    -- ── 1. Family & Children ──────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Family & Children') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Family & Children', '👨‍👩‍👧‍👦', '#F472B6', 'expense', 11, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Childcare / Nanny', '👶', '#F472B6', 'expense', true, _gid),
        (_uid, 'Baby Essentials', '🍼', '#EC4899', 'expense', true, _gid),
        (_uid, 'Kids Clothing', '👗', '#D946EF', 'expense', true, _gid),
        (_uid, 'Kids Activities', '🎪', '#F97316', 'expense', true, _gid),
        (_uid, 'School Transport', '🚌', '#F59E0B', 'expense', true, _gid),
        (_uid, 'Family Outings', '🎡', '#3B82F6', 'expense', true, _gid),
        (_uid, 'Elderly Care', '🧓', '#78716C', 'expense', true, _gid),
        (_uid, 'Allowances', '💵', '#10B981', 'expense', true, _gid);
    END IF;

    -- ── 2. Religion & Charity ─────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Religion & Charity') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Religion & Charity', '🕌', '#059669', 'expense', 12, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Zakat', '🤲', '#059669', 'expense', true, _gid),
        (_uid, 'Sadaqah', '💚', '#10B981', 'expense', true, _gid),
        (_uid, 'Mosque Donation', '🕌', '#14B8A6', 'expense', true, _gid),
        (_uid, 'Umrah / Hajj', '🕋', '#0D9488', 'expense', true, _gid),
        (_uid, 'Eid Expenses', '🌙', '#F59E0B', 'expense', true, _gid),
        (_uid, 'Ramadan Supplies', '🌅', '#F97316', 'expense', true, _gid),
        (_uid, 'Charity & NGOs', '❤️', '#EF4444', 'expense', true, _gid);
    END IF;

    -- ── 3. Travel ─────────────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Travel') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Travel', '✈️', '#0EA5E9', 'expense', 13, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Flights', '✈️', '#0EA5E9', 'expense', true, _gid),
        (_uid, 'Hotels & Accommodation', '🏨', '#6366F1', 'expense', true, _gid),
        (_uid, 'Car Rental', '🚙', '#F97316', 'expense', true, _gid),
        (_uid, 'Travel Insurance', '🛡️', '#3B82F6', 'expense', true, _gid),
        (_uid, 'Activities & Tours', '🗺️', '#10B981', 'expense', true, _gid),
        (_uid, 'Visa Fees', '🛂', '#7C3AED', 'expense', true, _gid);
    END IF;

    -- ── 4. Subscriptions & Digital ────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Subscriptions & Digital') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Subscriptions & Digital', '🔄', '#7C3AED', 'expense', 14, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'App Subscriptions', '📱', '#7C3AED', 'expense', true, _gid),
        (_uid, 'Cloud Storage', '☁️', '#3B82F6', 'expense', true, _gid),
        (_uid, 'Music Streaming', '🎵', '#EC4899', 'expense', true, _gid),
        (_uid, 'Video Streaming', '📺', '#EF4444', 'expense', true, _gid),
        (_uid, 'Software Licenses', '💿', '#06B6D4', 'expense', true, _gid);
    END IF;

    -- ── 5. Debt & Loans ──────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Debt & Loans') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Debt & Loans', '💳', '#DC2626', 'expense', 15, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Credit Card Payment', '💳', '#DC2626', 'expense', true, _gid),
        (_uid, 'Personal Loan', '🏦', '#EF4444', 'expense', true, _gid),
        (_uid, 'Car Loan', '🚗', '#F97316', 'expense', true, _gid),
        (_uid, 'Student Loan', '🎓', '#3B82F6', 'expense', true, _gid),
        (_uid, 'Bank Fees & Interest', '🏛️', '#64748B', 'expense', true, _gid);
    END IF;

    -- ── 6. Gifts & Social ────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Gifts & Social') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Gifts & Social', '🎁', '#F472B6', 'expense', 17, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Wedding Gifts', '💒', '#EC4899', 'expense', true, _gid),
        (_uid, 'Birthday Gifts', '🎂', '#F97316', 'expense', true, _gid),
        (_uid, 'Social Events', '🎉', '#A855F7', 'expense', true, _gid),
        (_uid, 'Tips & Gratitude', '💰', '#10B981', 'expense', true, _gid);
    END IF;

    -- ── 7. Personal Care (split from Health) ──────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Personal Care') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Personal Care', '💆', '#D946EF', 'expense', 8, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Salon & Barber', '💇', '#D946EF', 'expense', true, _gid),
        (_uid, 'Skincare', '🧴', '#F472B6', 'expense', true, _gid),
        (_uid, 'Spa & Massage', '💆', '#A855F7', 'expense', true, _gid),
        (_uid, 'Gym & Fitness', '🏋️', '#10B981', 'expense', true, _gid),
        (_uid, 'Laundry & Dry Clean', '👔', '#06B6D4', 'expense', true, _gid);
    END IF;

    -- ── 8. Dining & Cafés (split from Food) ──────────────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Dining & Cafés') THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Dining & Cafés', '☕', '#F43F5E', 'expense', 4, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Restaurants', '🍽️', '#F43F5E', 'expense', true, _gid),
        (_uid, 'Fast Food', '🍔', '#F97316', 'expense', true, _gid),
        (_uid, 'Cafés & Coffee', '☕', '#78716C', 'expense', true, _gid),
        (_uid, 'Food Delivery', '🛵', '#EF4444', 'expense', true, _gid),
        (_uid, 'Shisha / Hookah', '💨', '#8B5CF6', 'expense', true, _gid);
    END IF;

    -- ── 9. Financial & Savings (rename/expand existing Savings) ──
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Financial & Savings') THEN
      -- Attempt to rename existing 'Savings' group
      UPDATE category_groups
        SET name = 'Financial & Savings', icon = '🏦', color = '#0D9488', sort_order = 16
        WHERE user_id = _uid AND name = 'Savings';
      -- If there was no Savings group to rename, create new
      IF NOT FOUND THEN
        INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
          VALUES (_uid, 'Financial & Savings', '🏦', '#0D9488', 'expense', 16, true)
          RETURNING id INTO _gid;
        INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
          (_uid, 'Emergency Fund', '🆘', '#EF4444', 'expense', true, _gid),
          (_uid, 'Savings Account', '🏦', '#0D9488', 'expense', true, _gid),
          (_uid, 'Gold Purchase', '🪙', '#D97706', 'expense', true, _gid),
          (_uid, 'Stock Investment', '📈', '#10B981', 'expense', true, _gid);
      ELSE
        -- Get the renamed group id and add new categories
        SELECT id INTO _gid FROM category_groups WHERE user_id = _uid AND name = 'Financial & Savings';
        INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id)
          SELECT _uid, n.name, n.icon, n.color, 'expense', true, _gid
          FROM (VALUES
            ('Gold Purchase', '🪙', '#D97706'),
            ('Stock Investment', '📈', '#10B981'),
            ('Savings Account', '🏦', '#0D9488')
          ) AS n(name, icon, color)
          WHERE NOT EXISTS (
            SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.name = n.name AND c.group_id = _gid
          );
      END IF;
    END IF;

    -- ── 10. Passive Income (split from single Income) ─────────
    IF NOT EXISTS (SELECT 1 FROM category_groups WHERE user_id = _uid AND name = 'Passive Income') THEN
      -- Rename existing 'Income' → 'Earned Income'
      UPDATE category_groups
        SET name = 'Earned Income'
        WHERE user_id = _uid AND name = 'Income' AND type = 'income';

      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default)
        VALUES (_uid, 'Passive Income', '📈', '#0D9488', 'income', 2, true)
        RETURNING id INTO _gid;
      INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id) VALUES
        (_uid, 'Investment Returns', '📈', '#0D9488', 'income', true, _gid),
        (_uid, 'Rental Income', '🏠', '#6366F1', 'income', true, _gid),
        (_uid, 'Dividends', '💹', '#10B981', 'income', true, _gid),
        (_uid, 'Interest', '🏦', '#3B82F6', 'income', true, _gid),
        (_uid, 'Pension', '🧓', '#78716C', 'income', true, _gid),
        (_uid, 'Refunds & Cashback', '🔄', '#06B6D4', 'income', true, _gid),
        (_uid, 'Other Income', '💵', '#64748B', 'income', true, _gid);
    END IF;

    -- ── Rename old groups to new names (if they still have old names) ──
    UPDATE category_groups SET name = 'Housing & Rent', icon = '🏠', color = '#6366F1', sort_order = 1
      WHERE user_id = _uid AND name = 'Home' AND type = 'expense';
    UPDATE category_groups SET name = 'Utilities & Bills', icon = '🧾', color = '#8B5CF6', sort_order = 2
      WHERE user_id = _uid AND name = 'Bills' AND type = 'expense';
    UPDATE category_groups SET name = 'Groceries & Markets', icon = '🛒', color = '#10B981', sort_order = 3
      WHERE user_id = _uid AND name = 'Food' AND type = 'expense';
    UPDATE category_groups SET name = 'Transport & Fuel', icon = '🚗', color = '#F97316', sort_order = 5
      WHERE user_id = _uid AND name = 'Transport' AND type = 'expense';
    UPDATE category_groups SET name = 'Shopping & Retail', icon = '🛍️', color = '#EC4899', sort_order = 6
      WHERE user_id = _uid AND name = 'Shopping' AND type = 'expense';
    UPDATE category_groups SET name = 'Health & Medical', icon = '🏥', color = '#EF4444', sort_order = 7
      WHERE user_id = _uid AND name = 'Health' AND type = 'expense';
    UPDATE category_groups SET name = 'Other Expenses', icon = '📦', color = '#94A3B8', sort_order = 18
      WHERE user_id = _uid AND name = 'Other' AND type = 'expense';

  END LOOP;
END;
$$;
