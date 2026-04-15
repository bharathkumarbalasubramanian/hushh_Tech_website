-- =====================================================
-- FIX: Financial Link + Onboarding Tables
-- =====================================================
-- Run in Supabase SQL Editor.
-- Creates user_financial_data and onboarding_data tables
-- with ALL columns (final state after all migrations).
-- =====================================================

-- =====================================================
-- 0. Helper function: set_current_timestamp_updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. CREATE user_financial_data TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Plaid connection info
  plaid_item_id TEXT,
  plaid_access_token TEXT,
  institution_name TEXT,
  institution_id TEXT,

  -- Financial data (JSONB — not all institutions support all products)
  balances JSONB,
  asset_report JSONB,
  asset_report_token TEXT,
  investments JSONB,

  -- Which products are available
  available_products JSONB DEFAULT '{"balance":false,"assets":false,"investments":false}',

  -- Status: pending | linking | fetching | partial | complete | failed
  status TEXT DEFAULT 'pending',

  -- Error details for failed product fetches
  fetch_errors JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for upsert
ALTER TABLE public.user_financial_data
  ADD CONSTRAINT user_financial_data_user_id_unique UNIQUE (user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_financial_data_user_id
  ON public.user_financial_data (user_id);

-- Auto-update trigger
CREATE OR REPLACE TRIGGER set_timestamp_on_user_financial_data
  BEFORE UPDATE ON public.user_financial_data
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS
ALTER TABLE public.user_financial_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own financial data" ON public.user_financial_data;
  DROP POLICY IF EXISTS "Users can insert their own financial data" ON public.user_financial_data;
  DROP POLICY IF EXISTS "Users can update their own financial data" ON public.user_financial_data;
  DROP POLICY IF EXISTS "Service role full access" ON public.user_financial_data;
END;
$$;

CREATE POLICY "Users can view their own financial data"
  ON public.user_financial_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial data"
  ON public.user_financial_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial data"
  ON public.user_financial_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.user_financial_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permissions
GRANT ALL ON TABLE public.user_financial_data TO authenticated;
GRANT ALL ON TABLE public.user_financial_data TO service_role;
GRANT SELECT ON TABLE public.user_financial_data TO anon;


-- =====================================================
-- 2. CREATE onboarding_data TABLE (final state)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.onboarding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Legacy: Account Type (nullable after step removal)
  account_type TEXT,

  -- Fund Selection
  selected_fund TEXT DEFAULT 'hushh_fund_a',

  -- Share Class Units (Step 1 in new flow)
  class_a_units INTEGER DEFAULT 0 CHECK (class_a_units >= 0),
  class_b_units INTEGER DEFAULT 0 CHECK (class_b_units >= 0),
  class_c_units INTEGER DEFAULT 0 CHECK (class_c_units >= 0),

  -- Referral Source
  referral_source TEXT CHECK (referral_source IN (
    'podcast', 'social_media_influencer', 'social_media_ad',
    'yahoo_finance', 'ai_tool', 'website_blog_article',
    'penny_hoarder', 'family_friend', 'tv_radio', 'other'
  )),
  referral_source_other TEXT,

  -- Residence
  citizenship_country TEXT DEFAULT 'united_states',
  residence_country TEXT DEFAULT 'united_states',

  -- Account Structure
  account_structure TEXT CHECK (account_structure IN ('individual', 'other')),

  -- Phone
  phone_number TEXT,
  phone_country_code TEXT DEFAULT '+1',

  -- Legal Name
  legal_first_name TEXT,
  legal_last_name TEXT,

  -- Address
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  address_country TEXT DEFAULT 'United States',
  address_phone_number TEXT,
  address_phone_country_code TEXT DEFAULT '+1',

  -- Sensitive Info
  ssn_encrypted TEXT,
  date_of_birth TEXT,

  -- Investment
  initial_investment_amount DECIMAL(12,2),
  recurring_investment_enabled BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN (
    'once_a_month', 'twice_a_month', 'weekly', 'every_other_week'
  )),
  recurring_amount DECIMAL(12,2),
  recurring_day TEXT,
  recurring_day_of_month INTEGER,

  -- Progress Tracking (13 steps after removal of old 1 & 2)
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 13),
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- AI Prefill
  ai_prefilled BOOLEAN DEFAULT false,
  ai_prefilled_at TIMESTAMPTZ,

  -- GPS Location
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_city TEXT,
  gps_state TEXT,
  gps_country TEXT,
  gps_zip_code TEXT,
  gps_full_address TEXT,
  gps_detected_at TIMESTAMPTZ,

  -- AI DOB
  ai_dob_detected TEXT,
  ai_dob_confidence DOUBLE PRECISION,
  ai_dob_source TEXT,

  -- Shadow Profile
  shadow_profile JSONB,

  -- NDA tracking
  nda_signed_at TIMESTAMPTZ,
  nda_pdf_url TEXT,
  nda_version TEXT DEFAULT 'v1.0',
  nda_signer_name TEXT,
  nda_signer_ip TEXT,

  -- Privacy
  privacy_accepted BOOLEAN DEFAULT false,
  privacy_accepted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert their own onboarding data" ON public.onboarding_data;
  DROP POLICY IF EXISTS "Users can view their own onboarding data" ON public.onboarding_data;
  DROP POLICY IF EXISTS "Users can update their own onboarding data" ON public.onboarding_data;
  DROP POLICY IF EXISTS "Users can delete their own onboarding data" ON public.onboarding_data;
END;
$$;

CREATE POLICY "Users can insert their own onboarding data"
  ON public.onboarding_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own onboarding data"
  ON public.onboarding_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding data"
  ON public.onboarding_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own onboarding data"
  ON public.onboarding_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON public.onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_current_step ON public.onboarding_data(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_is_completed ON public.onboarding_data(is_completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_created_at ON public.onboarding_data(created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_share_units ON public.onboarding_data(class_a_units, class_b_units, class_c_units)
  WHERE class_a_units > 0 OR class_b_units > 0 OR class_c_units > 0;
CREATE INDEX IF NOT EXISTS idx_onboarding_data_ai_prefilled ON public.onboarding_data(ai_prefilled) WHERE ai_prefilled = TRUE;
CREATE INDEX IF NOT EXISTS idx_onboarding_data_nda_signed ON public.onboarding_data(user_id) WHERE nda_signed_at IS NOT NULL;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION public.update_onboarding_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_on_onboarding_data
  BEFORE UPDATE ON public.onboarding_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_data_timestamp();

-- Permissions
GRANT ALL ON public.onboarding_data TO authenticated;
GRANT ALL ON public.onboarding_data TO service_role;


-- =====================================================
-- 3. VERIFY
-- =====================================================
DO $$
DECLARE
  tbl_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tbl_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('user_financial_data', 'onboarding_data');

  IF tbl_count >= 2 THEN
    RAISE NOTICE '✅ Both tables created successfully! Financial link flow is ready.';
  ELSE
    RAISE WARNING '⚠️ Only % of 2 tables found.', tbl_count;
  END IF;
END;
$$;

-- =====================================================
-- DONE! After running this:
-- 1. /onboarding/financial-link will work (uses user_financial_data)
-- 2. /onboarding/step-1 will work (uses onboarding_data)
-- 3. All RLS policies + indexes + triggers in place
-- =====================================================
