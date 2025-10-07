#!/bin/bash

# User data script for VoiceLoop HR EC2 instance
# This script sets up the server environment and deploys the application

set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install other dependencies
apt-get install -y git nginx certbot python3-certbot-nginx

# Create application user
useradd -m -s /bin/bash voiceloophr
usermod -aG sudo voiceloophr

# Create application directory
mkdir -p /opt/voiceloophr
chown voiceloophr:voiceloophr /opt/voiceloophr

# Switch to application user for the rest of the setup
sudo -u voiceloophr bash << 'EOF'

# Clone the repository
cd /opt/voiceloophr
git clone https://github.com/peercodeai/voiceloophr_v0-1e.git .

# Install dependencies
npm install

# Create environment file
cat > .env.local << EOL
# Database Configuration
DATABASE_URL=postgresql://${db_username}:${db_password}@${db_host}/${db_name}
POSTGRES_DB=${db_name}
POSTGRES_USER=${db_username}
POSTGRES_PASSWORD=${db_password}
POSTGRES_HOST=${db_host}
POSTGRES_PORT=5432

# AWS Configuration
AWS_REGION=${aws_region}
AWS_S3_BUCKET=${s3_bucket}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}

# OpenAI Configuration
OPENAI_API_KEY=${OPENAI_API_KEY}

# Supabase Configuration (if using)
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Application Configuration
NEXTAUTH_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NODE_ENV=production
NEXT_PUBLIC_DISABLE_AUTH=true

# File Upload Configuration
MAX_FILE_SIZE=100MB
UPLOAD_DIR=/opt/voiceloophr/uploads

# Redis Configuration (if using)
REDIS_URL=${REDIS_URL}
EOL

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Build the application
npm run build

EOF

# Configure Nginx
cat > /etc/nginx/sites-available/voiceloophr << 'EOF'
server {
    listen 80;
    server_name _;

    # Redirect HTTP to HTTPS (will be configured after SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Handle large file uploads
    client_max_body_size 100M;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/voiceloophr /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx
systemctl enable nginx

# Create PM2 ecosystem file
cat > /opt/voiceloophr/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'voiceloophr',
    script: 'npm',
    args: 'start',
    cwd: '/opt/voiceloophr',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/voiceloophr/logs/err.log',
    out_file: '/opt/voiceloophr/logs/out.log',
    log_file: '/opt/voiceloophr/logs/combined.log',
    time: true
  }]
};
EOF

# Create logs directory
mkdir -p /opt/voiceloophr/logs
chown voiceloophr:voiceloophr /opt/voiceloophr/logs

# Create systemd service for PM2
cat > /etc/systemd/system/voiceloophr.service << 'EOF'
[Unit]
Description=VoiceLoop HR Application
After=network.target

[Service]
Type=forking
User=voiceloophr
WorkingDirectory=/opt/voiceloophr
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable voiceloophr
systemctl start voiceloophr

# Create log rotation for PM2
cat > /etc/logrotate.d/voiceloophr << 'EOF'
/opt/voiceloophr/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 voiceloophr voiceloophr
    postrotate
        systemctl reload voiceloophr
    endscript
}
EOF

# Set up log rotation
logrotate -f /etc/logrotate.d/voiceloophr

# Create health check script
cat > /opt/voiceloophr/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for VoiceLoop HR
HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Application is healthy"
    exit 0
else
    echo "Application health check failed with status: $RESPONSE"
    exit 1
fi
EOF

chmod +x /opt/voiceloophr/health-check.sh

# Create update script
cat > /opt/voiceloophr/update-app.sh << 'EOF'
#!/bin/bash

# Update script for VoiceLoop HR
set -e

cd /opt/voiceloophr

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Restarting application..."
pm2 restart voiceloophr

echo "Application updated successfully!"
EOF

chmod +x /opt/voiceloophr/update-app.sh
chown voiceloophr:voiceloophr /opt/voiceloophr/update-app.sh

# Create backup script
cat > /opt/voiceloophr/backup-db.sh << 'EOF'
#!/bin/bash

# Database backup script
BACKUP_DIR="/opt/voiceloophr/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

pg_dump -h ${db_host} -U ${db_username} -d ${db_name} > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Database backup completed: backup_$DATE.sql"
EOF

chmod +x /opt/voiceloophr/backup-db.sh

# Install PostgreSQL client for backups
apt-get install -y postgresql-client

# Set up daily backup cron job
echo "0 2 * * * /opt/voiceloophr/backup-db.sh" | crontab -u voiceloophr -

# Create monitoring script
cat > /opt/voiceloophr/monitor.sh << 'EOF'
#!/bin/bash

# Simple monitoring script
echo "=== VoiceLoop HR System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""

echo "=== PM2 Status ==="
pm2 status
echo ""

echo "=== Disk Usage ==="
df -h
echo ""

echo "=== Memory Usage ==="
free -h
echo ""

echo "=== Application Health ==="
/opt/voiceloophr/health-check.sh
EOF

chmod +x /opt/voiceloophr/monitor.sh

echo "Setup completed successfully!"
echo "Application will be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "To check status: systemctl status voiceloophr"
echo "To view logs: pm2 logs voiceloophr"
echo "To update app: /opt/voiceloophr/update-app.sh"
