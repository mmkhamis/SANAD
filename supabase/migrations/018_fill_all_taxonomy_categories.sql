-- ============================================================
-- Migration 018: Fill ALL taxonomy subcategories for every user
-- For each taxonomy group, ensure the group exists and ALL
-- subcategories exist. Does NOT delete existing categories.
-- ============================================================

DO $$
DECLARE
  _uid uuid;
  _gid uuid;
BEGIN
  FOR _uid IN
    SELECT DISTINCT user_id FROM category_groups
  LOOP

    -- ══════════════════════════════════════════════════════════
    -- INCOME
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'income' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Income', '💰', '#10B981', 'income', 0, true, 'income')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'income', true, _gid, v.tkey
      FROM (VALUES
        ('Salary',            '💰', '#10B981', 'salary'),
        ('Bonus',             '🎁', '#10B981', 'bonus'),
        ('Freelance',         '💻', '#10B981', 'freelance'),
        ('Business Profit',   '🏢', '#10B981', 'business_profit'),
        ('Rental Income',     '🏠', '#10B981', 'rental_income'),
        ('Investment Income',  '📈', '#10B981', 'investment_income'),
        ('Family Support',    '🤝', '#10B981', 'family_support_in'),
        ('Gift Received',     '🎀', '#10B981', 'gift_received'),
        ('Refund / Rebate',   '🔄', '#10B981', 'refund_rebate'),
        ('Other Income',      '💵', '#10B981', 'other_income')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- BILLS & UTILITIES
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'bills_utilities' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Bills & Utilities', '🧾', '#8B5CF6', 'expense', 1, true, 'bills_utilities')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Electricity',    '⚡', '#8B5CF6', 'electricity'),
        ('Water',          '💧', '#8B5CF6', 'water'),
        ('Gas',            '🔥', '#8B5CF6', 'gas'),
        ('Internet',       '🌐', '#8B5CF6', 'internet'),
        ('Mobile',         '📱', '#8B5CF6', 'mobile'),
        ('Landline',       '☎️', '#8B5CF6', 'landline'),
        ('TV / Satellite', '📡', '#8B5CF6', 'tv_satellite'),
        ('Building Fees',  '🏢', '#8B5CF6', 'building_fees')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- HOUSING & HOME
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'housing_home' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Housing & Home', '🏠', '#6366F1', 'expense', 2, true, 'housing_home')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Rent',              '🏠', '#6366F1', 'rent'),
        ('Mortgage',          '🏦', '#6366F1', 'mortgage'),
        ('Home Maintenance',  '🔧', '#6366F1', 'home_maintenance'),
        ('Furniture',         '🛋️', '#6366F1', 'furniture'),
        ('Home Appliances',   '🏠', '#6366F1', 'home_appliances'),
        ('Cleaning Supplies', '🧹', '#6366F1', 'cleaning_supplies'),
        ('Home Decor',        '🖼️', '#6366F1', 'home_decor'),
        ('Security Services', '🔒', '#6366F1', 'security_services')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- FOOD & DINING
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'food_dining' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Food & Dining', '🍽️', '#10B981', 'expense', 3, true, 'food_dining')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Groceries',         '🛒', '#10B981', 'groceries'),
        ('Bakery',            '🍞', '#10B981', 'bakery'),
        ('Meat & Seafood',    '🥩', '#10B981', 'meat_seafood'),
        ('Restaurants',       '🍽️', '#10B981', 'restaurants'),
        ('Cafes & Coffee',    '☕', '#10B981', 'cafes_coffee'),
        ('Food Delivery',     '🛵', '#10B981', 'food_delivery'),
        ('Snacks & Sweets',   '🍰', '#10B981', 'snacks_sweets'),
        ('Water & Beverages', '🥤', '#10B981', 'water_beverages')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- TRANSPORT
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transport' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Transport', '🚗', '#F97316', 'expense', 4, true, 'transport')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Fuel',                    '⛽', '#F97316', 'fuel'),
        ('Uber / Taxi',             '🚕', '#F97316', 'uber_taxi'),
        ('Public Transport',        '🚌', '#F97316', 'public_transport'),
        ('Parking',                 '🅿️', '#F97316', 'parking'),
        ('Tolls',                   '🛣️', '#F97316', 'tolls'),
        ('Car Maintenance',         '🔧', '#F97316', 'car_maintenance'),
        ('Car Insurance',           '🛡️', '#F97316', 'car_insurance'),
        ('Registration & Licensing','📋', '#F97316', 'registration_licensing')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- SHOPPING
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'shopping' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Shopping', '🛍️', '#EC4899', 'expense', 5, true, 'shopping')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Fashion',          '👕', '#EC4899', 'fashion'),
        ('Shoes',            '👟', '#EC4899', 'shoes'),
        ('Bags & Accessories','👜', '#EC4899', 'bags_accessories'),
        ('Jewelry',          '💎', '#EC4899', 'jewelry'),
        ('Watches',          '⌚', '#EC4899', 'watches'),
        ('Electronics',      '📱', '#EC4899', 'electronics'),
        ('General Shopping',  '📦', '#EC4899', 'general_shopping'),
        ('Gifts',            '🎁', '#EC4899', 'gifts')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- HEALTH & MEDICAL
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'health_medical' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Health & Medical', '🏥', '#EF4444', 'expense', 6, true, 'health_medical')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Doctor Visits',       '🩺', '#EF4444', 'doctor_visits'),
        ('Medicines',           '💊', '#EF4444', 'medicines'),
        ('Lab Tests',           '🧪', '#EF4444', 'lab_tests'),
        ('Hospital',            '🏥', '#EF4444', 'hospital'),
        ('Dental',              '🦷', '#EF4444', 'dental'),
        ('Vision & Glasses',    '👓', '#EF4444', 'vision'),
        ('Therapy & Fitness',   '🏋️', '#EF4444', 'therapy_fitness'),
        ('Health Insurance',    '🛡️', '#EF4444', 'health_insurance')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- EDUCATION
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'education' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Education', '🎓', '#3B82F6', 'expense', 7, true, 'education')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('School Fees',       '🎓', '#3B82F6', 'school_fees'),
        ('University',        '🏫', '#3B82F6', 'university'),
        ('Courses & Training','💻', '#3B82F6', 'courses_training'),
        ('Books & Supplies',  '📖', '#3B82F6', 'books_supplies'),
        ('Tutoring',          '👨‍🏫', '#3B82F6', 'tutoring'),
        ('Exam Fees',         '📝', '#3B82F6', 'exam_fees'),
        ('School Transport',  '🚌', '#3B82F6', 'school_transport'),
        ('Language Learning',  '🗣️', '#3B82F6', 'language_learning')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- FAMILY & CHILDREN
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'family_children' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Family & Children', '👨‍👩‍👧‍👦', '#F59E0B', 'expense', 8, true, 'family_children')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Childcare',        '👶', '#F59E0B', 'childcare'),
        ('Baby Supplies',    '🍼', '#F59E0B', 'baby_supplies'),
        ('Kids Clothing',    '👗', '#F59E0B', 'kids_clothing'),
        ('Allowances',       '💵', '#F59E0B', 'allowances'),
        ('Family Support',   '🤝', '#F59E0B', 'family_support_out'),
        ('School Needs',     '🎒', '#F59E0B', 'school_needs'),
        ('Kids Activities',  '🎪', '#F59E0B', 'kids_activities'),
        ('Maternity',        '❤️', '#F59E0B', 'maternity')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- ENTERTAINMENT & LIFESTYLE
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'entertainment_lifestyle' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Entertainment & Lifestyle', '🎬', '#A855F7', 'expense', 9, true, 'entertainment_lifestyle')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Cinema & Events',    '🎬', '#A855F7', 'cinema_events'),
        ('Gaming',             '🎮', '#A855F7', 'gaming'),
        ('Hobbies',            '🎨', '#A855F7', 'hobbies'),
        ('Beauty & Grooming',  '💇', '#A855F7', 'beauty_grooming'),
        ('Sports Clubs',       '🏋️', '#A855F7', 'sports_clubs'),
        ('Social Outings',     '🎉', '#A855F7', 'social_outings'),
        ('Smoking & Shisha',   '💨', '#A855F7', 'smoking_shisha'),
        ('Personal Care',      '💆', '#A855F7', 'personal_care')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- SUBSCRIPTIONS & DIGITAL
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'subscriptions_digital' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Subscriptions & Digital', '🔄', '#06B6D4', 'expense', 10, true, 'subscriptions_digital')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Netflix',            '📺', '#06B6D4', 'netflix'),
        ('Shahid VIP',         '📺', '#06B6D4', 'shahid_vip'),
        ('Disney+',            '🎬', '#06B6D4', 'disney_plus'),
        ('Spotify',            '🎵', '#06B6D4', 'spotify'),
        ('YouTube Premium',    '▶️', '#06B6D4', 'youtube_premium'),
        ('Anghami',            '🎶', '#06B6D4', 'anghami'),
        ('iCloud / Storage',   '☁️', '#06B6D4', 'icloud_storage'),
        ('Adobe',              '🎨', '#06B6D4', 'adobe'),
        ('Microsoft',          '💻', '#06B6D4', 'microsoft'),
        ('ChatGPT / AI Tools', '🤖', '#06B6D4', 'chatgpt_ai_tools'),
        ('VPN',                '🔐', '#06B6D4', 'vpn_security'),
        ('Other Digital',      '🌐', '#06B6D4', 'other_digital')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- SAVINGS & GOALS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'savings_goals' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Savings & Goals', '🏦', '#14B8A6', 'expense', 11, true, 'savings_goals')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Emergency Fund',    '🆘', '#14B8A6', 'emergency_fund'),
        ('General Savings',   '🏦', '#14B8A6', 'general_savings'),
        ('Home Goal',         '🏠', '#14B8A6', 'home_goal'),
        ('Car Goal',          '🚗', '#14B8A6', 'car_goal'),
        ('Wedding Goal',      '💍', '#14B8A6', 'wedding_goal'),
        ('Education Goal',    '🎓', '#14B8A6', 'education_goal'),
        ('Travel Goal',       '✈️', '#14B8A6', 'travel_goal'),
        ('Hajj / Umrah Goal', '🕋', '#14B8A6', 'hajj_umrah_goal')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- INVESTMENTS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'investments' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Investments', '📈', '#0EA5E9', 'expense', 12, true, 'investments')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Stocks',                  '📈', '#0EA5E9', 'stocks'),
        ('ETFs & Funds',            '📊', '#0EA5E9', 'etfs_funds'),
        ('Crypto',                  '₿',  '#0EA5E9', 'crypto'),
        ('Gold & Silver',           '🪙', '#0EA5E9', 'gold_silver'),
        ('Real Estate Investment',  '🏗️', '#0EA5E9', 'real_estate_investment'),
        ('Private Business',        '🏢', '#0EA5E9', 'private_business'),
        ('Retirement',              '🏖️', '#0EA5E9', 'retirement'),
        ('Investment Fees',         '📄', '#0EA5E9', 'investment_fees')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- DEBT & OBLIGATIONS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'debt_obligations' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Debt & Obligations', '💳', '#DC2626', 'expense', 13, true, 'debt_obligations')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Credit Card Payment',  '💳', '#DC2626', 'credit_card_payment'),
        ('Personal Loan',        '🏦', '#DC2626', 'personal_loan'),
        ('Mortgage Payment',     '🏠', '#DC2626', 'mortgage_payment'),
        ('Car Loan',             '🚗', '#DC2626', 'car_loan'),
        ('Installments / BNPL',  '🛒', '#DC2626', 'installments_bnpl'),
        ('Taxes & Gov Fees',     '🏛️', '#DC2626', 'taxes_fees'),
        ('Legal Support',        '⚖️', '#DC2626', 'legal_support'),
        ('Alimony / Support',    '🤝', '#DC2626', 'alimony_support')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- TRAVEL
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'travel' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Travel', '✈️', '#0F766E', 'expense', 14, true, 'travel')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Flights',           '✈️', '#0F766E', 'flights'),
        ('Hotels',            '🏨', '#0F766E', 'hotels'),
        ('Visa Fees',         '🛂', '#0F766E', 'visa_fees'),
        ('Travel Transport',  '🚐', '#0F766E', 'travel_transport'),
        ('Travel Food',       '🍜', '#0F766E', 'travel_food'),
        ('Travel Shopping',   '🎒', '#0F766E', 'travel_shopping'),
        ('Travel Insurance',  '🛡️', '#0F766E', 'travel_insurance'),
        ('Hajj / Umrah',      '🕋', '#0F766E', 'hajj_umrah_trip')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- RELIGION / CHARITY / SOCIAL
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'religion_charity_social' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Religion / Charity / Social', '🕌', '#16A34A', 'expense', 15, true, 'religion_charity_social')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Zakat',              '🤲', '#16A34A', 'zakat'),
        ('Sadaqah / Charity',  '💚', '#16A34A', 'sadaqah'),
        ('Mosque / Community', '🕌', '#16A34A', 'mosque_community'),
        ('Eid / Social Giving','🌙', '#16A34A', 'eid_social_giving'),
        ('Family Occasions',   '🎊', '#16A34A', 'family_occasions'),
        ('Funeral Support',    '🌸', '#16A34A', 'funeral_support'),
        ('Religious Courses',  '📕', '#16A34A', 'religious_courses'),
        ('Qurbani / Sacrifice','🐑', '#16A34A', 'qurbani')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- BUSINESS / WORK EXPENSES
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'business_work_expenses' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Business / Work Expenses', '💼', '#475569', 'expense', 16, true, 'business_work_expenses')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Office Supplies',         '📎', '#475569', 'office_supplies'),
        ('Software & Tools',        '💿', '#475569', 'software_tools'),
        ('Business Travel',         '✈️', '#475569', 'business_travel'),
        ('Marketing & Ads',         '📣', '#475569', 'marketing_ads'),
        ('Shipping & Logistics',    '📮', '#475569', 'shipping_logistics'),
        ('Professional Services',   '🤝', '#475569', 'professional_services'),
        ('Coworking / Office Rent', '🏢', '#475569', 'coworking_office_rent'),
        ('Work Internet & Phone',   '📱', '#475569', 'internet_phone_work')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- LUXURY & STATUS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'luxury_status' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Luxury & Status', '👑', '#B45309', 'expense', 17, true, 'luxury_status')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Designer Fashion',  '✨', '#B45309', 'designer_fashion'),
        ('Luxury Bags',       '👜', '#B45309', 'luxury_bags'),
        ('Premium Watches',   '⌚', '#B45309', 'watches_premium'),
        ('Fine Dining',       '🍷', '#B45309', 'fine_dining'),
        ('Premium Travel',    '✈️', '#B45309', 'premium_travel'),
        ('VIP Events',        '⭐', '#B45309', 'vip_events'),
        ('Collectibles',      '💎', '#B45309', 'collectibles'),
        ('Luxury Home',       '🏠', '#B45309', 'luxury_home')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- PETS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'pets' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Pets', '🐾', '#8B5E3C', 'expense', 18, true, 'pets')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Pet Food',     '🦴', '#8B5E3C', 'pet_food'),
        ('Vet',          '🩺', '#8B5E3C', 'vet'),
        ('Pet Supplies', '📦', '#8B5E3C', 'pet_supplies'),
        ('Grooming',     '✂️', '#8B5E3C', 'grooming'),
        ('Boarding',     '🏠', '#8B5E3C', 'boarding'),
        ('Pet Toys',     '🧸', '#8B5E3C', 'pet_toys')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- MISCELLANEOUS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'miscellaneous' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Miscellaneous', '📦', '#94A3B8', 'expense', 19, true, 'miscellaneous')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Cash Withdrawal',     '💵', '#94A3B8', 'cash_withdrawal'),
        ('Bank Fees',           '🏛️', '#94A3B8', 'bank_fees'),
        ('Fines & Penalties',   '⚠️', '#94A3B8', 'fines_penalties'),
        ('Unexpected Expense',  '⚡', '#94A3B8', 'unexpected_expense'),
        ('Uncategorized',       '❓', '#94A3B8', 'uncategorized'),
        ('Fees & Commissions',  '🧾', '#94A3B8', 'fees_commissions'),
        ('Loss / Damage',       '🛡️', '#94A3B8', 'loss_damage'),
        ('Other Miscellaneous', '📦', '#94A3B8', 'other_misc')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

    -- ══════════════════════════════════════════════════════════
    -- TRANSFERS
    -- ══════════════════════════════════════════════════════════
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transfers' LIMIT 1;
    IF _gid IS NULL THEN
      INSERT INTO category_groups (user_id, name, icon, color, type, sort_order, is_default, taxonomy_key)
        VALUES (_uid, 'Transfers', '↔️', '#3B82F6', 'expense', 20, true, 'transfers')
        RETURNING id INTO _gid;
    END IF;
    INSERT INTO categories (user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
      SELECT _uid, v.name, v.icon, v.color, 'expense', true, _gid, v.tkey
      FROM (VALUES
        ('Between Accounts',    '🔄', '#3B82F6', 'between_accounts'),
        ('Cash to Bank',        '🏦', '#3B82F6', 'cash_to_bank'),
        ('Bank to Cash',        '💵', '#3B82F6', 'bank_to_cash'),
        ('Wallet Top-up',       '📱', '#3B82F6', 'wallet_top_up'),
        ('Move to Savings',     '🏦', '#3B82F6', 'savings_transfer'),
        ('Move to Investment',  '📈', '#3B82F6', 'investment_transfer')
      ) AS v(name, icon, color, tkey)
      WHERE NOT EXISTS (
        SELECT 1 FROM categories c WHERE c.user_id = _uid AND c.taxonomy_key = v.tkey
      );

  END LOOP;
END;
$$;
