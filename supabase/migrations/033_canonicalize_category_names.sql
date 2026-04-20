-- ============================================================
-- Migration 033: Canonicalize category names + retire duplicates
--
-- WHAT THIS DOES:
--   1. Adds retired_at timestamptz to categories & category_groups.
--      NULL = active (shown). Non-null = retired (hidden from UI).
--      This cleanly distinguishes "retired system duplicate" from
--      "user-created custom category" (both previously is_default=false).
--   2. Updates every category_group.name + categories.name to the
--      canonical English label from category-taxonomy.ts.
--   3. Remaps orphan categories (old names from migration 013 that
--      duplicate canonical ones) → migrates their transactions/budgets
--      to the canonical category, then sets retired_at=NOW().
--   4. Retires the old ghost group shells the same way.
--
-- WHY:
--   Migration 013 seeded flat categories (Salon & Barber, Skincare,
--   Spa & Massage, Gym & Fitness, Fast Food, App Subscriptions …).
--   Migration 015 added taxonomy_key but never updated name column.
--   Migration 018 added the canonical versions (Beauty & Grooming,
--   Sports Clubs …). All of them coexist in the DB, all is_default=true,
--   causing 4×صالون in the picker, 2×بقالة, English labels in Arabic
--   mode, etc.
--
-- SERVICE QUERIES MUST FILTER: WHERE retired_at IS NULL
-- SAFE TO RE-RUN: all updates are WHERE-guarded / NOT EXISTS-guarded.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- STEP 0: Add retired_at columns
-- ════════════════════════════════════════════════════════════

ALTER TABLE category_groups ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE categories      ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ DEFAULT NULL;

-- ════════════════════════════════════════════════════════════
-- STEP 1: Canonicalize category_groups.name
-- ════════════════════════════════════════════════════════════

UPDATE category_groups
SET name = CASE taxonomy_key
  WHEN 'income'                  THEN 'Income'
  WHEN 'bills_utilities'         THEN 'Bills & Utilities'
  WHEN 'housing_home'            THEN 'Housing & Home'
  WHEN 'food_dining'             THEN 'Food & Dining'
  WHEN 'transport'               THEN 'Transport'
  WHEN 'shopping'                THEN 'Shopping'
  WHEN 'health_medical'          THEN 'Health & Medical'
  WHEN 'education'               THEN 'Education'
  WHEN 'family_children'         THEN 'Family & Children'
  WHEN 'entertainment_lifestyle' THEN 'Entertainment & Lifestyle'
  WHEN 'subscriptions_digital'   THEN 'Subscriptions & Digital'
  WHEN 'savings_goals'           THEN 'Savings & Goals'
  WHEN 'investments'             THEN 'Investments'
  WHEN 'debt_obligations'        THEN 'Debt & Obligations'
  WHEN 'travel'                  THEN 'Travel'
  WHEN 'religion_charity_social' THEN 'Religion / Charity / Social Duties'
  WHEN 'business_work_expenses'  THEN 'Business / Work Expenses'
  WHEN 'pets'                    THEN 'Pets'
  WHEN 'miscellaneous'           THEN 'Miscellaneous'
  WHEN 'transfers'               THEN 'Transfers'
  ELSE name
END
WHERE taxonomy_key IS NOT NULL;

-- ════════════════════════════════════════════════════════════
-- STEP 2: Canonicalize categories.name
-- ════════════════════════════════════════════════════════════

