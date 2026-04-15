-- ============================================================
-- PROFILE SEARCH MIGRATIONS
-- Run this script in Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/ibsisfnjxeowvdtvgzff/sql/new
-- ============================================================

-- Migration 1: Create user_enriched_profiles table
-- ============================================================

CREATE TABLE IF NOT EXISTS user_enriched_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identity Core (parsed from API)
  age INT,
  dob DATE,
  occupation TEXT,
  nationality TEXT,
  marital_status TEXT,
  
  -- Address (structured JSONB for flexibility)
  address JSONB DEFAULT '{}',
  -- Example: {"line1": "123 Main St", "city": "SF", "state": "CA", "zipCode": "94102", "country": "USA"}
  
  -- Phone (structured JSONB)
  phone JSONB DEFAULT '{}',
  -- Example: {"countryCode": "+1", "number": "5551234567"}
  
  -- Preferences (30+ categories stored as JSONB for flexibility)
  preferences JSONB DEFAULT '{}',
  -- Contains all preference fields from API (diet, hobbies, brands, travel, etc.)
  
  -- AI Confidence & Metadata
  confidence FLOAT DEFAULT 0,
  net_worth_score INT DEFAULT 0,
  net_worth_context TEXT,
  
  -- Search context
  search_query TEXT,
  raw_api_response JSONB,
  sources JSONB DEFAULT '[]',
  
  -- Field source tracking (which fields were AI-suggested vs user-edited)
  field_sources JSONB DEFAULT '{}',
  -- Example: {"nationality": "ai_suggested", "phone": "user_edited"}
  
  -- Status
  is_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint on user_id
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_enriched_profiles_user_id ON user_enriched_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enriched_profiles_confidence ON user_enriched_profiles(confidence);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_user_enriched_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_enriched_profiles_updated_at ON user_enriched_profiles;
CREATE TRIGGER trigger_update_user_enriched_profiles_updated_at
  BEFORE UPDATE ON user_enriched_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_enriched_profiles_updated_at();

-- RLS Policies
ALTER TABLE user_enriched_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own enriched profile
DO $$ BEGIN
  CREATE POLICY "Users can view own enriched profile"
    ON user_enriched_profiles
    FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own enriched profile
DO $$ BEGIN
  CREATE POLICY "Users can insert own enriched profile"
    ON user_enriched_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own enriched profile
DO $$ BEGIN
  CREATE POLICY "Users can update own enriched profile"
    ON user_enriched_profiles
    FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role can do anything (for API calls)
DO $$ BEGIN
  CREATE POLICY "Service role can manage all enriched profiles"
    ON user_enriched_profiles
    FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add comment for documentation
COMMENT ON TABLE user_enriched_profiles IS 'Stores AI-enriched user profiles from hushh-profile-search API. Used for onboarding pre-population and profile dashboard display.';
COMMENT ON COLUMN user_enriched_profiles.preferences IS 'JSONB containing 30+ preference categories (diet, hobbies, travel, entertainment, etc.)';
COMMENT ON COLUMN user_enriched_profiles.field_sources IS 'Tracks which fields were AI-suggested vs user-edited for analytics and trust scoring';


-- Migration 2: Add AI prefill columns to onboarding_data
-- ============================================================

-- Add columns to track AI pre-fill status
ALTER TABLE onboarding_data 
ADD COLUMN IF NOT EXISTS ai_prefilled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_prefilled_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN onboarding_data.ai_prefilled IS 'Whether this record was pre-filled using AI-powered web intelligence';
COMMENT ON COLUMN onboarding_data.ai_prefilled_at IS 'Timestamp when AI pre-fill occurred';

-- Create index for querying AI-prefilled records
CREATE INDEX IF NOT EXISTS idx_onboarding_data_ai_prefilled 
ON onboarding_data(ai_prefilled) 
WHERE ai_prefilled = TRUE;


-- ============================================================
-- VERIFICATION
-- Run this to verify the migrations were applied:
-- ============================================================

-- Check if user_enriched_profiles table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_enriched_profiles'
) AS user_enriched_profiles_exists;

-- Check if ai_prefilled column exists in onboarding_data
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'onboarding_data' 
  AND column_name = 'ai_prefilled'
) AS ai_prefilled_column_exists;
