# 📞 Memoora Call Integration Guide

## 🎯 Overview

This guide shows your main application how to integrate with the **Memoora Call Recording Microservice** to initiate phone calls and ask questions. The service handles the entire call flow, from dialing to recording responses.

## 🚀 Quick Start

### 1. Generate an API Key

First, you need an API key to authenticate with the service:

```bash
curl -X POST "https://memoora-calls.onrender.com/api/v1/generate-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Your App Name",
    "email": "your-app@example.com",
    "companyWebsite": "https://yourapp.com",
    "phoneNumber": "+1234567890",
    "description": "Integration for main application"
  }'
```

**Response:**
```json
{
  "apiKey": "your-64-character-api-key-here",
  "keyId": "uuid-here",
  "warning": "Store this key securely - it won't be shown again"
}
```

**⚠️ Important:** Store this API key securely - you'll need it for all future requests.

### 2. Make a Call

Use the API key to initiate a call:

```bash
curl -X POST "https://memoora-calls.onrender.com/api/v1/call" \
  -H "x-api-key: your-64-character-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customMessage": "Tell me about your favorite childhood memory"
  }'
```

**Response:**
```json
{
  "success": true,
  "callId": "uuid-here",
  "twilioSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "initiated",
  "message": "Call initiated successfully"
}
```

## 🔧 Integration Examples

### JavaScript/Node.js

```javascript
class MemooraCallService {
  constructor(apiKey, baseUrl = 'https://memoora-calls.onrender.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async makeCall(phoneNumber, question) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        },
        body: JSON.stringify({
          phoneNumber,
          customMessage: question
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to initiate call:', error);
      throw error;
    }
  }

  async getCallStatus(callId) {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/calls/${callId}`, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get call status:', error);
      throw error;
    }
  }
}

// Usage
const memoora = new MemooraCallService('your-api-key-here');

// Make a call
memoora.makeCall('+1234567890', 'What is your favorite family tradition?')
  .then(result => {
    console.log('Call initiated:', result);
  })
  .catch(error => {
    console.error('Call failed:', error);
  });
```

### React Hook

```javascript
import { useState, useCallback } from 'react';

export const useMemooraCalls = (apiKey, baseUrl = 'https://memoora-calls.onrender.com') => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeCall = useCallback(async (phoneNumber, question) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${baseUrl}/api/v1/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          phoneNumber,
          customMessage: question
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiKey, baseUrl]);

  return {
    makeCall,
    loading,
    error
  };
};

