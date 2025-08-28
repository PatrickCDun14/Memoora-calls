// utils/api-key-service.js
const crypto = require('crypto');
const { supabase, supabaseAdmin, testConnection } = require('../config/supabase');

class ApiKeyService {
  constructor() {
    this.keys = new Map(); // In-memory cache for performance
    this.keyPrefix = 'mk_';
    this.keyLength = 32;
    
    // Test database connection on initialization
    this.initializeConnection();
  }

  // ===== INITIALIZATION =====
  
  async initializeConnection() {
    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        console.error('❌ Failed to initialize database connection');
        throw new Error('Database connection failed');
      }
      console.log('✅ API Key Service initialized successfully');
    } catch (error) {
      console.error('❌ API Key Service initialization failed:', error.message);
      throw error;
    }
  }

  // ===== API KEY GENERATION =====
  
  generateApiKey() {
    const randomBytes = crypto.randomBytes(this.keyLength);
    return this.keyPrefix + randomBytes.toString('hex');
  }

  // Complete API key generation with storage
  async createApiKey(keyData) {
    try {
      const { clientName, email, companyWebsite, phoneNumber, description } = keyData;
      
      // Generate the API key
      const apiKey = this.generateApiKey();
      const keyId = this.generateKeyId();
      
      // Create account ID from email (simple hash)
      const accountId = 'acc_' + crypto.createHash('md5').update(email).digest('hex').substring(0, 8);
      
      // Store the API key
      const storeResult = await this.storeApiKey({
        key: apiKey,
        accountId: accountId,
        keyName: clientName || 'Default API Key',
        permissions: ['call', 'recordings', 'read'],
        limits: {
          maxCallsPerDay: 50,
          maxCallsPerMonth: 1000,
          maxCallsPerHour: 10
        }
      });
      
      if (!storeResult.success) {
        throw new Error('Failed to store API key');
      }
      
      return {
        apiKey: apiKey,
        keyId: keyId,
        clientName: clientName,
        email: email,
        companyWebsite: companyWebsite,
        phoneNumber: phoneNumber,
        description: description,
        accountId: accountId,
        permissions: storeResult.data.permissions,
        maxCallsPerDay: storeResult.data.limits.maxCallsPerDay,
        maxCallsPerMonth: storeResult.data.limits.maxCallsPerMonth,
        createdAt: storeResult.data.createdAt
      };
      
    } catch (error) {
      console.error('❌ Error creating API key:', error);
      throw error;
    }
  }

  generateKeyId() {
    const randomBytes = crypto.randomBytes(8);
    return 'key_' + randomBytes.toString('hex');
  }

  // ===== API KEY STORAGE =====
  
  async storeApiKey(keyData) {
    try {
      const { key, accountId, keyName, permissions, limits } = keyData;
      
      // Hash the key for secure storage
      const keyHash = this.hashApiKey(key);
      
      console.log('🔑 Storing API key:', {
        key: key.substring(0, 8) + '...',
        keyHash: keyHash.substring(0, 8) + '...',
        accountId,
        keyName
      });
      
      // Create key record
      const keyRecord = {
        id: this.generateKeyId(),
        keyHash,
        key: key, // Store original key temporarily (in production, never store plain text)
        accountId,
        keyName: keyName || 'Default API Key',
        permissions: permissions || ['call', 'recordings', 'read'],
        limits: {
          maxCallsPerDay: limits?.maxCallsPerDay || 50,
          maxCallsPerMonth: limits?.maxCallsPerMonth || 1000,
          maxCallsPerHour: limits?.maxCallsPerHour || 10
        },
        createdAt: new Date().toISOString(),
        lastUsed: null,
        isActive: true,
        usage: {
          callsToday: 0,
          callsThisMonth: 0,
          callsThisHour: 0
        }
      };

      // Store in Supabase database
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .insert({
            key_hash: keyRecord.keyHash,
            account_id: keyRecord.accountId || null,
            key_name: keyRecord.keyName,
            permissions: keyRecord.permissions,
            max_calls_per_day: keyRecord.limits.maxCallsPerDay,
            max_calls_per_month: keyRecord.limits.maxCallsPerMonth,
            is_active: keyRecord.isActive
          })
          .select();

        if (error) {
          console.error('❌ Database insert error:', error);
          throw new Error(`Database error: ${error.message}`);
        }

        console.log('✅ API key stored in Supabase database');
        
        // Also store in memory cache for performance
        this.keys.set(keyHash, keyRecord);
        
        return {
          success: true,
          data: {
            id: data[0].id,
            key: keyRecord.key,
            accountId: keyRecord.accountId,
            permissions: keyRecord.permissions,
            limits: keyRecord.limits,
            createdAt: keyRecord.createdAt
          }
        };
        
      } catch (dbError) {
        console.error('❌ Database storage failed:', dbError);
        // Fallback to memory-only storage for development
        this.keys.set(keyHash, keyRecord);
        console.log('⚠️  API key stored in memory only (database failed)');
        
        return {
          success: true,
          data: {
            id: keyRecord.id,
            key: keyRecord.key,
            accountId: keyRecord.accountId,
            permissions: keyRecord.permissions,
            limits: keyRecord.limits,
            createdAt: keyRecord.createdAt
          }
        };
      }
      
    } catch (error) {
      console.error('❌ Error storing API key:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===== API KEY VALIDATION =====
  
  async validateApiKey(apiKey) {
    try {
      if (!apiKey || typeof apiKey !== 'string') {
        return { valid: false, error: 'Invalid API key format' };
      }

      // Hash the provided key
      const keyHash = this.hashApiKey(apiKey);
      
      console.log('🔍 Validating API key:', {
        providedKey: apiKey.substring(0, 8) + '...',
        keyHash: keyHash.substring(0, 8) + '...',
        totalStoredKeys: this.keys.size
      });
      
      // Check memory cache first (for performance)
      let keyRecord = this.keys.get(keyHash);
      
      if (!keyRecord) {
        console.log('❌ API key not found in memory cache, checking database...');
        
        // Check database if not in cache
        try {
          const { data, error } = await supabase
            .from('api_keys')
            .select('*')
            .eq('key_hash', keyHash)
            .eq('is_active', true)
            .single();

          if (error || !data) {
            console.log('❌ API key not found in database');
            return { valid: false, error: 'API key not found' };
          }

          // Found in database, create key record
          keyRecord = {
            id: data.id,
            keyHash: data.key_hash,
            accountId: data.account_id,
            keyName: data.key_name,
            permissions: data.permissions || [],
            limits: {
              maxCallsPerDay: data.max_calls_per_day || 50,
              maxCallsPerMonth: data.max_calls_per_month || 1000,
              maxCallsPerHour: 10
            },
            isActive: data.is_active,
            lastUsed: data.last_used,
            usage: {
              callsToday: 0,
              callsThisMonth: 0,
              callsThisHour: 0
            }
          };

          // Cache it for future use
          this.keys.set(keyHash, keyRecord);
          console.log('✅ API key loaded from database and cached');
          
        } catch (dbError) {
          console.error('❌ Database lookup failed:', dbError);
          return { valid: false, error: 'API key validation failed' };
        }
      }

      // Check if key is active
      if (!keyRecord.isActive) {
        return { valid: false, error: 'API key is inactive' };
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimits(keyRecord);
      if (!rateLimitCheck.allowed) {
        return { 
          valid: false, 
          error: 'Rate limit exceeded',
          details: rateLimitCheck.details
        };
      }

      // Update last used timestamp
      keyRecord.lastUsed = new Date().toISOString();
      
      // Update database
      try {
        await supabase
          .from('api_keys')
          .update({ last_used: keyRecord.lastUsed })
          .eq('key_hash', keyHash);
      } catch (updateError) {
        console.log('⚠️  Could not update last_used timestamp:', updateError.message);
      }

      return {
        valid: true,
        data: {
          id: keyRecord.id,
          accountId: keyRecord.accountId,
          permissions: keyRecord.permissions,
          limits: keyRecord.limits
        }
      };
      
    } catch (error) {
      console.error('❌ Error validating API key:', error);
      return { valid: false, error: 'Validation error' };
    }
  }

  // ===== RATE LIMITING =====
  
  async checkRateLimits(keyRecord) {
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentMonth = now.toISOString().substring(0, 7);
      const currentHour = now.getHours();
      
      // Reset counters if needed
      if (keyRecord.usage.lastReset !== today) {
        keyRecord.usage.callsToday = 0;
        keyRecord.usage.callsThisMonth = 0;
        keyRecord.usage.lastReset = today;
      }
      
      if (keyRecord.usage.lastMonthReset !== currentMonth) {
        keyRecord.usage.callsThisMonth = 0;
        keyRecord.usage.lastMonthReset = currentMonth;
      }
      
      if (keyRecord.usage.lastHourReset !== currentHour) {
        keyRecord.usage.callsThisHour = 0;
        keyRecord.usage.lastHourReset = currentHour;
      }

      // Check limits
      const dailyExceeded = keyRecord.usage.callsToday >= keyRecord.limits.maxCallsPerDay;
      const monthlyExceeded = keyRecord.usage.callsThisMonth >= keyRecord.limits.maxCallsPerMonth;
      const hourlyExceeded = keyRecord.usage.callsThisHour >= keyRecord.limits.maxCallsPerHour;

      if (dailyExceeded || monthlyExceeded || hourlyExceeded) {
        return {
          allowed: false,
          details: {
            daily: { current: keyRecord.usage.callsToday, limit: keyRecord.limits.maxCallsPerDay, exceeded: dailyExceeded },
            monthly: { current: keyRecord.usage.callsThisMonth, limit: keyRecord.limits.maxCallsPerMonth, exceeded: monthlyExceeded },
            hourly: { current: keyRecord.usage.callsThisHour, limit: keyRecord.limits.maxCallsPerHour, exceeded: hourlyExceeded }
          }
        };
      }

      return { allowed: true };
      
    } catch (error) {
      console.error('❌ Error checking rate limits:', error);
      return { allowed: true }; // Fail open for safety
    }
  }

  // ===== USAGE TRACKING =====
  
  async incrementUsage(apiKey, usageType = 'call') {
    try {
      const keyHash = this.hashApiKey(apiKey);
      const keyRecord = this.keys.get(keyHash);
      
      if (!keyRecord) {
        return { success: false, error: 'API key not found' };
      }

      // Increment usage counters
      if (usageType === 'call') {
        keyRecord.usage.callsToday++;
        keyRecord.usage.callsThisMonth++;
        keyRecord.usage.callsThisHour++;
      }

      // TODO: Update database
      // await this.updateUsage(keyRecord.id, keyRecord.usage);

      return { success: true };
      
    } catch (error) {
      console.error('❌ Error incrementing usage:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== UTILITY FUNCTIONS =====
  
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  // ===== DATABASE INTEGRATION (TODO) =====
  
  async storeInDatabase(keyRecord) {
    // TODO: Implement Supabase/PostgreSQL storage
    // This will replace the in-memory Map with persistent storage
    console.log('📝 TODO: Store API key in database:', keyRecord.id);
  }

  async getFromDatabase(keyHash) {
    // TODO: Implement database retrieval
    console.log('📝 TODO: Retrieve API key from database');
    return null;
  }

  async updateLastUsed(keyId, lastUsed) {
    // TODO: Implement database update
    console.log('📝 TODO: Update last used timestamp in database');
  }

  async updateUsage(keyId, usage) {
    // TODO: Implement usage update in database
    console.log('📝 TODO: Update usage counters in database');
  }

  // ===== CLEANUP =====
  
  async revokeApiKey(apiKey) {
    try {
      const keyHash = this.hashApiKey(apiKey);
      const keyRecord = this.keys.get(keyHash);
      
      if (keyRecord) {
        keyRecord.isActive = false;
        // TODO: Update database
        return { success: true };
      }
      
      return { success: false, error: 'API key not found' };
      
    } catch (error) {
      console.error('❌ Error revoking API key:', error);
      return { success: false, error: error.message };
    }
  }

  // ===== STATISTICS =====
  
  async getApiKeyStats(accountId) {
    try {
      const stats = {
        totalKeys: 0,
        activeKeys: 0,
        totalCalls: 0,
        averageCallsPerKey: 0
      };

      // Count keys for this account
      for (const [hash, keyRecord] of this.keys) {
        if (keyRecord.accountId === accountId) {
          stats.totalKeys++;
          if (keyRecord.isActive) stats.activeKeys++;
          stats.totalCalls += keyRecord.usage.callsThisMonth;
        }
      }

      if (stats.totalKeys > 0) {
        stats.averageCallsPerKey = Math.round(stats.totalCalls / stats.totalKeys);
      }

      return { success: true, data: stats };
      
    } catch (error) {
      console.error('❌ Error getting API key stats:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new ApiKeyService();
