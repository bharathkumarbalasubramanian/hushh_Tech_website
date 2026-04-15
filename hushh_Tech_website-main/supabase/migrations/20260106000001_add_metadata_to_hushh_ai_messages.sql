-- Add metadata column to hushh_ai_messages table for calendar events and other structured data
-- Migration: 20260106000001_add_metadata_to_hushh_ai_messages.sql

-- Add metadata column (JSONB for flexible structured data)
ALTER TABLE hushh_ai_messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Create GIN index on metadata column for efficient JSON queries
CREATE INDEX IF NOT EXISTS idx_hushh_ai_messages_metadata
ON hushh_ai_messages USING GIN (metadata);

-- Add comment to document the metadata structure
COMMENT ON COLUMN hushh_ai_messages.metadata IS 'Stores structured metadata for messages. Example: {"calendarEvent": {"id": "...", "summary": "...", "startTime": "...", "endTime": "...", "meetLink": "..."}}';
