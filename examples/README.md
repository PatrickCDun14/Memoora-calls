# 📱 Client Integration Examples

This directory contains examples of how other applications can integrate with the Memoora call recording microservice.

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Memoora service running (see main README.md)
- Axios package: `npm install axios`

### Running the Example

1. **Start your Memoora service**:
   ```bash
   cd /path/to/memoora-service
   npm start
   ```

2. **Run the client example**:
   ```bash
   cd examples
   node client-integration.js
   ```

## 🔑 How API Key Generation Works

### **The Process**
1. **Client calls `/api/v1/generate-api-key`** (no authentication required)
2. **Service generates a secure API key** and returns it
3. **Client stores the API key** securely
4. **Client uses the API key** for all subsequent authenticated requests

### **Why This Works**
- **Key generation is public** - no authentication required
- **Rate limited** - prevents abuse (5 requests per hour per IP)
- **Secure keys** - cryptographically random, 64-character keys
- **One-time display** - keys are only shown once

## 📋 Example Workflow

```javascript
const MemooraClient = require('./client-integration');

const client = new MemooraClient('http://localhost:5000');

// Step 1: Generate API key (first time only)
await client.generateApiKey('My App', 'dev@company.com');

// Step 2: Use the service
await client.initiateCall('+1234567890');
const recordings = await client.getRecordings();
```

## 🛡️ Security Features

- **Rate limiting**: 5 key generation requests per hour per IP
- **Email validation**: Basic email format checking
- **IP logging**: Track who generates keys
- **Secure generation**: Uses Node.js crypto module

## 🔧 Customization

You can modify the client to:
- Store API keys in environment variables
- Add retry logic for failed requests
- Implement key rotation
- Add error handling for your use case

## 📚 API Documentation

See the main [API.md](../API.md) file for complete endpoint documentation. 