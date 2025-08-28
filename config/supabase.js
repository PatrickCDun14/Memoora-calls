// config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./environment');

// ===== SUPABASE CLIENT CONFIGURATION =====
// 
// This file creates and configures the Supabase client using standardized
// environment variables from config/environment.js
//
// Usage:
// - For database reads (API key validation): Use anon client
// - For database writes (creating calls): Use service role client
// - For admin operations: Use service role client

// Validate Supabase configuration
if (!config.database.supabase.url || !config.database.supabase.anonKey || !config.database.supabase.serviceRoleKey) {
  console.error('❌ CRITICAL: Supabase configuration incomplete');
  console.error('   Required: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase clients
const supabaseUrl = config.database.supabase.url;
const supabaseAnonKey = config.database.supabase.anonKey;
const supabaseServiceKey = config.database.supabase.serviceRoleKey;

// Anon client (for public reads, API key validation)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Service role client (for admin writes, creating calls)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

// Test database connection
const testConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test anon client (reads)
    const { data: anonTest, error: anonError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1);
    
    if (anonError) {
      console.error('❌ Anon client connection failed:', anonError.message);
      return false;
    }
    
    // Test service role client (writes)
    const { data: adminTest, error: adminError } = await supabaseAdmin
      .from('api_keys')
      .select('count')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Service role client connection failed:', adminError.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    console.log('   Anon client: Ready for reads');
    console.log('   Service role client: Ready for writes');
    return true;
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
};

// Export configured clients
module.exports = {
  // Public client (for reads, API key validation)
  supabase,
  
  // Admin client (for writes, creating calls)
  supabaseAdmin,
  
  // Connection test function
  testConnection,
  
  // Configuration info
  config: {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey
  }
};