// Usage in component
function CallButton() {
  const { makeCall, loading, error } = useMemooraCalls('your-api-key-here');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [question, setQuestion] = useState('');

  const handleCall = async () => {
    try {
      const result = await makeCall(phoneNumber, question);
      console.log('Call initiated:', result);
      // Handle success (e.g., show confirmation, redirect)
    } catch (err) {
      console.error('Call failed:', err);
      // Handle error (e.g., show error message)
    }
  };

  return (
    <div>
      <input
        type="tel"
        placeholder="Phone number (+1234567890)"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <textarea
        placeholder="What question would you like to ask?"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button onClick={handleCall} disabled={loading}>
        {loading ? 'Initiating Call...' : 'Make Call'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
```

### Python

```python
import requests
import json

class MemooraCallService:
    def __init__(self, api_key, base_url="https://memoora-calls.onrender.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key
        }
    
    def make_call(self, phone_number, question):
        """Initiate a call with a specific question"""
        try:
            payload = {
                'phoneNumber': phone_number,
                'customMessage': question
            }
            
            response = requests.post(
                f"{self.base_url}/api/v1/call",
                headers=self.headers,
                json=payload
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Failed to initiate call: {e}")
            raise
    
    def get_call_status(self, call_id):
        """Get the status of a specific call"""
        try:
            response = requests.get(
                f"{self.base_url}/api/v1/calls/{call_id}",
                headers=self.headers
            )
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Failed to get call status: {e}")
            raise

# Usage
memoora = MemooraCallService('your-api-key-here')

# Make a call
try:
    result = memoora.make_call(
        '+1234567890', 
        'What is your most cherished family memory?'
    )
    print(f"Call initiated: {result}")
except Exception as e:
    print(f"Call failed: {e}")
```

## 📱 How It Works

### 1. Call Flow
```
Your App → Memoora API → Twilio → Phone Call → User Answers → Recording Saved
```

### 2. What Happens
1. **Your app** sends a request with a phone number and question
2. **Memoora** calls the phone number using Twilio
3. **When answered**, Memoora asks the question using text-to-speech
4. **User responds** and the answer is recorded
5. **Recording is saved** to Supabase and your app is notified via webhook

### 3. Call States
- `initiated` - Call request received
- `ringing` - Phone is ringing
- `answered` - Call was answered
- `recording` - User is speaking
- `completed` - Call finished, recording saved

## 🔔 Webhook Notifications

When a call completes, Memoora will notify your app:

**Webhook URL:** `https://yourapp.com/api/calls/recording-complete`

**Payload:**
```json
{
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "filename": "recording-123.mp3",
  "recordingDurationSeconds": 45,
  "storytellerId": "user-123",
  "familyMemberId": "family-456",
  "question": "What is your favorite family tradition?",
  "accountId": "account-789"
}
```

**Security:** The webhook includes an HMAC signature for verification.

## 📋 API Reference

### Endpoint: `POST /api/v1/call`

**Headers:**
```
x-api-key: your-api-key-here
Content-Type: application/json
```

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "customMessage": "Your question here"
}
```

**Response:**
```json
{
  "success": true,
  "callId": "uuid-here",
  "twilioSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "initiated",
  "message": "Call initiated successfully"
}
```

### Endpoint: `GET /api/v1/calls/{callId}`

**Headers:**
```
x-api-key: your-api-key-here
```

**Response:**
```json
{
  "id": "call-uuid",
  "phoneNumber": "+1234567890",
  "status": "completed",
  "recordingUrl": "https://example.com/recording.mp3",
  "duration": 45,
  "createdAt": "2024-12-15T10:30:00Z"
}
```

## ⚠️ Important Notes

### Phone Number Format
- **Must include country code** (e.g., `+1` for US)
- **No spaces or special characters** (e.g., `+1234567890`, not `+1 (234) 567-8900`)

### Rate Limits
- **API Key Generation**: 2 requests per hour per IP
- **Call Initiation**: 10 calls per hour per API key
- **General API**: 100 requests per hour per API key

### Error Handling
```javascript
// Always handle errors gracefully
try {
  const result = await makeCall(phoneNumber, question);
  // Handle success
} catch (error) {
  if (error.message.includes('401')) {
    // Invalid API key
  } else if (error.message.includes('429')) {
    // Rate limit exceeded
  } else if (error.message.includes('400')) {
    // Invalid phone number or payload
  } else {
    // Other errors
  }
}
```

## 🧪 Testing

### Test with a Real Phone
```bash
# Test call to your own number
curl -X POST "https://memoora-calls.onrender.com/api/v1/call" \
  -H "x-api-key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customMessage": "This is a test call from Memoora"
  }'
```

### Health Check
```bash
curl "https://memoora-calls.onrender.com/health"
```

## 🚀 Production Checklist

- [ ] API key stored securely (not in client-side code)
- [ ] Phone number validation implemented
- [ ] Error handling for failed calls
- [ ] Webhook endpoint configured and secured
- [ ] Rate limiting handled gracefully
- [ ] Call status monitoring implemented

## 📞 Support

- **Service Status**: `https://memoora-calls.onrender.com/health`
- **API Discovery**: `https://memoora-calls.onrender.com/api/v1/`
- **Documentation**: See main README.md for complete details

---

**Need Help?** Check the main README.md for troubleshooting and advanced features.
