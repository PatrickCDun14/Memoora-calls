# Memoora Call Recording Microservice

A production-ready microservice for initiating phone calls, asking AI-powered questions, and automatically recording responses with full database integration.

## 🚀 Features

- **Phone Call Management**: Initiate outbound calls via Twilio
- **AI Question Reading**: Text-to-Speech integration for dynamic questions
- **Automatic Recording**: Record call responses with metadata
- **Database Integration**: Supabase storage for calls and recordings
- **Webhook System**: Notify main applications when recordings complete
- **API Key Management**: Secure, scalable API key system
- **Rate Limiting**: Built-in protection against abuse
- **Environment Management**: Development, staging, and production configs

## 🏗️ Architecture

```
Your App → Memoora API → Twilio → Phone Calls → Recordings → Supabase → Webhooks
```

## 📋 Prerequisites

- Node.js 18+
- Twilio Account (Account SID, Auth Token, Phone Number)
- Supabase Project (URL, Service Role Key)
- OpenAI API Key (for TTS features)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd Memoora-calls
npm install
```

### 2. Environment Setup
```bash
cp env.example .env
# Edit .env with your credentials
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Generate API Key
```bash
curl -X POST "http://localhost:5005/api/v1/generate-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Your App",
    "email": "your@email.com",
    "companyWebsite": "https://yourapp.com",
    "phoneNumber": "+1234567890"
  }'
```

### 5. Make a Call
```bash
curl -X POST "http://localhost:5005/api/v1/call" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to_number": "+1234567890",
    "question": "Tell me about your favorite memory",
    "interactive": true,
    "storytellerId": "user-123"
  }'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | ✅ |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | ✅ |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | ✅ |
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for TTS | ✅ |
| `BASE_URL` | Your public service URL | ✅ |
| `APP_BACKEND_URL` | Main app webhook URL | ✅ |
| `MEMOORA_CALL_SERVICE_API_KEY` | Shared secret for webhooks | ✅ |

### Environment Management
```bash
# Switch to development
./scripts/deployment/switch-env.sh development

# Switch to production
./scripts/deployment/switch-env.sh production
```

## 📚 API Reference

### Authentication
All API calls require an `x-api-key` header with a valid API key.

### Endpoints

#### Generate API Key
```http
POST /api/v1/generate-api-key
```

#### Initiate Call
```http
POST /api/v1/call
```

#### Get Recordings
```http
GET /api/v1/recordings
```

#### Download Recording
```http
GET /api/v1/recordings/{filename}
```

## 🗄️ Database Schema

The service uses Supabase with the following main tables:
- `calls` - Call metadata and status
- `recordings` - Recording files and metadata
- `api_keys` - API key management
- `accounts` - Account information

## 🚀 Deployment

### Render (Recommended)
```bash
# Deploy to Render
./scripts/deployment/deploy-render.sh
```

### Docker
```bash
# Build and run
docker-compose up -d
```

### Manual Deployment
```bash
# Set production environment
./scripts/deployment/switch-env.sh production

# Start production server
npm start
```

## 🔒 Security

- API key authentication
- Rate limiting
- CORS protection
- Input validation
- HMAC webhook signatures

## 📊 Monitoring

- Health check endpoint: `/health`
- Call status webhooks
- Recording completion notifications
- Database integration monitoring

## 🤝 Integration

See `docs/INTEGRATION_GUIDE.md` for detailed integration instructions with your main application.

## 📝 License

[Your License Here]

## 🆘 Support

For support, contact: [your-email@domain.com]
