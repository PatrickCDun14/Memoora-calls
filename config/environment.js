const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ===== ENVIRONMENT VARIABLE STANDARDS =====
// 
// REQUIRED VARIABLES (will cause startup failure if missing):
// - SUPABASE_URL: Your Supabase project URL
// - SUPABASE_ANON_KEY: Public anon key for database reads
// - SUPABASE_SERVICE_ROLE_KEY: Service role key for database writes
// - TWILIO_ACCOUNT_SID: Your Twilio account SID
// - TWILIO_AUTH_TOKEN: Your Twilio auth token
// - TWILIO_PHONE_NUMBER: Your Twilio phone number
// - OPENAI_API_KEY: Your OpenAI API key
//
// OPTIONAL VARIABLES (have sensible defaults):
// - NODE_ENV: Environment (development/staging/production)
// - PORT: Server port (default: 5005)
// - BASE_URL: Base URL for webhooks and callbacks
// - MAX_RECORDING_DURATION: Max recording length in seconds (default: 120)
// - MAX_CALLS_PER_DAY: Daily call limit (default: 100)
// - MAX_CALLS_PER_MONTH: Monthly call limit (default: 1000)
// - SUPPORT_EMAIL: Support contact (default: support@memoora.com)
//
// SECURITY VARIABLES (optional but recommended):
// - ALLOWED_DOMAINS: Comma-separated list of allowed domains
// - ADMIN_API_KEYS: Comma-separated list of admin API keys
// - CORS_ORIGIN: CORS origin (defaults to BASE_URL)

// Environment-specific configurations
const environments = {
  development: {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || 'http://localhost:5005',
    logLevel: 'debug',
    cors: {
      origin: [
        'http://localhost:3000', 
        'http://localhost:5005', 
        'http://127.0.0.1:5005',
        process.env.CORS_ORIGIN || process.env.BASE_URL
      ].filter(Boolean),
      credentials: true
    }
  },
  staging: {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || 'https://memoora-calls.onrender.com',
    logLevel: 'info',
    cors: {
      origin: [
        process.env.CORS_ORIGIN || process.env.BASE_URL,
        'https://memoora-backend.onrender.com',
        'https://frontend-one-ebon-91.vercel.app'
      ].filter(Boolean),
      credentials: true
    }
  },
  production: {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || 'https://memoora-calls.onrender.com',
    logLevel: 'warn',
    cors: {
      origin: [
        process.env.CORS_ORIGIN || process.env.BASE_URL,
        'https://memoora-backend.onrender.com',
        'https://memoora.com'
      ].filter(Boolean),
      credentials: true
    }
  }
};

// Get current environment
const currentEnv = process.env.NODE_ENV || 'development';

// ===== REQUIRED CONFIGURATION VALIDATION =====
const requiredEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};

// Check for missing required variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('💡 Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Export configuration
const config = {
  env: currentEnv,
  port: environments[currentEnv].port,
  baseUrl: environments[currentEnv].baseUrl,
  logLevel: environments[currentEnv].logLevel,
  cors: environments[currentEnv].cors,
  
  // Database Configuration
  database: {
    supabase: {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  },
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY
  },
  
  // Security Configuration
  security: {
    adminApiKeys: process.env.ADMIN_API_KEYS ? process.env.ADMIN_API_KEYS.split(',') : [],
    allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : [],
    blockedDomains: process.env.BLOCKED_DOMAINS ? process.env.BLOCKED_DOMAINS.split(',') : [],
    allowedCountryCodes: process.env.ALLOWED_COUNTRY_CODES ? process.env.ALLOWED_COUNTRY_CODES.split(',') : ['US', 'CA', 'GB'],
    maxCallsPerDay: parseInt(process.env.MAX_CALLS_PER_DAY) || 100,
    maxCallsPerMonth: parseInt(process.env.MAX_CALLS_PER_MONTH) || 1000,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@memoora.com',
    adminNotificationWebhook: process.env.ADMIN_NOTIFICATION_WEBHOOK
  },
  
  // Application Configuration
  app: {
    maxRecordingDuration: parseInt(process.env.MAX_RECORDING_DURATION) || 120,
    recordingsPath: process.env.RECORDINGS_PATH || './recordings',
    tempPath: process.env.TEMP_PATH || './temp',
    audioPath: process.env.AUDIO_PATH || './audio'
  },
  
  // Personal Configuration (for development/testing)
  personal: {
    myPhoneNumber: process.env.MY_PHONE_NUMBER
  }
};

// ===== CONFIGURATION VALIDATION =====
console.log('✅ Environment Configuration Loaded:');
console.log(`   Environment: ${config.env}`);
console.log(`   Port: ${config.port}`);
console.log(`   Base URL: ${config.baseUrl}`);
console.log(`   Log Level: ${config.logLevel}`);

// Validate Twilio configuration
if (config.twilio.accountSid && config.twilio.authToken && config.twilio.phoneNumber) {
  console.log('✅ Twilio: Fully configured');
} else {
  console.error('❌ Twilio: Incomplete configuration');
}

// Validate Supabase configuration
if (config.database.supabase.url && config.database.supabase.anonKey && config.database.supabase.serviceRoleKey) {
  console.log('✅ Supabase: Fully configured');
} else {
  console.error('❌ Supabase: Incomplete configuration');
}

// Validate OpenAI configuration
if (config.openai.apiKey) {
  console.log('✅ OpenAI: Configured');
} else {
  console.error('❌ OpenAI: Missing API key');
}

// Security warnings
if (config.security.adminApiKeys.length === 0) {
  console.warn('⚠️  Security: No admin API keys configured');
}

if (config.security.allowedDomains.length === 0) {
  console.warn('⚠️  Security: No domain restrictions configured');
}

module.exports = config; 