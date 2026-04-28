-- Migration 048: Deduplicate category groups + fix subcategory parents
--
-- Root cause: multiple active groups share the same taxonomy_key per user.
-- Subcategories point to one group, but the app shows another.
-- Fix: keep ONE group per taxonomy_key, move all subcats to it, retire the rest.
-- Also fixes type field on groups and categories.

BEGIN;

-- ═══ FIX GROUP TYPES FIRST ═══
-- Ensure each group has the correct transaction type based on taxonomy_key
UPDATE category_groups SET type = 'income'
WHERE taxonomy_key = 'income' AND type != 'income' AND retired_at IS NULL;

UPDATE category_groups SET type = 'transfer'
WHERE taxonomy_key = 'transfers' AND type != 'transfer' AND retired_at IS NULL;

UPDATE category_groups SET type = 'expense'
WHERE taxonomy_key NOT IN ('income', 'transfers') AND taxonomy_key IS NOT NULL
  AND type != 'expense' AND retired_at IS NULL;

-- Fix categories type too
UPDATE categories SET type = 'income'
WHERE taxonomy_key IN ('salary','bonus','freelance','business_profit','rental_income',
  'investment_income','family_support_in','gift_received','refund_rebate','other_income')
  AND type != 'income' AND retired_at IS NULL;

UPDATE categories SET type = 'transfer'
WHERE taxonomy_key IN ('between_accounts','cash_to_bank','bank_to_cash',
  'wallet_top_up','savings_transfer','investment_transfer')
  AND type != 'transfer' AND retired_at IS NULL;

UPDATE categories SET type = 'expense'
WHERE taxonomy_key IS NOT NULL AND retired_at IS NULL AND type != 'expense'
  AND taxonomy_key NOT IN ('salary','bonus','freelance','business_profit','rental_income',
    'investment_income','family_support_in','gift_received','refund_rebate','other_income',
    'between_accounts','cash_to_bank','bank_to_cash','wallet_top_up','savings_transfer','investment_transfer');


DO $$
DECLARE
  _uid uuid;
  _tk text;
  _keep_gid uuid;
  _dup record;
