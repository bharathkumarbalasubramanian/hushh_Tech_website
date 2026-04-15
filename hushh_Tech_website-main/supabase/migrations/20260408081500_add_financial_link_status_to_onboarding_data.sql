ALTER TABLE public.onboarding_data
ADD COLUMN IF NOT EXISTS financial_link_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.onboarding_data
DROP CONSTRAINT IF EXISTS onboarding_data_financial_link_status_check;

ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_financial_link_status_check
CHECK (financial_link_status IN ('pending', 'completed', 'skipped'));

COMMENT ON COLUMN public.onboarding_data.financial_link_status IS
'Tracks whether the canonical financial-link gate is pending, completed, or intentionally skipped.';

UPDATE public.onboarding_data AS onboarding
SET financial_link_status = 'completed'
FROM public.user_financial_data AS financial
WHERE onboarding.user_id = financial.user_id
  AND onboarding.financial_link_status = 'pending'
  AND financial.status IN ('complete', 'partial');

CREATE INDEX IF NOT EXISTS idx_onboarding_data_financial_link_status
ON public.onboarding_data(financial_link_status);
