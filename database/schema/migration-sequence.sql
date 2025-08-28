-- Migration Sequence: Create Basic Tables First, Then Add Enhanced Fields
-- Run this in Supabase SQL Editor in order

-- ========================================
-- STEP 1: Create Basic Tables (if they don't exist)
-- ========================================

-- 1. Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  external_user_id VARCHAR(255),
  external_system VARCHAR(100),
  phone_number VARCHAR(20),
  company_name VARCHAR(255),
  website VARCHAR(255),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 2. API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  account_id TEXT,
  key_name VARCHAR(255),
  permissions TEXT[] DEFAULT '{}',
  max_calls_per_day INTEGER DEFAULT 50,
  max_calls_per_month INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- 3. Calls table (basic version)
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twilio_call_sid VARCHAR(255) UNIQUE,
  account_id TEXT,
  api_key_id TEXT,
  external_user_id VARCHAR(255),
  external_call_id VARCHAR(255),
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration INTEGER,
  question TEXT,
  voice_config VARCHAR(100),
  recording_url VARCHAR(500),
  recording_filename VARCHAR(255),
  recording_size INTEGER,
  call_cost DECIMAL(10,4),
  answered_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- 4. Recordings table
CREATE TABLE IF NOT EXISTS recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INTEGER,
  duration INTEGER,
  mime_type VARCHAR(100) DEFAULT 'audio/mpeg',
  storage_bucket VARCHAR(100) DEFAULT 'recordings',
  storage_path VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT false
);

-- 5. Call Events table
CREATE TABLE IF NOT EXISTS call_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 2: Add Enhanced Fields to Calls Table
-- ========================================

-- Now add the enhanced fields to the calls table
DO $$ 
BEGIN
    -- Add storyteller_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calls' AND column_name = 'storyteller_id') THEN
        ALTER TABLE calls ADD COLUMN storyteller_id UUID;
        RAISE NOTICE 'Added storyteller_id column to calls table';
    ELSE
        RAISE NOTICE 'storyteller_id column already exists in calls table';
    END IF;
    
    -- Add family_member_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calls' AND column_name = 'family_member_id') THEN
        ALTER TABLE calls ADD COLUMN family_member_id UUID;
        RAISE NOTICE 'Added family_member_id column to calls table';
    ELSE
        RAISE NOTICE 'family_member_id column already exists in calls table';
    END IF;
    
    -- Add scheduled_call_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calls' AND column_name = 'scheduled_call_id') THEN
        ALTER TABLE calls ADD COLUMN scheduled_call_id UUID;
        RAISE NOTICE 'Added scheduled_call_id column to calls table';
    ELSE
        RAISE NOTICE 'scheduled_call_id column already exists in calls table';
    END IF;
    
    -- Add call_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calls' AND column_name = 'call_type') THEN
        ALTER TABLE calls ADD COLUMN call_type VARCHAR(50) DEFAULT 'storytelling';
        RAISE NOTICE 'Added call_type column to calls table';
    ELSE
        RAISE NOTICE 'call_type column already exists in calls table';
    END IF;
    
    -- Add custom_message if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calls' AND column_name = 'custom_message') THEN
        ALTER TABLE calls ADD COLUMN custom_message TEXT;
        RAISE NOTICE 'Added custom_message column to calls table';
    ELSE
        RAISE NOTICE 'custom_message column already exists in calls table';
    END IF;
    
    -- Add interactive flag if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'calls' AND column_name = 'interactive') THEN
        ALTER TABLE calls ADD COLUMN interactive BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added interactive column to calls table';
    ELSE
        RAISE NOTICE 'interactive column already exists in calls table';
    END IF;
    
END $$;

-- ========================================
-- STEP 3: Add Performance Indexes
-- ========================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_storyteller_id ON calls(storyteller_id);
CREATE INDEX IF NOT EXISTS idx_calls_family_member_id ON calls(family_member_id);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_call_id ON calls(scheduled_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_type ON calls(call_type);
CREATE INDEX IF NOT EXISTS idx_calls_interactive ON calls(interactive);
CREATE INDEX IF NOT EXISTS idx_calls_account_id ON calls(account_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

-- ========================================
-- STEP 4: Add Column Comments
-- ========================================

-- Add comments for documentation
COMMENT ON COLUMN calls.storyteller_id IS 'UUID of the storyteller being called';
COMMENT ON COLUMN calls.family_member_id IS 'UUID of the family member initiating the call';
COMMENT ON COLUMN calls.scheduled_call_id IS 'UUID of the scheduled call from the main application';
COMMENT ON COLUMN calls.call_type IS 'Type of call (storytelling, interview, conversation, etc.)';
COMMENT ON COLUMN calls.custom_message IS 'Custom message or question for the call';
COMMENT ON COLUMN calls.interactive IS 'Whether this is an interactive call with dynamic questions';

-- ========================================
-- STEP 5: Verify the Changes
-- ========================================

-- Verify all tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('accounts', 'api_keys', 'calls', 'recordings', 'call_events')
ORDER BY tablename;

-- Verify the enhanced columns were added to calls table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN ('storyteller_id', 'family_member_id', 'scheduled_call_id', 'call_type', 'custom_message', 'interactive')
ORDER BY column_name;

-- Show the complete calls table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
ORDER BY ordinal_position;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables created: accounts, api_keys, calls, recordings, call_events';
    RAISE NOTICE 'Enhanced fields added to calls table';
    RAISE NOTICE 'Indexes created for performance';
    RAISE NOTICE 'Ready to use enhanced Memoora Call API!';
    RAISE NOTICE '========================================';
END $$;
