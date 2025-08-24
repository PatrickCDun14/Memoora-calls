# 🚀 Memoora Call Recording Service - Integration Guide

## 📋 Overview

Memoora is a production-ready call recording microservice that allows your application to:
- **Initiate phone calls** programmatically
- **Record conversations** automatically
- **Store call metadata** in a database
- **Manage API keys** for secure access
- **Track call analytics** and status

## 🌐 Service Architecture

```
Your Main App → Memoora API → Twilio → Phone Calls → Recordings → Database
```

- **Service URL**: `http://localhost:5005` (local development)
- **API Base**: `/api/v1`
- **Authentication**: API Key in `x-api-key` header
- **Database**: Supabase (PostgreSQL)

## 🔑 Quick Start

### 1. Generate API Key
```javascript
const response = await fetch('http://localhost:5005/api/v1/generate-api-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientName: 'Your App Name',
    email: 'your-app@example.com',
    companyWebsite: 'https://yourapp.com',
    phoneNumber: '+1234567890',
    description: 'Integration for main application'
  })
});

const { apiKey, keyId } = await response.json();
```

### 2. Make a Phone Call
```javascript
const callResponse = await fetch('http://localhost:5005/api/v1/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890',
    customMessage: 'Optional custom message'
  })
});

const { sid, status, to } = await callResponse.json();
console.log(`Call initiated: ${sid} to ${to}`);
```

## 📚 Complete API Reference

### Authentication
All API calls require an API key in the `x-api-key` header:
```javascript
headers: {
  'x-api-key': 'your-api-key-here'
}
```

### Endpoints

#### 🔑 Generate API Key
```http
POST /api/v1/generate-api-key
Content-Type: application/json

{
  "clientName": "Your App Name",
  "email": "your-app@example.com", 
  "companyWebsite": "https://yourapp.com",
  "phoneNumber": "+1234567890",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "apiKey": "mk_abc123...",
  "keyId": "key_xyz789...",
  "clientName": "Your App Name",
  "warning": "Store this key securely - it won't be shown again"
}
```

#### 📞 Initiate Call
```http
POST /api/v1/call
x-api-key: your-api-key-here
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "customMessage": "Optional custom message"
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

#### 📊 Get Call Status
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
      "created_at": "2025-08-15T18:00:00Z"
    }
  ]
}
```

#### 🎙️ List Recordings
```http
GET /api/v1/recordings
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "recordings": [
    {
      "id": "uuid-here",
      "filename": "story-1755284022661.mp3",
      "duration": 30,
      "file_size": 2926,
      "created_at": "2025-08-15T18:53:49Z"
    }
  ]
}
```

#### 📥 Download Recording
```http
GET /api/v1/recordings/{filename}
x-api-key: your-api-key-here
```

**Response:** Audio file (MP3)

## 🔧 Integration Examples

### JavaScript/Node.js Integration

```javascript
class MemooraService {
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
}

// Usage
const memoora = new MemooraService();
await memoora.generateApiKey('My App', 'app@example.com', 'https://myapp.com', '+1234567890');
const call = await memoora.makeCall('+1234567890', 'Hello from my app!');
```

### Python Integration

```python
import requests
import json

class MemooraService:
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
memoora = MemooraService()
memoora.generate_api_key("My App", "app@example.com", "https://myapp.com", "+1234567890")
call = memoora.make_call("+1234567890", "Hello from my app!")
```

### React/JavaScript Frontend Integration

```javascript
// React hook for Memoora service
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

## 🗄️ Database Schema

### Calls Table
```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  api_key_id TEXT NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  twilio_call_sid VARCHAR(50),
  status VARCHAR(20) DEFAULT 'initiated',
  call_type VARCHAR(20) DEFAULT 'outbound',
  duration INTEGER,
  recording_id UUID REFERENCES recordings(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Recordings Table
```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
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

### API Keys Table
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  account_id TEXT,
  key_name VARCHAR(255),
  permissions JSONB DEFAULT '{}',
  max_calls_per_day INTEGER DEFAULT 100,
  max_calls_per_month INTEGER DEFAULT 3000,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Security & Rate Limiting

### API Key Security
- API keys are hashed before storage
- Each key has daily/monthly call limits
- Keys can be deactivated if compromised

### Rate Limiting
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

## 📱 Call Flow

1. **Your App** → **Memoora API** → **Twilio**
2. **Twilio** → **Phone Call** → **User Answers**
3. **Personal Greeting** → **Recording Starts** → **User Speaks**
4. **Recording Ends** → **File Saved** → **Database Updated**
5. **Your App** → **Query Database** → **Access Recordings**

## 🔍 Troubleshooting

### Common Issues

#### "Unauthorized domain" Error
- Check `ALLOWED_DOMAINS` in environment
- Ensure your domain is in the allowlist

#### "Account not authorized to call" Error
- Verify Twilio credentials
- Check phone number format (must include country code)

#### "Url is not a valid URL" Error
- Ensure `BASE_URL` is set correctly
- For local development, use ngrok: `https://your-ngrok-url.ngrok-free.app`

#### Database Connection Issues
- Verify Supabase credentials
- Check if tables exist in your database
- Ensure RLS policies are configured correctly

### Debug Endpoints
```http
GET /health - Service health check
GET /api/v1/ - API discovery
GET /api/v1/openapi.json - OpenAPI specification
```

## 📞 Support

- **Service Status**: `/health`
- **API Documentation**: `/api/v1/docs`
- **OpenAPI Spec**: `/api/v1/openapi.json`

## 🎯 Next Steps

1. **Generate API Key** for your application
2. **Test Integration** with a simple call
3. **Implement Error Handling** for production use
4. **Add Call Analytics** to your dashboard
5. **Set up Webhooks** for real-time updates

---

**Your Memoora service is now ready for integration! 🚀📞💾**
