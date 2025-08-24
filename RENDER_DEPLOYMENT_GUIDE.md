# 🚀 Render Deployment Guide for Memoora Microservice

## ⚠️ **Critical Render Considerations**

### **Ephemeral Filesystem**
- **Recordings are NOT persistent** on Render
- **Files are lost** when the service restarts
- **Consider cloud storage** for production recordings

### **Port Configuration**
- Render uses **port 5005** (not 10000)
- Application automatically adapts to `process.env.PORT`

## 🔧 **Render Deployment Setup**

### **Step 1: Create Render Account**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub/GitLab
3. Create a new account

### **Step 2: Connect Repository**
1. Click "New +" → "Web Service"
2. Connect your GitHub/GitLab repository
3. Select the `Memoora-calls` repository

### **Step 3: Configure Service**
```yaml
# Service Configuration
Name: memoora-api
Environment: Node
Region: Choose closest to your users
Branch: main
Root Directory: ./
Build Command: npm ci --only=production
Start Command: npm start
```

### **Step 4: Environment Variables**
Copy from `env.render.template` to Render environment variables:

#### **Required Variables:**
```bash
NODE_ENV=production
PORT=5005
BASE_URL=https://your-app-name.onrender.com
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
APP_BACKEND_URL=https://your-main-app.com
MEMOORA_CALL_SERVICE_API_KEY=your_shared_secret
```

#### **Optional Variables:**
```bash
MICROSERVICE_DB_WRITES_ENABLED=true
RECORDINGS_PATH=/tmp/recordings
MAX_RECORDING_DURATION=120
CORS_ORIGIN=https://your-app-name.onrender.com
```

### **Step 5: Deploy**
1. Click "Create Web Service"
2. Wait for build to complete
3. Verify health check passes: `/health`

## 🚨 **Render-Specific Issues & Solutions**

### **Issue 1: Recordings Not Persistent**
**Problem:** Recordings disappear after service restart
**Solutions:**
- Use Supabase storage for recordings
- Implement cloud storage (AWS S3, Google Cloud)
- Store only metadata in database

### **Issue 2: Port Conflicts**
**Problem:** Service won't start
**Solution:** Ensure `PORT=5005` in environment variables

### **Issue 3: Build Failures**
**Problem:** Build command fails
**Solutions:**
- Check `package.json` has correct scripts
- Verify all dependencies are in `dependencies` (not `devDependencies`)
- Ensure Node.js version compatibility

### **Issue 4: Environment Variable Issues**
**Problem:** Service can't read environment variables
**Solution:** Verify all variables are set in Render dashboard

## 🔒 **Security for Render Deployment**

### **Environment Variables**
- ✅ Never commit `.env` files
- ✅ Use Render's secure environment variable storage
- ✅ Rotate API keys regularly
- ✅ Use strong, unique secrets

### **CORS Configuration**
```bash
# Set in Render environment variables
CORS_ORIGIN=https://your-frontend-domain.com
ALLOWED_DOMAINS=yourcompany.com,trusted-partner.com
```

### **Rate Limiting**
```bash
# Configure in Render environment variables
MAX_REQUESTS_PER_HOUR=200
MAX_CALLS_PER_HOUR=20
```

## 📊 **Monitoring on Render**

### **Health Checks**
- Render automatically checks `/health` endpoint
- Service restarts if health check fails
- Monitor health check logs

### **Logs**
- View logs in Render dashboard
- Set up log forwarding if needed
- Monitor error rates and response times

### **Metrics**
- Response time monitoring
- Error rate tracking
- Resource usage monitoring

## 🚀 **Production Deployment Checklist**

### **Pre-Deployment**
- [ ] All environment variables configured
- [ ] Database schema applied to Supabase
- [ ] Twilio account configured and tested
- [ ] OpenAI API key configured
- [ ] Webhook URLs updated to Render domain

### **Deployment**
- [ ] Service builds successfully
- [ ] Health check passes
- [ ] All API endpoints respond
- [ ] Database connection works
- [ ] Twilio integration works

### **Post-Deployment**
- [ ] Test call initiation
- [ ] Verify recording storage
- [ ] Check webhook notifications
- [ ] Monitor performance
- [ ] Set up alerts

## 🔄 **Continuous Deployment**

### **Auto-Deploy**
- Render automatically deploys on git push
- Configure branch protection rules
- Test changes in staging environment

### **Rollback Strategy**
- Keep previous deployments
- Monitor for issues
- Quick rollback if needed

## 💰 **Cost Optimization**

### **Render Plans**
- **Starter**: $7/month (good for development)
- **Standard**: $25/month (recommended for production)
- **Pro**: $100/month (high-traffic applications)

### **Resource Limits**
- Monitor memory usage
- Optimize database queries
- Use efficient file handling

## 🆘 **Troubleshooting**

### **Common Issues**
1. **Build fails**: Check dependencies and Node.js version
2. **Service won't start**: Verify environment variables
3. **Health check fails**: Check application logs
4. **Database connection fails**: Verify Supabase credentials

### **Debug Commands**
```bash
# Check logs in Render dashboard
# Verify environment variables
# Test endpoints manually
# Check database connectivity
```

---

**🎉 Your Memoora microservice is now Render-ready!**

**Next Steps:**
1. **Set up Render account**
2. **Configure environment variables**
3. **Deploy the service**
4. **Test all functionality**
5. **Monitor performance**
