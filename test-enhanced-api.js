#!/usr/bin/env node

/**
 * Test Enhanced Memoora Call API
 * Tests the new enhanced payload with all additional fields
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5005';
const API_KEY = 'mk_2bb23d40d9cf9605ebbde5aef79e7312344bce864ccaa6e5cf7d15ce09005480';

// Test phone number (replace with your test number)
const TEST_PHONE = '+13128484329';

// Test data for enhanced API
const enhancedCallData = {
  phoneNumber: TEST_PHONE,
  customMessage: "Tell me about your favorite childhood memory",
  storytellerId: "c8d86af6-78b0-4184-b3eb-a92-523b6aea9e4f",
  familyMemberId: "d307c26e-c2e0-4695-9943-6046deddd31c",
  scheduledCallId: "c1b11800-7146-4205-b3eb-a997d157edab",
  callType: "storytelling",
  interactive: true
};

// Test data for basic API (backward compatibility)
const basicCallData = {
  phoneNumber: TEST_PHONE,
  customMessage: "Test basic call - backward compatibility"
};

async function testHealthEndpoint() {
  console.log('🏥 Testing Health Endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data.status);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testBasicCall() {
  console.log('\n📞 Testing Basic Call (Backward Compatibility)...');
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/call`, basicCallData, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ Basic call successful:');
    console.log('   - Status:', response.status);
    console.log('   - Call ID:', response.data.callId);
    console.log('   - Twilio SID:', response.data.twilioSid);
    console.log('   - Message:', response.data.message);
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Basic call timed out (15s)');
    } else {
      console.error('❌ Basic call failed:', error.response?.data || error.message);
    }
    return null;
  }
}

async function testEnhancedCall() {
  console.log('\n🚀 Testing Enhanced Call (New Features)...');
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/call`, enhancedCallData, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    console.log('✅ Enhanced call successful:');
    console.log('   - Status:', response.status);
    console.log('   - Call ID:', response.data.callId);
    console.log('   - Twilio SID:', response.data.twilioSid);
    console.log('   - Message:', response.data.message);
    
    // Check enhanced metadata
    if (response.data.metadata) {
      console.log('   - Enhanced Metadata:');
      console.log('     * Storyteller ID:', response.data.metadata.storytellerId);
      console.log('     * Family Member ID:', response.data.metadata.familyMemberId);
      console.log('     * Scheduled Call ID:', response.data.metadata.scheduledCallId);
      console.log('     * Call Type:', response.data.metadata.callType);
      console.log('     * Interactive:', response.data.metadata.interactive);
      console.log('     * Question:', response.data.metadata.question);
    }
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ Enhanced call timed out (15s)');
    } else {
      console.error('❌ Enhanced call failed:', error.response?.data || error.message);
    }
    return null;
  }
}

async function testInvalidPayload() {
  console.log('\n🚫 Testing Invalid Payload Validation...');
  
  const invalidData = {
    // Missing required phoneNumber
    customMessage: "This should fail"
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/call`, invalidData, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('❌ Invalid payload should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid payload correctly rejected with 400 status');
      console.log('   - Error:', error.response.data.error);
      return true;
    } else {
      console.error('❌ Unexpected error for invalid payload:', error.message);
      return false;
    }
  }
}

async function testInvalidApiKey() {
  console.log('\n🔑 Testing Invalid API Key...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/v1/call`, basicCallData, {
      headers: {
        'x-api-key': 'invalid-api-key',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('❌ Invalid API key should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Invalid API key correctly rejected with 401 status');
      return true;
    } else {
      console.error('❌ Unexpected error for invalid API key:', error.message);
      return false;
    }
  }
}

async function runAllTests() {
  console.log('🧪 Memoora Enhanced API Test Suite');
  console.log('=====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Key: ${API_KEY.substring(0, 20)}...`);
  console.log(`Test Phone: ${TEST_PHONE}`);
  console.log('=====================================\n');
  
  const results = {
    health: false,
    basicCall: false,
    enhancedCall: false,
    invalidPayload: false,
    invalidApiKey: false
  };
  
  // Run tests
  results.health = await testHealthEndpoint();
  
  if (results.health) {
    results.basicCall = await testBasicCall();
    results.enhancedCall = await testEnhancedCall();
    results.invalidPayload = await testInvalidPayload();
    results.invalidApiKey = await testInvalidApiKey();
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`🏥 Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`📞 Basic Call: ${results.basicCall ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🚀 Enhanced Call: ${results.enhancedCall ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🚫 Invalid Payload: ${results.invalidPayload ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🔑 Invalid API Key: ${results.invalidApiKey ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Enhanced API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
  }
  
  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✨ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testHealthEndpoint,
  testBasicCall,
  testEnhancedCall,
  testInvalidPayload,
  testInvalidApiKey
};
