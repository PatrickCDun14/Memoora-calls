# 🚀 Production Deployment Guide

## 📋 Prerequisites

- **Domain**: A registered domain with SSL certificate
- **Server**: VPS, cloud instance, or container platform
- **Twilio Account**: Active Twilio account with phone number
- **Docker**: Docker and Docker Compose installed (optional)

## 🌍 Environment Setup

### 1. Create Production Environment File

```bash
# Copy the template
cp PRODUCTION_ENV_TEMPLATE.md .env.production

# Edit with your production values
nano .env.production
```

### 2. Required Environment Variables

```bash
# Twilio Configuration (REQUIRED)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+17085547471

# Production Configuration
NODE_ENV=production
BASE_URL=https://yourdomain.com
ALLOWED_DOMAINS=yourdomain.com,app.yourdomain.com
```

## 🐳 Docker Deployment (Recommended)

### 1. Build Production Image

```bash
docker build -f Dockerfile.production -t memoora-calls:latest .
```

### 2. Deploy with Docker Compose

```bash
# Start production services
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 3. Update and Redeploy

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d --build
```

## 🖥️ Traditional Server Deployment

### 1. Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd memoora-calls

# Install dependencies
npm ci --production
```

### 2. Configure Environment

```bash
# Create production environment file
cp PRODUCTION_ENV_TEMPLATE.md .env.production
nano .env.production

# Set proper permissions
chmod 600 .env.production
```

### 3. Start with PM2

```bash
# Start the application
pm2 start index.js --name "memoora-calls" --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/memoora-calls`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/memoora-calls /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 📊 Monitoring and Logging

### 1. Health Checks

```bash
# Check application health
curl https://yourdomain.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-08-29T02:45:00.000Z",
  "environment": "production",
  "version": "1.0.0",
  "uptime": 3600
}
```

### 2. Log Management

```bash
# View application logs
pm2 logs memoora-calls

# Or with Docker
docker-compose -f docker-compose.production.yml logs -f memoora-calls

# Log rotation (if not using PM2/Docker)
sudo logrotate /etc/logrotate.d/memoora-calls
```

### 3. Performance Monitoring

```bash
# Monitor system resources
htop
iotop
nethogs

# Monitor Node.js process
pm2 monit
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/memoora-calls
            git pull origin main
            docker-compose -f docker-compose.production.yml down
            docker-compose -f docker-compose.production.yml up -d --build
```

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo lsof -i :5005
   sudo kill -9 <PID>
   ```

2. **Environment variables not loaded**
   ```bash
   # Check if .env file exists and has correct permissions
   ls -la .env.production
   chmod 600 .env.production
   ```

3. **Twilio webhook failures**
   ```bash
   # Verify BASE_URL is accessible
   curl -I https://yourdomain.com/health
   
   # Check Twilio webhook logs
   docker-compose logs memoora-calls | grep webhook
   ```

4. **CORS issues**
   ```bash
   # Verify ALLOWED_DOMAINS includes your frontend domain
   echo $ALLOWED_DOMAINS
   ```

## 📞 Support

- **Logs**: Check application logs for detailed error information
- **Health Endpoint**: Monitor `/health` endpoint for system status
- **Twilio Console**: Check Twilio logs for webhook delivery issues
- **Environment**: Verify all required environment variables are set

## 🔄 Maintenance

### Regular Tasks

- **Weekly**: Check logs for errors and performance issues
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and rotate API keys and tokens
- **Annually**: SSL certificate renewal and security audit
