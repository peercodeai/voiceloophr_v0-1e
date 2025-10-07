#!/bin/bash

# AWS Backend Deployment Script for VoiceLoop HR
# This script deploys the complete AWS infrastructure

set -e

echo "🚀 VoiceLoop HR AWS Backend Deployment"
echo "======================================"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not installed. Please install Terraform first."
    echo "Visit: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi

echo "✅ Terraform installed"

# Navigate to terraform directory
cd "$(dirname "$0")/terraform"

# Check if terraform.tfvars exists
if [ ! -f "terraform.tfvars" ]; then
    echo "❌ terraform.tfvars not found."
    echo "Please copy terraform.tfvars.example to terraform.tfvars and fill in your values."
    exit 1
fi

echo "✅ terraform.tfvars found"

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Plan the deployment
echo "📋 Planning deployment..."
terraform plan -out=tfplan

# Ask for confirmation
read -p "Do you want to proceed with the deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Apply the plan
echo "🚀 Deploying infrastructure..."
terraform apply tfplan

# Get outputs
echo "📊 Deployment completed! Getting outputs..."
EC2_IP=$(terraform output -raw ec2_public_ip)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

echo ""
echo "🎉 AWS Backend Infrastructure Deployed!"
echo "======================================"
echo "EC2 Instance IP: $EC2_IP"
echo "S3 Bucket: $S3_BUCKET"
echo "RDS Endpoint: $RDS_ENDPOINT"
echo "Application URL: http://$EC2_IP"
echo ""
echo "📝 Next Steps:"
echo "1. SSH into the server: ssh -i ~/.ssh/id_rsa ubuntu@$EC2_IP"
echo "2. Check application status: sudo systemctl status voiceloophr"
echo "3. View logs: sudo -u voiceloophr pm2 logs voiceloophr"
echo "4. Set up SSL certificate: sudo certbot --nginx"
echo ""
echo "🔧 Environment Variables to Set:"
echo "Run these commands on the EC2 instance:"
echo "sudo -u voiceloophr bash"
echo "cd /opt/voiceloophr"
echo "nano .env.local"
echo ""
echo "Add these variables:"
echo "OPENAI_API_KEY=your_openai_key_here"
echo "AWS_ACCESS_KEY_ID=your_aws_access_key"
echo "AWS_SECRET_ACCESS_KEY=your_aws_secret_key"
echo "NEXTAUTH_SECRET=your_nextauth_secret"
echo ""
echo "Then restart the application:"
echo "sudo systemctl restart voiceloophr"
echo ""
echo "✅ Deployment completed successfully!"
