# VoiceLoopHR Open-Source AI Deployment Script (PowerShell)
# This script deploys the complete open-source AI backend on AWS

param(
    [Parameter(Position=0)]
    [ValidateSet("deploy", "destroy", "stop", "health")]
    [string]$Action = "deploy"
)

# Configuration
$PROJECT_NAME = "voiceloophr"
$AWS_REGION = "us-east-1"
$INSTANCE_TYPE = "g5.xlarge"
$MIN_INSTANCES = 1
$MAX_INSTANCES = 3
$DESIRED_INSTANCES = 2

# Functions
function Write-Log {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
    exit 1
}

# Check prerequisites
function Test-Prerequisites {
    Write-Log "Checking prerequisites..."
    
    # Check AWS CLI
    if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
        Write-Error "AWS CLI is not installed. Please install it first."
    }
    
    # Check Terraform
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-Error "Terraform is not installed. Please install it first."
    }
    
    # Check Docker
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker is not installed. Please install it first."
    }
    
    # Check Docker Compose
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose is not installed. Please install it first."
    }
    
    # Check AWS credentials
    try {
        aws sts get-caller-identity | Out-Null
    }
    catch {
        Write-Error "AWS credentials not configured. Run 'aws configure' first."
    }
    
    Write-Success "All prerequisites met!"
}

# Deploy infrastructure
function Deploy-Infrastructure {
    Write-Log "Deploying AWS infrastructure..."
    
    Set-Location infrastructure/terraform
    
    # Initialize Terraform
    Write-Log "Initializing Terraform..."
    terraform init
    
    # Create terraform.tfvars
    $dbPassword = -join ((1..32) | ForEach {Get-Random -InputObject @('A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9')})
    
    @"
aws_region = "$AWS_REGION"
project_name = "$PROJECT_NAME"
ai_instance_type = "$INSTANCE_TYPE"
min_instances = $MIN_INSTANCES
max_instances = $MAX_INSTANCES
desired_instances = $DESIRED_INSTANCES
db_password = "$dbPassword"
"@ | Out-File -FilePath terraform.tfvars -Encoding UTF8
    
    # Plan deployment
    Write-Log "Planning Terraform deployment..."
    terraform plan -out=tfplan
    
    # Apply deployment
    Write-Log "Applying Terraform deployment..."
    terraform apply tfplan
    
    # Get outputs
    Write-Log "Getting infrastructure outputs..."
    $script:RDS_ENDPOINT = terraform output -raw rds_endpoint
    $script:S3_BUCKET = terraform output -raw s3_bucket_name
    $script:ALB_DNS = terraform output -raw alb_dns_name
    
    Write-Success "Infrastructure deployed successfully!"
    Write-Log "RDS Endpoint: $RDS_ENDPOINT"
    Write-Log "S3 Bucket: $S3_BUCKET"
    Write-Log "Load Balancer: $ALB_DNS"
    
    Set-Location ../..
}

# Deploy AI services
function Deploy-AIServices {
    Write-Log "Deploying AI services..."
    
    Set-Location docker/ai-services
    
    # Create environment file
    @"
VLLM_ENDPOINT=http://localhost:8000/v1
WHISPER_ENDPOINT=http://localhost:8001
TTS_ENDPOINT=http://localhost:8002
AWS_REGION=$AWS_REGION
S3_BUCKET=$S3_BUCKET
RDS_ENDPOINT=$RDS_ENDPOINT
"@ | Out-File -FilePath .env -Encoding UTF8
    
    # Start services
    Write-Log "Starting AI services..."
    docker-compose up -d
    
    # Wait for services to be healthy
    Write-Log "Waiting for AI services to be healthy..."
    $timeout = 300
    while ($timeout -gt 0) {
        $services = docker-compose ps
        if ($services -match "healthy") {
            Write-Success "AI services are healthy!"
            break
        }
        Start-Sleep -Seconds 10
        $timeout -= 10
    }
    
    if ($timeout -le 0) {
        Write-Error "AI services failed to start within timeout"
    }
    
    Set-Location ../..
}

