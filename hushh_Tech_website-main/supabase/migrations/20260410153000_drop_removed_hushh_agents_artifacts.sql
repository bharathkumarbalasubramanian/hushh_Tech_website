BEGIN;

DROP VIEW IF EXISTS public.hushh_agents_user_activity;
DROP VIEW IF EXISTS public.hushh_agents_top_users;
DROP VIEW IF EXISTS public.hushh_agents_recent_activity;
DROP VIEW IF EXISTS public.hushh_agents_language_usage;

DROP FUNCTION IF EXISTS public.track_hushh_agents_access(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.log_hushh_agents_message(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, UUID);
DROP FUNCTION IF EXISTS public.log_email_send(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);

DROP TABLE IF EXISTS public.agent_mailer_logs CASCADE;
DROP TABLE IF EXISTS public.agent_mailer_contacts CASCADE;
DROP TABLE IF EXISTS public.agent_mailer_campaigns CASCADE;
DROP TABLE IF EXISTS public.agent_mailer_templates CASCADE;

DROP TABLE IF EXISTS public.resume_analyses CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_email_sessions CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_email_otps CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_resume_sessions CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_users CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_messages CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_agent_swipes CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_matches CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_conversations CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_chat_logs CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_consumer_profiles CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_sessions CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_user_agent_selections CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_users CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_profiles CASCADE;
DROP TABLE IF EXISTS public.hushh_agents_daily_stats CASCADE;
DROP TABLE IF EXISTS public.hushh_agents CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_messages CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_conversations CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_subscriptions CASCADE;
DROP TABLE IF EXISTS public.hushh_agent_usage CASCADE;

COMMIT;
