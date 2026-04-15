-- Fix Profile Link Sharing: Make existing profiles publicly accessible
-- and change defaults so new profiles are public by default.
--
-- Problem: is_public and user_confirmed both default to FALSE,
-- causing shared profile links to return null from the query
-- (RLS policy filters on is_public = true).

-- 1. Fix all existing profiles that have a slug to be publicly accessible
UPDATE investor_profiles 
SET is_public = true, user_confirmed = true 
WHERE slug IS NOT NULL AND slug != '';

-- 2. Change column defaults so new profiles are public by default
ALTER TABLE investor_profiles ALTER COLUMN is_public SET DEFAULT true;
ALTER TABLE investor_profiles ALTER COLUMN user_confirmed SET DEFAULT true;
