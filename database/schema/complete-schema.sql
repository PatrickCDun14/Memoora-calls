-- Complete Memoora Database Schema
-- Run this in Supabase SQL Editor to set up the complete database

-- ========================================
-- STEP 1: Create Basic Tables
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

-- 3. Calls table
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
-- STEP 2: Create Voice Modularity Tables
-- ========================================

-- 6. Voice Snippets table
CREATE TABLE IF NOT EXISTS voice_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT,
  snippet_name VARCHAR(255) NOT NULL,
  snippet_type VARCHAR(100) NOT NULL,
  audio_file_path VARCHAR(500),
  audio_file_size INTEGER,
  duration INTEGER,
  mime_type VARCHAR(100) DEFAULT 'audio/mpeg',
  storage_bucket VARCHAR(100) DEFAULT 'voice-snippets',
  storage_path VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- 7. Voice Templates table
CREATE TABLE IF NOT EXISTS voice_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT,
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,
  snippet_sequence JSONB NOT NULL,
  total_duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Voice Configurations table
CREATE TABLE IF NOT EXISTS voice_configurations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT,
  template_id UUID REFERENCES voice_templates(id) ON DELETE SET NULL,
  config_name VARCHAR(255) NOT NULL,
  target_name VARCHAR(255),
  custom_variables JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Voice Usage table
CREATE TABLE IF NOT EXISTS voice_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  configuration_id UUID REFERENCES voice_configurations(id) ON DELETE SET NULL,
  template_id UUID REFERENCES voice_templates(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 3: Create Extensions Tables
-- ========================================

-- 10. Account Quotas table
CREATE TABLE IF NOT EXISTS account_quotas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL,
  daily_call_limit INTEGER DEFAULT 100,
  monthly_call_limit INTEGER DEFAULT 3000,
  daily_call_count INTEGER DEFAULT 0,
  monthly_call_count INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. API Key Usage Logs table
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  response_time INTEGER,
  status_code INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Webhook Logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_url VARCHAR(500) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Storage Assets table
CREATE TABLE IF NOT EXISTS storage_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_type VARCHAR(100) NOT NULL,
  asset_id UUID NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- STEP 4: Create Indexes
-- ========================================

-- Basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_account_id ON calls(account_id);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_account_id ON api_keys(account_id);
CREATE INDEX IF NOT EXISTS idx_recordings_call_id ON recordings(call_id);

-- Voice modularity indexes
CREATE INDEX IF NOT EXISTS idx_voice_snippets_account_id ON voice_snippets(account_id);
CREATE INDEX IF NOT EXISTS idx_voice_templates_account_id ON voice_templates(account_id);
CREATE INDEX IF NOT EXISTS idx_voice_configurations_account_id ON voice_configurations(account_id);

-- Extensions indexes
CREATE INDEX IF NOT EXISTS idx_account_quotas_account_id ON account_quotas(account_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_storage_assets_asset_type ON storage_assets(asset_type);

-- ========================================
-- STEP 5: Create Functions and Triggers
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_snippets_updated_at BEFORE UPDATE ON voice_snippets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_templates_updated_at BEFORE UPDATE ON voice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_configurations_updated_at BEFORE UPDATE ON voice_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_account_quotas_updated_at BEFORE UPDATE ON account_quotas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_storage_assets_updated_at BEFORE UPDATE ON storage_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

SELECT '✅ Complete Memoora Database Schema Created Successfully!' as status;
