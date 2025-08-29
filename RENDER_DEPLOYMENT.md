# 🚀 Render Deployment Guide

## 📋 **Prerequisites**
- GitHub repository with your code ✅
- Render account (free tier available)
- Twilio credentials ready

## 🌐 **Step 1: Create Render Account**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended)
3. Verify your email

## 🆕 **Step 2: Create New Web Service**
1. Click "New +" button
2. Select "Web Service"
3. Connect your GitHub repository: `PatrickCDun14/Memoora-calls`
4. Click "Connect"

## ⚙️ **Step 3: Configure Service**

### **Basic Settings:**
- **Name**: `memoora-calls` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users (US East/West recommended)
- **Branch**: `main`
- **Root Directory**: Leave empty (root of repo)

### **Build & Deploy:**
- **Build Command**: `npm ci --production`
- **Start Command**: `npm start`

### **Plan:**
- **Free**: Start with free tier (750 hours/month)
- **Paid**: Upgrade later if needed

## 🔑 **Step 4: Set Environment Variables**

Click "Environment" tab and add these variables:

### **Required Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+17085547471
```

### **Production Variables:**
```bash
NODE_ENV=production
BASE_URL=https://your-app-name.onrender.com
ALLOWED_DOMAINS=yourdomain.com,app.yourdomain.com
```

### **Optional Variables:**
```bash
PORT=10000
LOG_LEVEL=info
```

## 🚀 **Step 5: Deploy**
1. Click "Create Web Service"
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build the application
   - Start the service

## 📊 **Step 6: Monitor Deployment**
- Watch the build logs
- Wait for "Deploy successful" message
- Your app will be available at: `https://your-app-name.onrender.com`

## ✅ **Step 7: Test Your Deployment**

### **Health Check:**
```bash
curl https://your-app-name.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-08-29T...",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 123.45
}
```

### **API Discovery:**
```bash
curl https://your-app-name.onrender.com/api/v1/
```

## 🔧 **Step 8: Configure Twilio Webhooks**

Update your Twilio webhook URLs to point to Render:

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to Phone Numbers → Manage → Active numbers
3. Click on your number: `+17085547471`
4. Update webhook URLs:
   - **Voice Configuration**: `https://your-app-name.onrender.com/api/v1/voice`
   - **Status Callback**: `https://your-app-name.onrender.com/api/v1/call-status`

## 🌍 **Step 9: Test Complete Flow**

1. **Generate API Key:**
```bash
curl -X POST "https://your-app-name.onrender.com/api/v1/generate-api-key" \
  -H "Content-Type: application/json" \
  -d '{"clientName": "Production Test", "email": "test@example.com", "companyWebsite": "https://example.com", "phoneNumber": "+1234567890"}'
```

2. **Make a Test Call:**
```bash
curl -X POST "https://your-app-name.onrender.com/api/v1/call" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+13128484329", "customMessage": "Hi! This is a production test call from Render.", "storytellerId": "render-test", "callType": "storytelling", "interactive": true}'
```

## 🚨 **Troubleshooting**

### **Build Failures:**
- Check build logs in Render dashboard
- Verify `package.json` has correct scripts
- Ensure all dependencies are in `dependencies` (not `devDependencies`)

### **Runtime Errors:**
- Check application logs in Render dashboard
- Verify all environment variables are set
- Check Twilio credentials are correct

### **Webhook Issues:**
- Verify Twilio webhook URLs are updated
- Check Render app is accessible from internet
- Verify CORS settings in your code

## 📈 **Scaling & Monitoring**

### **Free Tier Limits:**
- 750 hours/month
- Sleeps after 15 minutes of inactivity
- Cold start on first request after sleep

### **Upgrading:**
- Choose paid plan for 24/7 uptime
- Better performance and reliability
- Custom domains and SSL

### **Monitoring:**
- View logs in Render dashboard
- Set up alerts for failures
- Monitor response times and uptime

## 🎉 **Success!**

Your Memoora microservice is now running in production on Render with:
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Auto-scaling
- ✅ Built-in monitoring
- ✅ Easy rollbacks
- ✅ Git-based deployments

## 🔄 **Future Updates**

To update your production app:
1. Push changes to GitHub `main` branch
2. Render automatically detects changes
3. Builds and deploys new version
4. Zero-downtime deployments

## 📞 **Support**

- **Render Docs**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
- **Your App Logs**: Available in Render dashboard
