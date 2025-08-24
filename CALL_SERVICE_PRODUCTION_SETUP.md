# 📞 Memoora Call Service - Production Setup Guide

## 🎯 Overview

This guide explains how to set up the production call service to replace the current ngrok-based development setup. The goal is to create a reliable, scalable service that integrates with Twilio for making outbound calls to storytellers.

## 🏗️ Current Architecture

```
Frontend (Vercel) → Backend (Render) → Call Service (ngrok) → Twilio → Phone Calls
```

## 🚀 Target Architecture

```
Frontend (Vercel) → Backend (Render) → Call Service (Render) → Twilio → Phone Calls
```

## �� Prerequisites

- [x] GitHub repository access ✅
- [x] Render account (free tier works) ✅
- [x] Twilio account with Voice API enabled ✅
- [x] Environment variables from current setup ✅
- [x] Supabase database configured ✅

## 🔧 Step 1: Understand Current Call Service

### Current Implementation
The call service is currently running locally with ngrok, handling:
- **Call initiation** from the backend
- **Twilio webhook processing** for call status updates
- **Recording management** and storage
- **Call flow logic** (questions, prompts, etc.)
- **Voice modularity system** (snippets, templates, configurations)
- **Question-based calling** with Text-to-Speech integration

### Key Files in Current Service
- `index.js` - Main application entry point
- `routes-memoora/memoora.js` - Main API routes for calls and recordings
- `utils/` - Services for API keys, Supabase, TTS, and webhook notifications
- `config/environment.js` - Environment configuration
- `render.yaml` - Render deployment configuration (already configured)

### Current ngrok URL
`https://4b80228e6406.ngrok-free.app` (development only)

## 🚀 Step 2: Deploy Call Service to Render

### 2.1 Service Already Configured ✅
Your `render.yaml` is already set up with:
- Service name: `memoora-calls`
- Port: `5005`
- Environment variables configured
- Build and start commands ready

### 2.2 Deploy to Render
1. **Push your code to GitHub** (if not already done)
2. **Connect repository to Render** (if not already done)
3. **Deploy the service**

```bash
# Your service should deploy automatically when you push to main
git push origin main
```

### 2.3 Verify Deployment
Check your Render dashboard for:
- Service status: "Live" ✅
- Build logs: No errors
- Environment variables: All set correctly

## 🔄 Step 3: Update Backend Configuration

### 3.1 Update Environment Variables
In your Render backend service, update:
```bash
MEMOORA_CALL_SERVICE_URL=https://memoora-calls.onrender.com
MEMOORA_CALL_SERVICE_API_KEY=your_shared_secret_here
```

**Note**: This microservice will be deployed at `https://memoora-calls.onrender.com` and will communicate with your main backend at `https://memoora-backend.onrender.com`.

### 3.2 Remove ngrok Dependencies
- Update any hardcoded ngrok URLs in your backend
- Ensure all webhook endpoints point to the new Render service

## 📱 Step 4: Twilio Webhook Configuration

### 4.1 Update Webhook URLs
In your Twilio console, update webhook URLs from:
```
https://4b80228e6406.ngrok-free.app/api/v1/voice
https://4b80228e6406.ngrok-free.app/api/v1/voice-interactive
https://4b80228e6406.ngrok-free.app/api/v1/handle-recording
https://4b80228e6406.ngrok-free.app/api/v1/call-status
```

To:
```
https://memoora-calls.onrender.com/api/v1/voice
https://memoora-calls.onrender.com/api/v1/voice-interactive
https://memoora-calls.onrender.com/api/v1/handle-recording
https://memoora-calls.onrender.com/api/v1/call-status
```

### 4.2 Required Webhook Endpoints
Your service already has these endpoints:
- `/api/v1/voice` - Handle basic voice calls
- `/api/v1/voice-interactive` - Handle question-based calls with TTS
- `/api/v1/handle-recording` - Process call recordings
- `/api/v1/call-status` - Handle call status updates

## 🧪 Step 5: Testing & Validation

