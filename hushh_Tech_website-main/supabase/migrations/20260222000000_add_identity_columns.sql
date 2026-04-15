-- Add identity data columns to user_financial_data
-- Stores Plaid /identity/get and /identity/match responses

ALTER TABLE user_financial_data
  ADD COLUMN IF NOT EXISTS identity_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS identity_match_scores jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_financial_data.identity_data IS 'Plaid /identity/get response: name, email, phone, address from bank';
COMMENT ON COLUMN user_financial_data.identity_match_scores IS 'Plaid /identity/match response: match scores (0-100) for name, email, phone, address';
