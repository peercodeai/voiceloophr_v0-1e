# VoiceLoopHR Open-Source AI Backend - Build & Deployment Guide

## 🏗️ What We Need to Build

### **1. Core Application Components**

#### **Next.js Application**
- ✅ **Dockerfile** - Multi-stage build for production
- ✅ **Docker Compose** - Application containerization
- ✅ **Nginx Configuration** - Load balancing and SSL termination
- ✅ **Health Check API** - Comprehensive service monitoring

#### **Open-Source AI Services**
- ✅ **vLLM Integration** - High-performance LLM serving
- ✅ **Whisper STT** - Speech-to-text processing
- ✅ **Coqui TTS** - Text-to-speech synthesis
- ✅ **Service Layer** - TypeScript service abstraction
- ✅ **API Routes** - RESTful endpoints for AI services

### **2. AWS Infrastructure**

#### **Compute Resources**
- ✅ **EC2 G5 Instances** - GPU-accelerated AI processing
- ✅ **Auto Scaling Groups** - Dynamic scaling based on demand
- ✅ **Load Balancer** - Application Load Balancer with SSL
- ✅ **Security Groups** - Network security configuration

#### **Data Storage**
- ✅ **RDS PostgreSQL** - Database with pg_vector extension
- ✅ **S3 Storage** - Document storage with encryption
- ✅ **Database Migrations** - Schema and vector indexes

#### **Monitoring & Logging**
- ✅ **CloudWatch Dashboard** - Comprehensive monitoring
- ✅ **CloudWatch Alarms** - Automated alerting
- ✅ **SNS Notifications** - Email alerts
- ✅ **Log Groups** - Centralized logging

### **3. CI/CD Pipeline**

#### **GitHub Actions Workflow**
- ✅ **Automated Testing** - Code quality and unit tests
- ✅ **Docker Build** - Multi-architecture image building
- ✅ **AWS Deployment** - Infrastructure and application deployment
- ✅ **Health Checks** - Post-deployment verification
- ✅ **Monitoring Setup** - CloudWatch configuration

## 🚀 Deployment Process

### **Phase 1: Prerequisites Setup**

1. **AWS Account Configuration**
   ```bash
   # Configure AWS CLI
   aws configure
   
   # Verify access
   aws sts get-caller-identity
   ```

2. **GitHub Secrets Configuration**
   ```
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   DB_PASSWORD=your_secure_password
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Environment Variables**
   ```bash
   # Copy environment template
   cp env.open-source.example .env.local
   
   # Configure your settings
   nano .env.local
   ```

### **Phase 2: Infrastructure Deployment**

1. **Terraform Infrastructure**
   ```bash
   cd infrastructure/terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Database Setup**
   ```bash
   # Run migrations
   psql -h your-rds-endpoint -U postgres -d voiceloophr -f database/migrations/001_initial_schema.sql
   psql -h your-rds-endpoint -U postgres -d voiceloophr -f database/migrations/002_vector_indexes.sql
   ```

### **Phase 3: AI Services Deployment**

1. **Docker Services**
   ```bash
   cd docker/ai-services
   docker-compose up -d
   ```

2. **Service Verification**
   ```bash
   # Check vLLM
   curl http://localhost:8000/health
   
   # Check Whisper
   curl http://localhost:8001/health
   
   # Check TTS
   curl http://localhost:8002/health
   ```

### **Phase 4: Application Deployment**

1. **Build Application**
   ```bash
   docker build -t voiceloophr-app .
   ```

2. **Deploy with Docker Compose**
   ```bash
   cd docker/app
   docker-compose up -d
   ```

3. **Health Check**
   ```bash
   curl http://localhost:3000/api/health
   ```

## 🔧 Build Requirements

### **System Requirements**

#### **Development Environment**
- **Node.js**: 18+
- **pnpm**: Latest version
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **AWS CLI**: 2.0+
- **Terraform**: 1.0+

#### **Production Environment**
- **AWS Account**: With EC2, RDS, S3 access
- **EC2 Instances**: G5.xlarge or larger
- **RAM**: 16GB+ (32GB+ recommended)
- **Storage**: 100GB+ SSD
- **GPU**: NVIDIA GPU with CUDA support

### **Dependencies**

