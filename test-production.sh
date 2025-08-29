#!/bin/bash

# 🚀 Production Test Script for Memoora Microservice
# Replace YOUR_APP_NAME with your actual Render app name

APP_NAME="YOUR_APP_NAME"  # Change this to your actual app name
BASE_URL="https://${APP_NAME}.onrender.com"

echo "🧪 Testing Memoora Microservice on Render: ${BASE_URL}"
echo "=================================================="

# Test 1: Health Check
echo "✅ Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "${BASE_URL}/health")
echo "Health Response: ${HEALTH_RESPONSE}"

# Test 2: API Discovery
echo "✅ Testing API Discovery..."
API_RESPONSE=$(curl -s "${BASE_URL}/api/v1/")
echo "API Discovery Response: ${API_RESPONSE}"

# Test 3: Generate API Key
echo "✅ Testing API Key Generation..."
API_KEY_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/generate-api-key" \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Production Test", "email": "test@example.com", "companyWebsite": "https://example.com", "phoneNumber": "+1234567890"}')

echo "API Key Response: ${API_KEY_RESPONSE}"

# Extract API key for call test
API_KEY=$(echo "${API_KEY_RESPONSE}" | grep -o '"apiKey":"[^"]*"' | cut -d'"' -f4)

if [ -n "${API_KEY}" ]; then
    echo "🔑 API Key Generated: ${API_KEY}"
    
    # Test 4: Make a Test Call
    echo "✅ Testing Call Initiation..."
    CALL_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/call" \
      -H "x-api-key: ${API_KEY}" \
      -H "Content-Type: application/json" \
      -d '{"phoneNumber": "+13128484329", "customMessage": "Hi Patrick! This is a production test call from Render. Your microservice is now live in production! 🎉", "storytellerId": "render-production-test", "callType": "storytelling", "interactive": true}')
    
    echo "Call Response: ${CALL_RESPONSE}"
else
    echo "❌ Failed to generate API key"
fi

echo "=================================================="
echo "🎯 Production Test Complete!"
echo "🌐 Your app is live at: ${BASE_URL}"
echo "📊 Check Render dashboard for logs and monitoring"
