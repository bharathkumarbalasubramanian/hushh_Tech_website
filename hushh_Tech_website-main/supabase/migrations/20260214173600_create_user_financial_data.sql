-- =====================================================
-- User Financial Data Table
-- Stores Plaid-fetched Balance, Assets & Investments
-- before KYC flow begins.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,

  -- Plaid connection info
  plaid_item_id TEXT,
  institution_name TEXT,
  institution_id TEXT,

  -- Financial data (nullable — not all institutions support all products)
  balances JSONB,
  asset_report JSONB,
  asset_report_token TEXT,
  investments JSONB,

  -- Track which products are available for this institution
  available_products JSONB DEFAULT '{"balance":false,"assets":false,"investments":false}',

  -- Status: pending | linking | fetching | partial | complete | failed
  status TEXT DEFAULT 'pending',

  -- Store error details for debugging failed product fetches
  fetch_errors JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on user_id for upsert support
ALTER TABLE public.user_financial_data
  ADD CONSTRAINT user_financial_data_user_id_unique UNIQUE (user_id);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_financial_data_user_id
  ON public.user_financial_data (user_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE TRIGGER set_timestamp_on_user_financial_data
  BEFORE UPDATE ON public.user_financial_data
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS Policies
ALTER TABLE public.user_financial_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own financial data"
  ON public.user_financial_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial data"
  ON public.user_financial_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial data"
  ON public.user_financial_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes)
CREATE POLICY "Service role full access"
  ON public.user_financial_data FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE public.user_financial_data TO authenticated;
GRANT ALL ON TABLE public.user_financial_data TO service_role;
GRANT SELECT ON TABLE public.user_financial_data TO anon;
