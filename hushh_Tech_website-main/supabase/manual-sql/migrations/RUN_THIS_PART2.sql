-- =====================================================
-- PART 2: ALL Remaining Tables for Full Onboarding Flow
-- =====================================================
-- Current DB has: kyc_profiles, nda_signatures,
--                 onboarding_data, user_financial_data
--
-- This creates: investor_profiles, identity_verifications,
--               ceo_meeting_payments, user_enriched_profiles,
--               user_product_usage
-- Also: adds missing banking columns to onboarding_data,
--        creates RPC functions (track_product_usage, etc.)
-- =====================================================


-- =====================================================
-- 1. ADD missing banking columns to onboarding_data
-- =====================================================

ALTER TABLE public.onboarding_data
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_number TEXT,
ADD COLUMN IF NOT EXISTS bank_swift_code TEXT,
ADD COLUMN IF NOT EXISTS bank_address_city TEXT,
ADD COLUMN IF NOT EXISTS bank_address_country TEXT,
ADD COLUMN IF NOT EXISTS bank_account_type TEXT;

-- Update account_type constraint to support new tier types
ALTER TABLE public.onboarding_data
DROP CONSTRAINT IF EXISTS onboarding_data_account_type_check;

ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_account_type_check
CHECK (account_type = ANY (ARRAY[
  'wealth_1m', 'wealth_5m', 'ultra_25m',
  'general', 'retirement'
]));

ALTER TABLE public.onboarding_data
DROP CONSTRAINT IF EXISTS onboarding_data_bank_account_type_check;

ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_bank_account_type_check
CHECK (bank_account_type = ANY (ARRAY['checking', 'savings', 'wire']));


