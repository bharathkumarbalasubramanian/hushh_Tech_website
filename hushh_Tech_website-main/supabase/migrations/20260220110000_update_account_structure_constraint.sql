-- Allow new onboarding Step 5 account structure options.
ALTER TABLE public.onboarding_data
DROP CONSTRAINT IF EXISTS onboarding_data_account_structure_check;

ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_account_structure_check
CHECK (
  account_structure = ANY (ARRAY['individual', 'joint', 'retirement', 'trust', 'other'])
);
