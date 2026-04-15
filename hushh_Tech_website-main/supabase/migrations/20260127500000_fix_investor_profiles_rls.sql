-- Fix RLS policies for investor_profiles and user_enriched_profiles
-- The 406 errors occur when no row exists and RLS is too restrictive

-- ============================================
-- investor_profiles table fixes
-- ============================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.investor_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.investor_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.investor_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by anyone" ON public.investor_profiles;
DROP POLICY IF EXISTS "Service role full access" ON public.investor_profiles;

-- Allow users to insert their own profile
CREATE POLICY "investor_profiles_insert_own"
  ON public.investor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own profile (even if empty result)
CREATE POLICY "investor_profiles_select_own"
  ON public.investor_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow public profiles to be viewed by anyone (for public investor pages)
CREATE POLICY "investor_profiles_select_public"
  ON public.investor_profiles FOR SELECT
  TO authenticated, anon
  USING (is_public = true);

-- Allow users to update their own profile
CREATE POLICY "investor_profiles_update_own"
  ON public.investor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "investor_profiles_service_role"
  ON public.investor_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- user_enriched_profiles table fixes
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own enriched profile" ON public.user_enriched_profiles;
DROP POLICY IF EXISTS "Users can insert own enriched profile" ON public.user_enriched_profiles;
DROP POLICY IF EXISTS "Users can update own enriched profile" ON public.user_enriched_profiles;
DROP POLICY IF EXISTS "Service role can manage all enriched profiles" ON public.user_enriched_profiles;

-- Allow users to view their own enriched profile
CREATE POLICY "enriched_profiles_select_own"
  ON public.user_enriched_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own enriched profile
CREATE POLICY "enriched_profiles_insert_own"
  ON public.user_enriched_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own enriched profile
CREATE POLICY "enriched_profiles_update_own"
  ON public.user_enriched_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do anything
CREATE POLICY "enriched_profiles_service_role"
  ON public.user_enriched_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Make sure slug column exists with default
-- ============================================
DO $$
BEGIN
  -- Ensure slug has a default generator if not already
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'investor_profiles' AND a.attname = 'slug'
  ) THEN
    ALTER TABLE public.investor_profiles ADD COLUMN slug TEXT;
  END IF;
END $$;

-- Create function to generate slug from name if not exists
CREATE OR REPLACE FUNCTION generate_investor_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]', '-', 'g')) || '-investor';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS ensure_investor_slug ON public.investor_profiles;
CREATE TRIGGER ensure_investor_slug
  BEFORE INSERT OR UPDATE ON public.investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_investor_slug();
