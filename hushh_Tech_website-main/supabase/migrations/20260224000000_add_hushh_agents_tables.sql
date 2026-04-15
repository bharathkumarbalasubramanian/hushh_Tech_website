-- ============================================================
-- Hushh Agents - Database Schema
-- Multi-lingual AI Chat Platform with GCP Gemini Live API
-- ============================================================

-- Agents table - stores available AI agents
CREATE TABLE IF NOT EXISTS hushh_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT,
  model_config JSONB DEFAULT '{}',
  category TEXT CHECK (category IN ('general', 'specialist', 'creative')) DEFAULT 'general',
  is_pro BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations table - stores chat sessions
CREATE TABLE IF NOT EXISTS hushh_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT,
  language_code TEXT DEFAULT 'en-US',
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table - stores individual chat messages
CREATE TABLE IF NOT EXISTS hushh_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES hushh_agent_conversations(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  language_code TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User subscriptions table - tracks subscription tier
CREATE TABLE IF NOT EXISTS hushh_agent_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT CHECK (tier IN ('limited', 'pro')) DEFAULT 'limited',
  daily_message_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking table - for analytics
CREATE TABLE IF NOT EXISTS hushh_agent_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  is_voice BOOLEAN DEFAULT false,
  language_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_hushh_agent_conversations_user_id 
  ON hushh_agent_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_conversations_agent_id 
  ON hushh_agent_conversations(agent_id);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_messages_conversation_id 
  ON hushh_agent_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_messages_created_at 
  ON hushh_agent_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_subscriptions_user_id 
  ON hushh_agent_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_usage_user_id 
  ON hushh_agent_usage(user_id);

CREATE INDEX IF NOT EXISTS idx_hushh_agent_usage_created_at 
  ON hushh_agent_usage(created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE hushh_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_agent_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hushh_agent_usage ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only access their own
CREATE POLICY "Users can view own conversations" ON hushh_agent_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON hushh_agent_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON hushh_agent_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON hushh_agent_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages: Users can only access messages from their conversations
CREATE POLICY "Users can view own messages" ON hushh_agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hushh_agent_conversations 
      WHERE id = hushh_agent_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages" ON hushh_agent_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hushh_agent_conversations 
      WHERE id = hushh_agent_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Subscriptions: Users can only view/update their own
CREATE POLICY "Users can view own subscription" ON hushh_agent_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription" ON hushh_agent_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON hushh_agent_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Usage: Users can view their own usage
CREATE POLICY "Users can view own usage" ON hushh_agent_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON hushh_agent_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Functions
-- ============================================================

-- Function to reset daily message count
CREATE OR REPLACE FUNCTION reset_daily_message_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.daily_message_count := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-reset daily count
DROP TRIGGER IF EXISTS trigger_reset_daily_message_count ON hushh_agent_subscriptions;
CREATE TRIGGER trigger_reset_daily_message_count
  BEFORE UPDATE ON hushh_agent_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION reset_daily_message_count();

-- Function to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hushh_agent_conversations 
  SET 
    updated_at = now(),
    message_count = message_count + 1
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation on new message
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON hushh_agent_messages;
CREATE TRIGGER trigger_update_conversation_timestamp
  AFTER INSERT ON hushh_agent_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================================
-- Seed Default Agents
-- ============================================================

INSERT INTO hushh_agents (id, name, description, system_prompt, category, is_pro, is_active)
VALUES 
  ('hushh', 'Hushh', 'Your primary AI companion - helpful, friendly, and always ready to assist', 
   'You are Hushh, a friendly and intelligent AI assistant created by Hushh Labs.', 
   'general', false, true),
  ('hushh-pro', 'Hushh Pro', 'Advanced AI with voice capabilities and premium features', 
   'You are Hushh Pro, the premium AI assistant from Hushh Labs with voice capabilities.', 
   'general', true, true)
ON CONFLICT (id) DO NOTHING;