-- =====================================================
-- 2. CREATE investor_profiles TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
  phone_country_code TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  organisation TEXT,

  -- Derived context from enrichment
  derived_context JSONB DEFAULT '{}'::jsonb,

  -- AI Generated Profile (12 fields with confidence)
  investor_profile JSONB NOT NULL,

  -- AI prefill tracking
  is_ai_prefilled BOOLEAN DEFAULT true,
  user_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMPTZ,

  -- Public profile
  slug TEXT,
  is_public BOOLEAN DEFAULT false,

  -- Privacy settings
  privacy_settings JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT investor_profiles_email_key UNIQUE (email),
  CONSTRAINT investor_profiles_phone_unique UNIQUE (phone_country_code, phone_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id ON public.investor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_investor_profiles_slug ON public.investor_profiles(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investor_profiles_public ON public.investor_profiles(is_public) WHERE is_public = true;

-- Auto-generate slug trigger
CREATE OR REPLACE FUNCTION public.generate_investor_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REPLACE(NEW.name, ' ', '-')) || '-' || SUBSTR(NEW.id::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_investor_slug ON public.investor_profiles;
CREATE TRIGGER set_investor_slug
  BEFORE INSERT OR UPDATE ON public.investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_investor_slug();

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_timestamp_investor_profiles ON public.investor_profiles;
CREATE TRIGGER set_timestamp_investor_profiles
  BEFORE UPDATE ON public.investor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own investor profile" ON public.investor_profiles;
  DROP POLICY IF EXISTS "Users can insert own investor profile" ON public.investor_profiles;
  DROP POLICY IF EXISTS "Users can update own investor profile" ON public.investor_profiles;
  DROP POLICY IF EXISTS "Users can delete own investor profile" ON public.investor_profiles;
  DROP POLICY IF EXISTS "Public profiles are viewable by anyone" ON public.investor_profiles;
  DROP POLICY IF EXISTS "Service role full access on investor_profiles" ON public.investor_profiles;
END; $$;

CREATE POLICY "Users can view own investor profile"
  ON public.investor_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investor profile"
  ON public.investor_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investor profile"
  ON public.investor_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own investor profile"
  ON public.investor_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by anyone"
  ON public.investor_profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Service role full access on investor_profiles"
  ON public.investor_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;
GRANT SELECT ON public.investor_profiles TO anon;


-- =====================================================
-- 3. CREATE identity_verifications TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe session info
  stripe_session_id TEXT UNIQUE,
  stripe_verification_flow_id TEXT,

  -- Status: pending, processing, verified, requires_input, canceled, failed
  status TEXT NOT NULL DEFAULT 'pending',

  -- Verified data from Stripe
  verified_first_name TEXT,
  verified_last_name TEXT,
  verified_date_of_birth DATE,
  verified_id_number TEXT,
  verified_document_type TEXT,
  verified_document_country TEXT,
  verified_address_line1 TEXT,
  verified_address_city TEXT,
  verified_address_state TEXT,
  verified_address_postal_code TEXT,
  verified_address_country TEXT,

  -- Verification checks
  document_verified BOOLEAN DEFAULT FALSE,
  selfie_verified BOOLEAN DEFAULT FALSE,

  -- Raw Stripe data
  raw_response JSONB,

  -- Error info
  last_error TEXT,
  error_code TEXT,

  -- Metadata
  verification_type TEXT DEFAULT 'document',
  initiated_from TEXT DEFAULT 'onboarding',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_verifications_user_id
  ON public.identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_status
  ON public.identity_verifications(status);
CREATE INDEX IF NOT EXISTS idx_identity_verifications_stripe_session
  ON public.identity_verifications(stripe_session_id);

DROP TRIGGER IF EXISTS set_timestamp_identity_verifications ON public.identity_verifications;
CREATE TRIGGER set_timestamp_identity_verifications
  BEFORE UPDATE ON public.identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own verifications" ON public.identity_verifications;
  DROP POLICY IF EXISTS "Users can insert own verifications" ON public.identity_verifications;
  DROP POLICY IF EXISTS "Users can update own verifications" ON public.identity_verifications;
  DROP POLICY IF EXISTS "Service role full access on identity_verifications" ON public.identity_verifications;
END; $$;

CREATE POLICY "Users can view own verifications"
  ON public.identity_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON public.identity_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
  ON public.identity_verifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on identity_verifications"
  ON public.identity_verifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;


-- =====================================================
-- 4. CREATE ceo_meeting_payments TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ceo_meeting_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe payment info
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,

  -- Payment status: pending, completed
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER DEFAULT 100,
  hushh_coins_awarded INTEGER DEFAULT 100,

  -- Meeting booking
  calendly_booked BOOLEAN DEFAULT false,
  meeting_event_id TEXT,
  meeting_start_time TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ceo_meeting_payments_user_id
  ON public.ceo_meeting_payments(user_id);

DROP TRIGGER IF EXISTS set_timestamp_ceo_meeting_payments ON public.ceo_meeting_payments;
CREATE TRIGGER set_timestamp_ceo_meeting_payments
  BEFORE UPDATE ON public.ceo_meeting_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.ceo_meeting_payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own meeting payments" ON public.ceo_meeting_payments;
  DROP POLICY IF EXISTS "Users can insert own meeting payments" ON public.ceo_meeting_payments;
  DROP POLICY IF EXISTS "Users can update own meeting payments" ON public.ceo_meeting_payments;
  DROP POLICY IF EXISTS "Service role full access on ceo_meeting_payments" ON public.ceo_meeting_payments;
END; $$;

CREATE POLICY "Users can view own meeting payments"
  ON public.ceo_meeting_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meeting payments"
  ON public.ceo_meeting_payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meeting payments"
  ON public.ceo_meeting_payments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on ceo_meeting_payments"
  ON public.ceo_meeting_payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.ceo_meeting_payments TO authenticated;
GRANT ALL ON public.ceo_meeting_payments TO service_role;


-- =====================================================
-- 5. CREATE user_enriched_profiles TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_enriched_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Search query used
  search_query TEXT,
  search_email TEXT,
  search_phone TEXT,

  -- Enriched data
  enriched_name TEXT,
  enriched_company TEXT,
  enriched_title TEXT,
  enriched_location TEXT,
  enriched_bio TEXT,
  enriched_linkedin_url TEXT,
  enriched_twitter_url TEXT,
  enriched_github_url TEXT,
  enriched_website_url TEXT,
  enriched_avatar_url TEXT,

  -- Address data (used for Step 8 prefill)
  enriched_address_line1 TEXT,
  enriched_address_city TEXT,
  enriched_address_state TEXT,
  enriched_address_zip TEXT,
  enriched_address_country TEXT,

  -- Raw response data
  raw_enrichment_data JSONB,

  -- Source and confidence
  enrichment_source TEXT DEFAULT 'web_search',
  confidence_score DOUBLE PRECISION DEFAULT 0.0,

  -- Status
  status TEXT DEFAULT 'complete',

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_enriched_profiles_user_id
  ON public.user_enriched_profiles(user_id);

DROP TRIGGER IF EXISTS set_timestamp_user_enriched_profiles ON public.user_enriched_profiles;
CREATE TRIGGER set_timestamp_user_enriched_profiles
  BEFORE UPDATE ON public.user_enriched_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.user_enriched_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own enriched profile" ON public.user_enriched_profiles;
  DROP POLICY IF EXISTS "Users can insert own enriched profile" ON public.user_enriched_profiles;
  DROP POLICY IF EXISTS "Users can update own enriched profile" ON public.user_enriched_profiles;
  DROP POLICY IF EXISTS "Service role full access on user_enriched_profiles" ON public.user_enriched_profiles;
END; $$;

CREATE POLICY "Users can view own enriched profile"
  ON public.user_enriched_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enriched profile"
  ON public.user_enriched_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enriched profile"
  ON public.user_enriched_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_enriched_profiles"
  ON public.user_enriched_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.user_enriched_profiles TO authenticated;
GRANT ALL ON public.user_enriched_profiles TO service_role;


-- =====================================================
-- 6. CREATE user_product_usage TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_product_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Product tracking
  product_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),

  -- Usage metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT user_product_usage_user_product_unique UNIQUE (user_id, product_name)
);

