-- Migration 052: Ensure ALL canonical subcategories for every taxonomy group
--
-- 046 only covered 5 groups. This comprehensive migration covers all 17 groups
-- so that SMS AI categorization can always find a matching category row.

BEGIN;

CREATE OR REPLACE FUNCTION _ensure_one_v2(
  _uid   uuid,
  _gid   uuid,
  _color text,
  _name  text,
  _icon  text,
  _tk    text,
  _type  text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM categories
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NULL
  ) THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM categories
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL
  ) THEN
    UPDATE categories
    SET retired_at = NULL, group_id = _gid, icon = _icon, name = _name, color = _color
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL
      AND id = (
        SELECT id FROM categories
        WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL
        ORDER BY created_at DESC LIMIT 1
      );
    RETURN;
  END IF;

  INSERT INTO categories (id, user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
  VALUES (gen_random_uuid(), _uid, _name, _icon, _color, _type::transaction_type, true, _gid, _tk);
END;
$$;

CREATE OR REPLACE FUNCTION _ensure_all_subcats_v2() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _uid uuid;
  _gid uuid;
  _color text;
BEGIN
  FOR _uid IN SELECT DISTINCT user_id FROM category_groups WHERE retired_at IS NULL
  LOOP

    -- ═══ INCOME ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'income' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Salary',             'briefcase',     'salary',            'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Bonus',              'award',         'bonus',             'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Freelance',          'laptop',        'freelance',         'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Business Profit',    'store',         'business_profit',   'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Rental Income',      'building-2',    'rental_income',     'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Investment Income',  'chart-column',  'investment_income', 'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Support Received',   'hand-coins',    'family_support_in', 'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Gift Received',      'gift',          'gift_received',     'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Refund / Rebate',    'rotate-ccw',    'refund_rebate',     'income');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Other Income',       'plus-circle',   'other_income',      'income');
    END IF;

    -- ═══ BILLS & UTILITIES ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'bills_utilities' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Electricity',        'zap',           'electricity',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Water',              'droplets',      'water',              'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Gas',                'flame',         'gas',                'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Internet',           'wifi',          'internet',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Mobile',             'smartphone',    'mobile',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'TV / Satellite',     'tv',            'tv_satellite',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Building Fees',      'building',      'building_fees',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Government Services','landmark',      'government_services','expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Absher / Gov Apps',  'smartphone',    'absher',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Fawry',              'receipt',       'fawry',              'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Digital Egypt',      'landmark',      'e_gov_egypt',        'expense');
    END IF;

    -- ═══ HOUSING & HOME ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'housing_home' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Rent',               'key',           'rent',               'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Mortgage',           'landmark',      'mortgage',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Home Maintenance',   'hammer',        'home_maintenance',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Furniture',          'sofa',          'furniture',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Home Appliances',    'refrigerator',  'home_appliances',    'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Cleaning Supplies',  'spray-can',     'cleaning_supplies',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Home Decor',         'lamp',          'home_decor',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Security Services',  'shield',        'security_services',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Domestic Worker',    'user-round',    'domestic_worker',    'expense');
    END IF;

    -- ═══ FOOD & DINING ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'food_dining' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Groceries',          'shopping-cart',  'groceries',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Bakery',             'croissant',      'bakery',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Meat & Seafood',     'fish',           'meat_seafood',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Restaurants',        'chef-hat',       'restaurants',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Cafes & Coffee',     'coffee',         'cafes_coffee',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Food Delivery',      'bike',           'food_delivery',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'HungerStation',      'smartphone',     'hungerstation',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Jahez',              'bike',           'jahez',              'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Marsool',            'package',        'marsool',            'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Talabat',            'shopping-bag',   'talabat',            'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'elmenus',            'utensils',       'elmenus',            'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Snacks & Sweets',    'ice-cream-cone', 'snacks_sweets',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Water & Beverages',  'cup-soda',       'water_beverages',    'expense');
    END IF;

    -- ═══ TRANSPORT ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transport' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Fuel',                     'fuel',            'fuel',                  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Uber / Taxi',              'car-taxi-front',  'uber_taxi',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Careem',                   'car-taxi-front',  'careem',                'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Public Transport',         'bus',             'public_transport',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Parking',                  'parking-circle',  'parking',               'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Tolls',                    'road',            'tolls',                 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Car Maintenance',          'wrench',          'car_maintenance',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Car Insurance',            'shield-check',    'car_insurance',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Registration & Licensing', 'file-badge',      'registration_licensing','expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Car Rental',               'car-front',       'car_rental',            'expense');
    END IF;

    -- ═══ SHOPPING ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'shopping' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Fashion',           'shirt',      'fashion',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Shoes',             'footprints', 'shoes',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Bags & Accessories','briefcase',  'bags_accessories',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Jewelry',           'gem',        'jewelry',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Watches',           'watch',      'watches',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Electronics',       'smartphone', 'electronics',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'General Shopping',  'package',    'general_shopping',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Gifts',             'gift',       'gifts',             'expense');
    END IF;

    -- ═══ HEALTH & MEDICAL ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'health_medical' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Doctor Visits',      'stethoscope',   'doctor_visits',    'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Medicines',          'pill',          'medicines',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Lab Tests',          'flask-conical', 'lab_tests',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Hospital',           'hospital',      'hospital',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Dental',             'smile-plus',    'dental',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Therapy & Fitness',  'activity',      'therapy_fitness',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Health Insurance',   'shield-plus',   'health_insurance', 'expense');
    END IF;

    -- ═══ EDUCATION ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'education' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'School Fees',        'school',          'school_fees',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'University',         'building-library','university',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Courses & Training', 'book-open',       'courses_training',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Books & Supplies',   'book',            'books_supplies',    'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Tutoring',           'user-round',      'tutoring',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Exam Fees',          'file-pen-line',   'exam_fees',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'School Transport',   'bus-front',       'school_transport',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Language Learning',  'languages',       'language_learning', 'expense');
    END IF;

    -- ═══ FAMILY & CHILDREN ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'family_children' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Childcare',         'baby',           'childcare',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Baby Supplies',     'baby',           'baby_supplies',     'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Kids Clothing',     'shirt',          'kids_clothing',     'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Allowances',        'banknote',       'allowances',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Family Support',    'hand-heart',     'family_support_out','expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'School Needs',      'backpack',       'school_needs',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Kids Activities',   'toy-brick',      'kids_activities',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Maternity',         'heart',          'maternity',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Elderly Care',      'heart-handshake','elderly_care',      'expense');
    END IF;

    -- ═══ ENTERTAINMENT & LIFESTYLE ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'entertainment_lifestyle' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Cinema & Events',    'ticket',         'cinema_events',    'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Gaming',             'gamepad-2',      'gaming',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Hobbies',            'palette',        'hobbies',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Beauty & Grooming',  'sparkles',       'beauty_grooming',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Sports Clubs',       'dumbbell',       'sports_clubs',     'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Social Outings',     'party-popper',   'social_outings',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Smoking & Shisha',   'cigarette',      'smoking_shisha',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Laundry & Dry Clean','washing-machine','laundry',          'expense');
    END IF;

    -- ═══ SUBSCRIPTIONS & DIGITAL ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'subscriptions_digital' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Netflix',            'monitor-play',    'netflix',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Shahid VIP',         'tv',              'shahid_vip',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Disney+',            'film',            'disney_plus',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Spotify',            'music-4',         'spotify',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'YouTube Premium',    'youtube',         'youtube_premium',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Anghami',            'music',           'anghami',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'iCloud / Storage',   'cloud',           'icloud_storage',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'ChatGPT / AI Tools', 'bot',             'chatgpt_ai_tools', 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'VPN',                'shield-ellipsis', 'vpn_security',     'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Other Digital',      'globe',           'other_digital',    'expense');
    END IF;

    -- ═══ SAVINGS & GOALS ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'savings_goals' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Emergency Fund',    'shield-alert',   'emergency_fund',   'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'General Savings',   'wallet-cards',   'general_savings',  'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Home Goal',         'house',          'home_goal',        'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Car Goal',          'car',            'car_goal',         'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Wedding Goal',      'heart-handshake','wedding_goal',     'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Education Goal',    'graduation-cap', 'education_goal',   'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Travel Goal',       'plane',          'travel_goal',      'savings');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Hajj / Umrah Goal', 'moon-star',      'hajj_umrah_goal',  'savings');
    END IF;

    -- ═══ INVESTMENTS ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'investments' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Stocks',                   'chart-line',     'stocks',                  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'ETFs & Funds',             'chart-pie',      'etfs_funds',              'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Crypto',                   'bitcoin',        'crypto',                  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Gold & Silver',            'coins',          'gold_silver',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Real Estate Investment',   'building-2',     'real_estate_investment',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Private Business',         'store',          'private_business',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Retirement',               'hourglass',      'retirement',              'expense');
    END IF;

    -- ═══ DEBT & OBLIGATIONS ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'debt_obligations' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Credit Card Payment', 'credit-card',    'credit_card_payment', 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Personal Loan',       'hand-coins',     'personal_loan',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Mortgage Payment',    'house-plus',     'mortgage_payment',    'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Car Loan',            'car-front',      'car_loan',            'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Installments / BNPL', 'calendar-sync',  'installments_bnpl',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Tabby',               'smartphone-nfc', 'tabby',               'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Tamara',              'smartphone-nfc', 'tamara',              'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Taxes & Gov Fees',    'receipt-text',   'taxes_fees',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Legal Support',       'scale',          'legal_support',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Alimony / Support',   'hand-heart',     'alimony_support',     'expense');
    END IF;

    -- ═══ TRAVEL ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'travel' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Flights',            'plane-takeoff', 'flights',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Hotels',             'hotel',         'hotels',            'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Visa Fees',          'passport',      'visa_fees',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Travel Transport',   'train-front',   'travel_transport',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Travel Food',        'utensils',      'travel_food',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Travel Shopping',    'shopping-bag',  'travel_shopping',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Travel Insurance',   'shield-check',  'travel_insurance',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Hajj / Umrah',       'moon-star',     'hajj_umrah_trip',   'expense');
    END IF;

    -- ═══ RELIGION, CHARITY & SOCIAL ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'religion_charity_social' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Zakat',              'hand-coins',     'zakat',             'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Sadaqah / Charity',  'heart',          'sadaqah',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Mosque / Community', 'building',       'mosque_community',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Eid / Social Giving','gift',           'eid_social_giving', 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Family Occasions',   'users',          'family_occasions',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Funeral Support',    'flower-2',       'funeral_support',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Religious Courses',  'book-heart',     'religious_courses', 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Qurbani / Sacrifice','beef',           'qurbani',           'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Ramadan Supplies',   'moon-star',      'ramadan_supplies',  'expense');
    END IF;

    -- ═══ BUSINESS & WORK ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'business_work_expenses' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Office Supplies',        'paperclip',     'office_supplies',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Software & Tools',       'monitor-cog',   'software_tools',         'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Business Travel',        'plane',         'business_travel',        'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Marketing & Ads',        'megaphone',     'marketing_ads',          'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Shipping & Logistics',   'truck',         'shipping_logistics',     'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Professional Services',  'users-round',   'professional_services',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Coworking / Office Rent','building',      'coworking_office_rent',  'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Work Internet & Phone',  'smartphone',    'internet_phone_work',    'expense');
    END IF;

    -- ═══ PETS ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'pets' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Pet Food',       'bone',         'pet_food',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Vet',            'stethoscope',  'vet',            'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Pet Supplies',   'package',      'pet_supplies',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Grooming',       'scissors',     'grooming',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Boarding',       'house',        'boarding',       'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Pet Toys',       'toy-brick',    'pet_toys',       'expense');
    END IF;

    -- ═══ FINES ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'fines' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Traffic Fines',         'car',              'traffic_fines',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Parking Fines',         'parking-circle',   'parking_fines',      'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Government Fines',      'landmark',         'government_fines',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Late Payment Penalties','clock',            'late_payment_fines', 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Other Fines',           'octagon-alert',    'other_fines',        'expense');
    END IF;

    -- ═══ MISCELLANEOUS ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'miscellaneous' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Cash Withdrawal',     'banknote',       'cash_withdrawal',    'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Fees & Commissions',  'receipt',        'fees_commissions',   'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Unexpected Expense',  'triangle-alert', 'unexpected_expense', 'expense');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Uncategorized',       'circle-help',    'uncategorized',      'expense');
    END IF;

    -- ═══ TRANSFERS ═══
    SELECT id, color INTO _gid, _color FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transfers' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Between Accounts',    'repeat',          'between_accounts',    'transfer');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Cash to Bank',        'landmark',        'cash_to_bank',        'transfer');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Bank to Cash',        'wallet',          'bank_to_cash',        'transfer');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Wallet Top-up',       'smartphone',      'wallet_top_up',       'transfer');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Move to Savings',     'piggy-bank',      'savings_transfer',    'transfer');
      PERFORM _ensure_one_v2(_uid, _gid, _color, 'Move to Investment',  'candlestick-chart','investment_transfer','transfer');
    END IF;

  END LOOP;
END;
$$;

SELECT _ensure_all_subcats_v2();

DROP FUNCTION IF EXISTS _ensure_all_subcats_v2();
DROP FUNCTION IF EXISTS _ensure_one_v2(uuid, uuid, text, text, text, text, text);

COMMIT;
