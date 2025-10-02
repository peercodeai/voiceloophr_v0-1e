# VoiceLoopHR: Open-Source AI Backend

## 🌟 Overview

VoiceLoopHR Open-Source AI Backend is a complete self-hosted solution that eliminates dependency on external AI API services. This branch provides a fully functional AI-powered document analysis platform using open-source models and AWS infrastructure.

## 🚀 Key Features

### **Open-Source AI Components**
- **🤖 vLLM Integration** - High-performance LLM serving with GPU acceleration
- **🎤 Whisper STT** - OpenAI Whisper for speech-to-text processing
- **🔊 Coqui TTS** - XTTS-v2 for high-quality text-to-speech synthesis
- **☁️ AWS Infrastructure** - Scalable, cost-optimized cloud deployment
- **🔒 Complete Data Privacy** - No external API calls, full control over your data

### **Infrastructure Benefits**
- **Cost Optimization** - Up to 90% cost savings with spot instances
- **Scalability** - Auto-scaling based on demand
- **High Availability** - Multi-AZ deployment with load balancing
- **Security** - VPC isolation and encrypted data storage
- **Monitoring** - Comprehensive CloudWatch integration

## 🏗️ Architecture

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

## 📋 Prerequisites

### **System Requirements**
- **OS**: Linux (Ubuntu 20.04+) or Windows 10/11
- **RAM**: 16GB+ (32GB+ recommended for production)
- **Storage**: 100GB+ SSD
- **GPU**: NVIDIA GPU with CUDA support (for local development)

### **Software Requirements**
- **Node.js**: 18+ 
- **pnpm**: Latest version
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **AWS CLI**: 2.0+
- **Terraform**: 1.0+

### **AWS Requirements**
- **AWS Account** with appropriate permissions
- **EC2, RDS, S3, VPC** access
- **Budget**: $500-1000/month for production deployment

## 🚀 Quick Start

### **1. Clone and Setup**

```bash
# Clone the repository
git clone https://github.com/yourusername/voiceloophr.git
cd voiceloophr

# Switch to open-source branch
git checkout open-source-ai

# Install dependencies
pnpm install
```

### **2. Configure Environment**

```bash
# Copy environment template
cp env.open-source.example .env.local

# Edit configuration
nano .env.local
```

**Required Environment Variables:**
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# AI Service Endpoints (will be set after deployment)
VLLM_ENDPOINT=http://your-ec2-instance:8000/v1
WHISPER_ENDPOINT=http://your-ec2-instance:8001
TTS_ENDPOINT=http://your-ec2-instance:8002

# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **3. Deploy Infrastructure**

**Linux/macOS:**
```bash
# Make script executable
chmod +x scripts/deploy-open-source.sh

# Deploy complete system
./scripts/deploy-open-source.sh deploy
```

**Windows:**
```powershell
# Run PowerShell script
.\scripts\deploy-open-source.ps1 deploy
```

### **4. Access Application**

Once deployment is complete:
- **Application**: http://localhost:3000
- **vLLM API**: http://localhost:8000
- **Whisper API**: http://localhost:8001
- **TTS API**: http://localhost:8002

## 🛠️ Manual Deployment

### **Step 1: Deploy AWS Infrastructure**

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars << EOF
aws_region = "us-east-1"
project_name = "voiceloophr"
ai_instance_type = "g5.xlarge"
min_instances = 1
max_instances = 3
desired_instances = 2
db_password = "$(openssl rand -base64 32)"
EOF

# Deploy infrastructure
terraform plan
terraform apply
```

### **Step 2: Deploy AI Services**

```bash
cd docker/ai-services

# Start AI services
docker-compose up -d

# Check service health
docker-compose ps
```

### **Step 3: Deploy Application**

```bash
cd docker/app

# Start application
docker-compose up -d

# Check application health
curl http://localhost:3000/api/health
```

## 🔧 Configuration

### **AI Model Configuration**

**vLLM Models:**
```yaml
# docker/ai-services/docker-compose.yml
vllm:
  command: >
    --model microsoft/DialoGPT-medium
    --host 0.0.0.0
    --port 8000
    --tensor-parallel-size 1
    --gpu-memory-utilization 0.8
```

**Whisper Models:**
```yaml
whisper:
  environment:
    - WHISPER_MODEL=base  # tiny, base, small, medium, large
```

**TTS Models:**
```yaml
tts:
  environment:
    - TTS_MODEL=tts_models/multilingual/multi-dataset/xtts_v2
