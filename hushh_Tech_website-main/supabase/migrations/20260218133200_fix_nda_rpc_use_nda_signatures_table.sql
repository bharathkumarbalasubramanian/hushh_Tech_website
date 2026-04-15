-- Migration: Fix sign_global_nda & check_user_nda_status RPC functions
-- The previous migration (20260131) created these functions pointing to
-- onboarding_data table, but the actual NDA data lives in nda_signatures.
-- This migration recreates both functions to use the correct table.

-- Step 1: Recreate check_user_nda_status to use nda_signatures
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

-- Step 2: Recreate sign_global_nda to use nda_signatures
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

  -- Get user email from auth.users
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

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO anon;
GRANT EXECUTE ON FUNCTION sign_global_nda(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Step 4: Ensure RLS is enabled with proper policies
ALTER TABLE nda_signatures ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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
