# 🎙️ Memoora Call Recording Microservice

A powerful, scalable microservice for initiating phone calls, recording conversations, and managing call data through a simple REST API.

## 🚀 Features

- **📞 Phone Call Initiation** - Make outbound calls via Twilio
- **🎙️ Call Recording** - Automatic recording when calls are answered
- **❓ Question-Based Calling** - AI-powered TTS for dynamic questions
- **🗄️ Supabase Integration** - Persistent storage for calls and recordings
- **🔑 API Key Management** - Secure, scalable authentication
- **📊 Call Analytics** - Track call status, duration, and metadata
- **🎯 Interactive Call Flows** - Customizable call experiences
- **🔒 Security & Rate Limiting** - Production-ready security features

## 🎯 Use Cases

- **Storytelling Apps** - Record user stories with specific questions
- **Survey Calls** - Conduct phone-based surveys
- **Interview Recording** - Capture interview responses
- **Voice Memos** - Collect voice messages from users
- **Customer Feedback** - Record customer testimonials

## 🏗️ Architecture

```
Your App → Memoora API → Twilio → Phone Calls → Recordings → Supabase
```

- **Node.js/Express** backend
- **Twilio** for phone calls and recording
- **OpenAI TTS** for question reading
- **Supabase** for data persistence
- **Docker** for containerization
- **Render** for cloud deployment

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd memoora-calls
npm install
```

### 2. Environment Setup
```bash
cp env.example .env
# Fill in your Twilio, Supabase, and OpenAI credentials
```

### 3. Start Development
```bash
npm run dev
```

### 4. Test the Service
```bash
npm run test:call
```

## 🔧 Configuration

### Required Environment Variables
```bash
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (for TTS)
OPENAI_API_KEY=your_openai_api_key
TTS_PROVIDER=openai
ENABLE_QUESTION_READING=true

# Phone Numbers
MY_PHONE_NUMBER=+1234567890
BASE_URL=https://your-ngrok-url.ngrok-free.app
```

## 📚 API Reference

### Generate API Key
```http
POST /api/v1/generate-api-key
{
  "clientName": "Your App",
  "email": "app@example.com",
  "companyWebsite": "https://yourapp.com",
  "phoneNumber": "+1234567890"
}
```

### Make a Call
```http
POST /api/v1/call
x-api-key: your_api_key

{
  "phoneNumber": "+1234567890",
  "question": "Tell me about your childhood",
  "callType": "storytelling",
  "interactive": true
}
```

### List Recordings
```http
GET /api/v1/recordings
x-api-key: your_api_key
```

## 🧪 Testing

### Quick Tests
```bash
# Basic call test
npm run test:call

# Full workflow test
npm run test:workflow

# Voice modularity test
npm run test:voice-modularity

# Scalable calls test
npm run test:scalable-calls
```

### Test with ngrok
```bash
# Test with current ngrok URL
npm run test:call:ngrok
```

## 🚀 Deployment

### Local Development
```bash
npm run dev          # Development mode
npm run staging      # Staging mode
npm start           # Production mode
```

### Environment Switching
```bash
# Switch between environments
./scripts/switch-env.sh development
./scripts/switch-env.sh production
```

### Render Deployment
```bash
npm run deploy:render
```

## 📁 Project Structure

```
memoora-calls/
├── config/                 # Configuration files
├── routes-memoora/         # API route handlers
├── utils/                  # Utility services
├── tests/                  # Test suites
├── scripts/                # Deployment scripts
├── audio/                  # Custom audio files
├── recordings/             # Call recordings
├── database/               # Database schemas
└── docs/                   # Documentation
```

## 🔒 Security Features

- **API Key Authentication** - Secure access control
- **Rate Limiting** - Prevent abuse and control costs
- **Input Validation** - Sanitize all user inputs
- **CORS Protection** - Domain-based access control
- **Phone Number Validation** - Blocked number filtering

## 📊 Monitoring

### Health Check
```http
GET /health
```

### API Discovery
```http
GET /api/v1/
```

## 🎯 Enhanced Features

### Question-Based Calling
- **Dynamic Questions** - Send specific questions to storytellers
- **AI TTS** - OpenAI-powered text-to-speech
- **Interactive Flows** - Customizable call experiences
- **Fallback Support** - Graceful degradation on errors

### Voice Modularity
- **Voice Snippets** - Reusable audio components
- **Voice Templates** - Dynamic voice assembly
- **Voice Configurations** - Personalized voice settings

### Scalable Calls
- **Batch Processing** - Handle multiple calls efficiently
- **Queue Management** - Process calls asynchronously
- **Quota Management** - Control usage and costs

## 🔍 Troubleshooting

### Common Issues
- **"Unauthorized domain"** - Check `ALLOWED_DOMAINS`
- **"Account not authorized"** - Verify Twilio credentials
- **"Url is not valid"** - Set correct `BASE_URL`
- **"Invalid API key"** - Check API key and headers

### Debug Endpoints
```http
GET /health              # Service health
GET /api/v1/            # API discovery
GET /api/v1/openapi.json # OpenAPI spec
```

## 📚 Documentation

- **[API Integration Guide](API_INTEGRATION_GUIDE.md)** - For applications to call this service
- **[Integration Guide](INTEGRATION_GUIDE.md)** - For integrating with other systems
- **[Enhanced Features](ENHANCED_FEATURES_README.md)** - Question-based calling details
- **[Environment Setup](ENVIRONMENT_SETUP.md)** - Environment configuration
- **[Database Schema](database/schema/complete-schema.sql)** - Complete database structure

## 🚀 Roadmap

- **Multi-language Support** - International question support
- **Voice Cloning** - Personalized voice experiences
- **AI Question Generation** - Dynamic question creation
- **Advanced Analytics** - Call quality scoring
- **Webhook Management** - Custom webhook endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 Your Memoora microservice is ready for production!**

**Need help? Check the troubleshooting section or create an issue.**