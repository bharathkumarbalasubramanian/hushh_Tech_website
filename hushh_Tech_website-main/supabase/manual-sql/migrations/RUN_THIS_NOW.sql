-- =====================================================
-- COMPLETE FIX: NDA RPCs + Financial Link + Onboarding
-- =====================================================
-- Current DB has: kyc_profiles, nda_signatures
-- This adds: sign_global_nda RPC, check_user_nda_status RPC,
--            user_financial_data table, onboarding_data table
-- =====================================================

-- =====================================================
-- PART 1: NDA RPC Functions (uses existing nda_signatures)
-- =====================================================

CREATE OR REPLACE FUNCTION check_user_nda_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'hasSignedNda', signed_at IS NOT NULL,
    'signedAt', signed_at,
    'ndaVersion', nda_version,
    'signerName', signer_name
  ) INTO result
  FROM nda_signatures
  WHERE user_id = p_user_id;

  IF result IS NULL THEN
    RETURN jsonb_build_object(
      'hasSignedNda', false,
      'signedAt', null,
      'ndaVersion', null,
      'signerName', null
    );
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION sign_global_nda(
  p_signer_name TEXT,
  p_nda_version TEXT DEFAULT 'v1.0',
  p_pdf_url TEXT DEFAULT NULL,
  p_signer_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  INSERT INTO nda_signatures (
    user_id, signer_name, signer_email, signer_ip,
    nda_version, pdf_url, signed_at, created_at, updated_at
  )
  VALUES (
    v_user_id, p_signer_name, v_user_email,
    COALESCE(p_signer_ip, 'unknown'),
    COALESCE(p_nda_version, 'v1.0'),
    p_pdf_url, NOW(), NOW(), NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    signer_name = p_signer_name,
    signer_ip = COALESCE(p_signer_ip, nda_signatures.signer_ip),
    nda_version = COALESCE(p_nda_version, nda_signatures.nda_version),
    pdf_url = COALESCE(p_pdf_url, nda_signatures.pdf_url),
    signed_at = NOW(),
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'signedAt', NOW(),
    'signerName', p_signer_name,
    'ndaVersion', COALESCE(p_nda_version, 'v1.0')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO anon;
GRANT EXECUTE ON FUNCTION sign_global_nda(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- NDA RLS policies
ALTER TABLE nda_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own NDA signature" ON nda_signatures;
  DROP POLICY IF EXISTS "Users can insert own NDA signature" ON nda_signatures;
  DROP POLICY IF EXISTS "Users can update own NDA signature" ON nda_signatures;
END; $$;

CREATE POLICY "Users can view own NDA signature"
  ON nda_signatures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own NDA signature"
  ON nda_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own NDA signature"
  ON nda_signatures FOR UPDATE USING (auth.uid() = user_id);


-- =====================================================
-- PART 2: Helper trigger function
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =====================================================
-- PART 3: user_financial_data table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plaid_item_id TEXT,
  plaid_access_token TEXT,
  institution_name TEXT,
  institution_id TEXT,
  balances JSONB,
  asset_report JSONB,
  asset_report_token TEXT,
  investments JSONB,
  available_products JSONB DEFAULT '{"balance":false,"assets":false,"investments":false}',
  status TEXT DEFAULT 'pending',
  fetch_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_financial_data_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_financial_data_user_id
  ON public.user_financial_data (user_id);

DROP TRIGGER IF EXISTS set_timestamp_on_user_financial_data ON public.user_financial_data;
CREATE TRIGGER set_timestamp_on_user_financial_data
  BEFORE UPDATE ON public.user_financial_data
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.user_financial_data ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own financial data" ON public.user_financial_data;
  DROP POLICY IF EXISTS "Users can insert their own financial data" ON public.user_financial_data;
  DROP POLICY IF EXISTS "Users can update their own financial data" ON public.user_financial_data;
  DROP POLICY IF EXISTS "Service role full access on financial data" ON public.user_financial_data;
END; $$;

CREATE POLICY "Users can view their own financial data"
  ON public.user_financial_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own financial data"
  ON public.user_financial_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own financial data"
  ON public.user_financial_data FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on financial data"
  ON public.user_financial_data FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.user_financial_data TO authenticated;
GRANT ALL ON TABLE public.user_financial_data TO service_role;
GRANT SELECT ON TABLE public.user_financial_data TO anon;


-- =====================================================
-- PART 4: onboarding_data table (all columns, final state)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onboarding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT,
  selected_fund TEXT DEFAULT 'hushh_fund_a',
  class_a_units INTEGER DEFAULT 0 CHECK (class_a_units >= 0),
  class_b_units INTEGER DEFAULT 0 CHECK (class_b_units >= 0),
  class_c_units INTEGER DEFAULT 0 CHECK (class_c_units >= 0),
  referral_source TEXT CHECK (referral_source IN (
    'podcast','social_media_influencer','social_media_ad',
    'yahoo_finance','ai_tool','website_blog_article',
    'penny_hoarder','family_friend','tv_radio','other'
  )),
  referral_source_other TEXT,
  citizenship_country TEXT DEFAULT 'united_states',
  residence_country TEXT DEFAULT 'united_states',
  account_structure TEXT CHECK (account_structure IN ('individual','other')),
  phone_number TEXT,
  phone_country_code TEXT DEFAULT '+1',
  legal_first_name TEXT,
  legal_last_name TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  address_country TEXT DEFAULT 'United States',
  address_phone_number TEXT,
  address_phone_country_code TEXT DEFAULT '+1',
  ssn_encrypted TEXT,
  date_of_birth TEXT,
  initial_investment_amount DECIMAL(12,2),
  recurring_investment_enabled BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN (
    'once_a_month','twice_a_month','weekly','every_other_week'
  )),
  recurring_amount DECIMAL(12,2),
  recurring_day TEXT,
  recurring_day_of_month INTEGER,
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 13),
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  ai_prefilled BOOLEAN DEFAULT false,
  ai_prefilled_at TIMESTAMPTZ,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_city TEXT,
  gps_state TEXT,
  gps_country TEXT,
  gps_zip_code TEXT,
  gps_full_address TEXT,
  gps_detected_at TIMESTAMPTZ,
  ai_dob_detected TEXT,
  ai_dob_confidence DOUBLE PRECISION,
  ai_dob_source TEXT,
  shadow_profile JSONB,
  nda_signed_at TIMESTAMPTZ,
  nda_pdf_url TEXT,
  nda_version TEXT DEFAULT 'v1.0',
  nda_signer_name TEXT,
  nda_signer_ip TEXT,
  privacy_accepted BOOLEAN DEFAULT false,
  privacy_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.onboarding_data ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert their own onboarding data" ON public.onboarding_data;
  DROP POLICY IF EXISTS "Users can view their own onboarding data" ON public.onboarding_data;
  DROP POLICY IF EXISTS "Users can update their own onboarding data" ON public.onboarding_data;
  DROP POLICY IF EXISTS "Users can delete their own onboarding data" ON public.onboarding_data;
END; $$;

CREATE POLICY "Users can insert their own onboarding data"
  ON public.onboarding_data FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own onboarding data"
  ON public.onboarding_data FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own onboarding data"
  ON public.onboarding_data FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own onboarding data"
  ON public.onboarding_data FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON public.onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_current_step ON public.onboarding_data(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_is_completed ON public.onboarding_data(is_completed);

CREATE OR REPLACE FUNCTION public.update_onboarding_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_on_onboarding_data ON public.onboarding_data;
CREATE TRIGGER set_timestamp_on_onboarding_data
  BEFORE UPDATE ON public.onboarding_data
  FOR EACH ROW EXECUTE FUNCTION public.update_onboarding_data_timestamp();

GRANT ALL ON public.onboarding_data TO authenticated;
GRANT ALL ON public.onboarding_data TO service_role;


-- =====================================================
-- VERIFY
-- =====================================================
DO $$
DECLARE
  tbl_count INTEGER;
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tbl_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('user_financial_data', 'onboarding_data', 'nda_signatures', 'kyc_profiles');

  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN ('check_user_nda_status', 'sign_global_nda');

  RAISE NOTICE '✅ Tables: %/4 | RPC Functions: %/2', tbl_count, func_count;
END;
$$;
