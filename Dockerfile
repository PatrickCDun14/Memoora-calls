# Memoora Call Recording Microservice
# Clean, optimized Dockerfile for production deployment

# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create recordings directory
RUN mkdir -p recordings

# Expose port
EXPOSE 5005

# Start the application
CMD ["npm", "start"]
