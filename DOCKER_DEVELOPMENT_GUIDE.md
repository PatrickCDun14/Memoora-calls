# 🐳 Docker Development Guide

## 🎯 **Overview**

This guide explains how to use Docker with the Memoora Call Microservice for both local development and production deployment.

## 🚀 **Quick Start**

### **Local Development with Docker**
```bash
# Start the service with Docker Compose
npm run docker:dev

# Or manually
docker-compose up --build
```

### **Production Build**
```bash
# Build production image
npm run docker:build

# Run production container
npm run docker:prod
```

## 🛠️ **Available Commands**

### **Docker Scripts**
```bash
npm run docker:build    # Build Docker image
npm run docker:run      # Run container with .env.local
npm run docker:dev      # Start development environment
npm run docker:prod     # Start production environment
npm run docker:stop     # Stop all containers
npm run docker:clean    # Clean up Docker system
```

### **Manual Docker Commands**
```bash
# Build image
docker build -t memoora-calls .

# Run container
docker run -p 5005:5005 --env-file .env.local memoora-calls

# View logs
docker logs -f <container_id>

# Shell into container
docker exec -it <container_id> /bin/sh
```

## 🏗️ **Docker Configuration**

### **Dockerfile Features**
- **Multi-stage build** for optimization
- **Non-root user** for security
- **Health checks** for monitoring
- **Alpine Linux** for smaller image size
- **Production dependencies** only

### **Docker Compose Services**

#### **Development (`docker-compose.yml`)**
- Port mapping: `5005:5005`
- Environment: `development`
- Volume mounts for audio/recordings
- Health checks enabled
- Auto-restart on failure

#### **Production (`docker-compose.prod.yml`)**
- Resource limits configured
- Production environment
- Optimized for deployment
- Health monitoring

## 🌍 **Environment Configuration**

### **Local Development**
```bash
# Copy environment template
cp ENV_TEMPLATE.md .env.local

# Edit with your credentials
nano .env.local

# Start with Docker
npm run docker:dev
```

### **Production Deployment**
```bash
# Set production environment variables
cp ENV_TEMPLATE.md .env

# Edit production values
nano .env

# Deploy with Docker
npm run docker:prod
```

## 📊 **Docker Health Checks**

### **Built-in Health Check**
The Dockerfile includes a health check that:
- Runs every 30 seconds
- Tests the `/health` endpoint
- Reports container health status
- Integrates with Docker monitoring

### **Health Check Endpoint**
```bash
# Test health locally
curl http://localhost:5005/health

# Test health in container
docker exec <container_id> curl http://localhost:5005/health
```

## 🔧 **Development Workflow**

### **1. Local Development**
```bash
# Start development environment
npm run docker:dev

# Make code changes
# Changes are reflected automatically

# View logs
docker-compose logs -f memoora-calls

# Stop environment
npm run docker:stop
```

### **2. Testing**
```bash
# Run tests locally
npm test

# Run tests in container
docker exec <container_id> npm test
```

### **3. Production Testing**
```bash
# Build production image
npm run docker:build

# Test production locally
npm run docker:prod

# Verify functionality
curl http://localhost:5005/health
```

## 🚀 **Deployment**

### **Render Deployment**
The `render.yaml` file is configured for:
- **Automatic deployment** from Git
- **Environment variable** configuration
- **Health check** integration
- **Resource allocation** management

### **Manual Deployment**
```bash
# Build production image
docker build -t memoora-calls:latest .

# Tag for registry (if using private registry)
docker tag memoora-calls:latest your-registry/memoora-calls:latest

# Push to registry
docker push your-registry/memoora-calls:latest
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Check what's using port 5005
lsof -i :5005

# Kill process or change port in docker-compose.yml
```

#### **Environment Variables Not Loading**
```bash
# Verify .env file exists
ls -la .env*

# Check Docker environment
docker exec <container_id> env | grep NODE_ENV
```

#### **Container Won't Start**
```bash
# Check logs
docker logs <container_id>

# Check health status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### **Debug Commands**
```bash
# Inspect container
docker inspect <container_id>

# View container processes
docker top <container_id>

# Check container resources
docker stats <container_id>
```

## 📈 **Performance Optimization**

### **Image Size Optimization**
- **Alpine Linux** base image
- **Multi-stage builds** (if needed)
- **Production dependencies** only
- **Layer caching** optimization

### **Resource Management**
- **Memory limits**: 512MB max, 256MB reserved
- **CPU limits**: 0.5 cores max, 0.25 reserved
- **Health check** monitoring
- **Auto-restart** policies

## 🔒 **Security Features**

### **Container Security**
- **Non-root user** execution
- **Read-only** file system (optional)
- **Resource limits** to prevent abuse
- **Health checks** for monitoring

### **Network Security**
- **Port exposure** only when needed
- **Internal networking** for services
- **Environment isolation** per service

## 📚 **Additional Resources**

### **Docker Documentation**
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Docker Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck)

### **Node.js in Docker**
- [Node.js Docker Official Image](https://hub.docker.com/_/node)
- [Node.js Docker Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Last Updated:** August 28, 2025  
**Version:** 2.0.0  
**Status:** ✅ Ready for Development and Production
