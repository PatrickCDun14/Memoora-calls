class SimpleApiKeyService {
  constructor() {
    // In-memory storage using Map for fast lookups
    this.apiKeys = new Map();
    this.keyUsage = new Map();
    
    console.log('🔑 Simple API Key Service initialized (in-memory storage)');
  }

  // Generate a new API key
  generateApiKey() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `mk_${timestamp}_${random}`;
  }

  // Generate a unique key ID
  generateKeyId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `key_${timestamp}_${random}`;
  }

  // Create and store a new API key
  createApiKey(clientData) {
    const { clientName, email, companyWebsite, phoneNumber, description } = clientData;
    
    // Generate unique key and ID
    const apiKey = this.generateApiKey();
    const keyId = this.generateKeyId();
    
    // Create key record
    const keyRecord = {
      id: keyId,
      key: apiKey,
      clientName,
      email,
      companyWebsite,
      phoneNumber,
      description: description || '',
      createdAt: new Date().toISOString(),
      isActive: true,
      permissions: ['call', 'recordings', 'read'],
      lastUsed: null,
      requestCount: 0,
      limits: {
        maxCallsPerDay: 20,
        maxCallsPerMonth: 100,
        maxCallsPerHour: 5
      }
    };
    
    // Store in memory
    this.apiKeys.set(apiKey, keyRecord);
    this.keyUsage.set(apiKey, {
      dailyCalls: 0,
      monthlyCalls: 0,
      hourlyCalls: 0,
      lastReset: {
        daily: new Date().toDateString(),
        monthly: new Date().getMonth(),
        hourly: new Date().getHours()
      }
    });
    
    console.log(`🔑 New API key created: ${keyId} for ${clientName}`);
    
    return {
      apiKey,
      keyId,
      ...keyRecord
    };
  }

  // Validate an API key
  validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return { valid: false, message: 'Invalid API key format' };
    }
    
    const keyRecord = this.apiKeys.get(apiKey);
    if (!keyRecord) {
      return { valid: false, message: 'API key not found' };
    }
    
    if (!keyRecord.isActive) {
      return { valid: false, message: 'API key is inactive' };
    }
    
    // Update last used timestamp
    keyRecord.lastUsed = new Date().toISOString();
    
    return { 
      valid: true, 
      message: 'API key valid',
      keyRecord 
    };
  }

  // Check rate limits for an API key
  checkRateLimits(apiKey) {
    const usage = this.keyUsage.get(apiKey);
    if (!usage) {
      return { allowed: false, message: 'API key not found' };
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toDateString();
    const currentMonth = now.getMonth();
    
    // Reset counters if needed
    if (usage.lastReset.hourly !== currentHour) {
      usage.hourlyCalls = 0;
      usage.lastReset.hourly = currentHour;
    }
    
    if (usage.lastReset.daily !== currentDay) {
      usage.dailyCalls = 0;
      usage.lastReset.daily = currentDay;
    }
    
    if (usage.lastReset.monthly !== currentMonth) {
      usage.monthlyCalls = 0;
      usage.lastReset.monthly = currentMonth;
    }
    
    // Check limits
    const keyRecord = this.apiKeys.get(apiKey);
    if (!keyRecord) {
      return { allowed: false, message: 'API key not found' };
    }
    
    if (usage.hourlyCalls >= keyRecord.limits.maxCallsPerHour) {
      return { 
        allowed: false, 
        message: 'Hourly rate limit exceeded',
        retryAfter: '1 hour'
      };
    }
    
    if (usage.dailyCalls >= keyRecord.limits.maxCallsPerDay) {
      return { 
        allowed: false, 
        message: 'Daily rate limit exceeded',
        retryAfter: '24 hours'
      };
    }
    
    if (usage.monthlyCalls >= keyRecord.limits.maxCallsPerMonth) {
      return { 
        allowed: false, 
        message: 'Monthly rate limit exceeded',
        retryAfter: 'Next month'
      };
    }
    
    return { allowed: true, message: 'Rate limits OK' };
  }

  // Increment usage for an API key
  incrementUsage(apiKey, endpoint = 'general') {
    const usage = this.keyUsage.get(apiKey);
    if (!usage) return;
    
    usage.hourlyCalls++;
    usage.dailyCalls++;
    usage.monthlyCalls++;
    
    // Also increment the key record's request count
    const keyRecord = this.apiKeys.get(apiKey);
    if (keyRecord) {
      keyRecord.requestCount++;
    }
    
    console.log(`📊 API key usage incremented: ${apiKey.substring(0, 8)}... (${endpoint})`);
  }

  // Get all API keys (for admin purposes)
  getAllApiKeys() {
    return Array.from(this.apiKeys.values()).map(key => ({
      id: key.id,
      clientName: key.clientName,
      email: key.email,
      createdAt: key.createdAt,
      isActive: key.isActive,
      lastUsed: key.lastUsed,
      requestCount: key.requestCount
    }));
  }

  // Revoke an API key
  revokeApiKey(apiKey) {
    const keyRecord = this.apiKeys.get(apiKey);
    if (!keyRecord) {
      return { success: false, message: 'API key not found' };
    }
    
    keyRecord.isActive = false;
    this.apiKeys.set(apiKey, keyRecord);
    
    console.log(`🗑️ API key revoked: ${keyRecord.id}`);
    
    return { success: true, message: 'API key revoked successfully' };
  }

  // Get service stats
  getStats() {
    const totalKeys = this.apiKeys.size;
    const activeKeys = Array.from(this.apiKeys.values()).filter(k => k.isActive).length;
    const totalRequests = Array.from(this.apiKeys.values()).reduce((sum, k) => sum + k.requestCount, 0);
    
    return {
      totalKeys,
      activeKeys,
      totalRequests,
      storageType: 'in-memory',
      uptime: process.uptime()
    };
  }
}

module.exports = SimpleApiKeyService;
