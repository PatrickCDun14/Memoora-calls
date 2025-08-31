# Memoora Calls Microservice

A simple, focused microservice for initiating phone calls and recording stories via Twilio.

## 🎯 What It Does

- **Initiate Phone Calls**: Make outbound calls to storytellers
- **Professional Caller ID**: Display "Memoora" instead of phone number (Alpha Sender ID)
- **Record Stories**: Automatically record responses during calls
- **Store Recordings**: Save audio files locally with metadata
- **API Management**: Generate and validate API keys for access

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Copy `env.example` to `.env` and configure:
```bash
cp env.example .env
```

Required variables:
- `TWILIO_ACCOUNT_SID`: Your Twilio account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio auth token  
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number

Optional variables:
- `USE_ALPHA_SENDER_ID`: Set to `true` to enable professional caller ID
- `ALPHA_SENDER_ID`: Text to display as caller ID (default: "Memoora")
- `FALLBACK_PHONE_NUMBER`: Phone number to use if alpha sender fails

### 3. Start the Service
```bash
# Development
npm run dev

# Production
npm start
```

The service will be available at `http://localhost:5005`

## 📞 API Endpoints

### Public Endpoints
- `GET /health` - Service health check
- `POST /api/v1/generate-api-key` - Generate new API key

### Protected Endpoints (require `x-api-key` header)
- `POST /api/v1/call` - Initiate a phone call
- `GET /api/v1/calls` - List all calls
- `GET /api/v1/calls/:id` - Get call details
- `GET /api/v1/recordings` - List all recordings
- `GET /api/v1/recordings/:filename` - Get recording details
- `GET /api/v1/api-keys` - List API keys
- `GET /api/v1/stats` - Service statistics

## 🔑 Authentication

All protected endpoints require an API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your_api_key_here" \
     http://localhost:5005/api/v1/calls
```

## 📱 Making a Call

```bash
curl -X POST "http://localhost:5005/api/v1/call" \
  -H "x-api-key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customMessage": "Tell me about your favorite childhood memory",
    "storytellerId": "storyteller-123",
    "familyMemberId": "family-456"
  }'
```

## 🎵 Recording Flow

1. **Call Initiated**: Service creates call record and initiates Twilio call
2. **Phone Rings**: Storyteller receives call with your custom message (shows "Memoora" as caller ID)
3. **Recording Starts**: Twilio automatically records the response
4. **Webhook Received**: Service downloads and stores the recording
5. **Call Complete**: Recording metadata linked to call record

## 📞 Professional Caller ID (Alpha Sender ID)

The service supports **Alpha Sender ID** to display "Memoora" instead of a phone number on the recipient's caller ID. This creates a more professional and recognizable caller experience.

### Enable Alpha Sender ID

```bash
# In your .env file
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=Memoora
FALLBACK_PHONE_NUMBER=+1234567890  # Optional fallback
```

### Benefits
- ✅ **Professional appearance** - Shows "Memoora" instead of random number
- ✅ **Brand recognition** - Recipients immediately know it's from Memoora
- ✅ **Higher answer rates** - People are more likely to answer calls from known brands
- ✅ **Automatic fallback** - Falls back to phone number if alpha sender ID not supported

For detailed configuration and testing, see [ALPHA_SENDER_ID_GUIDE.md](ALPHA_SENDER_ID_GUIDE.md).

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Client    │───▶│  Express App    │───▶│  Twilio API     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  In-Memory      │
                       │  Services       │
                       │  - API Keys     │
                       │  - Calls        │
                       │  - Recordings   │
                       └─────────────────┘
```

## 🔧 Local Development

### Using ngrok for Twilio Webhooks
```bash
# Install ngrok
npm install -g ngrok

# Start your service
npm run dev

# In another terminal, expose local service
ngrok http 5005

# Update .env with ngrok URL
BASE_URL=https://your-ngrok-url.ngrok-free.app
```

### Testing the Complete Flow
1. Generate an API key
2. Make a test call
3. Check call status
4. Verify recording download

## 📁 Project Structure

```
├── index.js                    # Main application entry point
├── routes-memoora/
│   └── simple-memoora.js      # API route definitions
├── utils/
│   ├── simple-api-key-service.js    # API key management
│   ├── simple-call-service.js       # Call tracking
│   ├── simple-twilio-service.js     # Twilio integration
│   └── simple-recording-service.js  # Recording storage
├── config/
│   └── environment.js         # Environment configuration
├── recordings/                # Downloaded audio files
└── package.json
```

## 🚀 Deployment

### Docker
```bash
docker build -t memoora-calls .
docker run -p 5005:5005 --env-file .env memoora-calls
```

### Render
The service includes `render.yaml` for automatic deployment on Render.

## 📊 Monitoring

- **Health Check**: `GET /health`
- **Service Stats**: `GET /api/v1/stats`
- **API Key Usage**: Tracked per key with rate limiting

## 🔒 Security Features

- API key authentication for all protected endpoints
- Rate limiting per API key
- CORS configuration for allowed domains
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
