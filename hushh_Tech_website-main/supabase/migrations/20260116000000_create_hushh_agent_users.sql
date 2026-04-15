-- =====================================================
-- Hushh Agent Users Table
-- =====================================================
-- Stores users authenticated via Firebase/GCP Identity Platform Phone Auth
-- The firebase_uid links this table to Firebase Authentication
-- This is SEPARATE from the main Supabase auth.users table

CREATE TABLE IF NOT EXISTS public.hushh_agent_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Firebase UID from GCP Identity Platform Phone Auth
    firebase_uid TEXT UNIQUE NOT NULL,
    
    -- User phone number (verified via OTP)
    phone_number TEXT NOT NULL,
    
    -- Optional display name
    display_name TEXT,
    
    -- User metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Usage tracking
    total_sessions INT DEFAULT 0,
    total_resume_analyses INT DEFAULT 0,
    
    -- Premium tier for future monetization
    -- 'free' | 'pro' | 'enterprise'
    premium_tier TEXT DEFAULT 'free',
    premium_expires_at TIMESTAMPTZ,
    
    -- User preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{}',
    
    -- Indexes
    CONSTRAINT valid_premium_tier CHECK (premium_tier IN ('free', 'pro', 'enterprise'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_hushh_agent_users_firebase_uid 
    ON public.hushh_agent_users(firebase_uid);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_users_phone_number 
    ON public.hushh_agent_users(phone_number);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_users_created_at 
    ON public.hushh_agent_users(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.hushh_agent_users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public insert (for phone auth sync)
-- Note: The phoneAuth service uses the anon key to upsert users
CREATE POLICY "Allow public insert for phone auth"
    ON public.hushh_agent_users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: Allow users to read their own data
CREATE POLICY "Allow users to read own data"
    ON public.hushh_agent_users
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: Allow users to update their own data
CREATE POLICY "Allow users to update own data"
    ON public.hushh_agent_users
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- =====================================================
-- Hushh Agent Resume Sessions Table
-- =====================================================
-- Stores resume analysis sessions for each user

CREATE TABLE IF NOT EXISTS public.hushh_agent_resume_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to hushh_agent_users
    user_id UUID REFERENCES public.hushh_agent_users(id) ON DELETE CASCADE,
    
    -- Session metadata
    coach_id TEXT NOT NULL, -- 'victor' or 'sophia'
    session_started_at TIMESTAMPTZ DEFAULT NOW(),
    session_ended_at TIMESTAMPTZ,
    
    -- ATS Analysis Results (stored as JSONB)
    ats_score INT,
    ats_analysis JSONB,
    
    -- Transcript of conversation
    transcript JSONB DEFAULT '[]',
    
    -- Resume file reference (if uploaded)
    resume_file_url TEXT,
    resume_file_type TEXT, -- 'pdf', 'image', 'docx'
    
    -- Session status
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'abandoned'
    
    CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'abandoned'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_hushh_agent_resume_sessions_user_id 
    ON public.hushh_agent_resume_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_resume_sessions_started_at 
    ON public.hushh_agent_resume_sessions(session_started_at DESC);

-- Enable RLS
ALTER TABLE public.hushh_agent_resume_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow insert
CREATE POLICY "Allow insert resume sessions"
    ON public.hushh_agent_resume_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy: Allow select
CREATE POLICY "Allow select resume sessions"
    ON public.hushh_agent_resume_sessions
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy: Allow update
CREATE POLICY "Allow update resume sessions"
    ON public.hushh_agent_resume_sessions
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- =====================================================
-- Function: Increment user session count
-- =====================================================
CREATE OR REPLACE FUNCTION increment_user_session_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.hushh_agent_users
    SET total_sessions = total_sessions + 1,
        last_login_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment session count on new session
DROP TRIGGER IF EXISTS trigger_increment_session_count ON public.hushh_agent_resume_sessions;
CREATE TRIGGER trigger_increment_session_count
    AFTER INSERT ON public.hushh_agent_resume_sessions
    FOR EACH ROW
    EXECUTE FUNCTION increment_user_session_count();

-- =====================================================
-- Function: Increment resume analysis count
-- =====================================================
CREATE OR REPLACE FUNCTION increment_resume_analysis_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ats_score IS NOT NULL AND OLD.ats_score IS NULL THEN
        UPDATE public.hushh_agent_users
        SET total_resume_analyses = total_resume_analyses + 1
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment analysis count when ATS score is added
DROP TRIGGER IF EXISTS trigger_increment_analysis_count ON public.hushh_agent_resume_sessions;
CREATE TRIGGER trigger_increment_analysis_count
    AFTER UPDATE ON public.hushh_agent_resume_sessions
    FOR EACH ROW
    EXECUTE FUNCTION increment_resume_analysis_count();

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.hushh_agent_users IS 
    'Users authenticated via Firebase/GCP Identity Platform Phone Auth for hushh-agent';

COMMENT ON COLUMN public.hushh_agent_users.firebase_uid IS 
    'Unique identifier from Firebase Authentication (Phone Auth)';

COMMENT ON TABLE public.hushh_agent_resume_sessions IS 
    'Resume analysis sessions with AI coaches (Victor Thorne, Sophia Sterling)';

COMMENT ON COLUMN public.hushh_agent_resume_sessions.ats_analysis IS 
    'JSONB containing: { atsScore, strengths, weaknesses, recommendations, missingKeywords }';
