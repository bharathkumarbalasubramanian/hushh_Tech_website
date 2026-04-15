-- =====================================================
-- FIX PGRST204: PostgREST can't find unique constraint
-- on onboarding_data.user_id for upsert (on_conflict)
-- =====================================================

-- 1. Ensure the unique constraint exists with explicit name
ALTER TABLE public.onboarding_data
DROP CONSTRAINT IF EXISTS onboarding_data_user_id_key;

ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_user_id_key UNIQUE (user_id);

-- 2. Same for user_financial_data
ALTER TABLE public.user_financial_data
DROP CONSTRAINT IF EXISTS user_financial_data_user_id_unique;

ALTER TABLE public.user_financial_data
ADD CONSTRAINT user_financial_data_user_id_unique UNIQUE (user_id);

-- 3. Grant usage on schema to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 4. Grant SELECT on all tables to authenticated (needed for upsert)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 5. Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- DONE! The PGRST204 error should be gone now.
-- =====================================================
