# 🚀 AWS Backend Infrastructure for VoiceLoop HR

This directory contains everything needed to deploy VoiceLoop HR on AWS with persistent storage, solving all the serverless architecture issues.

## 🎯 What This Solves

- ❌ **Serverless memory volatility** → ✅ **Persistent PostgreSQL database**
- ❌ **Function timeout limits** → ✅ **No timeout limits on dedicated server**
- ❌ **localStorage quota issues** → ✅ **Server-side file storage with S3**
- ❌ **Inconsistent state** → ✅ **Reliable database transactions**
- ❌ **Mobile vs desktop differences** → ✅ **Consistent behavior across all devices**

## 📋 Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Terraform installed** (v1.0+)
3. **Node.js 18+** installed locally
4. **SSH key pair** in `~/.ssh/id_rsa` (for EC2 access)
5. **OpenAI API key** for AI functionality

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/peercodeai/voiceloophr_v0-1e.git
cd voiceloophr_v0-1e

# Run the automated setup
chmod +x aws-infrastructure/setup.sh
./aws-infrastructure/setup.sh
```

The setup script will:
- ✅ Check all prerequisites
- ✅ Prompt for configuration values
- ✅ Deploy AWS infrastructure with Terraform
- ✅ Set up the application on EC2
- ✅ Configure environment variables
- ✅ Run health checks

### Option 2: Manual Setup

```bash
# 1. Configure Terraform variables
cd aws-infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# 2. Deploy infrastructure
terraform init
terraform plan
terraform apply

# 3. Set up environment variables on EC2
# SSH to the instance and configure .env.local
```

## 🏗️ Infrastructure Components

### **EC2 Instance**
- **Instance Type:** t3.medium (configurable)
- **OS:** Ubuntu 22.04 LTS
- **Applications:** Node.js, PM2, Nginx, PostgreSQL client
- **Security:** SSH, HTTP, HTTPS access

### **RDS PostgreSQL Database**
- **Instance Class:** db.t3.micro (configurable)
- **Storage:** 20GB (auto-scaling to 100GB)
- **Backups:** 7-day retention
- **Security:** VPC-only access

### **S3 Bucket**
- **Purpose:** File storage for uploaded documents
- **Security:** Private bucket with encryption
- **Versioning:** Enabled for file history

### **Security Groups**
- **Web Access:** HTTP (80), HTTPS (443)
- **SSH Access:** Port 22
- **Database Access:** Port 5432 (EC2 only)

## 📊 Architecture

```
Internet → CloudFront → EC2 (Nginx) → Node.js App → PostgreSQL
                                    ↓
                                 S3 Storage
```

## 🔧 Configuration

### **Terraform Variables** (`terraform.tfvars`)

```hcl
aws_region = "us-east-1"
environment = "production"
app_name = "voiceloophr"
instance_type = "t3.medium"
db_instance_class = "db.t3.micro"
db_username = "voiceloophr"
db_password = "your_secure_password"
```

### **Environment Variables** (EC2 `.env.local`)

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Supabase (optional)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Application
NEXTAUTH_URL=http://your-domain.com
NEXTAUTH_SECRET=your-secret-key
NODE_ENV=production
```

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

- **`documents`** - File metadata and extracted content
- **`ai_analysis`** - AI analysis results and history
- **`conversations`** - Chat conversations
- **`messages`** - Individual chat messages
- **`file_uploads`** - Upload tracking and temporary storage
- **`user_settings`** - User preferences and encrypted API keys
- **`search_chunks`** - Document chunks for semantic search

## 🚀 Deployment Process

### **1. Infrastructure Deployment**
```bash
cd aws-infrastructure/terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### **2. Application Setup**
The EC2 instance automatically:
- ✅ Installs Node.js 18 and PM2
- ✅ Clones the repository
- ✅ Installs dependencies
- ✅ Builds the application
- ✅ Configures Nginx reverse proxy
- ✅ Sets up systemd service
- ✅ Starts the application

### **3. Database Setup**
```bash
# SSH to EC2 instance
ssh ubuntu@your-ec2-ip

