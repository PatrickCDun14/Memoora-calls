# 📞 Alpha Sender ID Implementation Guide

## 🎯 Overview

This guide explains how to configure and use the **Alpha Sender ID** feature in the Memoora Call Recording Microservice. This feature allows outgoing calls to display "Memoora" (or your custom name) instead of a phone number on the recipient's caller ID.

## ✨ What is Alpha Sender ID?

An **Alpha Sender ID** is a text-based caller ID that displays a name (like "Memoora") instead of a phone number when making outgoing calls. This creates a more professional and recognizable caller experience.

### Benefits
- ✅ **Professional appearance** - Shows "Memoora" instead of random number
- ✅ **Brand recognition** - Recipients immediately know it's from Memoora
- ✅ **Higher answer rates** - People are more likely to answer calls from known brands
- ✅ **Clean user experience** - No confusion about who's calling

## 🚀 Quick Start

### 1. Enable Alpha Sender ID

Add these environment variables to your `.env` file:

```bash
# Enable alpha sender ID
USE_ALPHA_SENDER_ID=true

# Set the caller ID name (max 11 characters)
ALPHA_SENDER_ID=Memoora

# Optional: Set fallback phone number
FALLBACK_PHONE_NUMBER=+1234567890
```

### 2. Test the Configuration

Run the test script to verify everything works:

```bash
# Test basic configuration
node test-alpha-sender.js

# Test with fallback functionality
node test-alpha-sender.js --test-fallback
```

### 3. Make a Test Call

Use the API to make a test call:

```bash
curl -X POST "https://memoora-calls.onrender.com/api/v1/call" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customMessage": "Test call with Memoora caller ID"
  }'
```

## ⚙️ Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `USE_ALPHA_SENDER_ID` | No | `false` | Set to `true` to enable alpha sender ID |
| `ALPHA_SENDER_ID` | No | `Memoora` | Text to display as caller ID (max 11 chars) |
| `FALLBACK_PHONE_NUMBER` | No | `TWILIO_PHONE_NUMBER` | Phone number to use if alpha sender fails |

### Configuration Examples

#### Basic Configuration
```bash
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=Memoora
```

#### Custom Brand Name
```bash
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=YourBrand
```

#### With Custom Fallback
```bash
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=Memoora
FALLBACK_PHONE_NUMBER=+1987654321
```

## 🔧 How It Works

### Call Flow with Alpha Sender ID

1. **Call Initiation**: Your app sends call request to microservice
2. **Alpha Sender Attempt**: Service tries to make call with "Memoora" as caller ID
3. **Success**: If supported, call shows "Memoora" on recipient's phone
4. **Fallback**: If not supported, automatically falls back to phone number
5. **Call Completion**: Normal call flow continues

### Fallback Mechanism

The system automatically handles fallback scenarios:

- **Alpha Sender ID not supported** in target country/carrier
- **Invalid alpha sender ID** format
- **Twilio account limitations** for alpha sender IDs

When fallback occurs:
- Call is made with phone number instead
- Logs indicate fallback was used
- Call record includes fallback information

## 🌍 Country Support

### Fully Supported Countries
- ✅ **United States** - Full support
- ✅ **Canada** - Full support  
- ✅ **United Kingdom** - Full support
- ✅ **Australia** - Full support

### Limited Support
- ⚠️ **Some European countries** - May require verification
- ⚠️ **Some carriers** - Not all carriers support alpha sender IDs

### Not Supported
- ❌ **Some Asian countries** - Limited or no support
- ❌ **Some mobile carriers** - May not display alpha sender IDs

## 📊 Monitoring & Logs

### Call Record Information

Each call record now includes caller ID information:

```json
{
  "id": "call_1234567890_1",
  "phoneNumber": "+1234567890",
  "status": "twilio_initiated",
  "metadata": {
    "callerId": "Memoora",
    "callerIdType": "alpha_sender",
    "fallbackUsed": false,
    "fallbackReason": null
  }
}
```

### Log Messages

The service logs detailed information about caller ID usage:

```
📞 Call call_1234567890_1 initiated with caller ID: Memoora (alpha_sender)
📞 Attempting call with alpha sender ID: Memoora
✅ Call initiated successfully with alpha sender ID: Memoora
```

### Fallback Logs

When fallback is used:

```
❌ Alpha sender ID failed: Invalid 'from' phone number
🔄 Falling back to phone number: +1234567890
⚠️  Fallback used for call call_1234567890_1: Invalid 'from' phone number
```

## 🧪 Testing

### Local Testing

1. **Set up environment**:
   ```bash
   cp env.example .env
   # Edit .env with your Twilio credentials and alpha sender settings
   ```

2. **Run test script**:
   ```bash
   node test-alpha-sender.js
   ```

