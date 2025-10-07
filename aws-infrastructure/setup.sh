#!/bin/bash

# Complete AWS Backend Setup Script
# This script sets up the entire AWS backend infrastructure

set -e

echo "🚀 VoiceLoop HR AWS Backend Setup"
echo "================================="

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI first."
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found. Please install Terraform first."
    echo "Visit: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ All prerequisites met"

# Get user inputs
echo ""
echo "📝 Configuration Setup"
echo "======================"

# Get AWS region
read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

# Get environment
read -p "Environment (default: production): " ENVIRONMENT
ENVIRONMENT=${ENVIRONMENT:-production}

# Get instance type
read -p "EC2 Instance Type (default: t3.medium): " INSTANCE_TYPE
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}

# Get database password
echo "Database password (will be encrypted):"
read -s DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Database password is required"
    exit 1
fi

# Get OpenAI API Key
echo "OpenAI API Key:"
read -s OPENAI_API_KEY
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OpenAI API Key is required"
    exit 1
fi

# Get Supabase credentials (optional)
echo "Supabase URL (optional, press Enter to skip):"
read SUPABASE_URL

echo "Supabase Anon Key (optional, press Enter to skip):"
read -s SUPABASE_ANON_KEY

echo "Supabase Service Role Key (optional, press Enter to skip):"
read -s SUPABASE_SERVICE_ROLE_KEY

# Generate random secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)

echo ""
echo "🔧 Creating configuration files..."

# Create terraform.tfvars
cat > aws-infrastructure/terraform/terraform.tfvars << EOF
aws_region = "$AWS_REGION"
environment = "$ENVIRONMENT"
app_name = "voiceloophr"
instance_type = "$INSTANCE_TYPE"
db_instance_class = "db.t3.micro"
db_username = "voiceloophr"
db_password = "$DB_PASSWORD"
EOF

# Create environment file for EC2
cat > aws-infrastructure/ec2-env-vars.env << EOF
# OpenAI Configuration
OPENAI_API_KEY=$OPENAI_API_KEY

# Supabase Configuration (if provided)
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# NextAuth Configuration
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_DISABLE_AUTH=true
EOF

echo "✅ Configuration files created"

# Deploy infrastructure
echo ""
echo "🚀 Deploying AWS Infrastructure..."
echo "================================="

cd aws-infrastructure
chmod +x deploy.sh
./deploy.sh

# Get the EC2 IP
EC2_IP=$(cd terraform && terraform output -raw ec2_public_ip)

echo ""
echo "📊 Setting up environment variables on EC2..."
echo "============================================="

# Wait for EC2 to be ready
echo "⏳ Waiting for EC2 instance to be ready..."
sleep 60

# Copy environment variables to EC2
echo "📤 Copying environment variables to EC2..."
scp -o StrictHostKeyChecking=no ec2-env-vars.env ubuntu@$EC2_IP:/tmp/

# Set up environment variables on EC2
ssh -o StrictHostKeyChecking=no ubuntu@$EC2_IP << 'EOF'
# Copy environment variables to application directory
sudo cp /tmp/ec2-env-vars.env /opt/voiceloophr/.env.local

# Set proper ownership
sudo chown voiceloophr:voiceloophr /opt/voiceloophr/.env.local
sudo chmod 600 /opt/voiceloophr/.env.local

# Restart the application
sudo systemctl restart voiceloophr

# Wait for application to start
sleep 10

# Check application status
sudo systemctl status voiceloophr --no-pager
EOF

echo ""
echo "🔍 Running health checks..."
echo "=========================="

# Health check
HEALTH_URL="http://$EC2_IP/api/health"
echo "Checking health endpoint: $HEALTH_URL"

# Wait for application to be ready
for i in {1..30}; do
    if curl -s -f "$HEALTH_URL" > /dev/null 2>&1; then
        echo "✅ Application is healthy!"
        break
    fi
    echo "⏳ Waiting for application to start... ($i/30)"
    sleep 10
done

# Test API endpoints
echo ""
echo "🧪 Testing API endpoints..."

# Test version endpoint
echo "Testing /api/version..."
curl -s "http://$EC2_IP/api/version" | jq '.' || echo "❌ Version endpoint failed"

# Test health endpoint
echo "Testing /api/health..."
curl -s "http://$EC2_IP/api/health" | jq '.' || echo "❌ Health endpoint failed"

echo ""
echo "🎉 AWS Backend Setup Complete!"
echo "=============================="
echo ""
echo "📊 Infrastructure Details:"
echo "EC2 Instance IP: $EC2_IP"
echo "Application URL: http://$EC2_IP"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo ""
echo "🔧 Management Commands:"
echo "SSH to server: ssh ubuntu@$EC2_IP"
echo "Check logs: ssh ubuntu@$EC2_IP 'sudo -u voiceloophr pm2 logs'"
echo "Restart app: ssh ubuntu@$EC2_IP 'sudo systemctl restart voiceloophr'"
echo "Update app: ssh ubuntu@$EC2_IP '/opt/voiceloophr/update-app.sh'"
echo ""
echo "🔒 Security:"
echo "1. Set up SSL certificate: ssh ubuntu@$EC2_IP 'sudo certbot --nginx'"
echo "2. Configure domain DNS to point to $EC2_IP"
echo "3. Update security groups if needed"
echo ""
echo "📈 Monitoring:"
echo "System status: ssh ubuntu@$EC2_IP '/opt/voiceloophr/monitor.sh'"
echo "Database backups: Automatically scheduled daily at 2 AM"
echo ""
echo "✅ Setup completed successfully!"
echo "Your VoiceLoop HR application is now running on AWS with persistent storage!"
