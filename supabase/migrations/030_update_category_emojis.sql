-- ============================================================
-- Migration 030: Update category emoji icons
--
-- WHAT THIS DOES:
--   1. Updates emoji icons for categories that changed in the
--      taxonomy v2 audit (home_appliances, domestic_worker, car_rental).
--   2. Updates the Domestic Worker icon from 🧹 to 🏡.
--   3. Updates Home Appliances icon from 🏠 to 🔌.
--   4. Updates Car Rental icon from 🚗 to 🚙.
--
-- SAFE TO RE-RUN: idempotent UPDATE statements.
-- ============================================================

BEGIN;

-- Domestic Worker: 🧹 → 🏡
UPDATE categories
SET icon = '🏡'
WHERE taxonomy_key = 'domestic_worker' AND icon = '🧹';

-- Home Appliances: 🏠 → 🔌
UPDATE categories
SET icon = '🔌'
WHERE taxonomy_key = 'home_appliances' AND icon = '🏠';

-- Car Rental: 🚗 → 🚙
UPDATE categories
SET icon = '🚙'
WHERE taxonomy_key = 'car_rental' AND icon = '🚗';

COMMIT;
