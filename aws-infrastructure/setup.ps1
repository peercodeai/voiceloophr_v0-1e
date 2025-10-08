# AWS Backend Setup Script for Windows PowerShell
# This script sets up the AWS backend infrastructure

param(
    [string]$AWSRegion = "us-east-1",
    [string]$Environment = "production",
    [string]$InstanceType = "t3.medium",
    [string]$OpenAIApiKey = "",
    [string]$DBPassword = ""
)

Write-Host "🚀 VoiceLoop HR AWS Backend Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check AWS CLI
try {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not found"
    }
    Write-Host "✅ AWS CLI configured" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" -ForegroundColor Yellow
    exit 1
}

# Check if AWS is configured
try {
    aws sts get-caller-identity 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not configured"
    }
} catch {
    Write-Host "❌ AWS CLI not configured. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

# Check Terraform
try {
    $terraformVersion = terraform --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform not found"
    }
    Write-Host "✅ Terraform installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Terraform not found. Please install Terraform first." -ForegroundColor Red
    Write-Host "Visit: https://developer.hashicorp.com/terraform/downloads" -ForegroundColor Yellow
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "✅ Node.js installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "Visit: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All prerequisites met" -ForegroundColor Green

# Get user inputs if not provided
if (-not $OpenAIApiKey) {
    $OpenAIApiKey = Read-Host "OpenAI API Key"
    if (-not $OpenAIApiKey) {
        Write-Host "❌ OpenAI API Key is required" -ForegroundColor Red
        exit 1
    }
}

if (-not $DBPassword) {
    $SecurePassword = Read-Host "Database password" -AsSecureString
    $DBPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword))
    if (-not $DBPassword) {
        Write-Host "❌ Database password is required" -ForegroundColor Red
        exit 1
    }
}

# Generate random secrets
$NextAuthSecret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString()))

Write-Host ""
Write-Host "🔧 Creating configuration files..." -ForegroundColor Yellow

# Create terraform.tfvars
$terraformVars = @"
aws_region = "$AWSRegion"
environment = "$Environment"
app_name = "voiceloophr"
instance_type = "$InstanceType"
db_instance_class = "db.t3.micro"
db_username = "voiceloophr"
db_password = "$DBPassword"
"@

$terraformVars | Out-File -FilePath "terraform/terraform.tfvars" -Encoding UTF8

# Create environment file for EC2
$envVars = @"
# OpenAI Configuration
OPENAI_API_KEY=$OpenAIApiKey

# NextAuth Configuration
NEXTAUTH_SECRET=$NextAuthSecret

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_DISABLE_AUTH=true
"@

$envVars | Out-File -FilePath "ec2-env-vars.env" -Encoding UTF8

Write-Host "✅ Configuration files created" -ForegroundColor Green

# Deploy infrastructure
Write-Host ""
Write-Host "🚀 Deploying AWS Infrastructure..." -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

Set-Location terraform

# Initialize Terraform
Write-Host "🔧 Initializing Terraform..." -ForegroundColor Yellow
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Terraform initialization failed" -ForegroundColor Red
    exit 1
}

# Plan the deployment
Write-Host "📋 Planning deployment..." -ForegroundColor Yellow
terraform plan -out=tfplan

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Terraform plan failed" -ForegroundColor Red
    exit 1
}

# Ask for confirmation
$confirm = Read-Host "Do you want to proceed with the deployment? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 1
}

# Apply the plan
Write-Host "🚀 Deploying infrastructure..." -ForegroundColor Yellow
terraform apply tfplan

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Terraform apply failed" -ForegroundColor Red
    exit 1
}

# Get outputs
Write-Host "📊 Deployment completed! Getting outputs..." -ForegroundColor Yellow
$EC2IP = terraform output -raw ec2_public_ip
$S3Bucket = terraform output -raw s3_bucket_name
$RDSEndpoint = terraform output -raw rds_endpoint

Set-Location ..

Write-Host ""
Write-Host "🎉 AWS Backend Infrastructure Deployed!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "EC2 Instance IP: $EC2IP" -ForegroundColor Cyan
Write-Host "S3 Bucket: $S3Bucket" -ForegroundColor Cyan
Write-Host "RDS Endpoint: $RDSEndpoint" -ForegroundColor Cyan
Write-Host "Application URL: http://$EC2IP" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. SSH into the server: ssh -i ~/.ssh/id_rsa ubuntu@$EC2IP" -ForegroundColor White
Write-Host "2. Check application status: sudo systemctl status voiceloophr" -ForegroundColor White
Write-Host "3. View logs: sudo -u voiceloophr pm2 logs voiceloophr" -ForegroundColor White
Write-Host "4. Set up SSL certificate: sudo certbot --nginx" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Environment Variables to Set:" -ForegroundColor Yellow
Write-Host "The environment variables have been automatically configured on the EC2 instance." -ForegroundColor White
Write-Host ""
Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "Your VoiceLoop HR application is now running on AWS with persistent storage!" -ForegroundColor Green
