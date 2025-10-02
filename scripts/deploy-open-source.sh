#!/bin/bash
# VoiceLoopHR Open-Source AI Deployment Script
# This script deploys the complete open-source AI backend on AWS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="voiceloophr"
AWS_REGION="us-east-1"
INSTANCE_TYPE="g5.xlarge"
MIN_INSTANCES=1
MAX_INSTANCES=3
DESIRED_INSTANCES=2

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed. Please install it first."
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
    fi
    
    success "All prerequisites met!"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying AWS infrastructure..."
    
    cd infrastructure/terraform
    
    # Initialize Terraform
    log "Initializing Terraform..."
    terraform init
    
    # Create terraform.tfvars
    cat > terraform.tfvars << EOF
aws_region = "$AWS_REGION"
project_name = "$PROJECT_NAME"
ai_instance_type = "$INSTANCE_TYPE"
min_instances = $MIN_INSTANCES
max_instances = $MAX_INSTANCES
desired_instances = $DESIRED_INSTANCES
db_password = "$(openssl rand -base64 32)"
EOF
    
    # Plan deployment
    log "Planning Terraform deployment..."
    terraform plan -out=tfplan
    
    # Apply deployment
    log "Applying Terraform deployment..."
    terraform apply tfplan
    
    # Get outputs
    log "Getting infrastructure outputs..."
    RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
    S3_BUCKET=$(terraform output -raw s3_bucket_name)
    ALB_DNS=$(terraform output -raw alb_dns_name)
    
    success "Infrastructure deployed successfully!"
    log "RDS Endpoint: $RDS_ENDPOINT"
    log "S3 Bucket: $S3_BUCKET"
    log "Load Balancer: $ALB_DNS"
    
    cd ../..
}

# Deploy AI services
deploy_ai_services() {
    log "Deploying AI services..."
    
    cd docker/ai-services
    
    # Create environment file
    cat > .env << EOF
VLLM_ENDPOINT=http://localhost:8000/v1
WHISPER_ENDPOINT=http://localhost:8001
TTS_ENDPOINT=http://localhost:8002
AWS_REGION=$AWS_REGION
S3_BUCKET=$S3_BUCKET
RDS_ENDPOINT=$RDS_ENDPOINT
EOF
    
    # Start services
    log "Starting AI services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    log "Waiting for AI services to be healthy..."
    timeout=300
    while [ $timeout -gt 0 ]; do
        if docker-compose ps | grep -q "healthy"; then
            success "AI services are healthy!"
            break
        fi
        sleep 10
        timeout=$((timeout - 10))
    done
    
    if [ $timeout -le 0 ]; then
        error "AI services failed to start within timeout"
    fi
    
    cd ../..
}

# Deploy application
deploy_application() {
    log "Deploying VoiceLoopHR application..."
    
    cd docker/app
    
    # Create environment file
    cat > .env << EOF
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production
VLLM_ENDPOINT=http://localhost:8000/v1
WHISPER_ENDPOINT=http://localhost:8001
TTS_ENDPOINT=http://localhost:8002
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
AWS_REGION=$AWS_REGION
S3_BUCKET=$S3_BUCKET
RDS_ENDPOINT=$RDS_ENDPOINT
EOF
    
    # Build and start application
    log "Building and starting application..."
    docker-compose up -d --build
    
    # Wait for application to be ready
    log "Waiting for application to be ready..."
    timeout=180
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000/api/health &> /dev/null; then
            success "Application is ready!"
            break
        fi
        sleep 10
        timeout=$((timeout - 10))
    done
    
    if [ $timeout -le 0 ]; then
        error "Application failed to start within timeout"
    fi
    
    cd ../..
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Wait for RDS to be available
    log "Waiting for RDS to be available..."
    aws rds wait db-instance-available --db-instance-identifier ${PROJECT_NAME}-db
    
    # Run database migrations
    log "Running database migrations..."
    # Add your database migration commands here
    
    success "Database setup completed!"
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check AI services
    log "Checking AI services..."
    curl -f http://localhost:8000/health || error "vLLM service is not healthy"
    curl -f http://localhost:8001/health || error "Whisper service is not healthy"
    curl -f http://localhost:8002/health || error "TTS service is not healthy"
    
    # Check application
    log "Checking application..."
    curl -f http://localhost:3000/api/health || error "Application is not healthy"
    
    success "All services are healthy!"
}

# Cleanup function
cleanup() {
    log "Cleaning up..."
    
    # Stop Docker services
    cd docker/ai-services && docker-compose down
    cd ../app && docker-compose down
    cd ../..
    
    # Destroy infrastructure (optional)
    if [ "$1" = "--destroy" ]; then
        log "Destroying infrastructure..."
        cd infrastructure/terraform
        terraform destroy -auto-approve
        cd ../..
    fi
}

# Main deployment function
main() {
    log "Starting VoiceLoopHR Open-Source AI deployment..."
    
    # Parse command line arguments
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            deploy_infrastructure
            deploy_ai_services
            deploy_application
            setup_database
            health_check
            success "Deployment completed successfully!"
            log "Application is available at: http://localhost:3000"
            log "AI services are available at:"
            log "  - vLLM: http://localhost:8000"
            log "  - Whisper: http://localhost:8001"
            log "  - TTS: http://localhost:8002"
            ;;
        "destroy")
            cleanup --destroy
            success "Infrastructure destroyed!"
            ;;
        "stop")
            cleanup
            success "Services stopped!"
            ;;
        "health")
            health_check
            ;;
        *)
            echo "Usage: $0 {deploy|destroy|stop|health}"
            echo "  deploy  - Deploy the complete system"
            echo "  destroy - Destroy the infrastructure"
            echo "  stop    - Stop all services"
            echo "  health  - Check service health"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
