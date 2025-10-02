#!/bin/bash
# User data script for AI services EC2 instances
# This script sets up the AI services on the EC2 instance

set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | tee /etc/apt/sources.list.d/nvidia-docker.list

apt-get update -y
apt-get install -y nvidia-docker2
systemctl restart docker

# Create application directory
mkdir -p /opt/voiceloophr
cd /opt/voiceloophr

# Create docker-compose.yml for AI services
cat > docker-compose.yml << 'EOF'
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
      --tensor-parallel-size 1
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

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
    restart: unless-stopped

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
    restart: unless-stopped

  health-check:
    image: curlimages/curl:latest
    depends_on:
      - vllm
      - whisper
      - tts
    command: >
      sh -c "
        echo 'Waiting for services to start...' &&
        sleep 30 &&
        curl -f http://vllm:8000/health || exit 1 &&
        curl -f http://whisper:8001/health || exit 1 &&
        curl -f http://tts:8002/health || exit 1 &&
        echo 'All services are healthy!'
      "
    restart: "no"
EOF

# Start AI services
docker-compose up -d

# Create systemd service for auto-start
cat > /etc/systemd/system/voiceloophr-ai.service << EOF
[Unit]
Description=VoiceLoopHR AI Services
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/voiceloophr
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl enable voiceloophr-ai.service
systemctl start voiceloophr-ai.service

# Create health check script
cat > /opt/voiceloophr/health_check.sh << 'EOF'
#!/bin/bash
# Health check script for AI services

check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    if curl -f -s "http://localhost:$port$endpoint" > /dev/null; then
        echo "✓ $service_name is healthy"
        return 0
    else
        echo "✗ $service_name is unhealthy"
        return 1
    fi
}

echo "Checking AI services health..."
check_service "vLLM" 8000 "/health"
check_service "Whisper" 8001 "/health"
check_service "TTS" 8002 "/health"

# Overall health status
if [ $? -eq 0 ]; then
    echo "All services are healthy!"
    exit 0
else
    echo "Some services are unhealthy!"
    exit 1
fi
EOF

chmod +x /opt/voiceloophr/health_check.sh

# Create CloudWatch agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/voiceloophr-ai.log",
                        "log_group_name": "/aws/ec2/voiceloophr-ai-services",
                        "log_stream_name": "{instance_id}"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "VoiceLoopHR/AI",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 60
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 60,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 60
            }
        }
    }
}
EOF

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i -E ./amazon-cloudwatch-agent.deb

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Log completion
echo "VoiceLoopHR AI services setup completed at $(date)" >> /var/log/voiceloophr-ai.log
