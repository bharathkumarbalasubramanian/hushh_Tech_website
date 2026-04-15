-- =====================================================
-- FIX PGRST204 v2: Force unique constraint + schema reload
-- =====================================================
-- Run this SQL, then ALSO go to:
-- Supabase Dashboard → Project Settings → API → Click "Reload"
-- (or just wait ~60 seconds for auto-reload)
-- =====================================================

-- 1. Verify current constraints (check output in Messages tab)
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.onboarding_data'::regclass
    AND contype = 'u'
    AND array_to_string(conkey, ',') = (
      SELECT attnum::text FROM pg_attribute
      WHERE attrelid = 'public.onboarding_data'::regclass
      AND attname = 'user_id'
    )
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✅ UNIQUE constraint on user_id EXISTS';
  ELSE
    RAISE NOTICE '❌ UNIQUE constraint on user_id MISSING - creating now...';
  END IF;
END;
$$;

-- 2. Drop any existing unique constraint on user_id (try common names)
ALTER TABLE public.onboarding_data DROP CONSTRAINT IF EXISTS onboarding_data_user_id_key;
ALTER TABLE public.onboarding_data DROP CONSTRAINT IF EXISTS onboarding_data_user_id_unique;

-- 3. Also drop the unique INDEX if it exists (PostgreSQL UNIQUE creates index)
DROP INDEX IF EXISTS onboarding_data_user_id_key;
DROP INDEX IF EXISTS onboarding_data_user_id_unique;
DROP INDEX IF EXISTS onboarding_data_user_id_idx;

-- 4. Create a fresh unique constraint
ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_user_id_key UNIQUE (user_id);

-- 5. Do the same for user_financial_data
ALTER TABLE public.user_financial_data DROP CONSTRAINT IF EXISTS user_financial_data_user_id_unique;
ALTER TABLE public.user_financial_data DROP CONSTRAINT IF EXISTS user_financial_data_user_id_key;
DROP INDEX IF EXISTS user_financial_data_user_id_unique;
DROP INDEX IF EXISTS user_financial_data_user_id_key;

ALTER TABLE public.user_financial_data
ADD CONSTRAINT user_financial_data_user_id_key UNIQUE (user_id);

-- 6. Grant full permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

-- 7. Force PostgREST schema cache reload (multiple methods)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 8. Verify the constraint was created
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'public.onboarding_data'::regclass
  AND att.attname = 'user_id'
  AND con.contype = 'u';

  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE '✅ UNIQUE constraint created: %', constraint_name;
  ELSE
    RAISE NOTICE '❌ UNIQUE constraint still missing!';
  END IF;
END;
$$;

-- =====================================================
-- IMPORTANT: After running this SQL, you MUST also do:
-- 1. Go to https://supabase.com/dashboard/project/ibsisfnjxeowvdtvgzff/settings/api
-- 2. Scroll down to "Schema" section
-- 3. Click the "Reload" button
-- This forces PostgREST to pick up the new constraints.
-- =====================================================
