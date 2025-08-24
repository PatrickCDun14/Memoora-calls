const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Environment-specific configurations
const environments = {
  development: {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || 'http://localhost:5005',
    logLevel: 'debug',
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5005', 'http://127.0.0.1:5005', process.env.BASE_URL].filter(Boolean),
      credentials: true
    }
  },
  staging: {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || 'https://memoora-calls.onrender.com',
    logLevel: 'info',
    cors: {
      origin: [
        process.env.BASE_URL, 
        'https://memoora-calls.onrender.com',
        'https://memoora-backend.onrender.com',
        'https://frontend-one-ebon-91.vercel.app'
      ],
      credentials: true
    }
  },
  production: {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || 'https://memoora-calls.onrender.com',
    logLevel: 'warn',
    cors: {
      origin: [
        process.env.BASE_URL, 
        'https://memoora-calls.onrender.com',
        'https://memoora-backend.onrender.com',
        'https://frontend-one-ebon-91.vercel.app'
      ],
      credentials: true
    }
  }
};

// Get current environment
const currentEnv = process.env.NODE_ENV || 'development';

// Export configuration
const config = {
  env: currentEnv,
  port: environments[currentEnv].port,
  baseUrl: environments[currentEnv].baseUrl,
  logLevel: environments[currentEnv].logLevel,
  cors: environments[currentEnv].cors,
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  
  // Security Configuration
  security: {
    adminApiKeys: process.env.ADMIN_API_KEYS ? process.env.ADMIN_API_KEYS.split(',') : [],
    allowedDomains: process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : [],
    blockedDomains: process.env.BLOCKED_DOMAINS ? process.env.BLOCKED_DOMAINS.split(',') : [],
    allowedCountryCodes: process.env.ALLOWED_COUNTRY_CODES ? process.env.ALLOWED_COUNTRY_CODES.split(',') : ['US', 'CA', 'GB'],
    maxCallsPerDay: parseInt(process.env.MAX_CALLS_PER_DAY) || 100,
    maxCallsPerMonth: parseInt(process.env.MAX_CALLS_PER_MONTH) || 1000,
    supportEmail: process.env.SUPPORT_EMAIL || 'support@yourcompany.com',
    adminNotificationWebhook: process.env.ADMIN_NOTIFICATION_WEBHOOK
  },
  
  // Personal Configuration
  personal: {
    myPhoneNumber: process.env.MY_PHONE_NUMBER
  }
};

// Validation
if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
  console.warn('⚠️  Warning: Twilio credentials not fully configured');
}

if (config.security.adminApiKeys.length === 0) {
  console.warn('⚠️  Warning: No admin API keys configured');
}

module.exports = config; 