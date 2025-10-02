# AWS Infrastructure & Open-Source AI Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying VoiceLoopHR with a complete open-source AI backend on AWS. This deployment eliminates external API dependencies and provides full control over your AI infrastructure.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Application     │    │   AI Services   │
│   (Frontend)    │◄──►│  Load Balancer   │◄──►│   (EC2 G5)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   RDS PostgreSQL │    │   S3 Storage    │
                       │   (pg_vector)    │    │   (Documents)   │
                       └──────────────────┘    └─────────────────┘
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Terraform or AWS CloudFormation
- Docker and Docker Compose
- Domain name (optional, for production)

## Infrastructure Components

### 1. Compute Resources

#### **EC2 G5 Instances**
- **Instance Types**: `g5.xlarge`, `g5.2xlarge`, `g5.4xlarge`
- **GPU**: NVIDIA A10G Tensor Core GPUs
- **Purpose**: LLM inference, STT, and TTS processing
- **Scaling**: Auto Scaling Groups based on demand

#### **Cost Optimization**
- **Spot Instances**: For non-critical workloads (up to 90% cost savings)
- **Reserved Instances**: For predictable base loads
- **Right-sizing**: Continuous monitoring and optimization

### 2. Data Storage

#### **RDS PostgreSQL with pg_vector**
- **Purpose**: Vector database for semantic search
- **Configuration**: Multi-AZ deployment for high availability
- **Scaling**: Read replicas for improved performance
- **Extension**: pg_vector for vector similarity search

#### **S3 Storage**
- **Purpose**: Document storage (PDFs, DOCX, XLSX)
- **Configuration**: Intelligent Tiering for cost optimization
- **Security**: Bucket policies and access controls

### 3. Networking & Security

#### **VPC Configuration**
- **Public Subnets**: Load balancers and NAT gateways
- **Private Subnets**: EC2 instances and RDS
- **Security Groups**: Strict access controls
- **Network ACLs**: Additional security layer

#### **Load Balancing**
- **Application Load Balancer**: Traffic distribution
- **SSL/TLS**: AWS Certificate Manager integration
- **Health Checks**: Automatic failover

### 4. AI Services

#### **vLLM (Large Language Model)**
- **Purpose**: High-performance LLM serving
- **Models**: Support for various open-source models
- **Optimization**: GPU-accelerated inference
- **API**: OpenAI-compatible endpoints

#### **OpenAI Whisper (Speech-to-Text)**
- **Purpose**: Audio transcription
- **Deployment**: Containerized on EC2
- **Performance**: GPU-accelerated processing

#### **Coqui TTS (Text-to-Speech)**
- **Purpose**: Voice synthesis
- **Model**: XTTS-v2 for high-quality speech
- **Deployment**: Containerized on EC2

## Deployment Steps

### Step 1: Infrastructure Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/voiceloophr.git
   cd voiceloophr
   git checkout open-source-ai
   ```

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and region
   ```

3. **Deploy Infrastructure with Terraform**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

### Step 2: AI Services Deployment

1. **Deploy Containerized AI Services**
   ```bash
   cd docker/ai-services
   docker-compose up -d
   ```

2. **Verify Services**
   ```bash
   # Check vLLM service
   curl http://your-ec2-instance:8000/v1/models
   
   # Check Whisper service
   curl http://your-ec2-instance:8001/health
   
   # Check TTS service
   curl http://your-ec2-instance:8002/health
   ```

### Step 3: Application Deployment

1. **Deploy Next.js Application**
   ```bash
   cd docker/app
   docker-compose up -d
   ```

2. **Configure Environment Variables**
   ```bash
   # Update .env.local with your AWS endpoints
   VLLM_ENDPOINT=http://your-ec2-instance:8000/v1
   WHISPER_ENDPOINT=http://your-ec2-instance:8001
   TTS_ENDPOINT=http://your-ec2-instance:8002
   ```

### Step 4: Database Setup

1. **Initialize Database**
   ```bash
   # Connect to RDS instance
   psql -h your-rds-endpoint -U postgres -d voiceloophr
   
   # Enable pg_vector extension
   CREATE EXTENSION vector;
   
   # Run migrations
   \i database/migrations/001_initial_schema.sql
   ```