BEGIN
  -- For each user + taxonomy_key combo that has more than one active group
  FOR _uid, _tk IN
    SELECT user_id, taxonomy_key
    FROM category_groups
    WHERE retired_at IS NULL AND taxonomy_key IS NOT NULL
    GROUP BY user_id, taxonomy_key
    HAVING count(*) > 1
  LOOP
    -- Keep the one with the most subcategories (or newest if tied)
    SELECT cg.id INTO _keep_gid
    FROM category_groups cg
    LEFT JOIN (
      SELECT group_id, count(*) as cnt
      FROM categories
      WHERE user_id = _uid AND retired_at IS NULL
      GROUP BY group_id
    ) cc ON cc.group_id = cg.id
    WHERE cg.user_id = _uid
      AND cg.taxonomy_key = _tk
      AND cg.retired_at IS NULL
    ORDER BY COALESCE(cc.cnt, 0) DESC, cg.created_at DESC
    LIMIT 1;

    IF _keep_gid IS NULL THEN CONTINUE; END IF;

    -- Move all active subcategories from duplicate groups into the keeper
    UPDATE categories c
    SET group_id = _keep_gid
    FROM category_groups cg
    WHERE c.group_id = cg.id
      AND cg.user_id = _uid
      AND cg.taxonomy_key = _tk
      AND cg.retired_at IS NULL
      AND cg.id != _keep_gid
      AND c.retired_at IS NULL;

    -- Retire the duplicate groups
    UPDATE category_groups
    SET retired_at = NOW()
    WHERE user_id = _uid
      AND taxonomy_key = _tk
      AND retired_at IS NULL
      AND id != _keep_gid;
  END LOOP;

  -- Now fix subcategory parents (same logic as 047 but after dedup)
  FOR _uid IN SELECT DISTINCT user_id FROM category_groups WHERE retired_at IS NULL
  LOOP
    -- FOOD & DINING
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'food_dining' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('groceries','bakery','meat_seafood','restaurants','cafes_coffee',
          'food_delivery','hungerstation','jahez','marsool','talabat','elmenus','snacks_sweets','water_beverages');
    END IF;

    -- TRANSPORT
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transport' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('fuel','uber_taxi','careem','public_transport','parking','tolls',
          'car_maintenance','car_insurance','registration_licensing','car_rental');
    END IF;

    -- SHOPPING
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'shopping' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('fashion','shoes','bags_accessories','jewelry','watches',
          'electronics','general_shopping','gifts');
    END IF;

    -- HEALTH & MEDICAL
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'health_medical' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('doctor_visits','medicines','lab_tests','hospital','dental',
          'therapy_fitness','health_insurance','pharmacy');
    END IF;

    -- EDUCATION
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'education' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('school_fees','university','courses_training','books_supplies',
          'tutoring','exam_fees','school_transport','language_learning');
    END IF;

    -- FAMILY & CHILDREN
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'family_children' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('childcare','baby_supplies','kids_clothing','allowances',
          'family_support_out','school_needs','kids_activities','maternity','elderly_care');
    END IF;

    -- ENTERTAINMENT & LIFESTYLE
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'entertainment_lifestyle' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('cinema_events','gaming','hobbies','beauty_grooming','sports_clubs',
          'social_outings','smoking_shisha','laundry');
    END IF;

    -- SUBSCRIPTIONS & DIGITAL
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'subscriptions_digital' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('netflix','shahid_vip','disney_plus','spotify','youtube_premium',
          'anghami','icloud_storage','chatgpt_ai_tools','vpn_security','other_digital');
    END IF;

    -- DEBT & OBLIGATIONS
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'debt_obligations' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('credit_card_payment','personal_loan','mortgage_payment','car_loan',
          'installments_bnpl','tabby','tamara','taxes_fees','legal_support','alimony_support');
    END IF;

    -- BILLS & UTILITIES
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'bills_utilities' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('electricity','water','gas','internet','mobile','tv_satellite',
          'building_fees','government_services','absher','fawry','e_gov_egypt');
    END IF;

    -- HOUSING & HOME
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'housing_home' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('rent','mortgage','home_maintenance','furniture','home_appliances',
          'cleaning_supplies','home_decor','security_services','domestic_worker');
    END IF;

    -- INCOME
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'income' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('salary','bonus','freelance','business_profit','rental_income',
          'investment_income','family_support_in','gift_received','refund_rebate','other_income');
    END IF;

    -- SAVINGS & GOALS
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'savings_goals' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('emergency_fund','general_savings','home_goal','car_goal',
          'wedding_goal','education_goal','travel_goal','hajj_umrah_goal');
    END IF;

    -- INVESTMENTS
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'investments' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('stocks','etfs_funds','crypto','gold_silver',
          'real_estate_investment','private_business','retirement');
    END IF;

    -- TRAVEL
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'travel' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('flights','hotels','visa_fees','travel_transport',
          'travel_food','travel_shopping','travel_insurance','hajj_umrah_trip');
    END IF;

    -- RELIGION / CHARITY / SOCIAL
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'religion_charity_social' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('zakat','sadaqah','mosque_community','eid_social_giving',
          'family_occasions','funeral_support','religious_courses','qurbani','ramadan_supplies');
    END IF;

    -- BUSINESS / WORK
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'business_work_expenses' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('office_supplies','software_tools','business_travel','marketing_ads',
          'shipping_logistics','professional_services','coworking_office_rent','internet_phone_work');
    END IF;

    -- PETS
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'pets' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('pet_food','vet','pet_supplies','grooming','boarding','pet_toys');
    END IF;

    -- MISCELLANEOUS
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'miscellaneous' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('cash_withdrawal','fees_commissions','fines_penalties',
          'unexpected_expense','uncategorized');
    END IF;

    -- TRANSFERS
    SELECT id INTO _keep_gid FROM category_groups
      WHERE user_id = _uid AND taxonomy_key = 'transfers' AND retired_at IS NULL LIMIT 1;
    IF _keep_gid IS NOT NULL THEN
      UPDATE categories SET group_id = _keep_gid
      WHERE user_id = _uid AND retired_at IS NULL AND group_id != _keep_gid
        AND taxonomy_key IN ('between_accounts','cash_to_bank','bank_to_cash',
          'wallet_top_up','savings_transfer','investment_transfer');
    END IF;
  END LOOP;

  -- Deduplicate subcategories too (same user + taxonomy_key, keep newest)
  FOR _uid, _tk IN
    SELECT user_id, taxonomy_key
    FROM categories
    WHERE retired_at IS NULL AND taxonomy_key IS NOT NULL
    GROUP BY user_id, taxonomy_key
    HAVING count(*) > 1
  LOOP
    SELECT id INTO _keep_gid FROM categories
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NULL
    ORDER BY created_at DESC LIMIT 1;

    UPDATE categories SET retired_at = NOW()
    WHERE user_id = _uid AND taxonomy_key = _tk AND retired_at IS NULL AND id != _keep_gid;
  END LOOP;
END;
$$;

COMMIT;
