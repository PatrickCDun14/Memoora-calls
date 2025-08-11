// utils/security.js

const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// Redis client for distributed rate limiting (optional)
let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

// In-memory store for rate limiting (fallback)
const memoryStore = new Map();

// Rate limiting configuration
const createRateLimiter = (windowMs, max, keyGenerator) => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// API key validation with enhanced security
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'Please provide an API key in the x-api-key header'
    });
  }

  // Check if API key exists and is valid
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  // Check if API key is rate limited
  if (isApiKeyRateLimited(apiKey)) {
    return res.status(429).json({
      error: 'API key rate limited',
      message: 'This API key has exceeded its rate limit'
    });
  }

  // Add API key info to request for logging
  req.apiKey = apiKey;
  req.apiKeyInfo = getApiKeyInfo(apiKey);
  
  next();
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

// Rate limiting per API key
const isApiKeyRateLimited = (apiKey) => {
  const key = `rate_limit:${apiKey}`;
  const limit = 100; // requests per hour
  const window = 60 * 60 * 1000; // 1 hour

  if (redis) {
    // Use Redis for distributed rate limiting
    return redis.get(key).then(count => {
      if (count && parseInt(count) >= limit) {
        return true;
      }
      redis.incr(key);
      redis.expire(key, window / 1000);
      return false;
    }).catch(() => false);
  } else {
    // Fallback to in-memory
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
  }
};

// Call frequency limiting (prevent spam calls)
const callFrequencyLimiter = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const key = `call_frequency:${apiKey}`;
  const maxCallsPerHour = 10; // Adjust based on your needs
  const window = 60 * 60 * 1000; // 1 hour

  if (redis) {
    redis.get(key).then(count => {
      if (count && parseInt(count) >= maxCallsPerHour) {
        return res.status(429).json({
          error: 'Call frequency limit exceeded',
          message: `Maximum ${maxCallsPerHour} calls per hour exceeded. Please try again later.`
        });
      }
      redis.incr(key);
      redis.expire(key, window / 1000);
      next();
    }).catch(() => next());
  } else {
    // Fallback to in-memory
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
  }
};

// Phone number validation and blocking
const validatePhoneNumber = (phoneNumber) => {
  // Basic phone number format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return { valid: false, error: 'Invalid phone number format' };
  }

  // Check against blocked numbers (you can extend this)
  const blockedNumbers = process.env.BLOCKED_NUMBERS ? 
    process.env.BLOCKED_NUMBERS.split(',') : [];
  
  if (blockedNumbers.includes(phoneNumber)) {
    return { valid: false, error: 'Phone number is blocked' };
  }

  return { valid: true };
};

// Request size limiting
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 1024 * 1024; // 1MB
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      error: 'Request too large',
      message: 'Request body exceeds maximum allowed size'
    });
  }
  
  next();
};

// Logging middleware for security events
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      apiKey: req.apiKeyInfo ? req.apiKeyInfo.key : 'anonymous'
    };

    // Log security events
    if (res.statusCode === 401 || res.statusCode === 429) {
      console.warn('🚨 Security Event:', logData);
    } else {
      console.log('📊 Request Log:', logData);
    }
  });
  
  next();
};

module.exports = {
  validateApiKey,
  callFrequencyLimiter,
  validatePhoneNumber,
  requestSizeLimiter,
  securityLogger,
  createRateLimiter
}; 