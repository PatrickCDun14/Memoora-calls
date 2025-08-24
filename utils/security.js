// utils/security.js
const crypto = require('crypto');

// In-memory store for rate limiting (simple and effective for single instance)
const memoryStore = new Map();

// ===== API KEY VALIDATION =====

/**
 * Validate API key middleware
 * Checks if the provided API key is valid and active
 */
const validateApiKeyMiddleware = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'Missing API key',
        message: 'Please provide an API key in the x-api-key header'
      });
    }

    // Validate the API key using the service
    const apiKeyService = require('./api-key-service');
    const validation = await apiKeyService.validateApiKey(apiKey);
    
    if (!validation.valid) {
      return res.status(401).json({ 
        error: 'Invalid API key',
        message: validation.error
      });
    }

    // Add API key info to request for logging
    req.apiKey = apiKey;
    req.apiKeyInfo = {
      key: apiKey.substring(0, 8) + '...',
      id: validation.data.id,
      accountId: validation.data.accountId,
      permissions: validation.data.permissions,
      limits: validation.data.limits
    };
    
    next();
  } catch (error) {
    console.error('❌ API key validation error:', error);
    return res.status(500).json({ 
      error: 'Validation error',
      message: 'Internal server error during API key validation'
    });
  }
};

/**
 * Validate API key function (for direct calls)
 * Returns validation result object
 */
const validateApiKey = async (apiKey) => {
  try {
    if (!apiKey) {
      return { valid: false, message: 'API key is required' };
    }

    // Validate the API key using the service
    const apiKeyService = require('./api-key-service');
    const validation = await apiKeyService.validateApiKey(apiKey);
    
    return validation;
  } catch (error) {
    console.error('❌ API key validation error:', error);
    return { 
      valid: false, 
      message: 'Internal server error during API key validation',
      error: error.message
    };
  }
};

// Validate API key format and existence
const isValidApiKey = (apiKey) => {
  // Check if it's a valid format (you can customize this)
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 32) {
    return false;
  }

  // Check against environment variables or database
  const validKeys = process.env.API_KEYS ? 
    process.env.API_KEYS.split(',') : 
    [process.env.API_KEY];

  return validKeys.includes(apiKey);
};

// Get API key information (for logging and rate limiting)
const getApiKeyInfo = (apiKey) => {
  // You can extend this to check against a database
  // For now, return basic info
  return {
    key: apiKey.substring(0, 8) + '...',
    type: 'standard', // or 'premium', 'admin', etc.
    createdAt: new Date().toISOString()
  };
};

// Rate limiting per API key (simplified - in-memory only)
const isApiKeyRateLimited = (apiKey) => {
  const key = `rate_limit:${apiKey}`;
  const limit = 100; // requests per hour
  const window = 60 * 60 * 1000; // 1 hour

  // Use in-memory store (simple and effective for single instance)
  const now = Date.now();
  const record = memoryStore.get(key);
  
  if (!record || (now - record.timestamp) > window) {
    memoryStore.set(key, { count: 1, timestamp: now });
    return false;
  }
  
  if (record.count >= limit) {
    return true;
  }
  
  record.count++;
  return false;
};

// Call frequency limiting (prevent spam calls)
const callFrequencyLimiter = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const key = `call_frequency:${apiKey}`;
  const maxCallsPerHour = 10; // Adjust based on your needs
  const window = 60 * 60 * 1000; // 1 hour

  // Use in-memory store
  const now = Date.now();
  const record = memoryStore.get(key);
  
  if (!record || (now - record.timestamp) > window) {
    memoryStore.set(key, { count: 1, timestamp: now });
    return next();
  }
  
  if (record.count >= maxCallsPerHour) {
    return res.status(429).json({
      error: 'Call frequency limit exceeded',
      message: `Maximum ${maxCallsPerHour} calls per hour exceeded. Please try again later.`
    });
  }
  
  record.count++;
  next();
};

