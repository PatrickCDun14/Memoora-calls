// 🧪 Frontend Integration Test for Memoora Microservice
// This simulates how your frontend should work

const BASE_URL = 'https://memoora-calls.onrender.com';

// Simulate frontend API key generation
async function generateApiKey() {
  console.log('🔑 Generating new API key...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/generate-api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Memoora Frontend',
        email: 'test@memoora.com',
        companyWebsite: 'https://www.memoora.com',
        phoneNumber: '+13128484329'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API Key generated:', data.apiKey);
    return data.apiKey;
    
  } catch (error) {
    console.error('❌ Failed to generate API key:', error.message);
    return null;
  }
}

// Simulate frontend making a call
async function makeCall(apiKey) {
  console.log('📞 Making call with API key...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/v1/call`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        phoneNumber: '+13128484329',
        customMessage: 'Hi Patrick! This is a test call from your production microservice! 🎉',
        storytellerId: 'frontend-test-123',
        callType: 'storytelling',
        interactive: true
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
    }
    
    const data = await response.json();
    console.log('✅ Call initiated successfully:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Failed to make call:', error.message);
    return null;
  }
}

// Test the complete flow
async function testFrontendIntegration() {
  console.log('🧪 Testing Frontend Integration with Production Microservice');
  console.log('========================================================');
  
  // Step 1: Generate API key
  const apiKey = await generateApiKey();
  if (!apiKey) {
    console.log('❌ Cannot proceed without API key');
    return;
  }
  
  // Step 2: Make a call
  const callResult = await makeCall(apiKey);
  if (callResult) {
    console.log('🎉 Frontend integration test PASSED!');
  } else {
    console.log('❌ Frontend integration test FAILED!');
  }
  
  console.log('========================================================');
  console.log('📋 For your frontend, use this API key:', apiKey);
  console.log('🔗 Base URL:', BASE_URL);
}

// Run the test
testFrontendIntegration().catch(console.error);

