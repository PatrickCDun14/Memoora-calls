# Memoora Call Recording Microservice

A production-ready microservice for handling call recording functionality through Twilio integration. Built with Node.js, Express, and Docker for easy deployment across different environments.

## 🚀 Features

- **Outbound Call Management**: Initiate calls to any phone number
- **Voice Recording**: Capture audio stories with customizable prompts
- **File Management**: Download, store, and serve recorded audio files
- **Webhook Integration**: Seamless Twilio webhook handling
- **API Security**: API key authentication and rate limiting
- **Health Monitoring**: Built-in health checks and status endpoints
- **Multi-Environment Support**: Development and production configurations

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web App      │    │   Memoora        │    │   Twilio        │
│   (Frontend)   │───▶│   Microservice   │───▶│   Voice API     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Recordings     │
                       │   Storage        │
                       └──────────────────┘
```

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Twilio account with phone number
- Environment variables configured

## 🛠️ Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo>
cd memoora
cp env.example .env
# Edit .env with your actual values
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Development Mode
```bash
# Start with Node.js
npm run dev

# Or use Docker
./scripts/deploy.sh development deploy
```

### 4. Production Mode
```bash
# Create production environment file
cp env.example .env.prod
# Edit .env.prod with production values

# Deploy with Nginx
./scripts/deploy.sh production deploy
```

## 🔧 Configuration

### Environment Variables

Create `.env` and `.env.prod` files based on `env.example`:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000
BASE_URL=http://localhost:5000

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Phone Numbers
MY_PHONE_NUMBER=+1234567890

# Security
CORS_ORIGIN=http://localhost:3000
API_KEY=your_secure_api_key

# Recording Storage
RECORDINGS_PATH=./recordings
MAX_RECORDING_DURATION=120
```

### Twilio Setup

1. Configure your Twilio phone number webhook URLs:
   - **Voice Webhook**: `https://your-domain.com/api/v1/voice`
   - **Status Callback**: `https://your-domain.com/api/v1/call-status`
   - **Recording Status Callback**: `https://your-domain.com/api/v1/handle-recording`

2. Ensure your Twilio account has voice capabilities enabled

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d --build
```

### Production (with Nginx)
```bash
docker-compose -f docker-compose.prod.nginx.yml up -d --build
```

### Using Deployment Scripts
```bash
# Deploy development
./scripts/deploy.sh development deploy

# Deploy production
./scripts/deploy.sh production deploy

# Stop services
./scripts/deploy.sh production stop

# View logs
./scripts/deploy.sh production logs
```

## 📡 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/v1/call` | Initiate call | Yes |
| POST | `/api/v1/voice` | Twilio voice webhook | No |
| POST | `/api/v1/handle-recording` | Recording handler | No |
| POST | `/api/v1/call-status` | Call status updates | No |
| GET | `/api/v1/recordings` | List recordings | Yes |
| GET | `/api/v1/recordings/:filename` | Download recording | Yes |

See [API.md](API.md) for detailed API documentation.

## 🔒 Security Features

- **API Key Authentication**: Secure access to protected endpoints
- **CORS Protection**: Configurable cross-origin resource sharing
- **Rate Limiting**: Nginx-based rate limiting for API endpoints
- **Security Headers**: Helmet.js security middleware
- **Input Validation**: Request validation and sanitization
- **Non-root Docker**: Container runs as non-root user

## 📊 Monitoring & Health

- **Health Check Endpoint**: `/health` for service status
- **Docker Health Checks**: Container-level health monitoring
- **Structured Logging**: Morgan logging with environment-based configuration
- **Error Handling**: Comprehensive error handling and logging

## 🌍 Environment Management

### Development
- Local file storage
- Detailed error messages
- Development logging
- Hot reload with nodemon

### Production
- Docker containerization
- Nginx reverse proxy
- Rate limiting
- Production logging
- Resource limits
- Persistent volume storage

## 🚀 Deployment Options

### 1. Local Development
```bash
npm run dev
```

### 2. Docker Development
```bash
docker-compose up -d
```

### 3. Production with Docker
```bash
docker-compose -f docker-compose.prod.nginx.yml up -d
```

### 4. Cloud Deployment
- **AWS**: Use ECS or EC2 with the Docker image
- **Google Cloud**: Deploy to Cloud Run or GKE
- **Azure**: Use Azure Container Instances or AKS
- **Heroku**: Deploy directly with Procfile

## 📁 Project Structure

```
memoora/
├── index.js                 # Main server file
├── routes-memoora/         # API route definitions
├── utils/                  # Utility functions
├── recordings/             # Audio file storage
├── scripts/                # Deployment scripts
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Development Docker setup
├── docker-compose.prod.yml # Production Docker setup
├── nginx.conf              # Nginx configuration
├── API.md                  # API documentation
└── README.md               # This file
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🔄 CI/CD Integration

The service is designed to work with CI/CD pipelines:

- **Build**: `docker build -t memoora .`
- **Test**: Run health checks and API tests
- **Deploy**: Use deployment scripts or Docker Compose
- **Monitor**: Health check endpoints for monitoring

## 📞 Usage Examples

### Initiate a Call
```javascript
const response = await fetch('https://your-domain.com/api/v1/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_api_key'
  },
  body: JSON.stringify({
    phoneNumber: '+1234567890'
  })
});
```

### Check Service Health
```javascript
const health = await fetch('https://your-domain.com/health');
const status = await health.json();
console.log('Service status:', status.status);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For issues and questions:
1. Check the [API documentation](API.md)
2. Review the logs: `./scripts/deploy.sh production logs`
3. Check health status: `GET /health`
4. Verify environment variables are set correctly

## 🔮 Future Enhancements

- [ ] WebSocket support for real-time call status
- [ ] Audio transcription with OpenAI
- [ ] Call analytics and reporting
- [ ] Multi-tenant support
- [ ] Advanced call routing
- [ ] Integration with external storage (S3, GCS) 