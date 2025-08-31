# 🚀 Alpha Sender ID Deployment Guide

## 📋 Overview

This guide walks you through deploying the Alpha Sender ID feature to production. The feature allows outgoing calls to display "Memoora" instead of a phone number on the recipient's caller ID.

## 🎯 Pre-Deployment Checklist

### ✅ Environment Variables

Ensure these variables are set in your production environment:

```bash
# Required Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Alpha Sender ID Configuration
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=Memoora
FALLBACK_PHONE_NUMBER=+1234567890  # Optional, defaults to TWILIO_PHONE_NUMBER

# Server Configuration
BASE_URL=https://memoora-calls.onrender.com
NODE_ENV=production
```

### ✅ Twilio Account Requirements

1. **Verified Account**: Ensure your Twilio account is verified
2. **Phone Number**: Verify your Twilio phone number is active
3. **Alpha Sender ID Support**: Check if your account supports alpha sender IDs
4. **Permissions**: Ensure your account has outbound calling permissions

### ✅ Testing Requirements

1. **Local Testing**: Run `node test-alpha-sender-structure.js` ✅
2. **Configuration Test**: Verify environment variables are set correctly
3. **Test Call**: Make a test call to verify alpha sender ID works

## 🚀 Deployment Steps

### Step 1: Update Environment Variables

#### For Render Deployment

1. Go to your Render dashboard
2. Navigate to your service
3. Go to **Environment** tab
4. Add/update these variables:

```bash
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=Memoora
FALLBACK_PHONE_NUMBER=+1234567890
```

#### For Other Platforms

Update your environment variables according to your platform:

- **Heroku**: `heroku config:set USE_ALPHA_SENDER_ID=true`
- **AWS**: Update environment variables in your deployment configuration
- **Docker**: Update your `.env` file or environment configuration

### Step 2: Deploy Code

```bash
# Commit your changes
git add .
git commit -m "Add alpha sender ID support with fallback functionality"

# Push to your repository
git push origin main

# Your platform will automatically deploy the changes
```

### Step 3: Verify Deployment

#### Health Check

```bash
curl https://memoora-calls.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "version": "1.0.0"
}
```

#### Service Discovery

```bash
curl https://memoora-calls.onrender.com/api/v1/
```

This should return the API endpoints and service information.

### Step 4: Test Alpha Sender ID

#### Generate API Key

```bash
curl -X POST "https://memoora-calls.onrender.com/api/v1/generate-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Alpha Sender Test",
    "email": "test@example.com",
    "companyWebsite": "https://example.com",
    "phoneNumber": "+1234567890"
  }'
```

#### Make Test Call

```bash
curl -X POST "https://memoora-calls.onrender.com/api/v1/call" \
  -H "x-api-key: YOUR_GENERATED_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customMessage": "Test call with Memoora caller ID"
  }'
```

#### Verify Caller ID

1. **Check your phone**: The call should display "Memoora" as the caller ID
2. **Check logs**: Review service logs for alpha sender ID usage
3. **Check call record**: Verify the call record includes caller ID information

## 📊 Monitoring & Verification

### Check Service Logs

Monitor your service logs for alpha sender ID usage:

```bash
# Look for these log messages:
📞 Attempting call with alpha sender ID: Memoora
✅ Call initiated successfully with alpha sender ID: Memoora
📞 Call call_1234567890_1 initiated with caller ID: Memoora (alpha_sender)
```

### Check Call Records

Verify call records include caller ID information:

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://memoora-calls.onrender.com/api/v1/calls
```

Look for this in the response:
```json
{
  "metadata": {
    "callerId": "Memoora",
    "callerIdType": "alpha_sender",
    "fallbackUsed": false
  }
}
```

### Monitor Fallback Usage

If alpha sender ID fails, you'll see fallback logs:

```bash
❌ Alpha sender ID failed: Invalid 'from' phone number
🔄 Falling back to phone number: +1234567890
⚠️  Fallback used for call call_1234567890_1: Invalid 'from' phone number
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### Issue: Alpha Sender ID Not Working

**Symptoms**: Calls still show phone number instead of "Memoora"

**Solutions**:
1. Verify `USE_ALPHA_SENDER_ID=true` is set
2. Check if `ALPHA_SENDER_ID=Memoora` is configured
3. Review logs for fallback usage
4. Test with different carriers/regions

#### Issue: Calls Failing

**Symptoms**: Calls fail with error 21211 or similar

**Solutions**:
1. Verify Twilio credentials are correct
2. Check if alpha sender ID is supported in target region
3. Ensure fallback phone number is valid
4. Review Twilio Console for account limitations

#### Issue: Environment Variables Not Applied

**Symptoms**: Service still uses old configuration

**Solutions**:
1. Verify environment variables are set correctly
2. Restart the service after updating variables
3. Check platform-specific deployment requirements
4. Verify variable names match exactly

### Error Codes & Solutions

| Error | Description | Solution |
|-------|-------------|----------|
| `21211` | Invalid 'from' phone number | Alpha sender ID not supported, check fallback |
| `21214` | 'from' phone number not verified | Verify phone number in Twilio Console |
| `21215` | 'from' phone number not owned by subaccount | Check Twilio account permissions |

## 📈 Success Metrics

### Monitor These Metrics

1. **Alpha Sender Success Rate**: Percentage of calls using alpha sender ID
2. **Fallback Rate**: Percentage of calls falling back to phone number
3. **Answer Rate**: Compare before/after alpha sender ID implementation
4. **User Feedback**: Gather feedback on caller ID experience

### Expected Improvements

- **Answer Rate**: 20-40% increase in call answer rates
- **Brand Recognition**: Users immediately recognize "Memoora" calls
- **Professional Appearance**: More legitimate and trustworthy calls

## 🔄 Rollback Plan

If issues occur, you can quickly disable alpha sender ID:

### Quick Disable

Set environment variable:
```bash
USE_ALPHA_SENDER_ID=false
```

### Verify Rollback

1. **Check logs**: Should show "Alpha Sender ID: disabled"
2. **Test call**: Should use phone number as caller ID
3. **Monitor**: Ensure calls continue working normally

## 📞 Support

### Getting Help

If you encounter deployment issues:

1. **Check logs** for detailed error messages
2. **Verify environment variables** are set correctly
3. **Test locally** with `node test-alpha-sender-structure.js`
4. **Contact support** with specific error codes and logs

### Useful Commands

```bash
# Test service health
curl https://memoora-calls.onrender.com/health

# Check service configuration
curl https://memoora-calls.onrender.com/api/v1/

# View recent calls
curl -H "x-api-key: YOUR_API_KEY" \
  https://memoora-calls.onrender.com/api/v1/calls

# Test alpha sender ID locally
node test-alpha-sender-structure.js
```

---

**🎉 Your Alpha Sender ID feature is now deployed and ready to provide professional caller ID!**

Monitor the logs and user feedback to ensure everything is working correctly. The system will automatically handle fallback scenarios to ensure reliable call delivery.
