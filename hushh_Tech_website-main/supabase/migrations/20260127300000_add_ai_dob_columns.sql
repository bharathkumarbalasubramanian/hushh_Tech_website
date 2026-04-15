-- Add AI-inferred DOB columns to onboarding_data table
-- These columns cache the DOB inferred by Gemini + Google Search grounding

ALTER TABLE onboarding_data
ADD COLUMN IF NOT EXISTS ai_inferred_dob DATE,
ADD COLUMN IF NOT EXISTS ai_dob_confidence INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN onboarding_data.ai_inferred_dob IS 'DOB inferred by Gemini 3 Pro + Google Search grounding';
COMMENT ON COLUMN onboarding_data.ai_dob_confidence IS 'Confidence score (0-100) for AI-inferred DOB';
