# 🚀 Deployment Guide - Memoora Call Recording Microservice

## 📋 Pre-Deployment Checklist

### ✅ Environment Setup
- [ ] `.env` file configured with production values
- [ ] `BASE_URL` set to your production domain
- [ ] `NODE_ENV` set to `production`
- [ ] All required API keys configured

### ✅ Database Setup
- [ ] Supabase project created and configured
- [ ] Database schema applied (see `database/schema/complete-schema.sql`)
- [ ] Service role key configured in `.env`

### ✅ External Services
- [ ] Twilio account configured
- [ ] OpenAI API key configured
- [ ] Main app webhook URL configured

## 🚀 Deployment Options

### Option 1: Render (Recommended)
```bash
# Deploy to Render
./scripts/deployment/deploy-render.sh
```

### Option 2: Docker
```bash
# Build and run with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Manual Deployment
```bash
# Set production environment
./scripts/deployment/switch-env.sh production

# Deploy
./scripts/deployment/deploy.sh
```

## 🔧 Production Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=5005
BASE_URL=https://your-production-domain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
OPENAI_API_KEY=your_openai_api_key
APP_BACKEND_URL=https://your-main-app.com
MEMOORA_CALL_SERVICE_API_KEY=your_shared_secret
MICROSERVICE_DB_WRITES_ENABLED=true
```

### Health Check
```bash
curl https://your-production-domain.com/health
```

### API Discovery
```bash
curl https://your-production-domain.com/api/v1/
```

## 📊 Monitoring

### Logs
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log
```

### Database Health
```bash
# Check database connection
curl https://your-production-domain.com/health
```

### Call Status
- Monitor `/api/v1/call-status` webhooks
- Check recording completion notifications
- Verify database storage

## 🔒 Security Checklist

- [ ] API keys are secure and not exposed
- [ ] CORS is properly configured for production
- [ ] Rate limiting is enabled
- [ ] Input validation is active
- [ ] Webhook signatures are verified
- [ ] HTTPS is enabled

## 🚨 Troubleshooting

### Common Issues
1. **Port already in use**: Check if service is already running
2. **Database connection failed**: Verify Supabase credentials
3. **Twilio errors**: Check account status and phone number
4. **Webhook failures**: Verify `BASE_URL` and webhook endpoints

### Debug Commands
```bash
# Check service status
ps aux | grep node

# Check port usage
lsof -i :5005

# Check environment
echo $NODE_ENV
echo $BASE_URL
```

## 📈 Scaling Considerations

- **Horizontal scaling**: Run multiple instances behind a load balancer
- **Database**: Ensure Supabase can handle your call volume
- **File storage**: Consider cloud storage for recordings
- **Monitoring**: Implement proper logging and alerting

## 🎯 Post-Deployment Verification

1. **Health check passes**
2. **API endpoints respond**
3. **Test call works**
4. **Recording storage works**
5. **Webhooks are sent**
6. **Database integration works**

## 📞 Support

For deployment issues, check:
1. Environment configuration
2. Database schema
3. External service credentials
4. Network connectivity
5. Service logs

---

**🎉 Your Memoora microservice is ready for production deployment!**
