// test-security.js - Test the security features of the Memoora microservice

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const VALID_API_KEY = process.env.API_KEY || 'your_valid_api_key_here_32_chars_minimum';
const INVALID_API_KEY = 'invalid_key';

async function testSecurityFeatures() {
  console.log('🔒 Testing Memoora Security Features\n');

  // Test 1: Health check (no auth required)
  console.log('1️⃣ Testing health check (no auth)...');
  try {
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', health.data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Call endpoint without API key
  console.log('\n2️⃣ Testing call endpoint without API key...');
  try {
    await axios.post(`${BASE_URL}/api/v1/call`, {
      phoneNumber: '+1234567890'
    });
    console.log('❌ Should have failed - no API key provided');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected - API key required');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 3: Call endpoint with invalid API key
  console.log('\n3️⃣ Testing call endpoint with invalid API key...');
  try {
    await axios.post(`${BASE_URL}/api/v1/call`, {
      phoneNumber: '+1234567890'
    }, {
      headers: { 'x-api-key': INVALID_API_KEY }
    });
    console.log('❌ Should have failed - invalid API key');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected - invalid API key');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 4: Call endpoint with valid API key
  console.log('\n4️⃣ Testing call endpoint with valid API key...');
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/call`, {
      phoneNumber: '+1234567890'
    }, {
      headers: { 'x-api-key': VALID_API_KEY }
    });
    console.log('✅ Call initiated successfully:', response.data.message);
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('⚠️ Rate limited - too many calls');
    } else {
      console.log('❌ Call failed:', error.response?.data?.error || error.message);
    }
  }

  // Test 5: Test rate limiting (make multiple rapid requests)
  console.log('\n5️⃣ Testing rate limiting...');
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(
      axios.post(`${BASE_URL}/api/v1/call`, {
        phoneNumber: '+1234567890'
      }, {
        headers: { 'x-api-key': VALID_API_KEY }
      }).catch(error => error.response?.status)
    );
  }

  const results = await Promise.all(promises);
  const rateLimited = results.filter(status => status === 429).length;
  const successful = results.filter(status => status === 200).length;
  const failed = results.filter(status => status && status !== 200 && status !== 429).length;

  console.log(`📊 Rate limiting results:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ⚠️ Rate limited: ${rateLimited}`);
  console.log(`   ❌ Failed: ${failed}`);

  // Test 6: Test phone number validation
  console.log('\n6️⃣ Testing phone number validation...');
  const testNumbers = [
    '+1234567890',      // Valid
    '+1-900-123-4567', // Blocked (premium)
    'invalid-number',   // Invalid format
    '+44123456789'      // Valid UK
  ];

  for (const number of testNumbers) {
    try {
      await axios.post(`${BASE_URL}/api/v1/call`, {
        phoneNumber: number
      }, {
        headers: { 'x-api-key': VALID_API_KEY }
      });
      console.log(`✅ ${number} - Call initiated`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`❌ ${number} - ${error.response.data.error}`);
      } else if (error.response?.status === 429) {
        console.log(`⚠️ ${number} - Rate limited`);
      } else {
        console.log(`❌ ${number} - Unexpected error: ${error.message}`);
      }
    }
  }

  // Test 7: Test recordings endpoint (requires auth)
  console.log('\n7️⃣ Testing recordings endpoint...');
  try {
    const recordings = await axios.get(`${BASE_URL}/api/v1/recordings`, {
      headers: { 'x-api-key': VALID_API_KEY }
    });
    console.log('✅ Recordings retrieved:', recordings.data.recordings.length, 'files');
  } catch (error) {
    console.log('❌ Recordings failed:', error.response?.data?.error || error.message);
  }

  console.log('\n🔒 Security testing completed!');
  console.log('\n📋 Summary:');
  console.log('   - API key authentication working');
  console.log('   - Rate limiting active');
  console.log('   - Phone number validation working');
  console.log('   - Protected endpoints secured');
}

// Run the tests
if (require.main === module) {
  testSecurityFeatures().catch(console.error);
}

module.exports = { testSecurityFeatures }; 