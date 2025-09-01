# 📞 Memoora Call Recording Microservice

A production-ready microservice for initiating phone calls and recording stories via Twilio, with professional caller ID support.

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
- `POST /api/v1/call` - Initiate outbound phone call
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

For detailed configuration and testing, see [docs/ALPHA_SENDER_ID_GUIDE.md](docs/ALPHA_SENDER_ID_GUIDE.md).

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
```

## 📁 Project Structure

```
├── config/                 # Configuration files
│   └── environment.js     # Environment validation
├── docs/                  # Documentation
│   ├── ALPHA_SENDER_*.md  # Alpha sender ID guides
│   ├── INTEGRATION_README.md
│   ├── PRODUCTION_*.md    # Production deployment guides
│   └── RENDER_DEPLOYMENT.md
├── routes-memoora/        # API routes
│   └── simple-memoora.js  # Main route handlers
├── tests/                 # Test files
│   ├── test-alpha-sender*.js
│   └── test-frontend-integration.js
├── scripts/               # Utility scripts
│   └── test-production.sh
├── utils/                 # Service modules
│   ├── simple-api-key-service.js
│   ├── simple-call-service.js
│   ├── simple-recording-service.js
│   └── simple-twilio-service.js
├── recordings/            # Audio recordings storage
├── index.js              # Main application entry point
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 📚 Documentation

### Core Documentation
- **[docs/ALPHA_SENDER_ID_GUIDE.md](docs/ALPHA_SENDER_ID_GUIDE.md)** - Complete alpha sender ID implementation guide
- **[docs/ALPHA_SENDER_DEPLOYMENT.md](docs/ALPHA_SENDER_DEPLOYMENT.md)** - Production deployment guide
- **[docs/ALPHA_SENDER_SUMMARY.md](docs/ALPHA_SENDER_SUMMARY.md)** - Implementation summary
- **[docs/ALPHA_SENDER_TWILIO_SETUP.md](docs/ALPHA_SENDER_TWILIO_SETUP.md)** - Twilio alpha sender ID setup guide

### Integration & Deployment
- **[docs/INTEGRATION_README.md](docs/INTEGRATION_README.md)** - Integration guide for main application
- **[docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)** - Production deployment instructions
- **[docs/RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md)** - Render-specific deployment guide
- **[docs/PRODUCTION_ENV_TEMPLATE.md](docs/PRODUCTION_ENV_TEMPLATE.md)** - Production environment template

### Testing
- **[tests/test-alpha-sender.js](tests/test-alpha-sender.js)** - Full alpha sender ID testing
- **[tests/test-alpha-sender-structure.js](tests/test-alpha-sender-structure.js)** - Structure validation
- **[tests/test-frontend-integration.js](tests/test-frontend-integration.js)** - Frontend integration testing
- **[scripts/test-production.sh](scripts/test-production.sh)** - Production testing script

## 🧪 Testing

### Run Structure Tests
```bash
node tests/test-alpha-sender-structure.js
```

### Run Full Alpha Sender Tests
```bash
node tests/test-alpha-sender.js
```

### Test Production Deployment
```bash
./scripts/test-production.sh
```

## 🚀 Deployment

### Render Deployment
The service is configured for deployment on Render. See [docs/RENDER_DEPLOYMENT.md](docs/RENDER_DEPLOYMENT.md) for details.

### Environment Variables
Set these in your deployment platform:
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
USE_ALPHA_SENDER_ID=false  # Set to true when ready
ALPHA_SENDER_ID=Memoora
```

## 📞 Support

### Getting Help
1. **Check logs** for detailed error messages
2. **Run test scripts** to verify configuration
3. **Review documentation** for troubleshooting steps
4. **Contact support** with specific error codes and logs

### Health Check
```bash
curl https://memoora-calls.onrender.com/health
```

---

**🎉 Ready to start making professional calls with Memoora!**

For detailed setup instructions, see the documentation in the `docs/` directory.
