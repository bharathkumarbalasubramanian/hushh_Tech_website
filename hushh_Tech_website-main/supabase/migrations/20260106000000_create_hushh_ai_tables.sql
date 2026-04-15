-- ============================================
-- Hushh AI Tables - Fresh Build
-- Free AI Assistant with Vertex AI
-- ============================================

-- 1. Users Table (tracks AI product users separately)
CREATE TABLE IF NOT EXISTS hushh_ai_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  total_chats INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_supabase_user UNIQUE (supabase_user_id)
);

-- 2. Chats Table (conversations)
CREATE TABLE IF NOT EXISTS hushh_ai_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hushh_ai_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS hushh_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES hushh_ai_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Media Limits Table (20 uploads/day)
CREATE TABLE IF NOT EXISTS hushh_ai_media_limits (
  user_id UUID PRIMARY KEY REFERENCES hushh_ai_users(id) ON DELETE CASCADE,
  daily_uploads INTEGER DEFAULT 0,
  last_reset TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_hushh_ai_users_supabase_id 
  ON hushh_ai_users(supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_hushh_ai_chats_user_id 
  ON hushh_ai_chats(user_id);

CREATE INDEX IF NOT EXISTS idx_hushh_ai_chats_updated 
  ON hushh_ai_chats(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_hushh_ai_messages_chat_id 
  ON hushh_ai_messages(chat_id);

CREATE INDEX IF NOT EXISTS idx_hushh_ai_messages_created 
  ON hushh_ai_messages(created_at ASC);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE hushh_ai_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_ai_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_ai_media_limits ENABLE ROW LEVEL SECURITY;

-- Users: Can only see/edit own record
CREATE POLICY "Users can view own profile"
  ON hushh_ai_users FOR SELECT
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON hushh_ai_users FOR UPDATE
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON hushh_ai_users FOR INSERT
  WITH CHECK (supabase_user_id = auth.uid());

-- Chats: Can only see/edit own chats
CREATE POLICY "Users can view own chats"
  ON hushh_ai_chats FOR SELECT
  USING (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own chats"
  ON hushh_ai_chats FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own chats"
  ON hushh_ai_chats FOR UPDATE
  USING (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own chats"
  ON hushh_ai_chats FOR DELETE
  USING (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

-- Messages: Can only see/edit messages in own chats
CREATE POLICY "Users can view own messages"
  ON hushh_ai_messages FOR SELECT
  USING (chat_id IN (
    SELECT c.id FROM hushh_ai_chats c
    JOIN hushh_ai_users u ON c.user_id = u.id
    WHERE u.supabase_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own messages"
  ON hushh_ai_messages FOR INSERT
  WITH CHECK (chat_id IN (
    SELECT c.id FROM hushh_ai_chats c
    JOIN hushh_ai_users u ON c.user_id = u.id
    WHERE u.supabase_user_id = auth.uid()
  ));

-- Media Limits: Can only see/edit own limits
CREATE POLICY "Users can view own media limits"
  ON hushh_ai_media_limits FOR SELECT
  USING (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own media limits"
  ON hushh_ai_media_limits FOR UPDATE
  USING (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own media limits"
  ON hushh_ai_media_limits FOR INSERT
  WITH CHECK (user_id IN (
    SELECT id FROM hushh_ai_users WHERE supabase_user_id = auth.uid()
  ));

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at on chat modification
CREATE OR REPLACE FUNCTION update_hushh_ai_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_timestamp
  BEFORE UPDATE ON hushh_ai_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_hushh_ai_chat_timestamp();

-- Increment message count on new message
CREATE OR REPLACE FUNCTION increment_hushh_ai_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hushh_ai_chats 
  SET message_count = message_count + 1, updated_at = NOW()
  WHERE id = NEW.chat_id;
  
  UPDATE hushh_ai_users
  SET total_messages = total_messages + 1
  WHERE id = (SELECT user_id FROM hushh_ai_chats WHERE id = NEW.chat_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_message_count
  AFTER INSERT ON hushh_ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_hushh_ai_message_count();

-- Reset daily media limits at midnight
CREATE OR REPLACE FUNCTION reset_hushh_ai_media_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.last_reset::DATE < CURRENT_DATE THEN
    NEW.daily_uploads = 0;
    NEW.last_reset = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_media_limits
  BEFORE UPDATE ON hushh_ai_media_limits
  FOR EACH ROW
  EXECUTE FUNCTION reset_hushh_ai_media_limits();

-- ============================================
-- RPC Functions
-- ============================================

-- Increment upload count atomically
CREATE OR REPLACE FUNCTION increment_hushh_ai_uploads(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_uploads INTEGER;
  last_reset_date DATE;
BEGIN
  SELECT daily_uploads, last_reset::DATE INTO current_uploads, last_reset_date
  FROM hushh_ai_media_limits
  WHERE user_id = p_user_id;
  
  -- Reset if new day
  IF last_reset_date < CURRENT_DATE THEN
    UPDATE hushh_ai_media_limits
    SET daily_uploads = 1, last_reset = NOW()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  
  -- Check limit (20/day)
  IF current_uploads >= 20 THEN
    RETURN FALSE;
  END IF;
  
  -- Increment
  UPDATE hushh_ai_media_limits
  SET daily_uploads = daily_uploads + 1
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Storage Bucket for Media
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('hushh-ai-media', 'hushh-ai-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hushh-ai-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage Policy: Users can read their own files
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hushh-ai-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read access for media
CREATE POLICY "Public can read media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'hushh-ai-media');