#### **Node.js Dependencies**
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.0.0",
    "@aws-sdk/s3-request-presigner": "^3.0.0",
    "zod": "^3.0.0"
  }
}
```

#### **Docker Dependencies**
- **vLLM**: Latest version with GPU support
- **Whisper**: OpenAI Whisper with CUDA
- **Coqui TTS**: XTTS-v2 model
- **Nginx**: Alpine Linux with SSL support
- **Redis**: For caching and session storage

#### **AWS Dependencies**
- **EC2**: G5 instances for GPU acceleration
- **RDS**: PostgreSQL 15+ with pg_vector
- **S3**: For document storage
- **CloudWatch**: For monitoring and logging
- **SNS**: For alert notifications

## 📊 Cost Estimation

### **Monthly AWS Costs**

| Component | Instance Type | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 G5.xlarge** | 2 instances | $600-800 |
| **RDS PostgreSQL** | db.t3.medium | $50-80 |
| **S3 Storage** | 100GB | $2-5 |
| **Load Balancer** | ALB | $20-30 |
| **CloudWatch** | Logs & Metrics | $10-20 |
| **Data Transfer** | Outbound | $5-15 |
| **Total** | | **$687-950** |

### **Cost Optimization Strategies**

1. **Spot Instances**: Up to 90% cost savings
2. **Reserved Instances**: For predictable workloads
3. **S3 Intelligent Tiering**: Automatic cost optimization
4. **Auto Scaling**: Scale down during low usage
5. **Right-sizing**: Regular monitoring and adjustment

## 🔒 Security Considerations

### **Network Security**
- VPC with private subnets for AI services
- Security groups with strict access controls
- Network ACLs for additional security
- VPC Flow Logs for monitoring

### **Data Security**
- Encryption at rest (RDS, S3)
- Encryption in transit (TLS)
- IAM roles for service access
- Regular security audits

### **Access Control**
- IAM roles for EC2 instances
- Least privilege access principles
- MFA for admin accounts
- Regular access reviews

## 📈 Monitoring & Alerting

### **CloudWatch Metrics**
- EC2 instance metrics (CPU, memory, GPU)
- RDS performance metrics
- Load balancer metrics
- S3 storage metrics
- Custom application metrics

### **CloudWatch Alarms**
- High CPU utilization (>80%)
- High memory utilization (>85%)
- Database connection issues
- High response time (>5s)
- High error rate (>5 errors/5min)

### **Logging**
- Application logs
- AI service logs
- Access logs
- Error logs
- Performance logs

## 🚨 Troubleshooting

### **Common Issues**

#### **1. GPU Not Available**
```bash
# Check GPU availability
nvidia-smi

# Verify Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

#### **2. Service Connection Issues**
```bash
# Check service health
curl http://localhost:8000/health

# Check Docker logs
docker-compose logs vllm
```

#### **3. Database Connection Issues**
```bash
# Test database connectivity
psql -h your-rds-endpoint -U postgres -d voiceloophr

# Check RDS status
aws rds describe-db-instances --db-instance-identifier voiceloophr-db
```

#### **4. High Memory Usage**
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart
```

### **Debug Commands**

```bash
# Check all services
docker-compose ps

# View logs
docker-compose logs -f

# Check resource usage
docker stats

# Test API endpoints
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "microsoft/DialoGPT-medium", "messages": [{"role": "user", "content": "Hello"}]}'
```

## 🔄 Maintenance

### **Regular Tasks**

#### **Daily**
- Monitor service health
- Check error logs
- Review cost metrics

#### **Weekly**
- Update dependencies
- Review security logs
- Optimize performance

#### **Monthly**
- Update AI models
- Review cost optimization
- Security audit

### **Updates**

#### **AI Models**
```bash
# Update vLLM
docker-compose pull vllm
docker-compose up -d vllm

# Update Whisper
docker-compose pull whisper
docker-compose up -d whisper

# Update TTS
docker-compose pull tts
docker-compose up -d tts
```

#### **Application**
```bash
# Update application
git pull origin open-source
docker-compose up -d --build app
```

## 📚 Additional Resources

### **Documentation**
- [AWS Infrastructure Guide](aws-infrastructure.md)
- [Open-Source README](README-OPEN-SOURCE.md)
- [Branch Comparison](branch-comparison.md)

### **Support**
- [GitHub Issues](https://github.com/peercodeai/voiceloophr_v0-1e/issues)
- [GitHub Discussions](https://github.com/peercodeai/voiceloophr_v0-1e/discussions)

### **References**
- [vLLM Documentation](https://docs.vllm.ai/)
- [OpenAI Whisper](https://openai.com/research/whisper)
- [Coqui TTS](https://github.com/coqui-ai/TTS)
- [AWS EC2 G5 Instances](https://aws.amazon.com/ec2/instance-types/g5/)

---

**Ready to deploy?** Follow the [Quick Start Guide](README-OPEN-SOURCE.md#quick-start) to get started!
