# 🚀 Memoora Call Recording Microservice

A production-ready Node.js microservice for automated phone call recording with AI-powered conversation flows.

## 🎯 Features

- **📞 Phone Call Management**: Initiate, record, and manage phone calls via Twilio
- **🤖 AI Integration**: OpenAI-powered conversation flows and voice synthesis
- **🗄️ Data Persistence**: Supabase database for call records and API key management
- **🔐 Security**: API key authentication and rate limiting
- **🎭 Voice Personalities**: Customizable voice configurations for different use cases
- **📊 Webhooks**: Real-time call status updates and notifications

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend App  │───▶│  Memoora API     │───▶│   Twilio        │
│                 │    │  (Express.js)    │    │   (Telephony)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Supabase       │
                       │   (Database)     │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   OpenAI         │
                       │   (AI Services)  │
                       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- Supabase account and project
- Twilio account and phone number
- OpenAI API key

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd memoora-calls
npm install
```

### 2. Environment Setup
```bash
# Copy the environment template
cp ENV_TEMPLATE.md .env.local

# Edit with your credentials
nano .env.local
```

### 3. Start Development Server
```bash
npm run dev
```

The service will start on `http://localhost:5005` with automatic validation of your configuration.

## 🌍 Environment Variables

See `ENV_TEMPLATE.md` for complete environment variable documentation.

### Required Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

## 📡 API Endpoints

### Core Endpoints
- `POST /api/v1/call` - Initiate outbound phone call
- `GET /api/v1/recordings` - List call recordings
- `GET /api/v1/recordings/:filename` - Download specific recording
- `POST /api/v1/generate-api-key` - Generate new API key

### Health & Info
- `GET /health` - Service health check
- `GET /api/v1/` - API discovery and documentation

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server with nodemon
npm run start        # Start production server
npm run staging      # Start staging server
npm run production   # Start production server
```

### Project Structure
```
memoora-calls/
├── config/              # Configuration files
│   ├── environment.js   # Environment variable management
│   └── supabase.js      # Supabase client configuration
├── routes-memoora/      # API route handlers
│   ├── memoora.js       # Core call management routes
│   ├── voice-modularity.js # Voice configuration routes
│   └── scalable-calls.js # Scalable call handling
├── utils/               # Utility services
│   ├── api-key-service.js # API key management
│   ├── supabase-service.js # Database operations
│   ├── twilio.js        # Twilio integration
│   └── security.js      # Authentication & security
├── index.js             # Main application entry point
└── package.json         # Dependencies and scripts
```

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm run production
```

### Environment-Specific
```bash
NODE_ENV=production npm start
NODE_ENV=staging npm start
```

## 🔐 Security Features

- **API Key Authentication**: Secure API key validation with rate limiting
- **Request Validation**: Input sanitization and phone number validation
- **Rate Limiting**: Per-API key and global rate limiting
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: HTTP security headers

## 📊 Monitoring

The service provides comprehensive logging and monitoring:

- **Startup Validation**: Automatic configuration validation
- **Request Logging**: Detailed API request/response logging
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance Metrics**: Response time and rate limit monitoring

## 🆘 Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Check your `.env.local` file
   - Ensure all required variables are set

2. **"Supabase connection failed"**
   - Verify Supabase credentials
   - Check project status

3. **"Twilio credentials not fully configured"**
   - Verify Twilio SID, token, and phone number
   - Ensure phone number is verified

### Getting Help

- Check the logs for detailed error messages
- Verify your environment configuration
- Review the `ENVIRONMENT_CLEANUP_SUMMARY.md` for common fixes

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
