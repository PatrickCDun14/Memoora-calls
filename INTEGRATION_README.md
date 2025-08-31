# 🚀 Memoora Call Recording Microservice - Integration Guide

## 📋 Overview

The **Memoora Call Recording Microservice** is a production-ready service that handles phone call initiation, recording, and management through Twilio. This guide will help your main application integrate seamlessly with this microservice.

## 🌐 Service Information

- **Production URL**: `https://memoora-calls.onrender.com`
- **Environment**: Production (HTTPS enabled)
- **Authentication**: API Key-based
- **CORS**: Enabled for `https://www.memoora.com` and `https://memoora.com`

## 🔑 Authentication & API Keys

### ⚠️ **CRITICAL: API Key Management**

**API keys are NOT persistent** - they expire on server restarts. Your application MUST generate a fresh API key before making any calls.

### Generate API Key

```javascript
const generateApiKey = async () => {
  try {
    const response = await fetch('https://memoora-calls.onrender.com/api/v1/generate-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Your App Name',
        email: 'your-email@yourdomain.com',
        companyWebsite: 'https://yourdomain.com',
        phoneNumber: '+1234567890'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.apiKey; // Store this for all subsequent calls
  } catch (error) {
    console.error('Failed to generate API key:', error);
    throw error;
  }
};
```

## 📞 Making Phone Calls

### Call Endpoint

```javascript
const makeCall = async (apiKey, callData) => {
  try {
    const response = await fetch('https://memoora-calls.onrender.com/api/v1/call', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': apiKey  // REQUIRED: Include the generated API key
      },
      body: JSON.stringify(callData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Call failed: ${errorData.error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to make call:', error);
    throw error;
  }
};
```

### Call Data Structure

```javascript
const callData = {
  phoneNumber: '+1234567890',        // REQUIRED: Recipient's phone number
  customMessage: 'Your message here', // REQUIRED: What the AI will say
  storytellerId: 'unique-id',        // OPTIONAL: For tracking purposes
  callType: 'storytelling',          // OPTIONAL: Defaults to 'storytelling'
  interactive: true,                  // OPTIONAL: Defaults to true
  familyMemberId: 'uuid',            // OPTIONAL: For family context
  scheduledCallId: 'uuid'            // OPTIONAL: For scheduled calls
};
```

## 🔄 Complete Integration Flow

### 1. App Initialization

```javascript
// When your app starts, generate an API key
useEffect(() => {
  const initializeMicroservice = async () => {
    try {
      const apiKey = await generateApiKey();
      setApiKey(apiKey); // Store in your app state
      console.log('Microservice initialized with API key');
    } catch (error) {
      console.error('Failed to initialize microservice:', error);
    }
  };
  
  initializeMicroservice();
}, []);
```

### 2. Making a Call

```javascript
const handleCallInitiation = async (phoneNumber, message) => {
  try {
    const callResult = await makeCall(apiKey, {
      phoneNumber,
      customMessage: message,
      storytellerId: 'user-session-id',
      callType: 'storytelling',
      interactive: true
    });
    
    console.log('Call initiated successfully:', callResult);
    // Handle success (e.g., show call status, redirect user)
    
  } catch (error) {
    console.error('Call initiation failed:', error);
    // Handle error (e.g., show error message to user)
  }
};
```

## 📊 Available Endpoints

| Endpoint | Method | Description | Authentication |
|----------|--------|-------------|----------------|
| `/health` | GET | Service health check | None |
| `/api/v1/` | GET | API discovery | None |
| `/api/v1/generate-api-key` | POST | Create new API key | None |
| `/api/v1/call` | POST | Initiate phone call | API Key required |
| `/api/v1/calls` | GET | List all calls | API Key required |
| `/api/v1/calls/:id` | GET | Get call details | API Key required |
| `/api/v1/recordings` | GET | List recordings | API Key required |
| `/api/v1/stats` | GET | Usage statistics | API Key required |

## ⚡ Rate Limits

Each API key has the following limits:
- **Hourly**: 5 calls
- **Daily**: 20 calls  
- **Monthly**: 100 calls

## 🧪 Testing Your Integration

### Health Check

```javascript
const testConnection = async () => {
  try {
    const response = await fetch('https://memoora-calls.onrender.com/health');
    const data = await response.json();
    console.log('Service status:', data);
    return data.status === 'healthy';
  } catch (error) {
    console.error('Service unavailable:', error);
    return false;
  }
};
```

### Complete Test Flow

