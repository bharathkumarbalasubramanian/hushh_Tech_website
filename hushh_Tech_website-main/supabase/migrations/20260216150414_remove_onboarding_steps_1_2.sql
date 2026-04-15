-- Migration: Remove onboarding steps 1 & 2
-- Date: 2026-02-16
-- Description:
--   - Removes Step 1 (Account type selection) and Step 2 (Intro screen)
--   - Step 3 (Share class selection) becomes new Step 1
--   - Renumbers all steps: old steps 3-15 become new steps 1-13
--   - Makes account_type nullable for backward compatibility
--   - Auto-migrates existing users to new step numbers

-- =====================================================
-- Step 1: Make account_type field nullable
-- =====================================================
-- Preserve existing data but make the field optional since it's no longer required

ALTER TABLE public.onboarding_data
ALTER COLUMN account_type DROP NOT NULL;

COMMENT ON COLUMN public.onboarding_data.account_type IS
'Legacy field - previously used in old Step 1 for account type selection ($1M/$5M/$25M). Now optional for backward compatibility. Users now select investment via share classes instead.';

-- =====================================================
-- Step 2: Update current_step constraint (13 steps instead of 15)
-- =====================================================

ALTER TABLE public.onboarding_data
DROP CONSTRAINT IF EXISTS onboarding_data_current_step_check;

ALTER TABLE public.onboarding_data
ADD CONSTRAINT onboarding_data_current_step_check
CHECK (current_step >= 1 AND current_step <= 13);

-- =====================================================
-- Step 3: Migrate existing users to new step numbers
-- =====================================================

-- Users at old steps 1-2 → reset to new step 1 (share class selection)
-- These users were on account selection or intro screen, now start at share classes
UPDATE public.onboarding_data
SET current_step = 1, updated_at = NOW()
WHERE current_step IN (1, 2);

-- Users at old steps 3-15 → decrement by 2
-- Old Step 3 becomes new Step 1, Old Step 4 becomes new Step 2, etc.
UPDATE public.onboarding_data
SET current_step = current_step - 2, updated_at = NOW()
WHERE current_step >= 3 AND current_step <= 15;

-- =====================================================
-- Step 4: Update completed_steps array
-- =====================================================
-- Decrement all completed step numbers by 2 (except steps 1-2 which are removed)
-- Remove completed steps 1 and 2, then decrement remaining steps by 2

UPDATE public.onboarding_data
SET completed_steps = (
  SELECT COALESCE(
    ARRAY_AGG(step - 2 ORDER BY step),
    ARRAY[]::INTEGER[]
  )
  FROM UNNEST(completed_steps) AS step
  WHERE step >= 3  -- Only keep steps 3 and above, decrement by 2
), updated_at = NOW()
WHERE completed_steps IS NOT NULL
  AND ARRAY_LENGTH(completed_steps, 1) > 0;

-- =====================================================
-- Step 5: Log migration results
-- =====================================================

DO $$
DECLARE
  total_users INTEGER;
  migrated_count INTEGER;
BEGIN
  -- Count total users in onboarding
  SELECT COUNT(*) INTO total_users
  FROM public.onboarding_data;

  -- Count users who were migrated (all active onboarding users)
  SELECT COUNT(*) INTO migrated_count
  FROM public.onboarding_data
  WHERE current_step <= 13;

  -- Log results
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Onboarding Steps 1 & 2 Removal Migration Complete';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total users in onboarding: %', total_users;
  RAISE NOTICE 'Users migrated to new step numbers: %', migrated_count;
  RAISE NOTICE 'New step range: 1-13 (was 1-15)';
  RAISE NOTICE 'account_type field: now nullable (legacy)';
  RAISE NOTICE '================================================';
END $$;

-- =====================================================
-- Step 6: Verification Query (commented out)
-- =====================================================
-- Uncomment to verify migration results:
--
-- SELECT
--   current_step,
--   COUNT(*) as user_count,
--   STRING_AGG(DISTINCT account_type::TEXT, ', ') as account_types
-- FROM public.onboarding_data
-- GROUP BY current_step
-- ORDER BY current_step;
