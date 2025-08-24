-- ============================================================================
-- MEMOORA SUPABASE DATABASE SCHEMA
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE (for family members with authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'family',
  subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free',
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
  city VARCHAR(255),
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Stripe integration fields
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Email verification
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP WITH TIME ZONE,
  
  -- Password reset
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  
  -- Account status
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'basic', 'premium')),
  CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'inactive', 'suspended', 'cancelled')),
  CONSTRAINT valid_role CHECK (role IN ('family', 'admin'))
);

-- ============================================================================
-- USER PROFILES TABLE (for patients and care staff)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(255),
  pin VARCHAR(10) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  
  -- Role-specific fields
  patient_code VARCHAR(100) UNIQUE,
  care_staff_code VARCHAR(100) UNIQUE,
  
  -- Profile fields
  date_of_birth DATE,
  gender VARCHAR(20),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),
  
  -- Medical/health fields
  medical_conditions TEXT[],
  medications TEXT[],
  allergies TEXT[],
  
  -- Preferences
  preferred_language VARCHAR(10) DEFAULT 'en',
  communication_preferences JSONB,
  
  -- Status
  is_self_managed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_profile_role CHECK (role IN ('patient', 'care_staff')),
  CONSTRAINT valid_pin_format CHECK (pin ~ '^[0-9]{4,6}$'),
  CONSTRAINT patient_code_required CHECK (
    (role = 'patient' AND patient_code IS NOT NULL) OR 
    (role != 'patient')
  ),
  CONSTRAINT care_staff_code_required CHECK (
    (role = 'care_staff' AND care_staff_code IS NOT NULL) OR 
    (role != 'care_staff')
  )
);

-- ============================================================================
-- FAMILY RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storyteller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100) NOT NULL DEFAULT 'family',
  relationship_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(family_member_id, storyteller_id),
  CONSTRAINT valid_relationship_type CHECK (relationship_type IN ('family', 'care_giver', 'friend', 'other'))
);

-- ============================================================================
-- RECORDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  format VARCHAR(20),
  
  -- Relationships
  family_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storyteller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Recording metadata
  recording_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  tags TEXT[],
  
  -- Processing status
  transcription_status VARCHAR(50) DEFAULT 'pending',
  transcription_text TEXT,
  transcription_confidence DECIMAL(3,2),
  
  -- Privacy and sharing
  is_private BOOLEAN DEFAULT TRUE,
  can_share BOOLEAN DEFAULT FALSE,
  shared_with UUID[],
  
  -- Status
  status VARCHAR(50) DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_transcription_status CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_recording_status CHECK (status IN ('processing', 'completed', 'failed', 'deleted')),
  CONSTRAINT valid_format CHECK (format IN ('wav', 'mp3', 'webm', 'm4a', 'aac'))
);

-- ============================================================================
-- SCHEDULED CALLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  description TEXT,
  
  -- Relationships
  family_member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storyteller_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  timezone VARCHAR(100) DEFAULT 'America/New_York',
  
  -- Call details
  call_type VARCHAR(50) DEFAULT 'storytelling',
  call_platform VARCHAR(50) DEFAULT 'zoom',
  meeting_link VARCHAR(500),
  meeting_id VARCHAR(255),
  meeting_password VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes and feedback
  pre_call_notes TEXT,
  post_call_notes TEXT,
  family_feedback TEXT,
  storyteller_feedback TEXT,
  
  -- Reminders
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_call_status CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  CONSTRAINT valid_call_type CHECK (call_type IN ('storytelling', 'check_in', 'family_update', 'other')),
  CONSTRAINT valid_call_platform CHECK (call_platform IN ('zoom', 'teams', 'skype', 'phone', 'other')),
  CONSTRAINT positive_duration CHECK (duration_minutes > 0)
);

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  category VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'medium',
  tags TEXT[],
  
  -- Question metadata
  question_type VARCHAR(50) DEFAULT 'open_ended',
  estimated_time_minutes INTEGER DEFAULT 5,
  suggested_context TEXT,
  
  -- Usage tracking
  times_asked INTEGER DEFAULT 0,
  times_answered INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT valid_question_type CHECK (question_type IN ('open_ended', 'multiple_choice', 'yes_no', 'rating')),
  CONSTRAINT positive_time CHECK (estimated_time_minutes > 0)
);