```javascript
const testCompleteFlow = async () => {
  try {
    // 1. Test connection
    const isHealthy = await testConnection();
    if (!isHealthy) throw new Error('Service unhealthy');
    
    // 2. Generate API key
    const apiKey = await generateApiKey();
    console.log('API Key generated:', apiKey);
    
    // 3. Test call initiation
    const callResult = await makeCall(apiKey, {
      phoneNumber: '+1234567890',
      customMessage: 'Test message from integration',
      storytellerId: 'test-integration'
    });
    
    console.log('Integration test PASSED:', callResult);
    return true;
    
  } catch (error) {
    console.error('Integration test FAILED:', error);
    return false;
  }
};
```

## 🚨 Error Handling

### Common Error Responses

```javascript
// 401 Unauthorized
{
  "error": "API key required"
}

// 401 Unauthorized  
{
  "error": "API key not found"
}

// 400 Bad Request
{
  "error": "Missing required fields",
  "required": ["phoneNumber", "customMessage"]
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded"
}
```

### Error Handling Example

```javascript
const handleApiError = (error, response) => {
  if (response?.status === 401) {
    // API key expired or invalid - regenerate
    regenerateApiKey();
  } else if (response?.status === 429) {
    // Rate limited - show user message
    showRateLimitMessage();
  } else {
    // Other errors - show generic message
    showErrorMessage(error.message);
  }
};
```

## 🔧 Configuration

### Environment Variables (for your app)

```bash
# Required
MEMOORA_MICROSERVICE_URL=https://memoora-calls.onrender.com

# Optional
MEMOORA_CLIENT_NAME=Your App Name
MEMOORA_CLIENT_EMAIL=your-email@yourdomain.com
MEMOORA_CLIENT_WEBSITE=https://yourdomain.com
MEMOORA_CLIENT_PHONE=+1234567890
```

### Configuration Object

```javascript
const microserviceConfig = {
  baseUrl: process.env.MEMOORA_MICROSERVICE_URL || 'https://memoora-calls.onrender.com',
  clientInfo: {
    name: process.env.MEMOORA_CLIENT_NAME || 'Your App Name',
    email: process.env.MEMOORA_CLIENT_EMAIL || 'your-email@yourdomain.com',
    website: process.env.MEMOORA_CLIENT_WEBSITE || 'https://yourdomain.com',
    phone: process.env.MEMOORA_CLIENT_PHONE || '+1234567890'
  }
};
```

## 📱 Call Flow

### What Happens When You Make a Call

1. **Your app** → Sends call request to microservice
2. **Microservice** → Validates API key and call data
3. **Microservice** → Initiates Twilio phone call
4. **Twilio** → Calls the recipient's phone number
5. **Recipient answers** → AI plays your custom message
6. **Recording starts** → Recipient shares their story
7. **Call ends** → Recording is saved and available via API
8. **Your app** → Can retrieve recording and call details

### Call Status Updates

The microservice automatically handles:
- Call initiation
- Call status tracking
- Recording management
- Webhook processing
- Error handling

## 🎯 Best Practices

### ✅ Do's

- **Always generate API key on app startup**
- **Store API key in app state/memory**
- **Include API key in all authenticated requests**
- **Handle errors gracefully**
- **Implement retry logic for failed calls**
- **Monitor rate limits**

### ❌ Don'ts

- **Don't hardcode API keys**
- **Don't reuse expired API keys**
- **Don't ignore error responses**
- **Don't make calls without valid API key**
- **Don't exceed rate limits**

## 🚀 Getting Started

### 1. Test Connection
```javascript
await testConnection();
```

### 2. Generate API Key
```javascript
const apiKey = await generateApiKey();
```

### 3. Make Your First Call
```javascript
const callResult = await makeCall(apiKey, {
  phoneNumber: '+1234567890',
  customMessage: 'Hello from your app!'
});
```

### 4. Handle Response
```javascript
if (callResult.success) {
  console.log('Call ID:', callResult.callId);
  // Redirect user or show success message
}
```

## 🆘 Support

### Troubleshooting

- **CORS errors**: Ensure your domain is in the allowed list
- **401 errors**: Regenerate your API key
- **429 errors**: Wait for rate limit reset
- **500 errors**: Check microservice health endpoint

### Health Check

Always check `/health` endpoint first if you encounter issues:
```javascript
const health = await fetch('https://memoora-calls.onrender.com/health');
```

## 📚 Additional Resources

- **API Discovery**: `GET /api/v1/` for full endpoint documentation
- **Service Status**: `GET /health` for real-time service health
- **Usage Stats**: `GET /api/v1/stats` for your API key usage

---

**🎉 You're now ready to integrate!** Start with the health check, then generate an API key, and make your first call. The microservice handles all the complexity - you just need to make HTTP requests! 🚀

