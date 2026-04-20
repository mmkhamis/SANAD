-- Add optional Arabic name column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name_ar TEXT;