# Run database schema
psql -h your-rds-endpoint -U voiceloophr -d voiceloophr -f /opt/voiceloophr/aws-infrastructure/database/schema.sql
```

## 🔍 Monitoring & Management

### **Application Status**
```bash
# Check application status
sudo systemctl status voiceloophr

# View application logs
sudo -u voiceloophr pm2 logs voiceloophr

# Restart application
sudo systemctl restart voiceloophr
```

### **System Monitoring**
```bash
# Run system health check
/opt/voiceloophr/monitor.sh

# Check disk usage
df -h

# Check memory usage
free -h

# Check application health
curl http://localhost:3000/api/health
```

### **Database Management**
```bash
# Connect to database
psql -h your-rds-endpoint -U voiceloophr -d voiceloophr

# Check database stats
SELECT * FROM get_document_stats('user-id-here');

# Clean up old files
SELECT cleanup_old_uploads();
```

## 🔄 Updates & Maintenance

### **Application Updates**
```bash
# SSH to EC2 instance
ssh ubuntu@your-ec2-ip

# Run update script
/opt/voiceloophr/update-app.sh
```

### **Database Backups**
- ✅ **Automatic daily backups** at 2 AM
- ✅ **7-day retention** policy
- ✅ **Manual backup command:**
```bash
/opt/voiceloophr/backup-db.sh
```

### **Log Rotation**
- ✅ **Automatic log rotation** for application logs
- ✅ **7-day retention** for rotated logs
- ✅ **Compression** of old logs

## 🔒 Security

### **Network Security**
- ✅ **Security groups** restrict access
- ✅ **Database** only accessible from EC2
- ✅ **S3 bucket** private with encryption

### **Application Security**
- ✅ **Environment variables** for sensitive data
- ✅ **Encrypted API keys** in database
- ✅ **HTTPS ready** (SSL certificate setup needed)

### **SSL Certificate Setup**
```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

## 💰 Cost Estimation

### **Monthly Costs** (us-east-1)
- **EC2 t3.medium:** ~$30/month
- **RDS db.t3.micro:** ~$15/month
- **S3 Storage (100GB):** ~$2/month
- **Data Transfer:** ~$1/month
- **Total:** ~$48/month

### **Cost Optimization**
- Use **t3.small** for development (~$15/month)
- Use **db.t3.micro** for small workloads
- Set up **CloudWatch billing alerts**

## 🚨 Troubleshooting

### **Application Not Starting**
```bash
# Check logs
sudo -u voiceloophr pm2 logs voiceloophr

# Check systemd status
sudo systemctl status voiceloophr

# Restart application
sudo systemctl restart voiceloophr
```

### **Database Connection Issues**
```bash
# Test database connection
psql -h your-rds-endpoint -U voiceloophr -d voiceloophr

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### **File Upload Issues**
```bash
# Check S3 bucket permissions
aws s3 ls s3://your-bucket-name

# Check application logs for S3 errors
sudo -u voiceloophr pm2 logs voiceloophr | grep S3
```

## 📞 Support

For issues with this AWS setup:
1. Check the application logs: `sudo -u voiceloophr pm2 logs voiceloophr`
2. Run the health check: `curl http://localhost:3000/api/health`
3. Check system resources: `/opt/voiceloophr/monitor.sh`
4. Review AWS CloudWatch logs for infrastructure issues

## 🎉 Benefits of This Setup

- ✅ **No more serverless timeouts** - Dedicated server handles large files
- ✅ **Persistent storage** - Files never disappear between requests
- ✅ **Consistent performance** - Same server handles all requests
- ✅ **Better mobile support** - No localStorage dependency
- ✅ **Reliable chat functionality** - Database-backed conversations
- ✅ **Scalable architecture** - Easy to upgrade resources
- ✅ **Professional monitoring** - Full logging and health checks

This AWS backend completely solves the serverless architecture issues and provides a robust, scalable foundation for VoiceLoop HR! 🚀
