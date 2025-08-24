# 📞 Memoora Call Recording Microservice - API Integration Guide

## 🎯 Overview

This guide explains how to integrate your application with the **Memoora Call Recording Microservice**. Your app can programmatically initiate phone calls, record conversations, and retrieve call data through a simple REST API.

## 🌐 Service Endpoints

- **Base URL**: `http://localhost:5005` (local development)
- **API Version**: `/api/v1`
- **Authentication**: API Key required in `x-api-key` header

## 🔑 Quick Start (3 Steps)

### Step 1: Generate API Key
```javascript
const response = await fetch('http://localhost:5005/api/v1/generate-api-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientName: 'Your Application Name',
    email: 'your-app@example.com',
    companyWebsite: 'https://yourapp.com',
    phoneNumber: '+1234567890'
  })
});

const { apiKey } = await response.json();
// Store this apiKey securely - you'll need it for all future requests
```

### Step 2: Make a Phone Call
```javascript
const callResponse = await fetch('http://localhost:5005/api/v1/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    customMessage: 'Optional custom message for the call'
  })
});

const { sid, status, to } = await callResponse.json();
console.log(`Call initiated: ${sid} to ${to}`);
```

### Step 3: Check Call Status
```javascript
// The call status will be updated automatically via webhooks
// You can also query the database for call information
```

## 📚 Complete API Reference

### Authentication
**All API calls require an API key in the `x-api-key` header:**
```javascript
headers: {
  'x-api-key': 'your-api-key-here'
}
```

---

## 🔑 API Key Management

### Generate New API Key
```http
POST /api/v1/generate-api-key
Content-Type: application/json

{
  "clientName": "Your Application Name",
  "email": "your-app@example.com",
  "companyWebsite": "https://yourapp.com",
  "phoneNumber": "+1234567890",
  "description": "Optional description of how you'll use this key"
}
```

**Response:**
```json
{
  "apiKey": "mk_abc123def456ghi789...",
  "keyId": "key_xyz789...",
  "clientName": "Your Application Name",
  "warning": "Store this key securely - it won't be shown again"
}
```

**⚠️ Important:** Store the `apiKey` immediately - it's only shown once!

---

## 📞 Call Management

### Initiate Phone Call
```http
POST /api/v1/call
x-api-key: your-api-key-here
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "customMessage": "Optional custom message for the call"
}
```

**Response:**
```json
{
  "message": "Call initiated successfully",
  "sid": "CA1234567890abcdef",
  "status": "queued",
  "to": "+1234567890"
}
```

**What Happens:**
1. **Twilio receives** your call request
2. **Phone rings** at the specified number
3. **Personal greeting plays** (your recorded voice)
4. **Recording starts** after the greeting
5. **User speaks** their message
6. **Recording ends** when call completes

---

## 📊 Call Data & Analytics

### Get Call Status
```http
GET /api/v1/call-status
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "calls": [
    {
      "id": "uuid-here",
      "status": "completed",
      "to_number": "+1234567890",
      "duration": 120,
      "created_at": "2025-08-15T18:00:00Z",
      "twilio_call_sid": "CA1234567890abcdef"
    }
  ]
}
```

**Call Status Values:**
- `initiated` - Call request sent to Twilio
- `ringing` - Phone is ringing
- `answered` - Call was answered, recording starts
- `completed` - Call finished successfully
- `busy` - Number was busy
- `no-answer` - No one answered
- `failed` - Call failed (check logs)

---

## 🎙️ Recording Management

### List All Recordings
```http
GET /api/v1/recordings
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "recordings": [
    {
      "filename": "story-1755284022661.mp3",
      "size": 2926,
      "created": "2025-08-15T18:53:49.954Z",
      "path": "/api/v1/recordings/story-1755284022661.mp3",
      "listenUrl": "https://your-ngrok-url.ngrok-free.app/api/v1/recordings/story-1755284022661.mp3",
      "downloadUrl": "https://your-ngrok-url.ngrok-free.app/api/v1/recordings/story-1755284022661.mp3"
    }
  ],
  "totalCount": 1,
  "databaseCount": 1,
  "localCount": 1
}
```

### Download/Listen to Recording
```http
GET /api/v1/recordings/{filename}
x-api-key: your-api-key-here
```

**Response:** Audio file (MP3) - can be played in browser or downloaded

---

## 🔧 Integration Examples

