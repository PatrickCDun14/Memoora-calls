-- 🎙️ Transcription Database Setup for Memoora
-- Run these commands in your Supabase SQL Editor

-- Add transcription columns to the recordings table
ALTER TABLE recordings 
ADD COLUMN IF NOT EXISTS transcription_text TEXT,
ADD COLUMN IF NOT EXISTS transcription_sid VARCHAR(255),
ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS transcription_url TEXT,
ADD COLUMN IF NOT EXISTS transcription_received_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance and easy querying
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_status ON recordings(transcription_status);
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_sid ON recordings(transcription_sid);
CREATE INDEX IF NOT EXISTS idx_recordings_call_sid ON recordings(call_sid);

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'recordings' 
  AND table_schema = 'public'
  AND column_name LIKE 'transcription%'
ORDER BY ordinal_position;