```

### **AWS Infrastructure Configuration**

**Instance Types:**
- **Development**: `g5.xlarge` (1 GPU, 4 vCPU, 16GB RAM)
- **Production**: `g5.2xlarge` (1 GPU, 8 vCPU, 32GB RAM)
- **High Performance**: `g5.4xlarge` (1 GPU, 16 vCPU, 64GB RAM)

**Database Configuration:**
- **Instance Class**: `db.t3.medium` (2 vCPU, 4GB RAM)
- **Storage**: 100GB-1000GB with auto-scaling
- **Backup**: 7-day retention

## 📊 Monitoring & Logging

### **CloudWatch Integration**

**Metrics:**
- EC2 instance metrics (CPU, memory, GPU utilization)
- RDS performance metrics
- Application custom metrics
- Load balancer metrics

**Logs:**
- Application logs: `/aws/ec2/voiceloophr-ai-services`
- AI service logs: Container logs
- Access logs: Load balancer logs

**Alarms:**
- High CPU/GPU utilization (>80%)
- Database connection issues
- Service health check failures

### **Health Checks**

```bash
# Check all services
curl http://localhost:3000/api/ai/health

# Check individual services
curl http://localhost:8000/health  # vLLM
curl http://localhost:8001/health  # Whisper
curl http://localhost:8002/health  # TTS
```

## 💰 Cost Optimization

### **Monthly Cost Estimates**

| Component | Instance Type | Monthly Cost |
|-----------|---------------|--------------|
| EC2 G5.xlarge | 2 instances | $600-800 |
| RDS PostgreSQL | db.t3.medium | $50-80 |
| S3 Storage | 100GB | $2-5 |
| Load Balancer | ALB | $20-30 |
| **Total** | | **$670-915** |

### **Cost Optimization Strategies**

1. **Spot Instances**: Up to 90% cost savings
2. **Right-sizing**: Regular monitoring and adjustment
3. **Reserved Instances**: For predictable workloads
4. **S3 Intelligent Tiering**: Automatic cost optimization
5. **Auto Scaling**: Scale down during low usage

## 🔒 Security

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

## 🐛 Troubleshooting

### **Common Issues**

**1. GPU Not Available**
```bash
# Check GPU availability
nvidia-smi

# Verify Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

**2. Service Connection Issues**
```bash
# Check service health
curl http://localhost:8000/health

# Check Docker logs
docker-compose logs vllm
```

**3. Database Connection Issues**
```bash
# Test database connectivity
psql -h your-rds-endpoint -U postgres -d voiceloophr

# Check RDS status
aws rds describe-db-instances --db-instance-identifier voiceloophr-db
```

**4. High Memory Usage**
```bash
# Check memory usage
docker stats

# Restart services
docker-compose restart
```

### **Log Locations**

- **Application Logs**: `docker/app/logs/`
- **AI Service Logs**: `docker-compose logs [service-name]`
- **Infrastructure Logs**: CloudWatch Logs
- **Database Logs**: RDS Logs

## 🔄 Maintenance

### **Regular Tasks**

**Daily:**
- Monitor service health
- Check error logs
- Review cost metrics

**Weekly:**
- Update dependencies
- Review security logs
- Optimize performance

**Monthly:**
- Update AI models
- Review cost optimization
- Security audit

### **Updates**

**AI Models:**
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

**Application:**
```bash
# Update application
git pull origin open-source-ai
docker-compose up -d --build app
```

## 📚 API Documentation

### **Chat Completion API**

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "microsoft/DialoGPT-medium",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ],
    "temperature": 0.7,
    "max_tokens": 1000
  }'
```

### **Transcription API**

```bash
curl -X POST http://localhost:8001/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "base64_encoded_audio_data",
    "model": "base",
    "language": "en"
  }'
```

### **TTS API**

```bash
curl -X POST http://localhost:8002/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test.",
    "model": "tts_models/multilingual/multi-dataset/xtts_v2",
    "language": "en"
  }'
```

## 🤝 Contributing

### **Development Setup**

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `pnpm test`
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### **Code Standards**

- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Tests**: Unit and integration tests
- **Documentation**: JSDoc comments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **vLLM Team** - For high-performance LLM serving
- **OpenAI** - For Whisper speech recognition
- **Coqui AI** - For open-source TTS
- **AWS** - For cloud infrastructure
- **Terraform** - For infrastructure as code

## 📞 Support

- **Documentation**: [GitHub Wiki](https://github.com/yourusername/voiceloophr/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/voiceloophr/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/voiceloophr/discussions)
- **Email**: support@voiceloophr.com

## 🔄 Changelog

### **v1.0.0** - Open-Source AI Backend
- ✅ **vLLM Integration** - High-performance LLM serving
- ✅ **Whisper STT** - Speech-to-text processing
- ✅ **Coqui TTS** - Text-to-speech synthesis
- ✅ **AWS Infrastructure** - Complete cloud deployment
- ✅ **Docker Support** - Containerized services
- ✅ **Terraform IaC** - Infrastructure as code
- ✅ **Cost Optimization** - Spot instances and auto-scaling
- ✅ **Monitoring** - CloudWatch integration
- ✅ **Security** - VPC isolation and encryption
- ✅ **Documentation** - Comprehensive guides

---

**Built with ❤️ by the VoiceLoop Team**

*Transforming document analysis with open-source AI*
