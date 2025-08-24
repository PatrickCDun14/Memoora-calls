// memoora/index.js
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const memooraRoutes = require('./routes-memoora/memoora');
const voiceModularityRoutes = require('./routes-memoora/voice-modularity');
const scalableCallsRoutes = require('./routes-memoora/scalable-calls');
const config = require('./config/environment');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(config.cors));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'Memoora Call Recording Microservice',
    timestamp: new Date().toISOString(),
    environment: config.env,
    baseUrl: config.baseUrl,
    port: config.port
  });
});

// API routes
app.use('/api/v1', memooraRoutes);
app.use('/api/v1/voice', voiceModularityRoutes);
app.use('/api/v1/calls', scalableCallsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: config.env === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(config.port, () => {
  console.log(`🚀 Memoora microservice is running on port ${config.port}`);
  console.log(`🌍 Environment: ${config.env}`);
  console.log(`🔗 Health check: ${config.baseUrl}/health`);
  console.log(`📞 API endpoints: ${config.baseUrl}/api/v1`);
  console.log(`🔒 Security level: ${config.env === 'production' ? 'High' : config.env === 'staging' ? 'Medium' : 'Development'}`);
});
