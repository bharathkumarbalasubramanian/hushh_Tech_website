-- Allow public slugs to resolve before AI confirmation while keeping the
-- richer AI/profile projections gated until confirmation is complete.

CREATE OR REPLACE FUNCTION public.get_public_investor_profile(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row public.investor_profiles%ROWTYPE;
  onboarding_row public.onboarding_data%ROWTYPE;
  privacy_settings jsonb := '{}'::jsonb;
  filtered_investor_profile jsonb := '{}'::jsonb;
  filtered_onboarding_data jsonb := '{}'::jsonb;
  field_name text;
BEGIN
  IF p_slug IS NULL OR btrim(p_slug) = '' THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO profile_row
  FROM public.investor_profiles
  WHERE slug = btrim(p_slug)
    AND is_public = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO onboarding_row
  FROM public.onboarding_data
  WHERE user_id = profile_row.user_id
  LIMIT 1;

  privacy_settings := COALESCE(profile_row.privacy_settings, '{}'::jsonb);

  IF profile_row.investor_profile IS NOT NULL THEN
    FOR field_name IN
      SELECT jsonb_object_keys(profile_row.investor_profile)
    LOOP
      IF public.is_public_profile_field_visible(
        privacy_settings,
        'investor_profile',
        field_name
      ) THEN
        filtered_investor_profile :=
          filtered_investor_profile ||
          jsonb_build_object(field_name, profile_row.investor_profile -> field_name);
      END IF;
    END LOOP;
  END IF;

  filtered_onboarding_data := jsonb_strip_nulls(
    jsonb_build_object(
      'account_type',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'onboarding_data', 'account_type')
          THEN onboarding_row.account_type
        ELSE NULL
      END,
      'selected_fund',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'onboarding_data', 'selected_fund')
          THEN onboarding_row.selected_fund
        ELSE NULL
      END,
      'citizenship_country',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'onboarding_data', 'citizenship_country')
          THEN onboarding_row.citizenship_country
        ELSE NULL
      END,
      'residence_country',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'onboarding_data', 'residence_country')
          THEN onboarding_row.residence_country
        ELSE NULL
      END
    )
  );

  RETURN jsonb_build_object(
    'slug', profile_row.slug,
    'profile_url', format('https://hushhtech.com/investor/%s', profile_row.slug),
    'is_confirmed', COALESCE(profile_row.user_confirmed, false),
    'basic_info', jsonb_build_object(
      'name',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'basic_info', 'name')
          THEN COALESCE(NULLIF(profile_row.name, ''), 'Public Investor')
        ELSE 'Public Investor'
      END,
      'email',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'basic_info', 'email')
          THEN public.mask_public_email(profile_row.email)
        ELSE NULL
      END,
      'age',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'basic_info', 'age')
          THEN profile_row.age
        ELSE NULL
      END,
      'organisation',
      CASE
        WHEN public.is_public_profile_field_visible(privacy_settings, 'basic_info', 'organisation')
          THEN NULLIF(profile_row.organisation, '')
        ELSE NULL
      END
    ),
    'investor_profile',
    CASE
      WHEN profile_row.user_confirmed AND filtered_investor_profile <> '{}'::jsonb THEN filtered_investor_profile
      ELSE NULL
    END,
    'onboarding_data',
    CASE
      WHEN profile_row.user_confirmed AND filtered_onboarding_data <> '{}'::jsonb THEN filtered_onboarding_data
      ELSE NULL
    END,
    'shadow_profile',
    CASE
      WHEN profile_row.user_confirmed THEN profile_row.shadow_profile
      ELSE NULL
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_investor_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_investor_profile(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_investor_profile(text) TO authenticated;