// Call frequency limiting function (for direct calls)
const checkCallFrequency = (accountId) => {
  const key = `call_frequency:${accountId}`;
  const maxCallsPerHour = 10; // Adjust based on your needs
  const window = 60 * 60 * 1000; // 1 hour

  // Use in-memory store
  const now = Date.now();
  const record = memoryStore.get(key);
  
  if (!record || (now - record.timestamp) > window) {
    memoryStore.set(key, { count: 1, timestamp: now });
    return { allowed: true, message: 'Call allowed' };
  }
  
  if (record.count >= maxCallsPerHour) {
    return { 
      allowed: false, 
      message: `Maximum ${maxCallsPerHour} calls per hour exceeded. Please try again later.`,
      retryAfter: Math.ceil((window - (now - record.timestamp)) / 1000)
    };
  }
  
  record.count++;
  return { allowed: true, message: 'Call allowed' };
};

// Daily and monthly call limits per API key
const callLimitChecker = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const dailyKey = `daily_calls:${apiKey}`;
  const monthlyKey = `monthly_calls:${apiKey}`;
  
  const dailyLimit = parseInt(process.env.MAX_CALLS_PER_DAY) || 100;
  const monthlyLimit = parseInt(process.env.MAX_CALLS_PER_MONTH) || 1000;

  // Use in-memory store
  const now = Date.now();
  const dailyRecord = memoryStore.get(dailyKey);
  const monthlyRecord = memoryStore.get(monthlyKey);
  
  // Check daily limit
  if (dailyRecord && dailyRecord.count >= dailyLimit) {
    return res.status(429).json({
      error: 'Daily call limit exceeded',
      message: `Maximum ${dailyLimit} calls per day exceeded. Please try again tomorrow.`
    });
  }
  
  // Check monthly limit
  if (monthlyRecord && monthlyRecord.count >= monthlyLimit) {
    return res.status(429).json({
      error: 'Monthly call limit exceeded',
      message: `Maximum ${monthlyLimit} calls per month exceeded. Please try again next month.`
    });
  }
  
  // Increment counters
  if (!dailyRecord || (now - dailyRecord.timestamp) > 24 * 60 * 60 * 1000) {
    memoryStore.set(dailyKey, { count: 1, timestamp: now });
  } else {
    dailyRecord.count++;
  }
  
  if (!monthlyRecord || (now - monthlyRecord.timestamp) > 31 * 24 * 60 * 60 * 1000) {
    memoryStore.set(monthlyKey, { count: 1, timestamp: now });
  } else {
    monthlyRecord.count++;
  }
  
  next();
};

// ===== INPUT VALIDATION =====

// Validate phone number format
const validatePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) {
    return { valid: false, message: 'Phone number is required' };
  }

  // Basic phone number validation (you can enhance this)
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return { valid: false, message: 'Invalid phone number format. Use international format (e.g., +1234567890)' };
  }

  // Format the phone number
  let formatted = phoneNumber;
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }

  return { 
    valid: true, 
    formatted: formatted,
    original: phoneNumber
  };
};

// Validate email format
const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
};

// ===== ADMIN API KEY CHECK =====

// Check if API key has admin privileges
const isAdminApiKey = (apiKey) => {
  const adminKeys = process.env.ADMIN_API_KEYS ? 
    process.env.ADMIN_API_KEYS.split(',') : 
    [];
  
  return adminKeys.includes(apiKey);
};

// ===== SECURITY MIDDLEWARE =====

// Request size limiting
const requestSizeLimiter = (req, res, next) => {
  const maxSize = 1024 * 1024; // 1MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds maximum allowed size of 1MB'
    });
  }
  
  next();
};

// ===== EXPORTS =====

module.exports = {
  validateApiKey,
  validateApiKeyMiddleware,
  isValidApiKey,
  getApiKeyInfo,
  isApiKeyRateLimited,
  callFrequencyLimiter,
  checkCallFrequency,
  callLimitChecker,
  validatePhoneNumber,
  validateEmail,
  isAdminApiKey,
  requestSizeLimiter
}; 