UPDATE categories
SET name = CASE taxonomy_key
  -- ─── Income ────────────────────────────────────────────
  WHEN 'salary'                  THEN 'Salary'
  WHEN 'bonus'                   THEN 'Bonus'
  WHEN 'freelance'               THEN 'Freelance'
  WHEN 'business_profit'         THEN 'Business Profit'
  WHEN 'rental_income'           THEN 'Rental Income'
  WHEN 'investment_income'       THEN 'Investment Income'
  WHEN 'family_support_in'       THEN 'Support Received'
  WHEN 'gift_received'           THEN 'Gift Received'
  WHEN 'refund_rebate'           THEN 'Refund / Rebate'
  WHEN 'other_income'            THEN 'Other Income'
  -- ─── Bills & Utilities ─────────────────────────────────
  WHEN 'electricity'             THEN 'Electricity'
  WHEN 'water'                   THEN 'Water'
  WHEN 'gas'                     THEN 'Gas'
  WHEN 'internet'                THEN 'Internet'
  WHEN 'mobile'                  THEN 'Mobile'
  WHEN 'tv_satellite'            THEN 'TV / Satellite'
  WHEN 'building_fees'           THEN 'Building Fees'
  WHEN 'government_services'     THEN 'Government Services'
  WHEN 'absher'                  THEN 'Absher / Gov Apps'
  WHEN 'fawry'                   THEN 'Fawry'
  WHEN 'e_gov_egypt'             THEN 'Digital Egypt'
  -- ─── Housing & Home ────────────────────────────────────
  WHEN 'rent'                    THEN 'Rent'
  WHEN 'mortgage'                THEN 'Mortgage'
  WHEN 'home_maintenance'        THEN 'Home Maintenance'
  WHEN 'furniture'               THEN 'Furniture'
  WHEN 'home_appliances'         THEN 'Home Appliances'
  WHEN 'cleaning_supplies'       THEN 'Cleaning Supplies'
  WHEN 'home_decor'              THEN 'Home Decor'
  WHEN 'security_services'       THEN 'Security Services'
  WHEN 'domestic_worker'         THEN 'Domestic Worker'
  -- ─── Food & Dining ─────────────────────────────────────
  WHEN 'groceries'               THEN 'Groceries'
  WHEN 'bakery'                  THEN 'Bakery'
  WHEN 'meat_seafood'            THEN 'Meat & Seafood'
  WHEN 'restaurants'             THEN 'Restaurants'
  WHEN 'cafes_coffee'            THEN 'Cafes & Coffee'
  WHEN 'food_delivery'           THEN 'Food Delivery'
  WHEN 'hungerstation'           THEN 'HungerStation'
  WHEN 'jahez'                   THEN 'Jahez'
  WHEN 'marsool'                 THEN 'Marsool'
  WHEN 'talabat'                 THEN 'Talabat'
  WHEN 'elmenus'                 THEN 'elmenus'
  WHEN 'snacks_sweets'           THEN 'Snacks & Sweets'
  WHEN 'water_beverages'         THEN 'Water & Beverages'
  -- ─── Transport ─────────────────────────────────────────
  WHEN 'fuel'                    THEN 'Fuel'
  WHEN 'uber_taxi'               THEN 'Uber / Taxi'
  WHEN 'careem'                  THEN 'Careem'
  WHEN 'public_transport'        THEN 'Public Transport'
  WHEN 'parking'                 THEN 'Parking'
  WHEN 'tolls'                   THEN 'Tolls'
  WHEN 'car_maintenance'         THEN 'Car Maintenance'
  WHEN 'car_insurance'           THEN 'Car Insurance'
  WHEN 'registration_licensing'  THEN 'Registration & Licensing'
  WHEN 'car_rental'              THEN 'Car Rental'
  -- ─── Shopping ──────────────────────────────────────────
  WHEN 'fashion'                 THEN 'Fashion'
  WHEN 'shoes'                   THEN 'Shoes'
  WHEN 'bags_accessories'        THEN 'Bags & Accessories'
  WHEN 'jewelry'                 THEN 'Jewelry'
  WHEN 'watches'                 THEN 'Watches'
  WHEN 'electronics'             THEN 'Electronics'
  WHEN 'general_shopping'        THEN 'General Shopping'
  WHEN 'gifts'                   THEN 'Gifts'
  -- ─── Health & Medical ──────────────────────────────────
  WHEN 'doctor_visits'           THEN 'Doctor Visits'
  WHEN 'medicines'               THEN 'Medicines'
  WHEN 'lab_tests'               THEN 'Lab Tests'
  WHEN 'hospital'                THEN 'Hospital'
  WHEN 'dental'                  THEN 'Dental'
  WHEN 'therapy_fitness'         THEN 'Therapy & Fitness'
  WHEN 'health_insurance'        THEN 'Health Insurance'
  -- ─── Education ─────────────────────────────────────────
  WHEN 'school_fees'             THEN 'School Fees'
  WHEN 'university'              THEN 'University'
  WHEN 'courses_training'        THEN 'Courses & Training'
  WHEN 'books_supplies'          THEN 'Books & Supplies'
  WHEN 'tutoring'                THEN 'Tutoring'
  WHEN 'exam_fees'               THEN 'Exam Fees'
  WHEN 'school_transport'        THEN 'School Transport'
  WHEN 'language_learning'       THEN 'Language Learning'
  -- ─── Family & Children ─────────────────────────────────
  WHEN 'childcare'               THEN 'Childcare'
  WHEN 'baby_supplies'           THEN 'Baby Supplies'
  WHEN 'kids_clothing'           THEN 'Kids Clothing'
  WHEN 'allowances'              THEN 'Allowances'
  WHEN 'family_support_out'      THEN 'Family Support'
  WHEN 'school_needs'            THEN 'School Needs'
  WHEN 'kids_activities'         THEN 'Kids Activities'
  WHEN 'maternity'               THEN 'Maternity'
  WHEN 'elderly_care'            THEN 'Elderly Care'
  -- ─── Entertainment & Lifestyle ─────────────────────────
  WHEN 'cinema_events'           THEN 'Cinema & Events'
  WHEN 'gaming'                  THEN 'Gaming'
  WHEN 'hobbies'                 THEN 'Hobbies'
  WHEN 'beauty_grooming'         THEN 'Beauty & Grooming'
  WHEN 'sports_clubs'            THEN 'Sports Clubs'
  WHEN 'social_outings'          THEN 'Social Outings'
  WHEN 'smoking_shisha'          THEN 'Smoking & Shisha'
  WHEN 'laundry'                 THEN 'Laundry & Dry Clean'
  -- ─── Subscriptions & Digital ───────────────────────────
  WHEN 'netflix'                 THEN 'Netflix'
  WHEN 'shahid_vip'              THEN 'Shahid VIP'
  WHEN 'disney_plus'             THEN 'Disney+'
  WHEN 'spotify'                 THEN 'Spotify'
  WHEN 'youtube_premium'         THEN 'YouTube Premium'
  WHEN 'anghami'                 THEN 'Anghami'
  WHEN 'icloud_storage'          THEN 'iCloud / Storage'
  WHEN 'chatgpt_ai_tools'        THEN 'ChatGPT / AI Tools'
  WHEN 'vpn_security'            THEN 'VPN'
  WHEN 'other_digital'           THEN 'Other Digital'
  -- ─── Savings & Goals ───────────────────────────────────
  WHEN 'emergency_fund'          THEN 'Emergency Fund'
  WHEN 'general_savings'         THEN 'General Savings'
  WHEN 'home_goal'               THEN 'Home Goal'
  WHEN 'car_goal'                THEN 'Car Goal'
  WHEN 'wedding_goal'            THEN 'Wedding Goal'
  WHEN 'education_goal'          THEN 'Education Goal'
  WHEN 'travel_goal'             THEN 'Travel Goal'
  WHEN 'hajj_umrah_goal'         THEN 'Hajj / Umrah Goal'
  -- ─── Investments ───────────────────────────────────────
  WHEN 'stocks'                  THEN 'Stocks'
  WHEN 'etfs_funds'              THEN 'ETFs & Funds'
  WHEN 'crypto'                  THEN 'Crypto'
  WHEN 'gold_silver'             THEN 'Gold & Silver'
  WHEN 'real_estate_investment'  THEN 'Real Estate Investment'
  WHEN 'private_business'        THEN 'Private Business'
  WHEN 'retirement'              THEN 'Retirement'
  -- ─── Debt & Obligations ────────────────────────────────
  WHEN 'credit_card_payment'     THEN 'Credit Card Payment'
  WHEN 'personal_loan'           THEN 'Personal Loan'
  WHEN 'mortgage_payment'        THEN 'Mortgage Payment'
  WHEN 'car_loan'                THEN 'Car Loan'
  WHEN 'installments_bnpl'       THEN 'Installments / BNPL'
  WHEN 'tabby'                   THEN 'Tabby'
  WHEN 'tamara'                  THEN 'Tamara'
  WHEN 'taxes_fees'              THEN 'Taxes & Government Fees'
  WHEN 'legal_support'           THEN 'Legal Support'
  WHEN 'alimony_support'         THEN 'Alimony / Support'
  -- ─── Travel ────────────────────────────────────────────
  WHEN 'flights'                 THEN 'Flights'
  WHEN 'hotels'                  THEN 'Hotels'
  WHEN 'visa_fees'               THEN 'Visa Fees'
  WHEN 'travel_transport'        THEN 'Travel Transport'
  WHEN 'travel_food'             THEN 'Travel Food'
  WHEN 'travel_shopping'         THEN 'Travel Shopping'
  WHEN 'travel_insurance'        THEN 'Travel Insurance'
  WHEN 'hajj_umrah_trip'         THEN 'Hajj / Umrah'
  -- ─── Religion / Charity / Social Duties ────────────────
  WHEN 'zakat'                   THEN 'Zakat'
  WHEN 'sadaqah'                 THEN 'Sadaqah / Charity'
  WHEN 'mosque_community'        THEN 'Mosque / Community'
  WHEN 'eid_social_giving'       THEN 'Eid / Social Giving'
  WHEN 'family_occasions'        THEN 'Family Occasions'
  WHEN 'funeral_support'         THEN 'Funeral Support'
  WHEN 'religious_courses'       THEN 'Religious Courses'
  WHEN 'qurbani'                 THEN 'Qurbani / Sacrifice'
  WHEN 'ramadan_supplies'        THEN 'Ramadan Supplies'
  -- ─── Business / Work Expenses ──────────────────────────
  WHEN 'office_supplies'         THEN 'Office Supplies'
  WHEN 'software_tools'          THEN 'Software & Tools'
  WHEN 'business_travel'         THEN 'Business Travel'
  WHEN 'marketing_ads'           THEN 'Marketing & Ads'
  WHEN 'shipping_logistics'      THEN 'Shipping & Logistics'
  WHEN 'professional_services'   THEN 'Professional Services'
  WHEN 'coworking_office_rent'   THEN 'Coworking / Office Rent'
  WHEN 'internet_phone_work'     THEN 'Work Internet & Phone'
  -- ─── Pets ──────────────────────────────────────────────
  WHEN 'pet_food'                THEN 'Pet Food'
  WHEN 'vet'                     THEN 'Vet'
  WHEN 'pet_supplies'            THEN 'Pet Supplies'
  WHEN 'grooming'                THEN 'Grooming'
  WHEN 'boarding'                THEN 'Boarding / Sitting'
  WHEN 'pet_toys'                THEN 'Pet Toys'
  -- ─── Miscellaneous ─────────────────────────────────────
  WHEN 'cash_withdrawal'         THEN 'Cash Withdrawal'
  WHEN 'fees_commissions'        THEN 'Fees & Commissions'
  WHEN 'fines_penalties'         THEN 'Fines & Penalties'
  WHEN 'unexpected_expense'      THEN 'Unexpected Expense'
  WHEN 'uncategorized'           THEN 'Uncategorized'
  -- ─── Transfers ─────────────────────────────────────────
  WHEN 'between_accounts'        THEN 'Between Accounts'
  WHEN 'cash_to_bank'            THEN 'Cash to Bank'
  WHEN 'bank_to_cash'            THEN 'Bank to Cash'
  WHEN 'wallet_top_up'           THEN 'Wallet Top-up'
  WHEN 'savings_transfer'        THEN 'Move to Savings'
  WHEN 'investment_transfer'     THEN 'Move to Investment'
  ELSE name