### 5.1 Test Service Health
```bash
# Test service health
curl https://memoora-calls.onrender.com/health

# Test basic endpoint
curl https://memoora-calls.onrender.com/api/v1/health
```

### 5.2 Test Complete Flow
1. **Schedule a call** from the frontend
2. **Initiate the call** (should hit your new Render service)
3. **Verify Twilio receives** the call request
4. **Check webhook processing** for call updates
5. **Validate recording storage** in your database

## 🔒 Step 6: Security & Production Considerations

### 6.1 API Key Authentication ✅
- API key validation implemented
- Environment variables for sensitive data
- Rate limiting implemented

### 6.2 Error Handling ✅
- Comprehensive error logging
- Graceful failure handling
- Database connection error handling

### 6.3 Scalability ✅
- Render auto-scaling ready
- Database connection pooling
- Efficient file handling

## 🚨 Troubleshooting Common Issues

### Issue: Call Service Not Responding
- Check Render deployment status
- Verify environment variables
- Check service logs in Render dashboard

### Issue: Twilio Webhooks Failing
- Verify webhook URLs are correct
- Check if service is accessible from internet
- Validate webhook endpoint implementations

### Issue: Database Connection Errors
- Verify Supabase credentials
- Check network access from Render
- Validate database schema

## 📊 Monitoring & Maintenance

### 6.1 Health Checks ✅
Your service has health check endpoints:
- `/health` - Basic service health
- `/api/v1/health` - API health status

### 6.2 Logging ✅
- Structured logging implemented
- Call attempts and results logged
- Error rates and response times tracked

### 6.3 Alerts
Set up alerts for:
- Service downtime
- High error rates
- Failed call attempts

## 🔄 Step 7: Migration Checklist

- [x] Call service configured for Render ✅
- [x] Environment variables configured ✅
- [x] Database schema ready ✅
- [x] API endpoints implemented ✅
- [x] API key generation endpoint added ✅
- [x] Health check endpoints implemented ✅
- [x] ngrok dependencies removed from code ✅
- [ ] Deploy call service to Render
- [ ] Update backend environment variables
- [ ] Update Twilio webhook URLs
- [ ] Test complete call flow
- [ ] Monitor service health
- [ ] Update documentation

## 📞 Support & Resources

### Twilio Documentation
- [Voice API Guide](https://www.twilio.com/docs/voice)
- [Webhook Handling](https://www.twilio.com/docs/voice/webhook)
- [Recording API](https://www.twilio.com/docs/voice/api/recording)

### Render Documentation
- [Web Services](https://render.com/docs/web-services)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Health Checks](https://render.com/docs/health-checks)

### Key Contacts
- **Backend Engineer**: [Your Name]
- **Frontend Engineer**: [Frontend Engineer Name]
- **DevOps/Infrastructure**: [Infrastructure Engineer Name]

## 🎯 Success Criteria

The setup is complete when:
1. ✅ Call service is deployed and accessible on Render
2. ✅ Backend can successfully initiate calls through the new service
3. ✅ Twilio webhooks are properly configured and working
4. ✅ Call recordings are being processed and stored
5. ✅ Complete call flow works end-to-end
6. ✅ Service is monitored and logging properly

## 🚀 Next Steps After Setup

1. **Performance optimization** - Add caching, connection pooling
2. **Advanced features** - Call analytics, quality metrics
3. **Scaling preparation** - Load testing, auto-scaling configuration
4. **Backup strategies** - Multi-region deployment, failover

## 🔧 Current Status

### ✅ What's Ready:
- Complete microservice codebase
- Database schema implemented
- API endpoints working
- Render configuration ready
- Environment variables configured
- Security features implemented
- Voice modularity system working
- Question-based calling with TTS
- Webhook notification system
- API key generation endpoint
- Health check endpoints
- ngrok dependencies removed from code

### 🚧 What Needs to be Done:
- Deploy to Render
- Update backend to use new service URL
- Update Twilio webhooks
- Test end-to-end flow
- Update documentation

---

**Your call service is production-ready! Just need to deploy and update the webhook URLs.** 🎉✨

**Questions? The service is well-architected and ready for production deployment.** 📞
