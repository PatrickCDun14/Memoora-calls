#!/bin/bash

# Production Deployment Script for Memoora Call Recording Microservice

set -e

echo "🚀 Starting production deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please create one from env.example"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Set production environment
export NODE_ENV=production

# Check if port is available
PORT=${PORT:-5005}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Warning: Port $PORT is already in use"
    echo "   You may need to stop the existing service first"
fi

# Start the service
echo "🚀 Starting production service on port $PORT..."
echo "📊 Health check available at: http://localhost:$PORT/health"
echo "📚 API docs available at: http://localhost:$PORT/api/v1/"

# Start the service
npm start 