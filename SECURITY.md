# Security Features & Anti-Spam Protection

## 🛡️ Overview

The Memoora microservice implements **multiple layers of security** to prevent spam, abuse, and unauthorized access. This document outlines all security measures and how they work together to protect your service.

## 🔐 Authentication & Authorization

### API Key Authentication
- **Required for all protected endpoints**
- **Minimum length**: 32 characters
- **Multiple API keys supported** (comma-separated in `API_KEYS` env var)
- **API key types**: Standard, Premium, Admin (different rate limits)

```bash
# Example API key header
x-api-key: your_very_long_and_secure_api_key_here_32_chars_min
```

### API Key Validation
```javascript
// Each request validates:
1. API key exists in header
2. API key format is valid (length, characters)
3. API key is in allowed list
4. API key is not rate limited
```

## 🚫 Rate Limiting

### Multi-Level Rate Limiting

#### 1. **Nginx Level (Production)**
```nginx
# General API endpoints: 10 requests/second
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

# Voice endpoints: 5 requests/second (Twilio webhooks)
limit_req_zone $binary_remote_addr zone=voice:10m rate=5r/s;
```

#### 2. **Application Level (Per API Key)**
```javascript
// Standard API Key: 100 requests/hour
// Premium API Key: 500 requests/hour  
// Admin API Key: 10,000 requests/hour
```

#### 3. **Call Frequency Limiting**
```javascript
// Standard: 10 calls/hour
// Premium: 50 calls/hour
// Admin: 1,000 calls/hour
```

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312200
Retry-After: 3600
```

## 📱 Phone Number Protection

### Validation Rules
```javascript
// Format validation
phoneRegex = /^\+[1-9]\d{1,14}$/

// Blocked patterns
blockedPatterns = [
  /^\+1-900/, // Premium numbers
  /^\+1-976/, // Premium numbers  
  /^\+44-9/,  // UK premium numbers
]
```

### Blocked Numbers
```bash
# Environment variable
BLOCKED_NUMBERS=+1234567890,+0987654321,+1555123456
```

## 🚨 Anti-Spam Measures

### 1. **Call Frequency Limits**
- **Prevents expensive Twilio call spam**
- **Per-API-key tracking**
- **Configurable limits per hour**

### 2. **Request Size Limits**
```javascript
// Maximum request body: 1MB
// Prevents large payload attacks
```

### 3. **Input Validation**
```javascript
// Phone number format validation
// Request body validation
// Content-type validation
```

### 4. **IP-Based Rate Limiting**
```nginx
# Nginx rate limiting by IP address
# Prevents single IP from overwhelming service
```

## 📊 Security Monitoring

### Security Event Logging
```javascript
// All security events are logged:
- Failed authentication attempts
- Rate limit violations  
- Invalid phone numbers
- Suspicious activity patterns
```

### Request Logging
```javascript
{
  timestamp: "2024-01-15T10:30:00.000Z",
  method: "POST",
  url: "/api/v1/call",
  statusCode: 200,
  duration: 150,
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  apiKey: "abc123..."
}
```

### Suspicious Activity Detection
```javascript
// Automatic alerts for:
- 5+ failed auth attempts
- 10+ rate limit violations  
- 3+ invalid phone numbers
```

## 🔒 Security Headers

### Helmet.js Protection
```javascript
// Security headers automatically added:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- HSTS: max-age=31536000; includeSubDomains; preload
```

### CORS Protection
```javascript
// Configurable CORS origin
CORS_ORIGIN=http://localhost:3000

// Prevents unauthorized domains from accessing API
```

## 🐳 Container Security

### Docker Security Features
```dockerfile
# Non-root user
USER nodejs

# Health checks
HEALTHCHECK --interval=30s --timeout=3s

# Minimal base image
FROM node:18-alpine
```

### Resource Limits
```yaml
# Production Docker Compose
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

## 🚀 Distributed Security (Optional)

### Redis Integration
```bash
# For distributed rate limiting across multiple instances
REDIS_URL=redis://localhost:6379
```

### Benefits
- **Shared rate limiting** across multiple servers
- **Persistent rate limit data**
- **Scalable security enforcement**

## 📋 Security Checklist

### Before Production Deployment
- [ ] **API keys are 32+ characters long**
- [ ] **Environment variables are secure**
- [ ] **CORS origin is restricted**
- [ ] **Rate limits are appropriate for your use case**
- [ ] **Phone number validation is configured**
- [ ] **Security monitoring is enabled**
- [ ] **HTTPS is enabled (production)**
- [ ] **Firewall rules are configured**

### Regular Security Maintenance
- [ ] **Monitor security logs**
- [ ] **Review rate limit violations**
- [ ] **Update blocked phone numbers**
- [ ] **Rotate API keys periodically**
- [ ] **Review access patterns**
- [ ] **Update dependencies for security patches**

## 🚨 Incident Response

### Rate Limit Violation
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this API key",
  "retryAfter": 3600
}
```

### Invalid API Key
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Invalid API key",
  "message": "The provided API key is not valid"
}
```

### Blocked Phone Number
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "Invalid phone number",
  "message": "Phone number is blocked"
}
```

## 🔧 Configuration Examples

### Development Environment
```bash
# .env
NODE_ENV=development
API_KEY=dev_key_32_chars_minimum_required
MAX_CALLS_PER_HOUR=100
MAX_REQUESTS_PER_HOUR=1000
```

### Production Environment
```bash
# .env.prod
NODE_ENV=production
API_KEY=prod_key_very_long_and_secure_here
MAX_CALLS_PER_HOUR=10
MAX_REQUESTS_PER_HOUR=100
BLOCKED_NUMBERS=+1900,+1976,+449
REDIS_URL=redis://redis:6379
```

## 📞 Security Contact

For security issues or questions:
1. **Check logs**: `./scripts/deploy.sh production logs`
2. **Monitor health**: `GET /health`
3. **Review rate limits**: Check response headers
4. **Verify configuration**: Review environment variables

## 🔮 Future Security Enhancements

- [ ] **JWT token authentication**
- [ ] **OAuth2 integration**
- [ ] **IP whitelisting/blacklisting**
- [ ] **Advanced threat detection**
- [ ] **Security metrics dashboard**
- [ ] **Automated security testing** 