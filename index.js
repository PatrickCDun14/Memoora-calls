// 🚀 Production-ready Memoora Call Recording Microservice
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { validateEnvironment, isProduction } = require('./config/environment');

// Import services
const SimpleApiKeyService = require('./utils/simple-api-key-service');
const SimpleCallService = require('./utils/simple-call-service');
const SimpleTwilioService = require('./utils/simple-twilio-service');
const SimpleRecordingService = require('./utils/simple-recording-service');

// Import routes
const memooraRoutes = require('./routes-memoora/simple-memoora');

// Initialize Express app
const app = express();

// Environment validation
let config;
try {
  config = validateEnvironment();
  console.log('✅ Environment validation passed');
} catch (error) {
  console.error('❌ Environment validation failed:', error.message);
  process.exit(1);
}

// Initialize services
const apiKeyService = new SimpleApiKeyService();
const callService = new SimpleCallService();
const twilioService = new SimpleTwilioService();
const recordingService = new SimpleRecordingService();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
const corsOptions = {
  origin: isProduction() 
    ? process.env.ALLOWED_DOMAINS?.split(',').map(domain => domain.trim()) || []
    : ['http://localhost:3000', 'http://localhost:5005', 'http://127.0.0.1:3000', 'http://127.0.0.1:5005'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/v1', memooraRoutes(apiKeyService, callService, twilioService, recordingService));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  
  const statusCode = error.statusCode || 500;
  const message = isProduction() ? 'Internal server error' : error.message;
  
  res.status(statusCode).json({
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
const server = app.listen(config.port, () => {
  console.log('🚀 Memoora Call Recording Microservice started');
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Server: http://localhost:${config.port}`);
  console.log(`🔗 Health: http://localhost:${config.port}/health`);
  console.log(`📞 API: http://localhost:${config.port}/api/v1`);
  
  if (config.baseUrl !== `http://localhost:${config.port}`) {
    console.log(`🌍 Public URL: ${config.baseUrl}`);
  }
  
  console.log('✅ All services initialized successfully');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${config.port} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});

module.exports = app;
