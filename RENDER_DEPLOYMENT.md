# Memoora Render Deployment Guide

## 🚀 Overview
This guide will walk you through deploying Memoora to Render as a microservice that other applications can call via REST API endpoints.

## 📋 Prerequisites
- [ ] GitHub/GitLab repository with your Memoora code
- [ ] Render account (free tier available)
- [ ] Twilio account with credentials
- [ ] API key for authentication

## 🔧 What We've Prepared

### 1. Configuration Files
- ✅ `render.yaml` - Render deployment configuration
- ✅ `Dockerfile` - Updated for port 10000 (Render standard)
- ✅ `API_DOCUMENTATION.md` - Complete API reference for other services
- ✅ `scripts/deploy-render.sh` - Deployment verification script

### 2. Environment Variables
Your `.env` file is configured with:
- ✅ `TWILIO_ACCOUNT_SID` - Your Twilio account SID
- ✅ `TWILIO_AUTH_TOKEN` - Your Twilio auth token  
- ✅ `TWILIO_PHONE_NUMBER` - Your Twilio phone number
- ✅ `API_KEY` - Generated API key for authentication
- ✅ `BASE_URL` - Placeholder for your Render app URL

## 🚀 Deployment Steps

### Step 1: Push to Git Repository
```bash
git add .
git commit -m "Prepare Memoora for Render deployment"
git push origin main
```

### Step 2: Connect to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your Git repository
4. Select the repository containing Memoora

### Step 3: Configure Service
- **Name**: `memoora-api` (or your preferred name)
- **Environment**: `Node`
- **Build Command**: `npm ci --only=production`
- **Start Command**: `npm start`
- **Plan**: `Starter` (free tier)

### Step 4: Set Environment Variables
In Render dashboard, add these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Port for the service |
| `BASE_URL` | `https://your-app-name.onrender.com` | Your Render app URL |
| `TWILIO_ACCOUNT_SID` | `your_twilio_sid` | From your .env file |
| `TWILIO_AUTH_TOKEN` | `your_twilio_token` | From your .env file |
| `TWILIO_PHONE_NUMBER` | `+1234567890` | From your .env file |
| `API_KEY` | `your_api_key` | From your .env file |
| `CORS_ORIGIN` | `*` | Allow all origins (or specific domains) |

### Step 5: Deploy
1. Click "Create Web Service"
2. Render will automatically build and deploy
3. Wait for deployment to complete (usually 2-5 minutes)

## 🔗 After Deployment

### Your API Endpoints
Once deployed, your API will be available at:
- **Health Check**: `https://your-app-name.onrender.com/health`
- **Initiate Call**: `https://your-app-name.onrender.com/api/v1/call`
- **List Recordings**: `https://your-app-name.onrender.com/api/v1/recordings`
- **Download Recording**: `https://your-app-name.onrender.com/api/v1/recordings/{filename}`

### Test Your API
```bash
# Health check
curl https://your-app-name.onrender.com/health

# Initiate a call (replace with your actual API key)
curl -X POST https://your-app-name.onrender.com/api/v1/call \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

## 🔐 Security Considerations

### API Key Management
- ✅ API key authentication required for all endpoints
- ✅ Rate limiting: 10 calls/hour, 100 requests/hour
- ✅ CORS protection configured
- ✅ Helmet security headers enabled

### Environment Variables
- ✅ Sensitive data stored in Render environment variables
- ✅ No secrets committed to Git
- ✅ Production-ready security configuration

## 📱 Integration Examples

### For Other Services
Other services can now call Memoora using the examples in `API_DOCUMENTATION.md`:

```javascript
// Example: Node.js service calling Memoora
const axios = require('axios');

const memooraClient = axios.create({
  baseURL: 'https://your-app-name.onrender.com',
  headers: {
    'X-API-Key': 'your_api_key_here'
  }
});

// Start a recording
const result = await memooraClient.post('/api/v1/call', {
  phoneNumber: '+1234567890'
});
```

## 🚨 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure `PORT=10000` in environment variables
2. **Build failures**: Check Node.js version compatibility (>=18.0.0)
3. **Environment variables**: Verify all required variables are set in Render
4. **CORS errors**: Check `CORS_ORIGIN` setting

### Debug Commands
```bash
# Check deployment status
curl https://your-app-name.onrender.com/health

# View logs in Render dashboard
# Go to your service → Logs tab
```

## 📚 Next Steps

1. **Deploy to Render** using the steps above
2. **Test all endpoints** to ensure they work
3. **Update your other services** to use the new API endpoints
4. **Monitor usage** in Render dashboard
5. **Scale up** if needed (upgrade from free tier)

## 🎯 Benefits of This Setup

- ✅ **Microservice Architecture**: Memoora runs independently
- ✅ **Scalable**: Can handle multiple concurrent requests
- ✅ **Secure**: API key authentication and rate limiting
- ✅ **Documented**: Clear API documentation for integration
- ✅ **Production Ready**: Proper error handling and logging
- ✅ **Cost Effective**: Free tier available on Render

---

**Need Help?** Check the `API_DOCUMENTATION.md` file for detailed endpoint information and integration examples. 