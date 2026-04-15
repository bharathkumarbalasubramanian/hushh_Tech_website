-- Migration: Add global NDA tracking columns to onboarding_data
-- This enables the global NDA gate feature where users must sign NDA after login

-- Add NDA tracking columns to onboarding_data table
ALTER TABLE onboarding_data 
ADD COLUMN IF NOT EXISTS nda_signed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nda_pdf_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nda_version TEXT DEFAULT 'v1.0',
ADD COLUMN IF NOT EXISTS nda_signer_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nda_signer_ip TEXT DEFAULT NULL;

-- Create index for efficient NDA status checks
CREATE INDEX IF NOT EXISTS idx_onboarding_data_nda_signed 
ON onboarding_data(user_id) 
WHERE nda_signed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN onboarding_data.nda_signed_at IS 'Timestamp when user signed the global NDA';
COMMENT ON COLUMN onboarding_data.nda_pdf_url IS 'URL to the signed NDA PDF in storage';
COMMENT ON COLUMN onboarding_data.nda_version IS 'Version of the NDA that was signed';
COMMENT ON COLUMN onboarding_data.nda_signer_name IS 'Full legal name provided during NDA signing';
COMMENT ON COLUMN onboarding_data.nda_signer_ip IS 'IP address at time of NDA signing for audit';

-- RPC function to check NDA status (fast query)
CREATE OR REPLACE FUNCTION check_user_nda_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'hasSignedNda', nda_signed_at IS NOT NULL,
    'signedAt', nda_signed_at,
    'ndaVersion', nda_version,
    'signerName', nda_signer_name
  ) INTO result
  FROM onboarding_data
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

-- RPC function to record NDA signature
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
  result JSONB;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Update or insert NDA signature
  INSERT INTO onboarding_data (user_id, nda_signed_at, nda_signer_name, nda_version, nda_pdf_url, nda_signer_ip, updated_at)
  VALUES (v_user_id, NOW(), p_signer_name, p_nda_version, p_pdf_url, p_signer_ip, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    nda_signed_at = NOW(),
    nda_signer_name = p_signer_name,
    nda_version = p_nda_version,
    nda_pdf_url = COALESCE(p_pdf_url, onboarding_data.nda_pdf_url),
    nda_signer_ip = p_signer_ip,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'success', true,
    'signedAt', NOW(),
    'signerName', p_signer_name,
    'ndaVersion', p_nda_version
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_nda_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sign_global_nda(TEXT, TEXT, TEXT, TEXT) TO authenticated;
