-- Migration 045: Restore retired subcategories that have no active replacement
--
-- Migration 034 retired categories inside groups that had no taxonomy_key.
-- Some of those categories (e.g. 'restaurants', 'cafes_coffee') had a valid
-- taxonomy_key but were the ONLY instance for that user — so they got retired
-- with no active replacement, leaving the user without those subcategories.
--
-- This migration:
-- 1. Finds retired categories with taxonomy_key where no active counterpart exists
-- 2. Un-retires them, re-parents to the correct canonical group, updates icon to Lucide

BEGIN;

-- Step 1: Un-retire categories that are the user's only instance of a taxonomy_key
-- and re-parent them to the canonical group

DO $$
DECLARE
  r record;
  _canonical_gid uuid;
  _parent_tk text;
BEGIN
  -- Map subcategory taxonomy_key → parent group taxonomy_key
  -- (covering all subcategories from migration 018)
  FOR r IN
    SELECT c.id, c.user_id, c.taxonomy_key
    FROM categories c
    WHERE c.retired_at IS NOT NULL
      AND c.taxonomy_key IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM categories c2
        WHERE c2.user_id = c.user_id
          AND c2.taxonomy_key = c.taxonomy_key
          AND c2.retired_at IS NULL
      )
  LOOP
    -- Determine parent group taxonomy_key
    _parent_tk := CASE
      WHEN r.taxonomy_key IN ('groceries','bakery','meat_seafood','restaurants','cafes_coffee',
                              'food_delivery','hungerstation','jahez','marsool','talabat','elmenus',
                              'snacks_sweets','water_beverages') THEN 'food_dining'
      WHEN r.taxonomy_key IN ('fuel','uber_taxi','careem','public_transport','parking','tolls',
                              'car_maintenance','car_insurance','registration_licensing','car_rental') THEN 'transport'
      WHEN r.taxonomy_key IN ('fashion','shoes','bags_accessories','jewelry','watches',
                              'electronics','general_shopping','gifts') THEN 'shopping'
      WHEN r.taxonomy_key IN ('doctor_visits','medicines','lab_tests','hospital','dental',
                              'therapy_fitness','health_insurance') THEN 'health_medical'
      WHEN r.taxonomy_key IN ('school_fees','university','courses_training','books_supplies',
                              'tutoring','exam_fees','school_transport','language_learning') THEN 'education'
      WHEN r.taxonomy_key IN ('childcare','baby_supplies','kids_clothing','allowances',
                              'family_support_out','school_needs','kids_activities','maternity','elderly_care') THEN 'family_children'
      WHEN r.taxonomy_key IN ('cinema_events','gaming','hobbies','beauty_grooming','sports_clubs',
                              'social_outings','smoking_shisha','laundry') THEN 'entertainment_lifestyle'
      WHEN r.taxonomy_key IN ('netflix','shahid_vip','disney_plus','spotify','youtube_premium',
                              'anghami','icloud_storage','chatgpt_ai_tools','vpn_security','other_digital') THEN 'subscriptions_digital'
      WHEN r.taxonomy_key IN ('emergency_fund','general_savings','home_goal','car_goal',
                              'wedding_goal','education_goal','travel_goal','hajj_umrah_goal') THEN 'savings_goals'
      WHEN r.taxonomy_key IN ('stocks','etfs_funds','crypto','gold_silver',
                              'real_estate_investment','private_business','retirement') THEN 'investments'
      WHEN r.taxonomy_key IN ('credit_card_payment','personal_loan','mortgage_payment','car_loan',
                              'installments_bnpl','tabby','tamara','taxes_fees','legal_support','alimony_support') THEN 'debt_obligations'
      WHEN r.taxonomy_key IN ('flights','hotels','visa_fees','travel_transport',
                              'travel_food','travel_shopping','travel_insurance','hajj_umrah_trip') THEN 'travel'
      WHEN r.taxonomy_key IN ('zakat','sadaqah','mosque_community','eid_social_giving',
                              'family_occasions','funeral_support','religious_courses','qurbani','ramadan_supplies') THEN 'religion_charity_social'
      WHEN r.taxonomy_key IN ('office_supplies','software_tools','business_travel','marketing_ads',
                              'shipping_logistics','professional_services','coworking_office_rent','internet_phone_work') THEN 'business_work_expenses'
      WHEN r.taxonomy_key IN ('pet_food','vet','pet_supplies','grooming','boarding','pet_toys') THEN 'pets'
      WHEN r.taxonomy_key IN ('cash_withdrawal','fees_commissions','fines_penalties',
                              'unexpected_expense','uncategorized') THEN 'miscellaneous'
      WHEN r.taxonomy_key IN ('between_accounts','cash_to_bank','bank_to_cash',
                              'wallet_top_up','savings_transfer','investment_transfer') THEN 'transfers'
      WHEN r.taxonomy_key IN ('salary','bonus','freelance','business_profit','rental_income',
                              'investment_income','family_support_in','gift_received','refund_rebate','other_income') THEN 'income'
      WHEN r.taxonomy_key IN ('electricity','water','gas','internet','mobile','tv_satellite',
                              'building_fees','government_services','absher','fawry','e_gov_egypt') THEN 'bills_utilities'
      WHEN r.taxonomy_key IN ('rent','mortgage','home_maintenance','furniture','home_appliances',
                              'cleaning_supplies','home_decor','security_services','domestic_worker') THEN 'housing_home'
      ELSE NULL
    END;

    IF _parent_tk IS NULL THEN CONTINUE; END IF;

    -- Find canonical group for this user
    SELECT id INTO _canonical_gid FROM category_groups
    WHERE user_id = r.user_id AND taxonomy_key = _parent_tk AND retired_at IS NULL
    LIMIT 1;

    IF _canonical_gid IS NULL THEN CONTINUE; END IF;

    -- Un-retire and re-parent
    UPDATE categories
    SET retired_at = NULL,
        group_id = _canonical_gid
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- Step 2: Ensure all restored categories have Lucide icons (not emojis)
-- An emoji icon contains non-ASCII chars and no hyphens/underscores
UPDATE categories
SET icon = CASE taxonomy_key
  WHEN 'groceries'               THEN 'shopping-cart'
  WHEN 'bakery'                  THEN 'croissant'
  WHEN 'meat_seafood'            THEN 'fish'
  WHEN 'restaurants'             THEN 'chef-hat'
  WHEN 'cafes_coffee'            THEN 'coffee'
  WHEN 'food_delivery'           THEN 'bike'
  WHEN 'hungerstation'           THEN 'smartphone'
  WHEN 'jahez'                   THEN 'bike'
  WHEN 'marsool'                 THEN 'package'
  WHEN 'talabat'                 THEN 'shopping-bag'
  WHEN 'elmenus'                 THEN 'utensils'
  WHEN 'snacks_sweets'           THEN 'ice-cream-cone'
  WHEN 'water_beverages'         THEN 'cup-soda'
  WHEN 'fuel'                    THEN 'fuel'
  WHEN 'uber_taxi'               THEN 'car-taxi-front'
  WHEN 'careem'                  THEN 'car-taxi-front'
  WHEN 'public_transport'        THEN 'bus'
  WHEN 'parking'                 THEN 'parking-circle'
  WHEN 'tolls'                   THEN 'road'
  WHEN 'car_maintenance'         THEN 'wrench'
  WHEN 'car_insurance'           THEN 'shield-check'
  WHEN 'registration_licensing'  THEN 'file-badge'
  WHEN 'car_rental'              THEN 'car-front'
  WHEN 'fashion'                 THEN 'shirt'
  WHEN 'shoes'                   THEN 'footprints'
  WHEN 'bags_accessories'        THEN 'briefcase'
  WHEN 'jewelry'                 THEN 'gem'
  WHEN 'watches'                 THEN 'watch'
  WHEN 'electronics'             THEN 'smartphone'
  WHEN 'general_shopping'        THEN 'package'
  WHEN 'gifts'                   THEN 'gift'
  WHEN 'doctor_visits'           THEN 'stethoscope'
  WHEN 'medicines'               THEN 'pill'
  WHEN 'cinema_events'           THEN 'ticket'
  WHEN 'beauty_grooming'         THEN 'sparkles'
  WHEN 'sports_clubs'            THEN 'dumbbell'
  WHEN 'absher'                  THEN 'smartphone'
  WHEN 'fawry'                   THEN 'receipt'
  WHEN 'tabby'                   THEN 'smartphone-nfc'
  WHEN 'tamara'                  THEN 'smartphone-nfc'
  ELSE icon
END
WHERE taxonomy_key IS NOT NULL
  AND retired_at IS NULL
  AND icon ~ '[^\x00-\x7F]'  -- has non-ASCII (emoji)
  AND icon !~ '[-_]';         -- not already a lucide name (contains hyphens/underscores)

COMMIT;
