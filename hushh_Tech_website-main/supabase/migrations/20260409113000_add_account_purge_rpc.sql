CREATE TABLE IF NOT EXISTS public.deleted_account_payment_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_payment_id UUID NOT NULL UNIQUE,
  former_user_id_hash TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  amount_cents INTEGER,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  original_payment_created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_account_payment_audits_user_hash
  ON public.deleted_account_payment_audits(former_user_id_hash);

COMMENT ON TABLE public.deleted_account_payment_audits IS
  'Minimal de-identified payment audit retained after account hard deletion.';

CREATE OR REPLACE FUNCTION public.delete_rows_by_uuid_if_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_value UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  schema_name TEXT := split_part(p_table_name, '.', 1);
  bare_table_name TEXT := split_part(p_table_name, '.', 2);
BEGIN
  IF bare_table_name = '' THEN
    bare_table_name := schema_name;
    schema_name := 'public';
  END IF;

  IF to_regclass(format('%I.%I', schema_name, bare_table_name)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'DELETE FROM %I.%I WHERE %I = $1',
    schema_name,
    bare_table_name,
    p_column_name
  )
  USING p_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_rows_by_text_if_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  schema_name TEXT := split_part(p_table_name, '.', 1);
  bare_table_name TEXT := split_part(p_table_name, '.', 2);
BEGIN
  IF bare_table_name = '' THEN
    bare_table_name := schema_name;
    schema_name := 'public';
  END IF;

  IF to_regclass(format('%I.%I', schema_name, bare_table_name)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'DELETE FROM %I.%I WHERE %I = $1',
    schema_name,
    bare_table_name,
    p_column_name
  )
  USING p_value;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_rows_by_uuid_array_if_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_values UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  schema_name TEXT := split_part(p_table_name, '.', 1);
  bare_table_name TEXT := split_part(p_table_name, '.', 2);
