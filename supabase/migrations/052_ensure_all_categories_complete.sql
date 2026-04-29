-- Migration 052: Ensure ALL category groups and subcategories from the
-- full taxonomy exist for every user. Previous migrations only covered
-- 5 groups — this covers all 18+ groups and their subcategories.

BEGIN;

-- ─── Helper: ensure a category_group exists for a user ──────────────
CREATE OR REPLACE FUNCTION _ensure_group(
  _uid   uuid,
  _tk    text,
  _name  text,
  _icon  text,
  _color text,
  _type  text
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  _gid uuid;
BEGIN
  SELECT id INTO _gid FROM category_groups
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NULL LIMIT 1;
  IF _gid IS NOT NULL THEN RETURN _gid; END IF;

  -- Un-retire if exists
  SELECT id INTO _gid FROM category_groups
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL LIMIT 1;
  IF _gid IS NOT NULL THEN
    UPDATE category_groups SET retired_at = NULL, name = _name, icon = _icon, color = _color
      WHERE id = _gid;
    RETURN _gid;
  END IF;

  _gid := gen_random_uuid();
  INSERT INTO category_groups (id, user_id, name, icon, color, type, taxonomy_key)
    VALUES (_gid, _uid, _name, _icon, _color, _type::transaction_type, _tk);
  RETURN _gid;
END;
$$;

-- ─── Helper: ensure a single subcategory exists ─────────────────────
CREATE OR REPLACE FUNCTION _ensure_sub(
  _uid   uuid,
  _gid   uuid,
  _color text,
  _name  text,
  _icon  text,
  _tk    text,
  _type  text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM categories WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NULL) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM categories WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL) THEN
    UPDATE categories SET retired_at = NULL, group_id = _gid, icon = _icon, name = _name, color = _color
      WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL
      AND id = (SELECT id FROM categories WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NOT NULL ORDER BY created_at DESC LIMIT 1);
    RETURN;
  END IF;
  INSERT INTO categories (id, user_id, name, icon, color, type, is_default, group_id, taxonomy_key)
    VALUES (gen_random_uuid(), _uid, _name, _icon, _color, _type::transaction_type, true, _gid, _tk);
END;
$$;

-- ─── Main function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _ensure_all_cats() RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _uid uuid;
  _gid uuid;
  _c   text;
