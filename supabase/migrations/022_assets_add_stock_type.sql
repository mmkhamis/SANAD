-- Allow stock assets in user portfolio
ALTER TABLE public.user_assets
DROP CONSTRAINT IF EXISTS asset_type_check;

ALTER TABLE public.user_assets
ADD CONSTRAINT asset_type_check
CHECK (asset_type IN ('gold', 'silver', 'crypto', 'stock'));