BEGIN
  IF COALESCE(array_length(p_values, 1), 0) = 0 THEN
    RETURN;
  END IF;

  IF bare_table_name = '' THEN
    bare_table_name := schema_name;
    schema_name := 'public';
  END IF;

  IF to_regclass(format('%I.%I', schema_name, bare_table_name)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'DELETE FROM %I.%I WHERE %I = ANY($1)',
    schema_name,
    bare_table_name,
    p_column_name
  )
  USING p_values;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_rows_by_text_array_if_exists(
  p_table_name TEXT,
  p_column_name TEXT,
  p_values TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  schema_name TEXT := split_part(p_table_name, '.', 1);
  bare_table_name TEXT := split_part(p_table_name, '.', 2);
BEGIN
  IF COALESCE(array_length(p_values, 1), 0) = 0 THEN
    RETURN;
  END IF;

  IF bare_table_name = '' THEN
    bare_table_name := schema_name;
    schema_name := 'public';
  END IF;

  IF to_regclass(format('%I.%I', schema_name, bare_table_name)) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'DELETE FROM %I.%I WHERE %I = ANY($1)',
    schema_name,
    bare_table_name,
    p_column_name
  )
  USING p_values;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_user_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  archived_payment_count INTEGER := 0;
  profile_slugs TEXT[] := ARRAY[]::TEXT[];
  investor_agent_slugs TEXT[] := ARRAY[]::TEXT[];
  lead_ids UUID[] := ARRAY[]::UUID[];
  conversation_ids UUID[] := ARRAY[]::UUID[];
  hushh_ai_user_ids UUID[] := ARRAY[]::UUID[];
  hushh_ai_chat_ids UUID[] := ARRAY[]::UUID[];
  intelligence_user_ids UUID[] := ARRAY[]::UUID[];
  intelligence_conversation_ids UUID[] := ARRAY[]::UUID[];
  plaid_item_ids TEXT[] := ARRAY[]::TEXT[];
  kyc_plaid_item_ids TEXT[] := ARRAY[]::TEXT[];
  financial_plaid_item_ids TEXT[] := ARRAY[]::TEXT[];
  plaid_account_ids TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF to_regclass('public.investor_profiles') IS NOT NULL THEN
    SELECT COALESCE(array_agg(slug), ARRAY[]::TEXT[])
    INTO profile_slugs
    FROM public.investor_profiles
    WHERE user_id = p_user_id
      AND slug IS NOT NULL
      AND slug <> '';
  END IF;

  IF to_regclass('public.investor_agents') IS NOT NULL THEN
    SELECT COALESCE(array_agg(slug), ARRAY[]::TEXT[])
    INTO investor_agent_slugs
    FROM public.investor_agents
    WHERE user_id = p_user_id
      AND slug IS NOT NULL
      AND slug <> '';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT slug), ARRAY[]::TEXT[])
  INTO profile_slugs
  FROM unnest(profile_slugs || investor_agent_slugs) AS slug;

  IF to_regclass('public.lead_requests') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO lead_ids
    FROM public.lead_requests
    WHERE user_id = p_user_id;
  END IF;

  IF to_regclass('public.conversations') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO conversation_ids
    FROM public.conversations
    WHERE consumer_id = p_user_id
       OR lead_id = ANY(lead_ids);
  END IF;

  IF to_regclass('public.hushh_ai_users') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO hushh_ai_user_ids
    FROM public.hushh_ai_users
    WHERE supabase_user_id = p_user_id;
  END IF;

  IF to_regclass('public.intelligence_users') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO intelligence_user_ids
    FROM public.intelligence_users
    WHERE supabase_user_id = p_user_id;
  END IF;

  IF to_regclass('public.plaid_items') IS NOT NULL THEN
    SELECT COALESCE(array_agg(plaid_item_id), ARRAY[]::TEXT[])
    INTO plaid_item_ids
    FROM public.plaid_items
    WHERE user_id = p_user_id::TEXT
      AND plaid_item_id IS NOT NULL
      AND plaid_item_id <> '';
  END IF;

  IF to_regclass('public.kyc_profiles') IS NOT NULL THEN
    SELECT COALESCE(array_agg(plaid_item_id), ARRAY[]::TEXT[])
    INTO kyc_plaid_item_ids
    FROM public.kyc_profiles
    WHERE user_id = p_user_id::TEXT
      AND plaid_item_id IS NOT NULL
      AND plaid_item_id <> '';
  END IF;

  IF to_regclass('public.user_financial_data') IS NOT NULL THEN
    SELECT COALESCE(array_agg(plaid_item_id), ARRAY[]::TEXT[])
    INTO financial_plaid_item_ids
    FROM public.user_financial_data
    WHERE user_id = p_user_id
      AND plaid_item_id IS NOT NULL
      AND plaid_item_id <> '';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT plaid_item_id), ARRAY[]::TEXT[])
  INTO plaid_item_ids
  FROM unnest(plaid_item_ids || kyc_plaid_item_ids || financial_plaid_item_ids) AS plaid_item_id;

  IF to_regclass('public.plaid_accounts') IS NOT NULL THEN
    SELECT COALESCE(array_agg(plaid_account_id), ARRAY[]::TEXT[])
    INTO plaid_account_ids
    FROM public.plaid_accounts
    WHERE plaid_item_id = ANY(plaid_item_ids);
  END IF;

  IF to_regclass('public.hushh_ai_chats') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO hushh_ai_chat_ids
    FROM public.hushh_ai_chats
    WHERE user_id = ANY(hushh_ai_user_ids);
  END IF;

  IF to_regclass('public.intelligence_conversations') IS NOT NULL THEN
    SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
    INTO intelligence_conversation_ids
    FROM public.intelligence_conversations
    WHERE user_id = ANY(intelligence_user_ids);
  END IF;

  IF to_regclass('public.ceo_meeting_payments') IS NOT NULL THEN
    INSERT INTO public.deleted_account_payment_audits (
      source_payment_id,
      former_user_id_hash,
      payment_method,
      payment_status,
      amount_cents,
      stripe_session_id,
      stripe_payment_intent,
      original_payment_created_at,
      deleted_at
    )
    SELECT
      id,
      encode(digest(p_user_id::TEXT, 'sha256'), 'hex'),
      COALESCE(payment_method, 'stripe'),
      payment_status,
      amount_cents,
      stripe_session_id,
      stripe_payment_intent,
      created_at,
      NOW()
    FROM public.ceo_meeting_payments
    WHERE user_id = p_user_id
    ON CONFLICT (source_payment_id) DO NOTHING;

    GET DIAGNOSTICS archived_payment_count = ROW_COUNT;
  END IF;

  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.messages',
    'conversation_id',
    conversation_ids
  );
  PERFORM public.delete_rows_by_uuid_if_exists('public.messages', 'sender_id', p_user_id);
  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.lead_events',
    'lead_id',
    lead_ids
  );
  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.conversations',
    'id',
    conversation_ids
  );
  PERFORM public.delete_rows_by_uuid_if_exists('public.lead_requests', 'user_id', p_user_id);

  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.analytics_events',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.blocked_agents',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.consumer_profiles',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.delete_requests',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists('public.devices', 'user_id', p_user_id);
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.notifications',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.swipe_actions',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.agent_reviews',
    'user_id',
    p_user_id
  );

  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.consents',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.community_registrations',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.kyc_consent_tokens',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.identity_verifications',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.user_product_usage',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.user_enriched_profiles',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.user_agent_selections',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.nda_signatures',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_text_if_exists(
    'public.kyc_profiles',
    'user_id',
    p_user_id::TEXT
  );

  PERFORM public.delete_rows_by_text_array_if_exists(
    'public.plaid_transactions',
    'plaid_account_id',
    plaid_account_ids
  );
  PERFORM public.delete_rows_by_text_array_if_exists(
    'public.plaid_sync_cursors',
    'plaid_item_id',
    plaid_item_ids
  );
  PERFORM public.delete_rows_by_text_array_if_exists(
    'public.plaid_accounts',
    'plaid_item_id',
    plaid_item_ids
  );
  PERFORM public.delete_rows_by_text_if_exists(
    'public.plaid_items',
    'user_id',
    p_user_id::TEXT
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.user_financial_data',
    'user_id',
    p_user_id
  );

  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.hushh_ai_messages',
    'chat_id',
    hushh_ai_chat_ids
  );
  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.hushh_ai_chats',
    'user_id',
    hushh_ai_user_ids
  );
  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.hushh_ai_media_limits',
    'user_id',
    hushh_ai_user_ids
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.hushh_ai_users',
    'supabase_user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_text_if_exists(
    'public.hushh_ai_rate_limits',
    'user_id',
    p_user_id::TEXT
  );

  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.intelligence_messages',
    'conversation_id',
    intelligence_conversation_ids
  );
  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.intelligence_conversations',
    'user_id',
    intelligence_user_ids
  );
  PERFORM public.delete_rows_by_uuid_array_if_exists(
    'public.intelligence_media_limits',
    'user_id',
    intelligence_user_ids
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.intelligence_users',
    'supabase_user_id',
    p_user_id
  );

  PERFORM public.delete_rows_by_uuid_if_exists('public.agent_tasks', 'user_id', p_user_id);
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.agent_messages',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.investor_agents',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_text_array_if_exists(
    'public.investor_inquiries',
    'slug',
    profile_slugs
  );
  PERFORM public.delete_rows_by_text_array_if_exists(
    'public.public_chat_messages',
    'slug',
    profile_slugs
  );

  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.onboarding_data',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.investor_profiles',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.ceo_meeting_payments',
    'user_id',
    p_user_id
  );
  PERFORM public.delete_rows_by_uuid_if_exists(
    'public.kyc_attestations',
    'user_id',
    p_user_id
  );

  PERFORM public.delete_rows_by_uuid_if_exists('public.users', 'id', p_user_id);

  RETURN jsonb_build_object(
    'archived_payment_audit_rows', archived_payment_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_user_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_user_account(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.purge_user_account(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_account(UUID) TO service_role;
