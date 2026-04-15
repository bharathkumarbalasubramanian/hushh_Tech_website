-- Migration: Create Hushh AI Cache Tables
-- Replaces Redis/Upstash with Supabase tables for rate limiting, caching, and analytics
-- Date: 2026-01-07

-- ============================================
-- 1. Rate Limiting Table
-- ============================================
CREATE TABLE IF NOT EXISTS hushh_ai_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_seconds INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint for user per window
    UNIQUE(user_id, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window 
ON hushh_ai_rate_limits(user_id, window_start);

-- Auto-cleanup old rate limit records (older than 1 hour)
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup 
ON hushh_ai_rate_limits(window_start);

-- ============================================
-- 2. Media Upload Limits Table
-- ============================================
CREATE TABLE IF NOT EXISTS hushh_ai_media_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    upload_date DATE DEFAULT CURRENT_DATE,
    upload_count INTEGER DEFAULT 1,
    max_uploads INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per user per day
    UNIQUE(user_id, upload_date)
);

-- Index for fast lookups (conditionally check if column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'hushh_ai_media_limits' 
               AND column_name = 'upload_date') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_media_limits_user_date 
                 ON hushh_ai_media_limits(user_id, upload_date)';
    END IF;
END $$;

-- ============================================
-- 3. Response Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS hushh_ai_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    cache_type TEXT NOT NULL, -- 'response', 'context', 'stream'
    cache_value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_cache_key ON hushh_ai_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expiry ON hushh_ai_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_type ON hushh_ai_cache(cache_type);

-- ============================================
-- 4. Analytics Table
-- ============================================
CREATE TABLE IF NOT EXISTS hushh_ai_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_date DATE DEFAULT CURRENT_DATE,
    metric_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One record per metric per day
    UNIQUE(metric_name, metric_date)
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_metric_date 
ON hushh_ai_analytics(metric_name, metric_date);

-- ============================================
-- 5. Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE hushh_ai_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_ai_media_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_ai_analytics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. RLS Policies - Allow service role full access
-- ============================================
-- Rate Limits
CREATE POLICY "Service role can manage rate limits" ON hushh_ai_rate_limits
    FOR ALL USING (true) WITH CHECK (true);

-- Media Limits
CREATE POLICY "Service role can manage media limits" ON hushh_ai_media_limits
    FOR ALL USING (true) WITH CHECK (true);

-- Cache
CREATE POLICY "Service role can manage cache" ON hushh_ai_cache
    FOR ALL USING (true) WITH CHECK (true);

-- Analytics
CREATE POLICY "Service role can manage analytics" ON hushh_ai_analytics
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 7. Function to clean expired cache entries
-- ============================================
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM hushh_ai_cache WHERE expires_at < NOW();
    DELETE FROM hushh_ai_rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    DELETE FROM hushh_ai_media_limits WHERE upload_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Schedule cleanup (run every hour via pg_cron if available)
-- Note: pg_cron needs to be enabled in Supabase dashboard
-- ============================================
-- SELECT cron.schedule('clean-hushh-ai-cache', '0 * * * *', 'SELECT clean_expired_cache()');

COMMENT ON TABLE hushh_ai_rate_limits IS 'Rate limiting for Hushh AI chat requests';
COMMENT ON TABLE hushh_ai_media_limits IS 'Daily media upload limits per user';
COMMENT ON TABLE hushh_ai_cache IS 'Response and context caching for Hushh AI';
COMMENT ON TABLE hushh_ai_analytics IS 'Usage analytics for Hushh AI';
