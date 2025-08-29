// Environment configuration and validation
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

const optionalEnvVars = [
  'PORT',
  'BASE_URL',
  'NODE_ENV',
  'LOG_LEVEL'
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];

  // Check required variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  // Check optional variables
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  // Validate BASE_URL format if provided
  if (process.env.BASE_URL) {
    try {
      new URL(process.env.BASE_URL);
    } catch (error) {
      missing.push('BASE_URL (invalid URL format)');
    }
  }

  // Validate Twilio phone number format
  if (process.env.TWILIO_PHONE_NUMBER && !process.env.TWILIO_PHONE_NUMBER.match(/^\+1\d{10}$/)) {
    missing.push('TWILIO_PHONE_NUMBER (must be +1XXXXXXXXXX format)');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (warnings.length > 0) {
    console.warn(`⚠️  Optional environment variables not set: ${warnings.join(', ')}`);
  }

  return {
    port: process.env.PORT || 5005,
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`,
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    }
  };
}

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

module.exports = {
  validateEnvironment,
  isProduction,
  isDevelopment
}; 