BEGIN
  FOR _uid IN SELECT DISTINCT user_id FROM category_groups WHERE retired_at IS NULL
  LOOP

    -- ═══ INCOME ═══
    _gid := _ensure_group(_uid, 'income', 'Income', 'wallet', '#10B981', 'income');
    _c := '#10B981';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Salary',            'briefcase',     'salary',            'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Bonus',             'award',         'bonus',             'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Freelance',         'laptop',        'freelance',         'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Business Profit',   'store',         'business_profit',   'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Rental Income',     'building-2',    'rental_income',     'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Investment Income',  'chart-column', 'investment_income',  'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Support Received',  'hand-coins',    'family_support_in', 'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Gift Received',     'gift',          'gift_received',     'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Refund / Rebate',   'rotate-ccw',    'refund_rebate',     'income');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Other Income',      'plus-circle',   'other_income',      'income');

    -- ═══ BILLS & UTILITIES ═══
    _gid := _ensure_group(_uid, 'bills_utilities', 'Bills & Utilities', 'file-text', '#F59E0B', 'expense');
    _c := '#F59E0B';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Electricity',       'zap',           'electricity',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Water',             'droplets',      'water',             'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Gas',               'flame',         'gas',               'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Internet',          'wifi',          'internet',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Mobile',            'smartphone',    'mobile',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'TV / Satellite',    'tv',            'tv_satellite',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Building Fees',     'building',      'building_fees',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Government Services','landmark',     'government_services','expense');

    -- ═══ HOUSING & HOME ═══
    _gid := _ensure_group(_uid, 'housing_home', 'Housing & Home', 'house', '#8B5CF6', 'expense');
    _c := '#8B5CF6';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Rent',              'key',           'rent',              'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Mortgage',          'landmark',      'mortgage',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Home Maintenance',  'hammer',        'home_maintenance',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Furniture',         'sofa',          'furniture',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Home Appliances',   'refrigerator',  'home_appliances',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Cleaning Supplies', 'spray-can',     'cleaning_supplies', 'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Home Decor',        'lamp',          'home_decor',        'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Security Services', 'shield',        'security_services', 'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Domestic Worker',   'user-round',    'domestic_worker',   'expense');

    -- ═══ FOOD & DINING ═══ (046 already covers, but ensure completeness)
    _gid := _ensure_group(_uid, 'food_dining', 'Food & Dining', 'utensils', '#F97316', 'expense');
    _c := '#F97316';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Groceries',         'shopping-cart', 'groceries',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Bakery',            'croissant',     'bakery',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Meat & Seafood',    'fish',          'meat_seafood',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Restaurants',       'chef-hat',      'restaurants',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Cafes & Coffee',    'coffee',        'cafes_coffee',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Food Delivery',     'bike',          'food_delivery',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Snacks & Sweets',   'ice-cream-cone','snacks_sweets',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Water & Beverages', 'cup-soda',      'water_beverages',   'expense');

    -- ═══ TRANSPORT ═══
    _gid := _ensure_group(_uid, 'transport', 'Transport', 'car', '#3B82F6', 'expense');
    _c := '#3B82F6';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Fuel',              'fuel',          'fuel',              'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Uber / Taxi',       'car-taxi-front','uber_taxi',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Public Transport',  'bus',           'public_transport',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Parking',           'parking-circle','parking',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Tolls',             'road',          'tolls',             'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Car Maintenance',   'wrench',        'car_maintenance',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Car Insurance',     'shield-check',  'car_insurance',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Registration & Licensing','file-badge','registration_licensing','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Car Rental',        'car-front',     'car_rental',        'expense');

    -- ═══ SHOPPING ═══
    _gid := _ensure_group(_uid, 'shopping', 'Shopping', 'shopping-bag', '#EC4899', 'expense');
    _c := '#EC4899';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Fashion',           'shirt',         'fashion',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Shoes',             'footprints',    'shoes',             'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Bags & Accessories','briefcase',     'bags_accessories',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Jewelry',           'gem',           'jewelry',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Watches',           'watch',         'watches',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Electronics',       'smartphone',    'electronics',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'General Shopping',  'package',       'general_shopping',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Gifts',             'gift',          'gifts',             'expense');

    -- ═══ HEALTH & MEDICAL ═══
    _gid := _ensure_group(_uid, 'health_medical', 'Health & Medical', 'heart-pulse', '#EF4444', 'expense');
    _c := '#EF4444';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Doctor Visits',     'stethoscope',   'doctor_visits',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Medicines',         'pill',          'medicines',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Lab Tests',         'flask-conical', 'lab_tests',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Hospital',          'hospital',      'hospital',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Dental',            'smile-plus',    'dental',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Therapy & Fitness', 'activity',      'therapy_fitness',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Health Insurance',  'shield-plus',   'health_insurance',  'expense');

    -- ═══ EDUCATION ═══
    _gid := _ensure_group(_uid, 'education', 'Education', 'graduation-cap', '#6366F1', 'expense');
    _c := '#6366F1';
    PERFORM _ensure_sub(_uid, _gid, _c, 'School Fees',       'school',        'school_fees',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'University',        'building-library','university',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Courses & Training','book-open',     'courses_training',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Books & Supplies',  'book',          'books_supplies',    'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Tutoring',          'user-round',    'tutoring',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Exam Fees',         'file-pen-line', 'exam_fees',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'School Transport',  'bus-front',     'school_transport',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Language Learning',  'languages',    'language_learning',  'expense');

    -- ═══ FAMILY & CHILDREN ═══
    _gid := _ensure_group(_uid, 'family_children', 'Family & Children', 'baby', '#F472B6', 'expense');
    _c := '#F472B6';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Childcare',         'baby',          'childcare',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Baby Supplies',     'baby',          'baby_supplies',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Kids Clothing',     'shirt',         'kids_clothing',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Allowances',        'banknote',      'allowances',        'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Family Support',    'hand-heart',    'family_support_out','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'School Needs',      'backpack',      'school_needs',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Kids Activities',   'toy-brick',     'kids_activities',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Maternity',         'heart',         'maternity',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Elderly Care',      'heart-handshake','elderly_care',     'expense');

    -- ═══ ENTERTAINMENT & LIFESTYLE ═══
    _gid := _ensure_group(_uid, 'entertainment_lifestyle', 'Entertainment & Lifestyle', 'sparkles', '#A855F7', 'expense');
    _c := '#A855F7';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Cinema & Events',   'ticket',        'cinema_events',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Gaming',            'gamepad-2',     'gaming',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Hobbies',           'palette',       'hobbies',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Beauty & Grooming', 'sparkles',      'beauty_grooming',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Sports Clubs',      'dumbbell',      'sports_clubs',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Social Outings',    'party-popper',  'social_outings',    'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Smoking & Shisha',  'cigarette',     'smoking_shisha',    'expense');

    -- ═══ SUBSCRIPTIONS & DIGITAL ═══
    _gid := _ensure_group(_uid, 'subscriptions_digital', 'Subscriptions & Digital', 'credit-card', '#06B6D4', 'expense');
    _c := '#06B6D4';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Netflix',           'monitor-play',  'netflix',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Shahid VIP',        'tv',            'shahid_vip',        'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Disney+',           'film',          'disney_plus',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Spotify',           'music-4',       'spotify',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'YouTube Premium',   'youtube',       'youtube_premium',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Anghami',           'music',         'anghami',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'iCloud / Storage',  'cloud',         'icloud_storage',    'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'ChatGPT / AI Tools','bot',           'chatgpt_ai_tools',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'VPN',               'shield-ellipsis','vpn_security',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Other Digital',     'globe',         'other_digital',     'expense');

    -- ═══ SAVINGS & GOALS ═══
    _gid := _ensure_group(_uid, 'savings_goals', 'Savings & Goals', 'piggy-bank', '#22C55E', 'expense');
    _c := '#22C55E';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Emergency Fund',    'shield-alert',  'emergency_fund',    'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'General Savings',   'wallet-cards',  'general_savings',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Home Goal',         'house',         'home_goal',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Car Goal',          'car',           'car_goal',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Wedding Goal',      'heart-handshake','wedding_goal',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Education Goal',    'graduation-cap','education_goal',    'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Travel Goal',       'plane',         'travel_goal',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Hajj / Umrah Goal', 'moon-star',     'hajj_umrah_goal',   'expense');

    -- ═══ INVESTMENTS ═══
    _gid := _ensure_group(_uid, 'investments', 'Investments', 'chart-line', '#14B8A6', 'expense');
    _c := '#14B8A6';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Stocks',            'chart-line',    'stocks',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'ETFs & Funds',      'chart-pie',     'etfs_funds',        'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Crypto',            'bitcoin',       'crypto',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Gold & Silver',     'coins',         'gold_silver',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Real Estate Investment','building-2','real_estate_investment','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Private Business',  'store',         'private_business',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Retirement',        'hourglass',     'retirement',        'expense');

    -- ═══ DEBT & OBLIGATIONS ═══
    _gid := _ensure_group(_uid, 'debt_obligations', 'Debt & Obligations', 'scale', '#EF4444', 'expense');
    _c := '#EF4444';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Credit Card Payment','credit-card',  'credit_card_payment','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Personal Loan',     'hand-coins',    'personal_loan',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Mortgage Payment',  'house-plus',    'mortgage_payment',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Car Loan',          'car-front',     'car_loan',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Installments / BNPL','calendar-sync','installments_bnpl', 'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Taxes & Government Fees','receipt-text','taxes_fees',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Legal Support',     'scale',         'legal_support',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Alimony / Support', 'hand-heart',    'alimony_support',   'expense');

    -- ═══ TRAVEL ═══
    _gid := _ensure_group(_uid, 'travel', 'Travel', 'plane', '#0EA5E9', 'expense');
    _c := '#0EA5E9';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Flights',           'plane-takeoff', 'flights',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Hotels',            'hotel',         'hotels',            'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Visa Fees',         'passport',      'visa_fees',         'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Travel Transport',  'train-front',   'travel_transport',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Travel Food',       'utensils',      'travel_food',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Travel Shopping',   'shopping-bag',  'travel_shopping',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Travel Insurance',  'shield-check',  'travel_insurance',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Hajj / Umrah',      'moon-star',    'hajj_umrah_trip',   'expense');

    -- ═══ RELIGION / CHARITY / SOCIAL ═══
    _gid := _ensure_group(_uid, 'religion_charity_social', 'Religion / Charity / Social Duties', 'heart', '#F59E0B', 'expense');
    _c := '#F59E0B';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Zakat',             'hand-coins',    'zakat',             'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Sadaqah / Charity', 'heart',         'sadaqah',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Mosque / Community','building',      'mosque_community',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Eid / Social Giving','gift',         'eid_social_giving', 'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Family Occasions',  'users',         'family_occasions',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Funeral Support',   'flower-2',      'funeral_support',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Religious Courses', 'book-heart',    'religious_courses',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Qurbani / Sacrifice','beef',         'qurbani',           'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Ramadan Supplies',  'moon-star',     'ramadan_supplies',  'expense');

    -- ═══ BUSINESS / WORK EXPENSES ═══
    _gid := _ensure_group(_uid, 'business_work_expenses', 'Business / Work Expenses', 'briefcase', '#64748B', 'expense');
    _c := '#64748B';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Office Supplies',   'paperclip',     'office_supplies',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Software & Tools',  'monitor-cog',   'software_tools',    'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Business Travel',   'plane',         'business_travel',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Marketing & Ads',   'megaphone',     'marketing_ads',     'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Shipping & Logistics','truck',       'shipping_logistics','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Professional Services','users-round','professional_services','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Coworking / Office Rent','building', 'coworking_office_rent','expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Work Internet & Phone','smartphone', 'internet_phone_work','expense');

    -- ═══ PETS ═══
    _gid := _ensure_group(_uid, 'pets', 'Pets', 'paw-print', '#A3E635', 'expense');
    _c := '#A3E635';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Pet Food',          'bone',          'pet_food',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Vet',               'stethoscope',   'vet',               'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Pet Supplies',      'package',       'pet_supplies',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Grooming',          'scissors',      'grooming',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Boarding / Sitting','house',         'boarding',          'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Pet Toys',          'toy-brick',     'pet_toys',          'expense');

    -- ═══ FINES & VIOLATIONS ═══
    _gid := _ensure_group(_uid, 'fines', 'Fines & Violations', 'siren', '#DC2626', 'expense');
    _c := '#DC2626';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Traffic Fines',         'car',            'traffic_fines',       'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Parking Fines',         'parking-circle',  'parking_fines',      'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Government Fines',      'landmark',        'government_fines',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Late Payment Penalties', 'clock',          'late_payment_fines', 'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Other Fines',           'octagon-alert',   'other_fines',        'expense');

    -- ═══ MISCELLANEOUS ═══
    _gid := _ensure_group(_uid, 'miscellaneous', 'Miscellaneous', 'boxes', '#94A3B8', 'expense');
    _c := '#94A3B8';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Cash Withdrawal',   'banknote',      'cash_withdrawal',   'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Fees & Commissions','receipt',       'fees_commissions',  'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Unexpected Expense','triangle-alert','unexpected_expense', 'expense');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Uncategorized',     'circle-help',   'uncategorized',     'expense');

    -- ═══ TRANSFERS ═══
    _gid := _ensure_group(_uid, 'transfers', 'Transfers', 'repeat', '#64748B', 'transfer');
    _c := '#64748B';
    PERFORM _ensure_sub(_uid, _gid, _c, 'Between Accounts',  'repeat',        'between_accounts',  'transfer');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Cash to Bank',      'landmark',      'cash_to_bank',      'transfer');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Bank to Cash',      'wallet',        'bank_to_cash',      'transfer');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Wallet Top-up',     'smartphone',    'wallet_top_up',     'transfer');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Move to Savings',   'piggy-bank',    'savings_transfer',  'transfer');
    PERFORM _ensure_sub(_uid, _gid, _c, 'Move to Investment','candlestick-chart','investment_transfer','transfer');

  END LOOP;
END;
$$;

-- Run it
SELECT _ensure_all_cats();

-- Clean up
DROP FUNCTION IF EXISTS _ensure_all_cats();
DROP FUNCTION IF EXISTS _ensure_sub(uuid, uuid, text, text, text, text, text);
DROP FUNCTION IF EXISTS _ensure_group(uuid, text, text, text, text, text);

COMMIT;
