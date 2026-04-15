-- =====================================================
-- FIX: sign_global_nda & check_user_nda_status RPC functions
-- =====================================================
-- Run this in Supabase SQL Editor to fix the 404 PGRST202 error.
-- These functions use the existing nda_signatures table.
-- =====================================================

-- Step 1: Create or replace check_user_nda_status function
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

  -- If no record found, return default (not signed)
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

-- Step 2: Create or replace sign_global_nda function
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
  -- Get current user ID from auth context
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;

  -- Try to get the user email from auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Upsert into nda_signatures (user_id has UNIQUE constraint)
  INSERT INTO nda_signatures (
    user_id,
    signer_name,
    signer_email,
    signer_ip,
    nda_version,
    pdf_url,
    signed_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_signer_name,
    v_user_email,
    COALESCE(p_signer_ip, 'unknown'),
    COALESCE(p_nda_version, 'v1.0'),
    p_pdf_url,
    NOW(),
    NOW(),
    NOW()
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

-- Step 3: Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sign_global_nda(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 4: Also grant to anon in case check is needed before full auth
GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO anon;

-- Step 5: Enable RLS on nda_signatures if not already enabled
ALTER TABLE nda_signatures ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies so users can read their own NDA status
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid errors
  DROP POLICY IF EXISTS "Users can view own NDA signature" ON nda_signatures;
  DROP POLICY IF EXISTS "Users can insert own NDA signature" ON nda_signatures;
  DROP POLICY IF EXISTS "Users can update own NDA signature" ON nda_signatures;
END;
$$;

CREATE POLICY "Users can view own NDA signature"
  ON nda_signatures FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own NDA signature"
  ON nda_signatures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own NDA signature"
  ON nda_signatures FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 7: Verify everything was created successfully
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN ('check_user_nda_status', 'sign_global_nda');

  IF func_count >= 2 THEN
    RAISE NOTICE '✅ Migration successful! Both RPC functions created. sign_global_nda and check_user_nda_status are ready.';
  ELSE
    RAISE WARNING '⚠️ Migration incomplete. Only % of 2 functions found.', func_count;
  END IF;
END;
$$;

-- =====================================================
-- DONE! After running this in Supabase SQL Editor:
-- 1. The sign_global_nda RPC will no longer return 404
-- 2. The check_user_nda_status RPC will work correctly
-- 3. Both use the existing nda_signatures table
-- =====================================================
