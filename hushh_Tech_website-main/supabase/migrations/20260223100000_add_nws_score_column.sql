-- Add Network Worth Score (NWS) column to user_financial_data
-- Computed from Plaid balance, investments, and identity match data
-- Score range: 0-100

ALTER TABLE user_financial_data
ADD COLUMN IF NOT EXISTS nws_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nws_breakdown JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nws_grade TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nws_calculated_at TIMESTAMPTZ DEFAULT NULL;
