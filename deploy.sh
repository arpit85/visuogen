#!/bin/bash

# VisuoGen Deployment Script
# This script automates the deployment process for self-hosting

set -e

echo "🚀 Starting VisuoGen deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        print_error ".env file not found. Please copy .env.example to .env and configure it."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Setup SSL certificates
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    if [ ! -d "ssl" ]; then
        mkdir -p ssl
    fi
    
    if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
        print_warning "SSL certificates not found. Generating self-signed certificates for testing..."
        
        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/privkey.pem \
            -out ssl/fullchain.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        print_warning "Self-signed certificates generated. For production, replace with proper SSL certificates."
    else
        print_success "SSL certificates found"
    fi
}

# Build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Build the application
    print_status "Building VisuoGen application..."
    docker-compose build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully"
    else
        print_error "Some services failed to start"
        docker-compose logs
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    docker-compose exec -T postgres pg_isready -U visuogen -d visuogen
    
    # Run migrations
    docker-compose exec -T visuogen npm run db:push
    
    print_success "Database migrations completed"
}

# Setup initial data
setup_initial_data() {
    print_status "Setting up initial data..."
    
    # Run seed script if it exists
    if docker-compose exec -T visuogen npm run seed 2>/dev/null; then
        print_success "Initial data setup completed"
    else
        print_warning "No seed script found or seed failed"
    fi
}

# Display final information
show_deployment_info() {
    print_success "🎉 VisuoGen deployment completed successfully!"
    echo
    print_status "Access your application:"
    echo "  • HTTP:  http://localhost"
    echo "  • HTTPS: https://localhost"
    echo
    print_status "Service URLs:"
    echo "  • Application: http://localhost:3000"
    echo "  • Database:    localhost:5432"
    echo "  • Redis:       localhost:6379"
    echo
    print_status "Useful commands:"
    echo "  • View logs:           docker-compose logs -f"
    echo "  • Restart services:    docker-compose restart"
    echo "  • Stop services:       docker-compose down"
    echo "  • Update application:  ./deploy.sh"
    echo
    print_warning "Important:"
    echo "  • Replace self-signed SSL certificates with proper ones for production"
    echo "  • Configure your domain in nginx.conf"
    echo "  • Set up proper backup for database and uploaded files"
    echo "  • Monitor application logs and performance"
}

# Main deployment flow
main() {
    echo "VisuoGen Self-Hosting Deployment"
    echo "================================="
    echo
    
    check_prerequisites
    setup_ssl
    deploy_services
    run_migrations
    setup_initial_data
    show_deployment_info
}

# Run main function
main "$@"