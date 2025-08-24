#!/bin/bash

# Environment Switching Script for Memoora
# Usage: ./scripts/switch-env.sh [development|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if environment argument is provided
if [ $# -eq 0 ]; then
    print_error "Please specify an environment: development or production"
    echo "Usage: $0 [development|production]"
    exit 1
fi

ENV=$1

# Validate environment
if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
    print_error "Invalid environment: $ENV"
    echo "Valid environments: development, production"
    exit 1
fi

print_info "Switching to $ENV environment..."

# Check if environment file exists
ENV_FILE="env.$ENV"
if [ ! -f "$ENV_FILE" ]; then
    print_error "Environment file $ENV_FILE not found!"
    exit 1
fi

# Backup current .env if it exists
if [ -f ".env" ]; then
    cp .env .env.backup
    print_status "Backed up current .env to .env.backup"
fi

# Copy environment file to .env
cp "$ENV_FILE" .env
print_status "Switched to $ENV environment"

# Show current environment
print_info "Current environment: $ENV"
print_info "Environment file: $ENV_FILE"

# Show key differences
echo ""
print_info "Key configuration differences:"
if [ "$ENV" = "development" ]; then
    echo "  • Lower call limits (20/day, 100/month)"
    echo "  • Higher rate limits (200/hour)"
    echo "  • Debug logging enabled"
    echo "  • More permissive CORS"
    echo "  • Auto-delete failed calls enabled"
else
    echo "  • Higher call limits (1000/day, 30000/month)"
    echo "  • Lower rate limits (50/hour)"
    echo "  • Warning logging only"
    echo "  • Restricted CORS"
    echo "  • Performance optimizations enabled"
fi

echo ""
print_warning "Remember to:"
echo "  1. Update the .env file with your actual credentials"
echo "  2. Set NODE_ENV=$ENV in your deployment"
echo "  3. Restart your application after switching"

print_status "Environment switch complete!" 