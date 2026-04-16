-- 009_nullable_category_fields.sql
-- Allow transactions to be saved without category details.
-- Migration 003 already made category_id nullable, but category_name,
-- category_icon, and category_color were still NOT NULL — causing inserts
-- to fail when SMS/OCR transactions are saved without a category.

ALTER TABLE public.transactions
  ALTER COLUMN category_name DROP NOT NULL;

ALTER TABLE public.transactions
  ALTER COLUMN category_icon DROP NOT NULL;

ALTER TABLE public.transactions
  ALTER COLUMN category_color DROP NOT NULL;
