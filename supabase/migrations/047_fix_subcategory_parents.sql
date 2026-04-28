-- Migration 047: Fix subcategory parent group assignments
--
-- Migrations 045/046 restored subcategories but some ended up under the
-- wrong parent group (e.g. Restaurants under Miscellaneous instead of
-- Food & Dining). This migration moves every active subcategory to its
-- correct canonical parent group by taxonomy_key.

BEGIN;

DO $$
DECLARE
  _uid uuid;
  _gid uuid;
BEGIN
  FOR _uid IN SELECT DISTINCT user_id FROM category_groups WHERE retired_at IS NULL
  LOOP

    -- ═══ Ensure food_dining group is active ═══
    -- (may have been retired if it had no taxonomy_key)
    UPDATE category_groups
    SET retired_at = NULL
    WHERE user_id = _uid AND taxonomy_key = 'food_dining' AND retired_at IS NOT NULL;

    -- ═══ FOOD & DINING subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'food_dining' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'groceries','bakery','meat_seafood','restaurants','cafes_coffee',
          'food_delivery','hungerstation','jahez','marsool','talabat','elmenus',
          'snacks_sweets','water_beverages'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ TRANSPORT subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transport' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'fuel','uber_taxi','careem','public_transport','parking','tolls',
          'car_maintenance','car_insurance','registration_licensing','car_rental'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ SHOPPING subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'shopping' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'fashion','shoes','bags_accessories','jewelry','watches',
          'electronics','general_shopping','gifts'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ HEALTH & MEDICAL subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'health_medical' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'doctor_visits','medicines','lab_tests','hospital','dental',
          'therapy_fitness','health_insurance','pharmacy'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ EDUCATION subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'education' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'school_fees','university','courses_training','books_supplies',
          'tutoring','exam_fees','school_transport','language_learning'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ FAMILY & CHILDREN subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'family_children' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'childcare','baby_supplies','kids_clothing','allowances',
          'family_support_out','school_needs','kids_activities','maternity','elderly_care'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ ENTERTAINMENT & LIFESTYLE subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'entertainment_lifestyle' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'cinema_events','gaming','hobbies','beauty_grooming','sports_clubs',
          'social_outings','smoking_shisha','laundry'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ SUBSCRIPTIONS & DIGITAL subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'subscriptions_digital' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'netflix','shahid_vip','disney_plus','spotify','youtube_premium',
          'anghami','icloud_storage','chatgpt_ai_tools','vpn_security','other_digital'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ DEBT & OBLIGATIONS subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'debt_obligations' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'credit_card_payment','personal_loan','mortgage_payment','car_loan',
          'installments_bnpl','tabby','tamara','taxes_fees','legal_support','alimony_support'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ BILLS & UTILITIES subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'bills_utilities' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'electricity','water','gas','internet','mobile','tv_satellite',
          'building_fees','government_services','absher','fawry','e_gov_egypt'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ HOUSING & HOME subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'housing_home' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'rent','mortgage','home_maintenance','furniture','home_appliances',
          'cleaning_supplies','home_decor','security_services','domestic_worker'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ INCOME subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'income' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'salary','bonus','freelance','business_profit','rental_income',
          'investment_income','family_support_in','gift_received','refund_rebate','other_income'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ SAVINGS & GOALS subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'savings_goals' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'emergency_fund','general_savings','home_goal','car_goal',
          'wedding_goal','education_goal','travel_goal','hajj_umrah_goal'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ INVESTMENTS subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'investments' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'stocks','etfs_funds','crypto','gold_silver',
          'real_estate_investment','private_business','retirement'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ TRAVEL subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'travel' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'flights','hotels','visa_fees','travel_transport',
          'travel_food','travel_shopping','travel_insurance','hajj_umrah_trip'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ RELIGION / CHARITY / SOCIAL subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'religion_charity_social' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'zakat','sadaqah','mosque_community','eid_social_giving',
          'family_occasions','funeral_support','religious_courses','qurbani','ramadan_supplies'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ BUSINESS / WORK subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'business_work_expenses' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'office_supplies','software_tools','business_travel','marketing_ads',
          'shipping_logistics','professional_services','coworking_office_rent','internet_phone_work'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ PETS subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'pets' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN ('pet_food','vet','pet_supplies','grooming','boarding','pet_toys')
        AND group_id != _gid;
    END IF;

    -- ═══ MISCELLANEOUS subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'miscellaneous' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'cash_withdrawal','fees_commissions','fines_penalties',
          'unexpected_expense','uncategorized'
        )
        AND group_id != _gid;
    END IF;

    -- ═══ TRANSFERS subcategories ═══
    SELECT id INTO _gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transfers' AND retired_at IS NULL LIMIT 1;
    IF _gid IS NOT NULL THEN
      UPDATE categories SET group_id = _gid
      WHERE user_id = _uid AND retired_at IS NULL
        AND taxonomy_key IN (
          'between_accounts','cash_to_bank','bank_to_cash',
          'wallet_top_up','savings_transfer','investment_transfer'
        )
        AND group_id != _gid;
    END IF;

  END LOOP;
END;
$$;

-- Also fix any duplicate active categories (same user + taxonomy_key):
-- Keep the one with the correct group, retire the rest
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT user_id, taxonomy_key, count(*) as cnt
    FROM categories
    WHERE retired_at IS NULL AND taxonomy_key IS NOT NULL
    GROUP BY user_id, taxonomy_key
    HAVING count(*) > 1
  LOOP
    -- Retire all but the most recent one
    UPDATE categories
    SET retired_at = NOW()
    WHERE user_id = r.user_id
      AND taxonomy_key = r.taxonomy_key
      AND retired_at IS NULL
      AND id != (
        SELECT id FROM categories
        WHERE user_id = r.user_id
          AND taxonomy_key = r.taxonomy_key
          AND retired_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      );
  END LOOP;
END;
$$;

-- Fix category names that don't match their taxonomy_key
-- (e.g. a row with taxonomy_key='restaurants' but name='Alimony / Support')
UPDATE categories
SET name = CASE taxonomy_key
  WHEN 'groceries'          THEN 'Groceries'
  WHEN 'bakery'             THEN 'Bakery'
  WHEN 'meat_seafood'       THEN 'Meat & Seafood'
  WHEN 'restaurants'        THEN 'Restaurants'
  WHEN 'cafes_coffee'       THEN 'Cafes & Coffee'
  WHEN 'food_delivery'      THEN 'Food Delivery'
  WHEN 'hungerstation'      THEN 'HungerStation'
  WHEN 'jahez'              THEN 'Jahez'
  WHEN 'marsool'            THEN 'Marsool'
  WHEN 'talabat'            THEN 'Talabat'
  WHEN 'alimony_support'    THEN 'Alimony / Support'
  WHEN 'fuel'               THEN 'Fuel'
  WHEN 'uber_taxi'          THEN 'Uber / Taxi'
  WHEN 'careem'             THEN 'Careem'
  WHEN 'public_transport'   THEN 'Public Transport'
  WHEN 'parking'            THEN 'Parking'
  WHEN 'pharmacy'           THEN 'Pharmacy'
  WHEN 'snacks_sweets'      THEN 'Snacks & Sweets'
  WHEN 'water_beverages'    THEN 'Water & Beverages'
  ELSE name
END
WHERE taxonomy_key IS NOT NULL
  AND retired_at IS NULL
  AND is_default = true;

COMMIT;
