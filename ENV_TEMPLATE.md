# 🌍 Environment Variables Guide

## 📋 Required Variables (Must be set)

These variables are **required** and will cause the service to fail on startup if missing:

### Database Configuration (Supabase)
```bash
# Your Supabase project URL
SUPABASE_URL=https://your-project.supabase.co

# Public anon key for database reads (API key validation, public data)
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Service role key for database writes (creating calls, storing data)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

### Twilio Configuration (Phone Service)
```bash
# Your Twilio account SID
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Your Twilio auth token
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Your verified Twilio phone number (format: +1XXXXXXXXXX)
TWILIO_PHONE_NUMBER=+1234567890
```

### OpenAI Configuration (AI Services)
```bash
# Your OpenAI API key
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

## 🔧 Optional Variables (Have sensible defaults)

### Environment & Server
```bash
# Environment (development/staging/production)
NODE_ENV=development

# Server port
PORT=5005

# Base URL for webhooks and callbacks
BASE_URL=http://localhost:5005

# CORS origin (defaults to BASE_URL)
CORS_ORIGIN=http://localhost:3000
```

### Application Limits
```bash
# Maximum recording duration in seconds
MAX_RECORDING_DURATION=120

# Daily call limit per API key
MAX_CALLS_PER_DAY=100

# Monthly call limit per API key
MAX_CALLS_PER_MONTH=1000
```

### Support & Configuration
```bash
# Support contact email
SUPPORT_EMAIL=support@memoora.com

# File storage paths
RECORDINGS_PATH=./recordings
TEMP_PATH=./temp
AUDIO_PATH=./audio
```

## 🛡️ Security Variables (Recommended for production)

### Domain & Access Control
```bash
# Comma-separated list of allowed domains
ALLOWED_DOMAINS=memoora.com,yourdomain.com

# Comma-separated list of blocked domains
BLOCKED_DOMAINS=spam.com,malicious.com

# Comma-separated list of admin API keys
ADMIN_API_KEYS=admin_key_1,admin_key_2

# Comma-separated list of allowed country codes
ALLOWED_COUNTRY_CODES=US,CA,GB
```

### Webhooks & Notifications
```bash
# Admin notification webhook URL
ADMIN_NOTIFICATION_WEBHOOK=https://your-webhook-url.com/notify
```

## 🧪 Development/Testing Variables

```bash
# Personal phone number for testing
MY_PHONE_NUMBER=+1234567890
```

## 📁 Environment File Setup

### 1. Local Development
```bash
# Copy template and fill in your values
cp ENV_TEMPLATE.md .env.local

# Edit with your actual credentials
nano .env.local
```

### 2. Production
```bash
# Create production environment file
cp ENV_TEMPLATE.md .env

# Edit with production values
nano .env
```

### 3. Git Ignore
```bash
# These files should never be committed
.env
.env.local
.env.production
.env.staging
```

## 🔑 Key Usage Logic

### Supabase Keys
- **`SUPABASE_ANON_KEY`**: Used for database reads (API key validation, public data access)
- **`SUPABASE_SERVICE_ROLE_KEY`**: Used for database writes (creating calls, storing recordings)

### Twilio Configuration
- **`TWILIO_PHONE_NUMBER`**: Must be a verified Twilio number
- **`TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`**: For making outbound calls

### Base URLs
- **`BASE_URL`**: Used for webhook callbacks and audio file URLs
- **`CORS_ORIGIN`**: Controls which domains can access the API

## 🚀 Quick Start

1. **Copy the template**: `cp ENV_TEMPLATE.md .env.local`
2. **Fill in required variables**: Database, Twilio, OpenAI
3. **Set optional variables**: Port, base URL, limits
4. **Start the service**: `npm start`

## ⚠️ Common Issues

### "Missing required environment variables"
- Check that all required variables are set
- Verify no typos in variable names
- Ensure `.env.local` file exists in project root

### "Twilio credentials not fully configured"
- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`
- Ensure Twilio phone number is verified

### "Supabase connection failed"
- Check `SUPABASE_URL` format
- Verify both `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
- Ensure Supabase project is active

## 🔍 Validation

The service will automatically validate your configuration on startup:

```bash
✅ Environment Configuration Loaded:
   Environment: development
   Port: 5005
   Base URL: http://localhost:5005
   Log Level: debug
✅ Twilio: Fully configured
✅ Supabase: Fully configured
✅ OpenAI: Configured
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Twilio Documentation](https://www.twilio.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Environment Variables Best Practices](https://12factor.net/config)
