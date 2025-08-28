-- Migration: Add Enhanced Fields to Calls Table
-- Run this in Supabase SQL Editor to add the new fields

-- Add new columns to calls table for enhanced call tracking
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
    
    -- Add call_type if it doesn't exist (or update if it's just a VARCHAR)
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_storyteller_id ON calls(storyteller_id);
CREATE INDEX IF NOT EXISTS idx_calls_family_member_id ON calls(family_member_id);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_call_id ON calls(scheduled_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_call_type ON calls(call_type);
CREATE INDEX IF NOT EXISTS idx_calls_interactive ON calls(interactive);

-- Add comments for documentation
COMMENT ON COLUMN calls.storyteller_id IS 'UUID of the storyteller being called';
COMMENT ON COLUMN calls.family_member_id IS 'UUID of the family member initiating the call';
COMMENT ON COLUMN calls.scheduled_call_id IS 'UUID of the scheduled call from the main application';
COMMENT ON COLUMN calls.call_type IS 'Type of call (storytelling, interview, conversation, etc.)';
COMMENT ON COLUMN calls.custom_message IS 'Custom message or question for the call';
COMMENT ON COLUMN calls.interactive IS 'Whether this is an interactive call with dynamic questions';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN ('storyteller_id', 'family_member_id', 'scheduled_call_id', 'call_type', 'custom_message', 'interactive')
ORDER BY column_name;