# Deploy application
function Deploy-Application {
    Write-Log "Deploying VoiceLoopHR application..."
    
    Set-Location docker/app
    
    # Create environment file
    @"
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production
VLLM_ENDPOINT=http://localhost:8000/v1
WHISPER_ENDPOINT=http://localhost:8001
TTS_ENDPOINT=http://localhost:8002
NEXT_PUBLIC_SUPABASE_URL=$env:NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_ROLE_KEY
AWS_REGION=$AWS_REGION
S3_BUCKET=$S3_BUCKET
RDS_ENDPOINT=$RDS_ENDPOINT
"@ | Out-File -FilePath .env -Encoding UTF8
    
    # Build and start application
    Write-Log "Building and starting application..."
    docker-compose up -d --build
    
    # Wait for application to be ready
    Write-Log "Waiting for application to be ready..."
    $timeout = 180
    while ($timeout -gt 0) {
        try {
            Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing | Out-Null
            Write-Success "Application is ready!"
            break
        }
        catch {
            Start-Sleep -Seconds 10
            $timeout -= 10
        }
    }
    
    if ($timeout -le 0) {
        Write-Error "Application failed to start within timeout"
    }
    
    Set-Location ../..
}

# Setup database
function Setup-Database {
    Write-Log "Setting up database..."
    
    # Wait for RDS to be available
    Write-Log "Waiting for RDS to be available..."
    aws rds wait db-instance-available --db-instance-identifier "${PROJECT_NAME}-db"
    
    # Run database migrations
    Write-Log "Running database migrations..."
    # Add your database migration commands here
    
    Write-Success "Database setup completed!"
}

# Health check
function Test-Health {
    Write-Log "Performing health check..."
    
    # Check AI services
    Write-Log "Checking AI services..."
    try {
        Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing | Out-Null
        Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing | Out-Null
        Invoke-WebRequest -Uri "http://localhost:8002/health" -UseBasicParsing | Out-Null
    }
    catch {
        Write-Error "AI services are not healthy"
    }
    
    # Check application
    Write-Log "Checking application..."
    try {
        Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing | Out-Null
    }
    catch {
        Write-Error "Application is not healthy"
    }
    
    Write-Success "All services are healthy!"
}

# Cleanup function
function Invoke-Cleanup {
    param([switch]$Destroy)
    
    Write-Log "Cleaning up..."
    
    # Stop Docker services
    Set-Location docker/ai-services
    docker-compose down
    Set-Location ../app
    docker-compose down
    Set-Location ../..
    
    # Destroy infrastructure (optional)
    if ($Destroy) {
        Write-Log "Destroying infrastructure..."
        Set-Location infrastructure/terraform
        terraform destroy -auto-approve
        Set-Location ../..
    }
}

# Main deployment function
function Start-Deployment {
    Write-Log "Starting VoiceLoopHR Open-Source AI deployment..."
    
    switch ($Action) {
        "deploy" {
            Test-Prerequisites
            Deploy-Infrastructure
            Deploy-AIServices
            Deploy-Application
            Setup-Database
            Test-Health
            Write-Success "Deployment completed successfully!"
            Write-Log "Application is available at: http://localhost:3000"
            Write-Log "AI services are available at:"
            Write-Log "  - vLLM: http://localhost:8000"
            Write-Log "  - Whisper: http://localhost:8001"
            Write-Log "  - TTS: http://localhost:8002"
        }
        "destroy" {
            Invoke-Cleanup -Destroy
            Write-Success "Infrastructure destroyed!"
        }
        "stop" {
            Invoke-Cleanup
            Write-Success "Services stopped!"
        }
        "health" {
            Test-Health
        }
    }
}

# Run main function
Start-Deployment
