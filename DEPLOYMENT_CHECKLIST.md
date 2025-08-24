# 🚀 Deployment Readiness Checklist

## ✅ **Pre-Deployment Requirements**

### **Environment Configuration**
- [ ] `.env` file created from `env.production.template`
- [ ] `NODE_ENV=production` set
- [ ] `BASE_URL` set to production domain
- [ ] `PORT=5005` configured
- [ ] All API keys and secrets configured

### **External Services**
- [ ] Twilio account active and configured
- [ ] Supabase project created and schema applied
- [ ] OpenAI API key configured (if using TTS)
- [ ] Main app webhook URL configured

### **Database Setup**
- [ ] Supabase project URL configured
- [ ] Service role key configured
- [ ] Database schema applied (`database/schema/complete-schema.sql`)
- [ ] Test database connection

### **Security Configuration**
- [ ] CORS origins configured for production
- [ ] Rate limiting enabled
- [ ] API key validation working
- [ ] Webhook signatures configured

## 🔧 **Deployment Steps**

### **Step 1: Environment Setup**
```bash
# Copy production template
cp env.production.template .env

# Edit with your values
nano .env
```

### **Step 2: Dependencies**
```bash
# Install production dependencies
npm ci --only=production

# Verify no dev dependencies
npm list --only=prod
```

### **Step 3: Test Locally**
```bash
# Test production mode locally
NODE_ENV=production npm start

# Check health endpoint
curl http://localhost:5005/health
```

### **Step 4: Deploy**
```bash
# Option A: Docker
docker-compose -f docker-compose.prod.yml up -d

# Option B: Direct deployment
./scripts/deployment/deploy.sh

# Option C: Render
./scripts/deployment/deploy-render.sh
```

## 🧪 **Post-Deployment Verification**

### **Health Checks**
- [ ] Health endpoint responds: `/health`
- [ ] API discovery works: `/api/v1/`
- [ ] CORS configured correctly
- [ ] Rate limiting active

### **Core Functionality**
- [ ] API key generation works
- [ ] Call initiation works
- [ ] Recording storage works
- [ ] Webhook notifications work
- [ ] Database integration works

### **External Integrations**
- [ ] Twilio calls work
- [ ] Supabase storage works
- [ ] OpenAI TTS works (if enabled)
- [ ] App backend notifications work

## 🚨 **Common Issues & Solutions**

### **Port Already in Use**
```bash
# Check what's using port 5005
lsof -i :5005

# Kill process if needed
kill -9 <PID>
```

### **Database Connection Failed**
- Verify Supabase credentials
- Check network connectivity
- Ensure schema is applied

### **Twilio Errors**
- Verify account status
- Check phone number permissions
- Ensure webhook URLs are accessible

### **CORS Issues**
- Verify `BASE_URL` is correct
- Check CORS configuration
- Ensure frontend domain is allowed

## 📊 **Monitoring Setup**

### **Logs**
```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Docker logs (if using Docker)
docker-compose -f docker-compose.prod.yml logs -f
```

### **Health Monitoring**
- Set up health check alerts
- Monitor response times
- Track error rates
- Monitor database performance

## 🔒 **Security Verification**

- [ ] No sensitive data in logs
- [ ] API keys are secure
- [ ] Rate limiting prevents abuse
- [ ] Input validation active
- [ ] CORS properly configured
- [ ] Webhook signatures verified

## 📈 **Performance Considerations**

- [ ] Response times under 500ms
- [ ] Database queries optimized
- [ ] File uploads handled efficiently
- [ ] Memory usage reasonable
- [ ] CPU usage stable

## 🎯 **Final Verification**

### **Test Call Flow**
1. Generate API key
2. Initiate test call
3. Verify recording
4. Check database storage
5. Confirm webhook notification

### **Load Testing**
- Test with multiple concurrent calls
- Verify rate limiting works
- Check database performance under load

---

**🎉 If all items are checked, your microservice is ready for production!**