END
WHERE taxonomy_key IS NOT NULL;

-- Also sync the denormalized category_name on transactions that reference
-- these categories (so transaction history shows the new canonical name).
UPDATE transactions t
SET
  category_name  = c.name,
  category_icon  = c.icon,
  category_color = c.color
FROM categories c
WHERE t.category_id = c.id
  AND c.taxonomy_key IS NOT NULL
  AND (t.category_name != c.name OR t.category_icon != c.icon);

-- ════════════════════════════════════════════════════════════
-- STEP 3: Remap orphan categories from migration 013
--
-- These have no taxonomy_key yet. We migrate their transactions
-- to the canonical category (by key per user), then RETIRE them
-- by setting retired_at=NOW().
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION _tmp_remap_orphan(
  p_old_name TEXT,
  p_to_key   TEXT
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  _src_id  uuid;
  _tgt_id  uuid;
  _uid     uuid;
BEGIN
  FOR _uid IN
    SELECT DISTINCT user_id FROM categories
    WHERE name = p_old_name
      AND taxonomy_key IS NULL
      AND retired_at IS NULL
  LOOP
    SELECT id INTO _src_id FROM categories
      WHERE user_id = _uid AND name = p_old_name AND taxonomy_key IS NULL AND retired_at IS NULL
      ORDER BY created_at LIMIT 1;

    SELECT id INTO _tgt_id FROM categories
      WHERE user_id = _uid AND taxonomy_key = p_to_key AND retired_at IS NULL
      LIMIT 1;

    IF _src_id IS NULL THEN CONTINUE; END IF;

    -- If a canonical target exists, migrate transactions to it
    IF _tgt_id IS NOT NULL AND _src_id != _tgt_id THEN
      UPDATE transactions t
      SET
        category_id    = _tgt_id,
        category_name  = tgt.name,
        category_icon  = tgt.icon,
        category_color = tgt.color
      FROM categories tgt
      WHERE tgt.id = _tgt_id
        AND t.category_id = _src_id;

      UPDATE budgets
      SET category_id   = _tgt_id,
          category_name = (SELECT name FROM categories WHERE id = _tgt_id)
      WHERE category_id = _src_id;
    END IF;

    -- RETIRE the orphan (do NOT change is_default — user-created categories
    -- also have is_default=false; retired_at is the only unambiguous signal)
    UPDATE categories
    SET retired_at = NOW()
    WHERE id = _src_id;
  END LOOP;
END;
$$;

-- ─── Orphan remaps (old name → canonical taxonomy_key) ───────────────

-- Subscriptions cluster
SELECT _tmp_remap_orphan('App Subscriptions',    'other_digital');
SELECT _tmp_remap_orphan('Subscriptions',         'other_digital');
SELECT _tmp_remap_orphan('Cloud Storage',         'icloud_storage');
SELECT _tmp_remap_orphan('Music Streaming',       'other_digital');
SELECT _tmp_remap_orphan('Video Streaming',       'other_digital');
SELECT _tmp_remap_orphan('Software Licenses',     'software_tools');
SELECT _tmp_remap_orphan('VPN',                   'vpn_security');

-- Personal care cluster
SELECT _tmp_remap_orphan('Salon & Barber',        'beauty_grooming');
SELECT _tmp_remap_orphan('Skincare',              'beauty_grooming');
SELECT _tmp_remap_orphan('Spa & Massage',         'beauty_grooming');
SELECT _tmp_remap_orphan('Gym & Fitness',         'sports_clubs');
SELECT _tmp_remap_orphan('Personal Care',         'beauty_grooming');

-- Food cluster
SELECT _tmp_remap_orphan('Dining / Food',         'restaurants');
SELECT _tmp_remap_orphan('Fast Food',             'restaurants');
SELECT _tmp_remap_orphan('Cafés & Coffee',        'cafes_coffee');

-- Housing cluster
SELECT _tmp_remap_orphan('Housing / Rent',        'rent');
SELECT _tmp_remap_orphan('Home Supplies',         'general_shopping');

-- Transport cluster
SELECT _tmp_remap_orphan('Transportation',        'public_transport');
SELECT _tmp_remap_orphan('Mobile / Phone',        'mobile');
SELECT _tmp_remap_orphan('Boarding',              'boarding');

-- Health cluster
SELECT _tmp_remap_orphan('Healthcare',            'doctor_visits');

-- Debt cluster
SELECT _tmp_remap_orphan('Debt / Loans',          'personal_loan');
SELECT _tmp_remap_orphan('Student Loan',          'personal_loan');
SELECT _tmp_remap_orphan('Bank Fees & Interest',  'fees_commissions');
SELECT _tmp_remap_orphan('Taxes & Gov Fees',      'taxes_fees');

-- Savings/investment cluster
SELECT _tmp_remap_orphan('Savings',               'general_savings');
SELECT _tmp_remap_orphan('Savings Account',       'general_savings');
SELECT _tmp_remap_orphan('Stock Investment',      'stocks');
SELECT _tmp_remap_orphan('Gold Purchase',         'gold_silver');

-- Charity cluster
SELECT _tmp_remap_orphan('Charity',               'sadaqah');
SELECT _tmp_remap_orphan('Charity & NGOs',        'sadaqah');
SELECT _tmp_remap_orphan('Mosque Donation',       'mosque_community');
SELECT _tmp_remap_orphan('Eid Expenses',          'eid_social_giving');
SELECT _tmp_remap_orphan('Fid Expenses',          'eid_social_giving');
SELECT _tmp_remap_orphan('Umrah / Hajj',          'hajj_umrah_trip');

-- Family cluster
SELECT _tmp_remap_orphan('Baby Essentials',       'baby_supplies');
SELECT _tmp_remap_orphan('Childcare / Nanny',     'childcare');
SELECT _tmp_remap_orphan('Family',                'family_support_out');
SELECT _tmp_remap_orphan('Family Outings',        'social_outings');

-- Social cluster
SELECT _tmp_remap_orphan('Social Events',         'social_outings');
SELECT _tmp_remap_orphan('Birthday Gifts',        'gifts');
SELECT _tmp_remap_orphan('Wedding Gifts',         'gifts');
SELECT _tmp_remap_orphan('Tips & Gratitude',      'eid_social_giving');
SELECT _tmp_remap_orphan('Activities & Tours',    'social_outings');

-- Travel cluster
SELECT _tmp_remap_orphan('Hotels & Accommodation','hotels');

-- ─── Clean up temp function ──────────────────────────────────────────
DROP FUNCTION IF EXISTS _tmp_remap_orphan(TEXT, TEXT);

-- ════════════════════════════════════════════════════════════
-- STEP 4: Retire duplicate category_groups from migration 013
--         that are now superseded. Sets retired_at=NOW() on the
--         group shell and ALL its still-active child categories.
-- ════════════════════════════════════════════════════════════

-- Retire group shells whose canonical replacement exists
-- (group has no taxonomy_key → was seeded by migration 013 or earlier)
UPDATE category_groups cg
SET retired_at = NOW()
WHERE cg.taxonomy_key IS NULL
  AND cg.retired_at IS NULL
  AND cg.name IN (
    'Dining & Cafés',
    'Personal Care',
    'Gifts & Social',
    'Religion & Charity',
    'Debt & Loans',
    'Subscriptions & Digital'
  );

-- Also retire any remaining active categories inside those now-retired groups
UPDATE categories c
SET retired_at = NOW()
FROM category_groups cg
WHERE c.group_id = cg.id
  AND cg.retired_at IS NOT NULL
  AND c.retired_at IS NULL;

COMMIT;
