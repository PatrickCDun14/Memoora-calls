# 🌍 Environment Setup Guide

This guide explains how to set up and switch between development and production environments for your Memoora microservice.

## 📁 Environment Files

### `env.development` - Local Development
- **Lower limits** for testing (20 calls/day, 100/month)
- **Higher rate limits** for development (200 requests/hour)
- **Debug logging** enabled
- **Permissive CORS** for localhost and ngrok
- **Auto-delete failed calls** enabled

### `env.production` - Production Deployment
- **Higher limits** for production (1000 calls/day, 30000/month)
- **Lower rate limits** for security (50 requests/hour)
- **Warning logging** only
- **Restricted CORS** for security
- **Performance optimizations** enabled

## 🚀 Quick Start

### 1. Switch to Development Environment
```bash
# Make the script executable
chmod +x scripts/switch-env.sh

# Switch to development
./scripts/switch-env.sh development

# Start development server
npm run dev
```

### 2. Switch to Production Environment
```bash
# Switch to production
./scripts/switch-env.sh production

# Start production server
npm start
```

## 🔧 Manual Environment Setup

### Development Environment
```bash
# Copy development config
cp env.development .env

# Edit .env with your actual values
nano .env

# Start development server
NODE_ENV=development npm run dev
```

### Production Environment
```bash
# Copy production config
cp env.production .env

# Edit .env with your actual values
nano .env

# Start production server
NODE_ENV=production npm start
```

## 📋 Required Environment Variables

### Core Configuration
```bash
NODE_ENV=development|production
PORT=5005
BASE_URL=http://localhost:5005  # Development
BASE_URL=https://your-app.onrender.com  # Production
```

### Twilio Configuration
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+17085547471
```

### Supabase Configuration
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Phone Numbers
```bash
MY_PHONE_NUMBER=+16306326359
```

### Security Settings
```bash
# Development (more permissive)
ALLOWED_DOMAINS=localhost,127.0.0.1,ngrok.io,ngrok-free.app
MAX_CALLS_PER_DAY=20
MAX_REQUESTS_PER_HOUR=200

# Production (more restrictive)
ALLOWED_DOMAINS=yourcompany.com,trusted-partner.com
MAX_CALLS_PER_DAY=1000
MAX_REQUESTS_PER_HOUR=50
```

## 🧪 Testing Different Environments

### Test Development Environment
```bash
# Switch to development
./scripts/switch-env.sh development

# Test locally
npm run test:workflow:local

# Test with ngrok
npm run test:workflow:ngrok
```

### Test Production Environment
```bash
# Switch to production
./scripts/switch-env.sh production

# Test production endpoints
npm run test:prod
```

## 🚀 Deployment Environments

### Render Production Deployment
```bash
# In Render dashboard, set:
NODE_ENV=production
BASE_URL=https://your-app.onrender.com

# Use env.production as template
# Copy values to Render environment variables
```

### Local Development with ngrok
```bash
# Start ngrok
ngrok http 5005

# Copy ngrok URL to .env
BASE_URL=https://your-ngrok-url.ngrok-free.app

# Start development server
npm run dev
```

## 🔒 Security Considerations

### Development
- ✅ Lower security for easier testing
- ✅ More permissive CORS
- ✅ Higher rate limits
- ✅ Debug logging enabled

### Production
- ✅ Strict security settings
- ✅ Restricted CORS origins
- ✅ Lower rate limits
- ✅ Minimal logging
- ✅ Performance optimizations

## 📊 Environment Comparison

| Feature | Development | Production |
|---------|-------------|------------|
| **Call Limits** | 20/day, 100/month | 1000/day, 30000/month |
| **Rate Limits** | 200/hour | 50/hour |
| **Logging** | Debug | Warning only |
| **CORS** | Permissive | Restricted |
| **Auto-delete** | Enabled | Disabled |
| **Performance** | Basic | Optimized |

## 🚨 Troubleshooting

### Common Issues

#### Environment Not Switching
```bash
# Check if .env file exists
ls -la .env

# Verify environment file exists
ls -la env.development env.production

# Check script permissions
chmod +x scripts/switch-env.sh
```

#### Configuration Not Loading
```bash
# Restart the server after switching environments
npm run dev  # or npm start

# Check NODE_ENV
echo $NODE_ENV

# Verify .env file contents
cat .env | grep NODE_ENV
```

#### Rate Limiting Issues
```bash
# Check current limits in .env
cat .env | grep MAX_CALLS

# Adjust limits for testing
MAX_CALLS_PER_DAY=50
MAX_REQUESTS_PER_HOUR=100
```

## 🎯 Best Practices

1. **Never commit .env files** to version control
2. **Use different Supabase projects** for dev/prod
3. **Test rate limiting** in development before production
4. **Monitor logs** when switching environments
5. **Backup configurations** before major changes
6. **Use environment-specific** API keys and credentials

## 📚 Additional Resources

- [Environment Configuration](./config/environment.js)
- [Package.json Scripts](./package.json)
- [Render Deployment Guide](./RENDER_DEPLOYMENT.md)
- [Security Overview](./SECURITY.md) 