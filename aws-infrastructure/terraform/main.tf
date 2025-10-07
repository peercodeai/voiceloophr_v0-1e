# AWS Backend Infrastructure for VoiceLoop HR
# This will create a proper backend with persistent storage

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security Group for EC2
resource "aws_security_group" "voiceloop_sg" {
  name_prefix = "voiceloop-hr-"
  description = "Security group for VoiceLoop HR application"
  vpc_id      = data.aws_vpc.default.id

  # HTTP
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Application port
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "voiceloop-hr-sg"
  }
}

# Key Pair for EC2 access
resource "aws_key_pair" "voiceloop_key" {
  key_name   = "voiceloop-hr-key"
  public_key = file("~/.ssh/id_rsa.pub") # Update this path as needed

  tags = {
    Name = "voiceloop-hr-key"
  }
}

# IAM Role for EC2
resource "aws_iam_role" "voiceloop_role" {
  name = "voiceloop-hr-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for S3 access
resource "aws_iam_policy" "voiceloop_s3_policy" {
  name = "voiceloop-hr-s3-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.voiceloop_files.arn,
          "${aws_s3_bucket.voiceloop_files.arn}/*"
        ]
      }
    ]
  })
}

# Attach policies to role
resource "aws_iam_role_policy_attachment" "voiceloop_s3_policy" {
  role       = aws_iam_role.voiceloop_role.name
  policy_arn = aws_iam_policy.voiceloop_s3_policy.arn
}

resource "aws_iam_role_policy_attachment" "voiceloop_ssm_policy" {
  role       = aws_iam_role.voiceloop_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance Profile
resource "aws_iam_instance_profile" "voiceloop_profile" {
  name = "voiceloop-hr-profile"
  role = aws_iam_role.voiceloop_role.name
}

# S3 Bucket for file storage
resource "aws_s3_bucket" "voiceloop_files" {
  bucket = "${var.app_name}-files-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "voiceloop-hr-files"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "voiceloop_files_versioning" {
  bucket = aws_s3_bucket.voiceloop_files.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "voiceloop_files_encryption" {
  bucket = aws_s3_bucket.voiceloop_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "voiceloop_files_pab" {
  bucket = aws_s3_bucket.voiceloop_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# RDS Subnet Group
resource "aws_db_subnet_group" "voiceloop_db_subnet_group" {
  name       = "voiceloop-hr-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "voiceloop-hr-db-subnet-group"
  }
}

# RDS Security Group
resource "aws_security_group" "voiceloop_db_sg" {
  name_prefix = "voiceloop-hr-db-"
  description = "Security group for VoiceLoop HR database"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.voiceloop_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "voiceloop-hr-db-sg"
  }
}

# RDS Instance
resource "aws_db_instance" "voiceloop_db" {
  identifier = "voiceloop-hr-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "voiceloophr"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.voiceloop_db_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.voiceloop_db_subnet_group.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = var.environment == "development"
  deletion_protection = var.environment == "production"
  
  tags = {
    Name = "voiceloop-hr-db"
    Environment = var.environment
  }
}

# EC2 Instance
resource "aws_instance" "voiceloop_app" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  key_name                    = aws_key_pair.voiceloop_key.key_name
  vpc_security_group_ids      = [aws_security_group.voiceloop_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.voiceloop_profile.name
  
  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }
  
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    db_host     = aws_db_instance.voiceloop_db.endpoint
    db_name     = aws_db_instance.voiceloop_db.db_name
    db_username = var.db_username
    db_password = var.db_password
    s3_bucket   = aws_s3_bucket.voiceloop_files.bucket
    aws_region  = var.aws_region
    app_name    = var.app_name
  }))
  
  tags = {
    Name = "voiceloop-hr-app"
    Environment = var.environment
  }
}

# Data source for Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Random string for S3 bucket suffix
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# Elastic IP for EC2
resource "aws_eip" "voiceloop_eip" {
  instance = aws_instance.voiceloop_app.id
  domain   = "vpc"

  tags = {
    Name = "voiceloop-hr-eip"
  }
}

# Outputs
output "ec2_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_eip.voiceloop_eip.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS name of the EC2 instance"
  value       = aws_instance.voiceloop_app.public_dns
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.voiceloop_db.endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  value       = aws_s3_bucket.voiceloop_files.bucket
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${aws_eip.voiceloop_eip.public_ip}"
}
