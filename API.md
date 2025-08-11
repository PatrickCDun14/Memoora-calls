# Memoora Call Recording Microservice API

## Overview
The Memoora microservice provides call recording functionality through Twilio integration. It handles outbound calls, voice prompts, recording capture, and file management.

## Base URL
- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`

## Authentication
Most endpoints require an API key passed in the `x-api-key` header:
```bash
x-api-key: your_api_key_here
```

## Endpoints

### 1. Health Check
**GET** `/health`

Check the service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "Memoora Call Recording Microservice",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

### 2. Initiate Call
**POST** `/api/v1/call`

Start an outbound call to record a story.

**Headers:**
```
x-api-key: your_api_key_here
Content-Type: application/json
```

**Body:**
```json
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

### 3. Voice Webhook (Twilio)
**POST** `/api/v1/voice`

Called by Twilio when the call connects. Returns TwiML instructions.

**Response:** TwiML XML for voice recording

### 4. Recording Handler (Twilio)
**POST** `/api/v1/handle-recording`

Called by Twilio after recording completion. Downloads and saves the recording.

**Body:** Twilio webhook payload with recording URL

### 5. Call Status Updates (Twilio)
**POST** `/api/v1/call-status`

Receives call status updates from Twilio.

**Body:** Twilio status callback payload

### 6. List Recordings
**GET** `/api/v1/recordings`

Get a list of all recorded stories.

**Headers:**
```
x-api-key: your_api_key_here
```

**Response:**
```json
{
  "recordings": [
    {
      "filename": "story-1705312200000.mp3",
      "size": 1024000,
      "created": "2024-01-15T10:30:00.000Z",
      "path": "/api/v1/recordings/story-1705312200000.mp3"
    }
  ]
}
```

### 7. Download Recording
**GET** `/api/v1/recordings/:filename`

Download a specific recording file.

**Headers:**
```
x-api-key: your_api_key_here
```

**Response:** Audio file (MP3)

## Error Responses

All endpoints return consistent error formats:

```json
{
  "error": "Error message",
  "details": "Additional error details (development only)"
}
```

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- **API endpoints**: 10 requests per second
- **Voice endpoints**: 5 requests per second (Twilio webhooks)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | Yes |
| `BASE_URL` | Base URL for webhooks | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | Yes |
| `MY_PHONE_NUMBER` | Default target phone number | Yes |
| `API_KEY` | API key for authentication | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | Yes |
| `RECORDINGS_PATH` | Path to store recordings | No |
| `MAX_RECORDING_DURATION` | Max recording length in seconds | No |

## Integration Example

```javascript
// Initiate a call
const response = await fetch('https://your-domain.com/api/v1/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_api_key_here'
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890'
  })
});

const result = await response.json();
console.log('Call initiated:', result.sid);
```

## Webhook URLs for Twilio

When configuring Twilio, use these webhook URLs:

- **Voice Webhook**: `https://your-domain.com/api/v1/voice`
- **Status Callback**: `https://your-domain.com/api/v1/call-status`
- **Recording Status Callback**: `https://your-domain.com/api/v1/handle-recording` 