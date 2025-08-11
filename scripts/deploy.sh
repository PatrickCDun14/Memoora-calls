#!/bin/bash

# Memoora Microservice Deployment Script
set -e

ENVIRONMENT=${1:-development}
ACTION=${2:-deploy}

echo "🚀 Memoora Microservice Deployment"
echo "Environment: $ENVIRONMENT"
echo "Action: $ACTION"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Function to deploy development environment
deploy_dev() {
    echo "🔧 Deploying development environment..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi
    
    # Start with Docker Compose
    docker-compose up -d --build
    
    echo "✅ Development environment deployed!"
    echo "🔗 Health check: http://localhost:5000/health"
    echo "📞 API endpoints: http://localhost:5000/api/v1"
}

# Function to deploy production environment
deploy_prod() {
    echo "🚀 Deploying production environment..."
    
    # Check if production environment file exists
    if [ ! -f ".env.prod" ]; then
        echo "❌ Production environment file (.env.prod) not found!"
        echo "Please create .env.prod with production values."
        exit 1
    fi
    
    # Deploy with Nginx
    docker-compose -f docker-compose.prod.nginx.yml up -d --build
    
    echo "✅ Production environment deployed!"
    echo "🔗 Health check: http://localhost/health"
    echo "📞 API endpoints: http://localhost/api/v1"
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.nginx.yml down
    else
        docker-compose down
    fi
    
    echo "✅ Services stopped!"
}

# Function to view logs
view_logs() {
    echo "📋 Viewing logs..."
    
    if [ "$ENVIRONMENT" = "production" ]; then
        docker-compose -f docker-compose.prod.nginx.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Main deployment logic
case $ACTION in
    "deploy")
        case $ENVIRONMENT in
            "development"|"dev")
                deploy_dev
                ;;
            "production"|"prod")
                deploy_prod
                ;;
            *)
                echo "❌ Unknown environment: $ENVIRONMENT"
                echo "Usage: $0 [development|production] [deploy|stop|logs]"
                exit 1
                ;;
        esac
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        view_logs
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo "Usage: $0 [development|production] [deploy|stop|logs]"
        exit 1
        ;;
esac 