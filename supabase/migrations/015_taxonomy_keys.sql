-- ─── Migration 015: Add taxonomy_key to categories & category_groups ─────────
-- Bridges DB records to the canonical category-taxonomy.ts source-of-truth

-- 1. Add taxonomy_key columns
ALTER TABLE category_groups ADD COLUMN IF NOT EXISTS taxonomy_key TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS taxonomy_key TEXT;

-- 2. Unique constraint: one taxonomy_key per user (NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS uq_category_groups_user_taxonomy
  ON category_groups (user_id, taxonomy_key) WHERE taxonomy_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_taxonomy
  ON categories (user_id, taxonomy_key) WHERE taxonomy_key IS NOT NULL;

-- 3. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_category_groups_taxonomy_key
  ON category_groups (taxonomy_key) WHERE taxonomy_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_taxonomy_key
  ON categories (taxonomy_key) WHERE taxonomy_key IS NOT NULL;

-- 4. Backfill category_groups — assign unique taxonomy_key per user
--    When multiple old groups map to the same taxonomy key, only the
--    first (by sort_order) gets it. Remaining duplicates stay NULL.
WITH ranked AS (
  SELECT cg.id,
         mapping.key,
         ROW_NUMBER() OVER (PARTITION BY cg.user_id, mapping.key ORDER BY cg.sort_order) AS rn
  FROM category_groups cg
  JOIN (VALUES
    ('Housing & Rent',         'housing_home'),
    ('Utilities & Bills',      'bills_utilities'),
    ('Groceries & Markets',    'food_dining'),
    ('Transport & Fuel',       'transport'),
    ('Shopping & Retail',      'shopping'),
    ('Health & Medical',       'health_medical'),
    ('Personal Care',          'entertainment_lifestyle'),
    ('Education',              'education'),
    ('Family & Children',      'family_children'),
    ('Religion & Charity',     'religion_charity_social'),
    ('Travel',                 'travel'),
    ('Subscriptions & Digital','subscriptions_digital'),
    ('Debt & Loans',           'debt_obligations'),
    ('Financial & Savings',    'savings_goals'),
    ('Other Expenses',         'miscellaneous'),
    ('Earned Income',          'income')
  ) AS mapping(name, key) ON cg.name = mapping.name
  WHERE cg.taxonomy_key IS NULL
)
UPDATE category_groups SET taxonomy_key = ranked.key
FROM ranked
WHERE category_groups.id = ranked.id AND ranked.rn = 1;

-- 5. Backfill categories — assign unique taxonomy_key per user
--    When multiple old categories map to the same key, first match (by name) wins.
WITH ranked AS (
  SELECT c.id,
         mapping.key,
         ROW_NUMBER() OVER (PARTITION BY c.user_id, mapping.key ORDER BY c.name) AS rn
  FROM categories c
  JOIN (VALUES
    -- Income
    ('Salary',               'salary'),
    ('Freelance',            'freelance'),
    ('Bonus',                'bonus'),
    ('Investment Returns',   'investment_income'),
    ('Rental Income',        'rental_income'),
    ('Gifts Received',       'gift_received'),
    ('Refunds & Cashback',   'refund_rebate'),
    ('Pension',              'other_income'),
    ('Business Revenue',     'business_profit'),
    -- Bills
    ('Electricity',          'electricity'),
    ('Water',                'water'),
    ('Gas',                  'gas'),
    ('Internet',             'internet'),
    ('Mobile / Phone',       'mobile'),
    ('Landline',             'landline'),
    ('TV / Satellite',       'tv_satellite'),
    -- Housing
    ('Rent',                 'rent'),
    ('Mortgage',             'mortgage'),
    ('Furniture',            'furniture'),
    ('Repairs & Maintenance','home_maintenance'),
    ('Cleaning Services',    'cleaning_supplies'),
    ('Home Décor',           'home_decor'),
    -- Food
    ('Supermarket',          'groceries'),
    ('Restaurants',          'restaurants'),
    ('Cafés & Coffee',       'cafes_coffee'),
    ('Food Delivery',        'food_delivery'),
    ('Desserts & Sweets',    'snacks_sweets'),
    -- Transport
    ('Fuel / Petrol',        'fuel'),
    ('Uber / Careem',        'uber_taxi'),
    ('Public Transport',     'public_transport'),
    ('Parking',              'parking'),
    ('Tolls & Salik',        'tolls'),
    ('Car Maintenance',      'car_maintenance'),
    ('Car Insurance',        'car_insurance'),
    -- Shopping
    ('Clothing & Fashion',   'fashion'),
    ('Shoes & Bags',         'shoes'),
    ('Electronics',          'electronics'),
    ('Accessories & Jewelry','jewelry'),
    -- Health
    ('Doctor Visit',         'doctor_visits'),
    ('Pharmacy',             'medicines'),
    ('Dental',               'dental'),
    ('Hospital',             'hospital'),
    ('Lab Tests',            'lab_tests'),
    ('Health Insurance',     'health_insurance'),
    -- Education
    ('School Fees',          'school_fees'),
    ('University Tuition',   'university'),
    ('Online Courses',       'courses_training'),
    ('Books & Materials',    'books_supplies'),
    ('Private Tutoring',     'tutoring'),
    ('Language Classes',     'language_learning'),
    -- Family
    ('Childcare / Nanny',   'childcare'),
    ('Baby Essentials',      'baby_supplies'),
    ('Kids Clothing',        'kids_clothing'),
    ('Allowances',           'allowances'),
    ('Kids Activities',      'kids_activities'),
    -- Entertainment
    ('Streaming Services',   'netflix'),
    ('Gaming',               'gaming'),
    ('Cinema & Movies',      'cinema_events'),
    ('Salon & Barber',       'beauty_grooming'),
    ('Gym & Fitness',        'therapy_fitness'),
    -- Subscriptions
    ('App Subscriptions',    'other_digital'),
    ('Cloud Storage',        'icloud_storage'),
    ('Music Streaming',      'spotify'),
    -- Debt
    ('Credit Card Payment',  'credit_card_payment'),
    ('Personal Loan',        'personal_loan'),
    ('Car Loan',             'car_loan'),
    ('Home Loan / Mortgage', 'mortgage_payment'),
    ('Buy Now Pay Later',    'installments_bnpl'),
    -- Travel
    ('Flights',              'flights'),
    ('Hotels & Accommodation','hotels'),
    ('Visa Fees',            'visa_fees'),
    ('Travel Insurance',     'travel_insurance'),
    -- Religion & Charity
    ('Zakat',                'zakat'),
    ('Sadaqah',              'sadaqah'),
    ('Umrah / Hajj',         'hajj_umrah_trip'),
    ('Eid Expenses',         'eid_social_giving'),
    -- Savings
    ('Emergency Fund',       'emergency_fund'),
    ('Savings Account',      'general_savings'),
    ('Gold Purchase',        'gold_silver'),
    ('Stock Investment',     'stocks'),
    ('Crypto',               'crypto'),
    ('Real Estate',          'real_estate_investment'),
    ('House Fund',           'home_goal'),
    ('Wedding Fund',         'wedding_goal'),
    -- Misc
    ('Miscellaneous',        'uncategorized'),
    ('Pets & Vet',           'pet_food'),
    ('Government Fees',      'taxes_fees'),
    ('Legal Services',       'legal_support'),
    ('Business & Work',      'office_supplies'),
    ('Shipping & Courier',   'shipping_logistics')
  ) AS mapping(name, key) ON c.name = mapping.name
  WHERE c.taxonomy_key IS NULL
)
UPDATE categories SET taxonomy_key = ranked.key
FROM ranked
WHERE categories.id = ranked.id AND ranked.rn = 1;
