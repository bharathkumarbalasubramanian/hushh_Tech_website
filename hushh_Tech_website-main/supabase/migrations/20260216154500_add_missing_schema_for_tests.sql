-- Migration: Add missing schema required by profileSearch tests
-- Date: 2026-02-16
-- Purpose: Fix failing tests by adding user_enriched_profiles table and ai_prefilled column

-- 1. Add ai_prefilled column to onboarding_data table
ALTER TABLE public.onboarding_data
ADD COLUMN IF NOT EXISTS ai_prefilled BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.onboarding_data.ai_prefilled IS
'Indicates whether this onboarding data was pre-filled by AI (e.g., from resume analysis)';

-- 2. Create user_enriched_profiles table
CREATE TABLE IF NOT EXISTS public.user_enriched_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Enriched profile data
  enriched_data JSONB,
  data_sources TEXT[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one profile per user
  CONSTRAINT user_enriched_profiles_user_id_key UNIQUE(user_id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS user_enriched_profiles_user_id_idx
ON public.user_enriched_profiles(user_id);

-- Add comment
COMMENT ON TABLE public.user_enriched_profiles IS
'Stores AI-enriched user profile data from multiple sources (resume, financial data, etc.)';

-- Enable Row Level Security
ALTER TABLE public.user_enriched_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_enriched_profiles

-- Policy: Users can view their own enriched profile
CREATE POLICY "Users can view own enriched profile"
ON public.user_enriched_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own enriched profile
CREATE POLICY "Users can insert own enriched profile"
ON public.user_enriched_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own enriched profile
CREATE POLICY "Users can update own enriched profile"
ON public.user_enriched_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to enriched profiles"
ON public.user_enriched_profiles
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');
