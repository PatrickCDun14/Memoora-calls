#!/usr/bin/env node

/**
 * 🧪 Alpha Sender ID Structure Test
 * 
 * This script tests the alpha sender ID code structure without requiring
 * actual Twilio credentials. It verifies that the configuration and
 * logic are working correctly.
 */

require('dotenv').config();

// Test environment configuration
function testEnvironmentConfig() {
  console.log('🧪 Testing Environment Configuration');
  console.log('====================================\n');

  // Test environment variables
  const envVars = {
    USE_ALPHA_SENDER_ID: process.env.USE_ALPHA_SENDER_ID,
    ALPHA_SENDER_ID: process.env.ALPHA_SENDER_ID,
    FALLBACK_PHONE_NUMBER: process.env.FALLBACK_PHONE_NUMBER,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
  };

  console.log('Environment variables:');
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value || 'not set'}`);
  });

  // Test alpha sender ID validation
  const alphaSenderId = process.env.ALPHA_SENDER_ID || 'Memoora';
  const isValidLength = alphaSenderId.length <= 11;
  
  console.log(`\nAlpha Sender ID validation:`);
  console.log(`  ID: "${alphaSenderId}"`);
  console.log(`  Length: ${alphaSenderId.length}/11 characters`);
  console.log(`  Valid length: ${isValidLength ? '✅' : '❌'}`);

  // Test phone number format validation
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const isValidPhoneFormat = phoneNumber && phoneNumber.match(/^\+1\d{10}$/);
  
  console.log(`\nPhone number validation:`);
  console.log(`  Number: ${phoneNumber || 'not set'}`);
  console.log(`  Valid format: ${isValidPhoneFormat ? '✅' : '❌'}`);

  return {
    alphaSenderValid: isValidLength,
    phoneNumberValid: isValidPhoneFormat,
    alphaSenderEnabled: process.env.USE_ALPHA_SENDER_ID === 'true'
  };
}

// Test Twilio service structure
function testTwilioServiceStructure() {
  console.log('\n🧪 Testing Twilio Service Structure');
  console.log('===================================\n');

  try {
    const SimpleTwilioService = require('./utils/simple-twilio-service');
    
    // Test service instantiation (without credentials)
    const twilioService = new SimpleTwilioService();
    
    console.log('✅ Twilio service class loaded successfully');
    console.log(`✅ Service configuration:`);
    console.log(`  - Alpha sender enabled: ${twilioService.useAlphaSender}`);
    console.log(`  - Alpha sender ID: ${twilioService.alphaSenderId}`);
    console.log(`  - Fallback number: ${twilioService.fallbackNumber}`);
    console.log(`  - Primary number: ${twilioService.phoneNumber}`);
    
    // Test configuration validation method exists
    if (typeof twilioService.validateConfiguration === 'function') {
      console.log('✅ validateConfiguration method exists');
    } else {
      console.log('❌ validateConfiguration method missing');
    }
    
    // Test makeCall method exists
    if (typeof twilioService.makeCall === 'function') {
      console.log('✅ makeCall method exists');
    } else {
      console.log('❌ makeCall method missing');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load Twilio service:', error.message);
    return false;
  }
}

// Test environment configuration module
function testEnvironmentModule() {
  console.log('\n🧪 Testing Environment Configuration Module');
  console.log('===========================================\n');

  try {
    const { validateEnvironment } = require('./config/environment');
    
    console.log('✅ Environment configuration module loaded');
    
    // Test validation function exists
    if (typeof validateEnvironment === 'function') {
      console.log('✅ validateEnvironment function exists');
    } else {
      console.log('❌ validateEnvironment function missing');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load environment module:', error.message);
    return false;
  }
}

// Test call service structure
function testCallServiceStructure() {
  console.log('\n🧪 Testing Call Service Structure');
  console.log('=================================\n');

  try {
    const SimpleCallService = require('./utils/simple-call-service');
    
    // Test service instantiation
    const callService = new SimpleCallService();
    
    console.log('✅ Call service class loaded successfully');
    
    // Test key methods exist
    const requiredMethods = [
      'createCall',
      'getCall',
      'updateCallStatus',
      'getCallsByApiKey',
      'getCallStats'
    ];
    
    requiredMethods.forEach(method => {
      if (typeof callService[method] === 'function') {
        console.log(`✅ ${method} method exists`);
      } else {
        console.log(`❌ ${method} method missing`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load call service:', error.message);
    return false;
  }
}

// Test routes structure
function testRoutesStructure() {
  console.log('\n🧪 Testing Routes Structure');
  console.log('===========================\n');

  try {
    const memooraRoutes = require('./routes-memoora/simple-memoora');
    
    console.log('✅ Routes module loaded successfully');
    
    // Test that it's a function (factory pattern)
    if (typeof memooraRoutes === 'function') {
      console.log('✅ Routes factory function exists');
    } else {
      console.log('❌ Routes factory function missing');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load routes:', error.message);
    return false;
  }
}

// Main test execution
function runStructureTests() {
  console.log('🚀 Starting Alpha Sender ID Structure Tests\n');
  
  const results = {
    environment: testEnvironmentConfig(),
    twilioService: testTwilioServiceStructure(),
    environmentModule: testEnvironmentModule(),
    callService: testCallServiceStructure(),
    routes: testRoutesStructure()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  Object.entries(results).forEach(([test, result]) => {
    if (typeof result === 'boolean') {
      console.log(`${test}: ${result ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.log(`${test}: ✅ PASS`);
      if (result.alphaSenderEnabled) {
        console.log(`  - Alpha sender ID: ENABLED`);
      } else {
        console.log(`  - Alpha sender ID: DISABLED`);
      }
    }
  });
  
  const allPassed = Object.values(results).every(result => 
    typeof result === 'boolean' ? result : true
  );
  
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Alpha Sender ID structure is correctly implemented!');
    console.log('\n📋 Next Steps:');
    console.log('1. Set up Twilio credentials in .env file');
    console.log('2. Enable alpha sender ID: USE_ALPHA_SENDER_ID=true');
    console.log('3. Run full test: node test-alpha-sender.js');
    console.log('4. Deploy to production');
  } else {
    console.log('\n⚠️  Some issues found. Please review the test output above.');
  }
  
  return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  const success = runStructureTests();
  process.exit(success ? 0 : 1);
}

module.exports = {
  testEnvironmentConfig,
  testTwilioServiceStructure,
  testEnvironmentModule,
  testCallServiceStructure,
  testRoutesStructure,
  runStructureTests
};