### JavaScript/Node.js
```javascript
class MemooraClient {
  constructor(baseUrl = 'http://localhost:5005') {
    this.baseUrl = baseUrl;
    this.apiKey = null;
  }

  async generateApiKey(clientName, email, companyWebsite, phoneNumber) {
    const response = await fetch(`${this.baseUrl}/api/v1/generate-api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName,
        email,
        companyWebsite,
        phoneNumber
      })
    });
    
    const data = await response.json();
    this.apiKey = data.apiKey;
    return data;
  }

  async makeCall(phoneNumber, customMessage = '') {
    if (!this.apiKey) {
      throw new Error('API key not set. Call generateApiKey() first.');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ phoneNumber, customMessage })
    });

    return response.json();
  }

  async getRecordings() {
    if (!this.apiKey) {
      throw new Error('API key not set. Call generateApiKey() first.');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/recordings`, {
      headers: { 'x-api-key': this.apiKey }
    });

    return response.json();
  }

  async downloadRecording(filename) {
    if (!this.apiKey) {
      throw new Error('API key not set. Call generateApiKey() first.');
    }

    const response = await fetch(`${this.baseUrl}/api/v1/recordings/${filename}`, {
      headers: { 'x-api-key': this.apiKey }
    });

    return response.blob(); // Returns audio file blob
  }
}

// Usage
const memoora = new MemooraClient();
await memoora.generateApiKey('My App', 'app@example.com', 'https://myapp.com', '+1234567890');
const call = await memoora.makeCall('+1234567890', 'Hello from my app!');
```

### Python
```python
import requests
import json

class MemooraClient:
    def __init__(self, base_url="http://localhost:5005"):
        self.base_url = base_url
        self.api_key = None
    
    def generate_api_key(self, client_name, email, company_website, phone_number):
        response = requests.post(f"{self.base_url}/api/v1/generate-api-key", json={
            "clientName": client_name,
            "email": email,
            "companyWebsite": company_website,
            "phoneNumber": phone_number
        })
        
        data = response.json()
        self.api_key = data["apiKey"]
        return data
    
    def make_call(self, phone_number, custom_message=""):
        if not self.api_key:
            raise Exception("API key not set. Call generate_api_key() first.")
        
        response = requests.post(f"{self.base_url}/api/v1/call", 
            headers={"x-api-key": self.api_key},
            json={"phoneNumber": phone_number, "customMessage": custom_message}
        )
        
        return response.json()
    
    def get_recordings(self):
        if not self.api_key:
            raise Exception("API key not set. Call generate_api_key() first.")
        
        response = requests.get(f"{self.base_url}/api/v1/recordings",
            headers={"x-api-key": self.api_key}
        )
        
        return response.json()

# Usage
memoora = MemooraClient()
memoora.generate_api_key("My App", "app@example.com", "https://myapp.com", "+1234567890")
call = memoora.make_call("+1234567890", "Hello from my app!")
```

### React/JavaScript Frontend
```javascript
import { useState, useCallback } from 'react';

export const useMemoora = (baseUrl = 'http://localhost:5005') => {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateApiKey = useCallback(async (clientName, email, companyWebsite, phoneNumber) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/generate-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          email,
          companyWebsite,
          phoneNumber
        })
      });
      
      const data = await response.json();
      setApiKey(data.apiKey);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const makeCall = useCallback(async (phoneNumber, customMessage = '') => {
    if (!apiKey) {
      throw new Error('API key not set. Call generateApiKey() first.');
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/api/v1/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ phoneNumber, customMessage })
      });
      
      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey, baseUrl]);

  return {
    apiKey,
    loading,
    error,
    generateApiKey,
    makeCall
  };
};

// Usage in React component
function CallButton() {
  const { apiKey, loading, makeCall } = useMemoora();
  
  const handleCall = async () => {
    try {
      const result = await makeCall('+1234567890', 'Hello from React!');
      console.log('Call initiated:', result.sid);
    } catch (error) {
      console.error('Call failed:', error);
    }
  };
  
  return (
    <button onClick={handleCall} disabled={!apiKey || loading}>
      {loading ? 'Initiating...' : 'Make Call'}
    </button>
  );
}
```

---

## 🗄️ Database Integration

### Call Records
When you make a call, it's automatically stored in the database:

```sql
-- Calls table structure
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  account_id TEXT NOT NULL,
  api_key_id TEXT NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  twilio_call_sid VARCHAR(50),
  status VARCHAR(20) DEFAULT 'initiated',
  call_type VARCHAR(20) DEFAULT 'outbound',
  duration INTEGER,
  recording_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Recording Records
Recordings are linked to calls:

```sql
-- Recordings table structure
CREATE TABLE recordings (
  id UUID PRIMARY KEY,
  call_id UUID REFERENCES calls(id),
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  duration INTEGER,
  recording_url TEXT,
  status VARCHAR(20) DEFAULT 'processing',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔒 Security & Rate Limiting

### API Key Security
- **Keys are hashed** before storage
- **Daily/monthly limits** per key
- **Can be deactivated** if compromised

### Rate Limits
- **API Key Generation**: 2 requests per hour per IP
- **Call Initiation**: 10 calls per hour per API key
- **General API**: 100 requests per hour per API key

### CORS Configuration
```javascript
// Development (localhost)
cors: {
  origin: ['http://localhost:3000', 'http://localhost:5005']
}

// Production
cors: {
  origin: ['https://yourapp.com']
}
```

---

## 🚀 Deployment

### Local Development
```bash
# Start Memoora service
cd memoora-calls
npm install
npm run dev

# Service runs on http://localhost:5005
```

### Production (Render)
```bash
# Deploy to Render
npm run deploy:render

# Update BASE_URL to your Render app URL
BASE_URL=https://your-app.onrender.com
```

---

## 📱 Complete Call Flow

```
1. Your App → POST /api/v1/call → Memoora API
2. Memoora → Twilio → Phone Call → User Answers
3. Personal Greeting → Recording Starts → User Speaks
4. Recording Ends → File Saved → Database Updated
5. Your App → GET /api/v1/recordings → Access Recordings
```

---

## 🔍 Troubleshooting

### Common Errors

#### "Unauthorized domain" Error
- Check `ALLOWED_DOMAINS` in Memoora environment
- Ensure your domain is in the allowlist

#### "Account not authorized to call" Error
- Verify Twilio credentials in Memoora
- Check phone number format (must include country code)

#### "Url is not a valid URL" Error
- Ensure `BASE_URL` is set correctly in Memoora
- For local development, use ngrok: `https://your-ngrok-url.ngrok-free.app`

#### "Invalid API key" Error
- Verify your API key is correct
- Check if the key is still active
- Ensure you're sending it in the `x-api-key` header

### Debug Endpoints
```http
GET /health - Service health check
GET /api/v1/ - API discovery
GET /api/v1/openapi.json - OpenAPI specification
```

---

## 📞 Support & Monitoring

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "Memoora Call Recording Microservice",
  "timestamp": "2025-08-15T18:53:16.598Z",
  "environment": "development",
  "baseUrl": "https://your-ngrok-url.ngrok-free.app",
  "port": "5005"
}
```

### API Discovery
```http
GET /api/v1/
```

**Response:**
```json
{
  "service": "Memoora Call Recording Microservice",
  "version": "1.0.0",
  "endpoints": {
    "/generate-api-key": "Generate new API key",
    "/call": "Initiate phone call",
    "/recordings": "List recordings",
    "/call-status": "Get call status"
  }
}
```

---

## 🎯 Integration Checklist

- [ ] **Generate API key** for your application
- [ ] **Store API key securely** in environment variables
- [ ] **Test call initiation** with a simple phone call
- [ ] **Implement error handling** for failed calls
- [ ] **Add call status monitoring** to your dashboard
- [ ] **Set up recording retrieval** for completed calls
- [ ] **Add rate limiting** to prevent abuse
- [ ] **Test in production** environment

---

## 📋 Environment Variables for Your App

```bash
# Add these to your application's .env file
MEMOORA_CALL_SERVICE_API_KEY=mk_your_api_key_here
MEMOORA_CALL_SERVICE_URL=http://localhost:5005

# For production
MEMOORA_CALL_SERVICE_URL=https://your-memoora-app.onrender.com
```

---

## 🚀 Next Steps

1. **Generate your first API key** using the `/generate-api-key` endpoint
2. **Test with a simple call** to verify integration
3. **Implement call tracking** in your application
4. **Add recording management** to your user interface
5. **Set up monitoring** for call success/failure rates

---

**Your Memoora integration is ready to go! 🎉📞💾**

**Need help? Check the health endpoint first, then review the troubleshooting section above.**
