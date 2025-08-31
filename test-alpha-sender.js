#!/usr/bin/env node

/**
 * 🧪 Alpha Sender ID Test Script
 * 
 * This script tests the alpha sender ID functionality by:
 * 1. Testing the Twilio service configuration
 * 2. Making a test call with alpha sender ID
 * 3. Verifying fallback behavior
 */

require('dotenv').config();
const SimpleTwilioService = require('./utils/simple-twilio-service');

async function testAlphaSenderID() {
  console.log('🧪 Testing Alpha Sender ID Configuration');
  console.log('==========================================\n');

  // Initialize Twilio service
  const twilioService = new SimpleTwilioService();
  
  // Test 1: Configuration validation
  console.log('📋 Test 1: Configuration Validation');
  console.log('-----------------------------------');
  
  const config = twilioService.validateConfiguration();
  console.log('Configuration validation result:', config);
  
  if (!config.isValid) {
    console.error('❌ Configuration validation failed:', config.errors);
    return false;
  }
  
  console.log('✅ Configuration validation passed\n');

  // Test 2: Service readiness
  console.log('📋 Test 2: Service Readiness');
  console.log('-----------------------------');
  
  const isReady = twilioService.isReady();
  console.log('Service ready:', isReady);
  
  if (!isReady) {
    console.error('❌ Twilio service not ready');
    return false;
  }
  
  console.log('✅ Twilio service is ready\n');

  // Test 3: Alpha sender ID configuration
  console.log('📋 Test 3: Alpha Sender ID Configuration');
  console.log('----------------------------------------');
  
  console.log('Alpha sender enabled:', twilioService.useAlphaSender);
  console.log('Alpha sender ID:', twilioService.alphaSenderId);
  console.log('Fallback number:', twilioService.fallbackNumber);
  console.log('Primary phone number:', twilioService.phoneNumber);
  
  console.log('✅ Alpha sender ID configuration loaded\n');

  // Test 4: Test call with alpha sender ID (if enabled)
  if (twilioService.useAlphaSender) {
    console.log('📋 Test 4: Alpha Sender ID Call Test');
    console.log('------------------------------------');
    
    const testPhoneNumber = process.env.TEST_PHONE_NUMBER;
    if (!testPhoneNumber) {
      console.log('⚠️  TEST_PHONE_NUMBER not set, skipping actual call test');
      console.log('💡 Set TEST_PHONE_NUMBER environment variable to test actual calls');
    } else {
      console.log(`📞 Testing call to: ${testPhoneNumber}`);
      
      try {
        const callResult = await twilioService.makeCall({
          phoneNumber: testPhoneNumber,
          customMessage: 'Hello from Memoora! This is a test call to verify alpha sender ID functionality.',
          callId: 'test-alpha-sender-' + Date.now(),
          webhookUrl: `${process.env.BASE_URL || 'http://localhost:5005'}/api/v1/voice`
        });
        
        console.log('✅ Test call successful!');
        console.log('Call result:', {
          twilioSid: callResult.twilioSid,
          status: callResult.status,
          callerId: callResult.callerId,
          callerIdType: callResult.callerIdType,
          fallbackUsed: callResult.fallbackUsed || false
        });
        
        if (callResult.fallbackUsed) {
          console.log('⚠️  Fallback was used:', callResult.fallbackReason);
        } else {
          console.log('🎉 Alpha sender ID worked successfully!');
        }
        
      } catch (error) {
        console.error('❌ Test call failed:', error.message);
        return false;
      }
    }
  } else {
    console.log('📋 Test 4: Alpha Sender ID Disabled');
    console.log('-----------------------------------');
    console.log('ℹ️  Alpha sender ID is disabled. Set USE_ALPHA_SENDER_ID=true to enable');
  }

  console.log('\n🎉 Alpha Sender ID Test Complete!');
  return true;
}

// Test fallback functionality
async function testFallbackFunctionality() {
  console.log('\n🧪 Testing Fallback Functionality');
  console.log('==================================\n');

  // Temporarily enable alpha sender ID for testing
  process.env.USE_ALPHA_SENDER_ID = 'true';
  process.env.ALPHA_SENDER_ID = 'InvalidSenderID'; // This should cause fallback
  
  const twilioService = new SimpleTwilioService();
  
  const testPhoneNumber = process.env.TEST_PHONE_NUMBER;
  if (!testPhoneNumber) {
    console.log('⚠️  TEST_PHONE_NUMBER not set, skipping fallback test');
    return true;
  }

  console.log('📞 Testing fallback with invalid alpha sender ID...');
  
  try {
    const callResult = await twilioService.makeCall({
      phoneNumber: testPhoneNumber,
      customMessage: 'Hello from Memoora! This is a fallback test call.',
      callId: 'test-fallback-' + Date.now(),
      webhookUrl: `${process.env.BASE_URL || 'http://localhost:5005'}/api/v1/voice`
    });
    
    console.log('✅ Fallback test successful!');
    console.log('Call result:', {
      twilioSid: callResult.twilioSid,
      status: callResult.status,
      callerId: callResult.callerId,
      callerIdType: callResult.callerIdType,
      fallbackUsed: callResult.fallbackUsed || false
    });
    
    if (callResult.fallbackUsed) {
      console.log('🎉 Fallback mechanism worked correctly!');
    } else {
      console.log('⚠️  Fallback was not used (unexpected)');
    }
    
  } catch (error) {
    console.error('❌ Fallback test failed:', error.message);
    return false;
  }

  return true;
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Alpha Sender ID Tests\n');
  
  try {
    const mainTest = await testAlphaSenderID();
    if (!mainTest) {
      console.error('\n❌ Main test failed');
      process.exit(1);
    }
    
    // Only run fallback test if explicitly requested
    if (process.argv.includes('--test-fallback')) {
      const fallbackTest = await testFallbackFunctionality();
      if (!fallbackTest) {
        console.error('\n❌ Fallback test failed');
        process.exit(1);
      }
    }
    
    console.log('\n🎉 All tests passed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set USE_ALPHA_SENDER_ID=true in your environment');
    console.log('2. Set ALPHA_SENDER_ID=Memoora (or your preferred name)');
    console.log('3. Set FALLBACK_PHONE_NUMBER if different from TWILIO_PHONE_NUMBER');
    console.log('4. Deploy and test with real calls');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testAlphaSenderID,
  testFallbackFunctionality
};