CREATE INDEX IF NOT EXISTS idx_user_product_usage_user_id
  ON public.user_product_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_product_usage_product
  ON public.user_product_usage(product_name);

DROP TRIGGER IF EXISTS set_timestamp_user_product_usage ON public.user_product_usage;
CREATE TRIGGER set_timestamp_user_product_usage
  BEFORE UPDATE ON public.user_product_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

ALTER TABLE public.user_product_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own product usage" ON public.user_product_usage;
  DROP POLICY IF EXISTS "Users can insert own product usage" ON public.user_product_usage;
  DROP POLICY IF EXISTS "Users can update own product usage" ON public.user_product_usage;
  DROP POLICY IF EXISTS "Service role full access on user_product_usage" ON public.user_product_usage;
END; $$;

CREATE POLICY "Users can view own product usage"
  ON public.user_product_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own product usage"
  ON public.user_product_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product usage"
  ON public.user_product_usage FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on user_product_usage"
  ON public.user_product_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.user_product_usage TO authenticated;
GRANT ALL ON public.user_product_usage TO service_role;


-- =====================================================
-- 7. RPC: track_product_usage
-- =====================================================

CREATE OR REPLACE FUNCTION track_product_usage(
  p_product_name TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO user_product_usage (user_id, product_name, usage_count, last_used_at, metadata)
  VALUES (v_user_id, p_product_name, 1, NOW(), p_metadata)
  ON CONFLICT (user_id, product_name)
  DO UPDATE SET
    usage_count = user_product_usage.usage_count + 1,
    last_used_at = NOW(),
    metadata = p_metadata,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION track_product_usage(TEXT, JSONB) TO authenticated;


-- =====================================================
-- 8. CREATE assets storage bucket (for NDA PDFs etc.)
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;


-- =====================================================
-- 9. VERIFY EVERYTHING
-- =====================================================

DO $$
DECLARE
  tbl_count INTEGER;
  func_count INTEGER;
  tbl_names TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(table_name, ', ' ORDER BY table_name)
  INTO tbl_count, tbl_names
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'kyc_profiles', 'nda_signatures', 'onboarding_data',
    'user_financial_data', 'investor_profiles',
    'identity_verifications', 'ceo_meeting_payments',
    'user_enriched_profiles', 'user_product_usage'
  );

  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN (
    'check_user_nda_status', 'sign_global_nda', 'track_product_usage'
  );

  RAISE NOTICE '=====================================================';
  RAISE NOTICE '✅ Tables: %/9', tbl_count;
  RAISE NOTICE '   Found: %', tbl_names;
  RAISE NOTICE '✅ RPC Functions: %/3', func_count;
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Full flow ready: Plaid → KYC Steps 1-13 → Identity';
  RAISE NOTICE 'Verification → CEO Meeting → Investor Profile Card';
  RAISE NOTICE '=====================================================';
END;
$$;
