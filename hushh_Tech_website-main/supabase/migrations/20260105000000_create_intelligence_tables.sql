-- ============================================
-- Hushh Intelligence Product Tables
-- Separate product with its own user tracking
-- ============================================

-- Intelligence Users Table (separate from main website)
CREATE TABLE IF NOT EXISTS intelligence_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supabase_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ DEFAULT NOW(),
  total_messages INT DEFAULT 0,
  total_conversations INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(supabase_user_id)
);

-- Intelligence Conversations
CREATE TABLE IF NOT EXISTS intelligence_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES intelligence_users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intelligence Messages
CREATE TABLE IF NOT EXISTS intelligence_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES intelligence_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  media_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intelligence Media Limits (20/day)
CREATE TABLE IF NOT EXISTS intelligence_media_limits (
  user_id UUID REFERENCES intelligence_users(id) ON DELETE CASCADE PRIMARY KEY,
  daily_uploads INT DEFAULT 0,
  last_reset DATE DEFAULT CURRENT_DATE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_intelligence_users_supabase_id ON intelligence_users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_conversations_user ON intelligence_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_conversations_updated ON intelligence_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_intelligence_messages_conversation ON intelligence_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_messages_created ON intelligence_messages(created_at DESC);

-- Function to auto-reset daily media limits
CREATE OR REPLACE FUNCTION reset_intelligence_media_limits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset < CURRENT_DATE THEN
    NEW.daily_uploads := 0;
    NEW.last_reset := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for daily reset
DROP TRIGGER IF EXISTS trigger_reset_intelligence_media ON intelligence_media_limits;
CREATE TRIGGER trigger_reset_intelligence_media
  BEFORE UPDATE ON intelligence_media_limits
  FOR EACH ROW
  EXECUTE FUNCTION reset_intelligence_media_limits();

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_intelligence_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE intelligence_conversations 
  SET updated_at = NOW() 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update conversation timestamp on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON intelligence_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON intelligence_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_intelligence_conversation_timestamp();

-- Function to increment user message count
CREATE OR REPLACE FUNCTION increment_intelligence_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE intelligence_users 
    SET total_messages = total_messages + 1 
    WHERE id = (SELECT user_id FROM intelligence_conversations WHERE id = NEW.conversation_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message count
DROP TRIGGER IF EXISTS trigger_increment_message_count ON intelligence_messages;
CREATE TRIGGER trigger_increment_message_count
  AFTER INSERT ON intelligence_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_intelligence_message_count();

-- RLS Policies
ALTER TABLE intelligence_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_media_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own intelligence profile" ON intelligence_users
  FOR SELECT USING (supabase_user_id = auth.uid());

CREATE POLICY "Users can update own intelligence profile" ON intelligence_users
  FOR UPDATE USING (supabase_user_id = auth.uid());

CREATE POLICY "Users can insert own intelligence profile" ON intelligence_users
  FOR INSERT WITH CHECK (supabase_user_id = auth.uid());

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON intelligence_conversations
  FOR SELECT USING (user_id IN (SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()));

CREATE POLICY "Users can insert own conversations" ON intelligence_conversations
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()));

CREATE POLICY "Users can update own conversations" ON intelligence_conversations
  FOR UPDATE USING (user_id IN (SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()));

CREATE POLICY "Users can delete own conversations" ON intelligence_conversations
  FOR DELETE USING (user_id IN (SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()));

-- Messages policies
CREATE POLICY "Users can view own messages" ON intelligence_messages
  FOR SELECT USING (conversation_id IN (
    SELECT id FROM intelligence_conversations WHERE user_id IN (
      SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert messages to own conversations" ON intelligence_messages
  FOR INSERT WITH CHECK (conversation_id IN (
    SELECT id FROM intelligence_conversations WHERE user_id IN (
      SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()
    )
  ));

-- Media limits policies
CREATE POLICY "Users can view own media limits" ON intelligence_media_limits
  FOR SELECT USING (user_id IN (SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()));

CREATE POLICY "Users can update own media limits" ON intelligence_media_limits
  FOR UPDATE USING (user_id IN (SELECT id FROM intelligence_users WHERE supabase_user_id = auth.uid()));