3. **Test with real call**:
   ```bash
   # Set your test phone number
   export TEST_PHONE_NUMBER=+1234567890
   node test-alpha-sender.js
   ```

### Production Testing

1. **Update environment variables** in your deployment platform
2. **Make test calls** to verify alpha sender ID displays correctly
3. **Monitor logs** for any fallback usage
4. **Test on different carriers** and devices

## 🚨 Troubleshooting

### Common Issues

#### Alpha Sender ID Not Displaying

**Symptoms**: Calls still show phone number instead of "Memoora"

**Solutions**:
1. Check if `USE_ALPHA_SENDER_ID=true` is set
2. Verify `ALPHA_SENDER_ID=Memoora` is configured
3. Check if target country/carrier supports alpha sender IDs
4. Review logs for fallback usage

#### Calls Failing

**Symptoms**: Calls fail with error 21211 or similar

**Solutions**:
1. Verify Twilio account has alpha sender ID permissions
2. Check alpha sender ID length (max 11 characters)
3. Ensure fallback phone number is valid
4. Review Twilio Console for alpha sender ID settings

#### Fallback Not Working

**Symptoms**: Calls fail completely when alpha sender ID fails

**Solutions**:
1. Verify `FALLBACK_PHONE_NUMBER` is set correctly
2. Check fallback number format (+1XXXXXXXXXX)
3. Ensure Twilio phone number is valid and verified

### Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `21211` | Invalid 'from' phone number | Alpha sender ID not supported, check fallback |
| `21214` | 'from' phone number not verified | Verify phone number in Twilio Console |
| `21215` | 'from' phone number not owned by subaccount | Check Twilio account permissions |

## 📈 Success Metrics

After implementing alpha sender ID, monitor these metrics:

### Answer Rate
- **Before**: Calls from unknown numbers
- **After**: Calls from "Memoora" brand
- **Expected**: 20-40% increase in answer rates

### User Feedback
- **Positive**: "I knew it was from Memoora right away"
- **Professional**: "Looks more legitimate"
- **Trust**: "I'm more likely to answer"

### Technical Metrics
- **Alpha Sender Success Rate**: Percentage of calls using alpha sender ID
- **Fallback Rate**: Percentage of calls falling back to phone number
- **Error Rate**: Should remain low with proper fallback

## 🔄 Deployment Steps

### 1. Update Environment Variables

In your deployment platform (Render, Heroku, etc.):

```bash
USE_ALPHA_SENDER_ID=true
ALPHA_SENDER_ID=Memoora
FALLBACK_PHONE_NUMBER=+1234567890
```

### 2. Deploy Code

```bash
git add .
git commit -m "Add alpha sender ID support"
git push origin main
```

### 3. Test Deployment

```bash
# Test health endpoint
curl https://memoora-calls.onrender.com/health

# Test call with alpha sender ID
curl -X POST "https://memoora-calls.onrender.com/api/v1/call" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "customMessage": "Test call with Memoora caller ID"
  }'
```

### 4. Monitor and Verify

1. **Check logs** for alpha sender ID usage
2. **Make test calls** to verify caller ID displays correctly
3. **Monitor fallback usage** to identify unsupported regions
4. **Gather user feedback** on caller ID experience

## 🎯 Best Practices

### Configuration
- ✅ **Use meaningful names**: "Memoora" instead of generic terms
- ✅ **Keep it short**: Maximum 11 characters
- ✅ **Test thoroughly**: Verify on multiple carriers and devices
- ✅ **Monitor fallback**: Track when fallback is used

### Testing
- ✅ **Test locally first**: Use test script before production
- ✅ **Test on multiple carriers**: Verizon, AT&T, T-Mobile, etc.
- ✅ **Test on different devices**: iPhone, Android, landline
- ✅ **Test in different regions**: If serving multiple countries

### Monitoring
- ✅ **Log caller ID usage**: Track alpha sender vs fallback usage
- ✅ **Monitor answer rates**: Compare before/after implementation
- ✅ **Gather user feedback**: Ask users about caller ID experience
- ✅ **Track error rates**: Ensure fallback mechanism works

## 📞 Support

### Getting Help

If you encounter issues with alpha sender ID:

1. **Check logs** for detailed error messages
2. **Run test script** to verify configuration
3. **Review Twilio documentation** for alpha sender ID support
4. **Contact support** with specific error codes and logs

### Useful Commands

```bash
# Test alpha sender ID configuration
node test-alpha-sender.js

# Check service health
curl https://memoora-calls.onrender.com/health

# View recent calls and caller ID usage
curl -H "x-api-key: YOUR_API_KEY" \
  https://memoora-calls.onrender.com/api/v1/calls
```

---

**🎉 You're now ready to implement professional caller ID with alpha sender ID!** 

Start by enabling the feature in your environment variables, test locally, then deploy to production. The system will automatically handle fallback scenarios to ensure reliable call delivery.
