-- Resume Analyses Table
-- Stores professional resume analysis results for users
-- Linked to hushh_agent_users via user_id or email

CREATE TABLE IF NOT EXISTS resume_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES hushh_agent_users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  
  -- Resume Info
  resume_filename TEXT,
  resume_size_bytes INTEGER,
  resume_mime_type TEXT,
  
  -- Overall Score
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  
  -- Category Scores (0-100)
  ats_score INTEGER CHECK (ats_score >= 0 AND ats_score <= 100),
  content_score INTEGER CHECK (content_score >= 0 AND content_score <= 100),
  format_score INTEGER CHECK (format_score >= 0 AND format_score <= 100),
  impact_score INTEGER CHECK (impact_score >= 0 AND impact_score <= 100),
  
  -- Detailed Analysis (JSONB for flexibility)
  strengths JSONB DEFAULT '[]'::jsonb,        -- Array of strengths
  weaknesses JSONB DEFAULT '[]'::jsonb,       -- Array of weaknesses  
  suggestions JSONB DEFAULT '[]'::jsonb,      -- Array of actionable suggestions
  keyword_analysis JSONB DEFAULT '{}'::jsonb, -- Missing keywords, target roles
  
  -- Full Analysis Text
  summary TEXT,                               -- Executive summary
  detailed_analysis TEXT,                     -- Full analysis text
  
  -- Coach Info
  coach_used TEXT CHECK (coach_used IN ('victor', 'sophia')),
  
  -- Timestamps
  analysis_started_at TIMESTAMPTZ,
  analysis_completed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  email_message_id TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed', 'email_sent')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_resume_analyses_user_id ON resume_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_email ON resume_analyses(email);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_status ON resume_analyses(status);
CREATE INDEX IF NOT EXISTS idx_resume_analyses_created_at ON resume_analyses(created_at DESC);

-- Row Level Security
ALTER TABLE resume_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own analyses
CREATE POLICY "Users can view own resume analyses"
  ON resume_analyses
  FOR SELECT
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
    OR user_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role full access to resume analyses"
  ON resume_analyses
  FOR ALL
  USING (current_setting('role') = 'service_role');

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_resume_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resume_analyses_updated_at
  BEFORE UPDATE ON resume_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_resume_analyses_updated_at();

-- Comment for documentation
COMMENT ON TABLE resume_analyses IS 'Stores professional AI-powered resume analysis results. Each analysis includes scores, strengths, weaknesses, and actionable suggestions.';
