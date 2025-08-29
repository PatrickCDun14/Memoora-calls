# Production Environment Configuration
# Copy these variables to your production .env file

## 🔴 REQUIRED VARIABLES (must be set)

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+17085547471
```

## 🟡 OPTIONAL VARIABLES (will use defaults if not set)

```bash
# Server Configuration
PORT=5005
NODE_ENV=production

# Public URL (your production domain)
# This should be your actual production domain, not localhost
BASE_URL=https://yourdomain.com

# CORS Configuration
# Comma-separated list of allowed domains
ALLOWED_DOMAINS=yourdomain.com,app.yourdomain.com

# Logging
LOG_LEVEL=info
```

## 🚨 PRODUCTION REQUIREMENTS

1. **Never commit .env.production to version control**
2. **Use strong, unique values for all secrets**
3. **BASE_URL must be a valid HTTPS URL in production**
4. **ALLOWED_DOMAINS should only include your production domains**
5. **Consider using a secrets management service for sensitive values**

## 🌍 DEPLOYMENT CHECKLIST

- [ ] Set `NODE_ENV=production`
- [ ] Configure `BASE_URL` to your production domain
- [ ] Set `ALLOWED_DOMAINS` to your production domains only
- [ ] Ensure all Twilio credentials are correct
- [ ] Test webhook endpoints with production URLs
- [ ] Verify CORS settings work with your frontend
- [ ] Set appropriate `LOG_LEVEL` for production
- [ ] Configure your reverse proxy/load balancer if needed
