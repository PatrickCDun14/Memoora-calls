# Memoora API Documentation

## Overview
Memoora is a call recording microservice that allows other services to initiate phone calls, record stories, and manage recordings via REST API endpoints.

## Base URL
```
https://your-render-app.onrender.com
```

## Authentication
All API endpoints require authentication using an API key in the `X-API-Key` header:
```
X-API-Key: your_api_key_here
```

## Endpoints

### 1. Health Check
**GET** `/health`

Check if the service is running and healthy.

**Response:**
```json
{
  "status": "healthy",
  "service": "Memoora Call Recording Microservice",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### 2. Initiate Call
**POST** `/api/v1/call`

Initiate an outbound phone call that will record a story.

**Request Body:**
```json
{
  "phoneNumber": "+1234567890",
  "customMessage": "Optional custom message to play before recording"
}
```

**Response:**
```json
{
  "message": "Call initiated successfully",
  "sid": "CA1234567890abcdef",
  "status": "initiated",
  "to": "+1234567890"
}
```

**Error Responses:**
- `400` - Invalid phone number or missing required fields
- `401` - Invalid or missing API key
- `429` - Rate limit exceeded
- `500` - Internal server error

### 3. List Recordings
**GET** `/api/v1/recordings`

Get a list of all recorded stories.

**Response:**
```json
{
  "recordings": [
    {
      "filename": "story-1705312200000.mp3",
      "size": 2048576,
      "created": "2024-01-15T10:30:00.000Z",
      "path": "/api/v1/recordings/story-1705312200000.mp3"
    }
  ]
}
```

### 4. Download Recording
**GET** `/api/v1/recordings/{filename}`

Download a specific recording file.

**Parameters:**
- `filename` - The name of the recording file

**Response:** Audio file (MP3)

**Error Responses:**
- `404` - Recording not found
- `401` - Invalid or missing API key

## Rate Limiting
- **Calls**: Maximum 10 calls per hour per API key
- **API Requests**: Maximum 100 requests per hour per API key

## Error Handling
All errors follow this format:
```json
{
  "error": "Error description",
  "message": "Detailed error message (only in development)"
}
```

## Integration Examples

### Node.js/JavaScript
```javascript
const axios = require('axios');

const memooraClient = axios.create({
  baseURL: 'https://your-render-app.onrender.com',
  headers: {
    'X-API-Key': 'your_api_key_here',
    'Content-Type': 'application/json'
  }
});

// Initiate a call
async function startRecording(phoneNumber) {
  try {
    const response = await memooraClient.post('/api/v1/call', {
      phoneNumber: phoneNumber
    });
    console.log('Call initiated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error starting call:', error.response?.data || error.message);
  }
}

// Get recordings list
async function getRecordings() {
  try {
    const response = await memooraClient.get('/api/v1/recordings');
    console.log('Recordings:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting recordings:', error.response?.data || error.message);
  }
}
```

### Python
```python
import requests

class MemooraClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def start_call(self, phone_number):
        response = requests.post(
            f"{self.base_url}/api/v1/call",
            json={'phoneNumber': phone_number},
            headers=self.headers
        )
        return response.json()
    
    def get_recordings(self):
        response = requests.get(
            f"{self.base_url}/api/v1/recordings",
            headers=self.headers
        )
        return response.json()

# Usage
client = MemooraClient('https://your-render-app.onrender.com', 'your_api_key')
result = client.start_call('+1234567890')
```

### cURL Examples
```bash
# Health check
curl -X GET https://your-render-app.onrender.com/health

# Initiate call
curl -X POST https://your-render-app.onrender.com/api/v1/call \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'

# Get recordings
curl -X GET https://your-render-app.onrender.com/api/v1/recordings \
  -H "X-API-Key: your_api_key_here"

# Download recording
curl -X GET https://your-render-app.onrender.com/api/v1/recordings/story-1705312200000.mp3 \
  -H "X-API-Key: your_api_key_here" \
  -o recording.mp3
```

## Environment Variables for Render
When deploying to Render, you'll need to set these environment variables:

- `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio auth token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- `BASE_URL` - Your Render app URL (e.g., https://your-app.onrender.com)
- `API_KEY` - Your API key for authentication
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)

## Support
For API support or questions, please refer to the main Memoora documentation or contact the development team. 