2. **Configure Vector Search**
   ```bash
   # Create vector indexes
   \i database/migrations/002_vector_indexes.sql
   ```

## Configuration Files

### Terraform Configuration

```hcl
# infrastructure/terraform/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# EC2 G5 Instances
resource "aws_instance" "ai_services" {
  count         = var.instance_count
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private[count.index % length(aws_subnet.private)].id
  
  vpc_security_group_ids = [aws_security_group.ai_services.id]
  
  tags = {
    Name = "voiceloophr-ai-${count.index + 1}"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier = "voiceloophr-db"
  engine     = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  allocated_storage = 100
  
  db_name  = "voiceloophr"
  username = "postgres"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
}
```

### Docker Compose for AI Services

```yaml
# docker/ai-services/docker-compose.yml
version: '3.8'

services:
  vllm:
    image: vllm/vllm-openai:latest
    ports:
      - "8000:8000"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    command: >
      --model microsoft/DialoGPT-medium
      --host 0.0.0.0
      --port 8000
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  whisper:
    image: openai/whisper:latest
    ports:
      - "8001:8001"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    command: >
      python -m flask run --host=0.0.0.0 --port=8001
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  tts:
    image: coqui/tts:latest
    ports:
      - "8002:8002"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    command: >
      python -m tts.server --host 0.0.0.0 --port 8002
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Monitoring & Logging

### CloudWatch Integration

1. **Metrics Collection**
   - EC2 instance metrics (CPU, memory, GPU utilization)
   - RDS performance metrics
   - Application custom metrics

2. **Log Aggregation**
   - Application logs
   - AI service logs
   - Access logs

3. **Alarms**
   - High CPU/GPU utilization
   - Database connection issues
   - Service health checks

### Cost Monitoring

1. **AWS Budgets**
   - Set up budget alerts
   - Monitor spending by service
   - Track cost trends

2. **Cost Optimization**
   - Regular instance right-sizing
   - Spot instance utilization
   - Reserved instance planning

## Security Best Practices

### Network Security
- Use private subnets for AI services
- Implement strict security groups
- Enable VPC Flow Logs
- Use AWS WAF for web protection

### Data Security
- Encrypt data at rest (RDS, S3)
- Encrypt data in transit (TLS)
- Implement proper IAM roles
- Regular security audits

### Access Control
- Use IAM roles for EC2 instances
- Implement least privilege access
- Enable MFA for admin accounts
- Regular access reviews

## Troubleshooting

### Common Issues

1. **GPU Not Available**
   ```bash
   # Check GPU availability
   nvidia-smi
   
   # Verify Docker GPU support
   docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
   ```

2. **Service Connection Issues**
   ```bash
   # Check service health
   curl http://your-ec2-instance:8000/health
   
   # Check security groups
   aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
   ```

3. **Database Connection Issues**
   ```bash
   # Test database connectivity
   psql -h your-rds-endpoint -U postgres -d voiceloophr
   
   # Check RDS status
   aws rds describe-db-instances --db-instance-identifier voiceloophr-db
   ```

## Cost Estimation

### Monthly Costs (Estimated)

| Service | Instance Type | Monthly Cost |
|---------|---------------|--------------|
| EC2 G5.xlarge | 2 instances | $600-800 |
| RDS PostgreSQL | db.t3.medium | $50-80 |
| S3 Storage | 100GB | $2-5 |
| Load Balancer | ALB | $20-30 |
| **Total** | | **$670-915** |

### Cost Optimization Tips

1. **Use Spot Instances**: Up to 90% cost savings
2. **Right-size Instances**: Regular monitoring and adjustment
3. **Reserved Instances**: For predictable workloads
4. **S3 Intelligent Tiering**: Automatic cost optimization
5. **Auto Scaling**: Scale down during low usage

## Support

For additional support and troubleshooting:

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/voiceloophr/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/voiceloophr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/voiceloophr/discussions)

## References

- [AWS EC2 G5 Instances](https://aws.amazon.com/ec2/instance-types/g5/)
- [vLLM Documentation](https://docs.vllm.ai/)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [Coqui TTS](https://github.com/coqui-ai/TTS)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest)