-- ============================================================================
-- USAGE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_type VARCHAR(50) NOT NULL, -- 'family', 'patient', 'care_staff'
  
  -- Usage metrics
  action_type VARCHAR(100) NOT NULL,
  action_details JSONB,
  
  -- Resource usage
  recordings_created INTEGER DEFAULT 0,
  recordings_processed INTEGER DEFAULT 0,
  calls_scheduled INTEGER DEFAULT 0,
  calls_completed INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  
  -- Timestamps
  action_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_user_type CHECK (user_type IN ('family', 'patient', 'care_staff')),
  CONSTRAINT valid_action_type CHECK (action_type IN ('login', 'recording_created', 'call_scheduled', 'question_asked', 'storyteller_linked'))
);

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Stripe integration
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  
  -- Payment details
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) NOT NULL,
  
  -- Subscription details
  subscription_tier VARCHAR(50),
  billing_cycle VARCHAR(20),
  next_billing_date DATE,
  
  -- Metadata
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD')),
  CONSTRAINT positive_amount CHECK (amount_cents > 0)
);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  user_id UUID,
  user_type VARCHAR(50),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  changes_summary TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_entity_type CHECK (entity_type IN ('user', 'recording', 'call', 'question', 'payment', 'relationship'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- User profiles table indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pin ON user_profiles(pin);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_patient_code ON user_profiles(patient_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_care_staff_code ON user_profiles(care_staff_code);

-- Family relationships table indexes
CREATE INDEX IF NOT EXISTS idx_family_relationships_family_member ON family_relationships(family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_storyteller ON family_relationships(storyteller_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_created_at ON family_relationships(created_at);

-- Recordings table indexes
CREATE INDEX IF NOT EXISTS idx_recordings_family_member ON recordings(family_member_id);
CREATE INDEX IF NOT EXISTS idx_recordings_storyteller ON recordings(storyteller_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at);
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_status ON recordings(transcription_status);

-- Scheduled calls table indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_family_member ON scheduled_calls(family_member_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_storyteller ON scheduled_calls(storyteller_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_scheduled_time ON scheduled_calls(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);

-- Usage tracking table indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_date ON usage_tracking(action_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_action_type ON usage_tracking(action_type);

-- Payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Audit log table indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_family_relationships_updated_at BEFORE UPDATE ON family_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_calls_updated_at BEFORE UPDATE ON scheduled_calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA INSERTION
-- ============================================================================

-- Insert sample questions
INSERT INTO questions (text, category, difficulty, tags, question_type, estimated_time_minutes) VALUES
('What was your favorite childhood memory?', 'childhood', 'easy', ARRAY['memory', 'childhood', 'happy'], 'open_ended', 5),
('What advice would you give to your younger self?', 'wisdom', 'medium', ARRAY['advice', 'reflection', 'wisdom'], 'open_ended', 8),
('What was the most challenging time in your life and how did you overcome it?', 'life', 'hard', ARRAY['challenge', 'overcoming', 'strength'], 'open_ended', 12),
('What are you most grateful for in your life?', 'gratitude', 'easy', ARRAY['gratitude', 'appreciation', 'blessings'], 'open_ended', 5),
('What is your proudest achievement?', 'achievement', 'medium', ARRAY['pride', 'success', 'accomplishment'], 'open_ended', 8),
('What is something you''ve always wanted to learn or try?', 'aspirations', 'medium', ARRAY['goals', 'learning', 'aspirations'], 'open_ended', 6),
('What is your favorite family tradition?', 'family', 'easy', ARRAY['family', 'tradition', 'culture'], 'open_ended', 5),
('What is the best piece of advice you''ve ever received?', 'wisdom', 'medium', ARRAY['advice', 'wisdom', 'guidance'], 'open_ended', 7),
('What is something that always makes you laugh?', 'humor', 'easy', ARRAY['humor', 'laughter', 'joy'], 'open_ended', 4),
('What is your favorite place in the world and why?', 'travel', 'medium', ARRAY['travel', 'places', 'memories'], 'open_ended', 8);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Family members with authentication and subscription management';
COMMENT ON TABLE user_profiles IS 'Patients and care staff profiles with PIN-based access';
COMMENT ON TABLE family_relationships IS 'Links between family members and storytellers';
COMMENT ON TABLE recordings IS 'Audio recordings with transcription and metadata';
COMMENT ON TABLE scheduled_calls IS 'Scheduled video/audio calls between family and storytellers';
COMMENT ON TABLE questions IS 'Question prompts for storytelling sessions';
COMMENT ON TABLE usage_tracking IS 'Track user activity and resource usage';
COMMENT ON TABLE payments IS 'Payment and subscription records';
COMMENT ON TABLE audit_log IS 'Audit trail for all system changes';

COMMENT ON COLUMN users.subscription_tier IS 'free, basic, or premium subscription level';
COMMENT ON COLUMN users.subscription_status IS 'active, inactive, suspended, or cancelled';
COMMENT ON COLUMN user_profiles.pin IS '4-6 digit PIN for patient/care staff access';
COMMENT ON COLUMN user_profiles.patient_code IS 'Unique identifier for patients';
COMMENT ON COLUMN user_profiles.care_staff_code IS 'Unique identifier for care staff';
COMMENT ON COLUMN recordings.transcription_status IS 'Status of audio transcription processing';
COMMENT ON COLUMN scheduled_calls.status IS 'Current status of scheduled call';
COMMENT ON COLUMN questions.difficulty IS 'Easy, medium, or hard question complexity';
COMMENT ON COLUMN payments.payment_status IS 'Status of payment processing'; 