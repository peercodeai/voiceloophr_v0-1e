# VoiceLoopHR Open-Source AI Backend - CloudWatch Monitoring
# This file defines CloudWatch dashboards, alarms, and monitoring configuration

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", "*"],
            ["AWS/EC2", "MemoryUtilization", "InstanceId", "*"],
            ["AWS/EC2", "NetworkIn", "InstanceId", "*"],
            ["AWS/EC2", "NetworkOut", "InstanceId", "*"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "EC2 Instance Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "${var.project_name}-db"],
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", "${var.project_name}-db"],
            ["AWS/RDS", "FreeableMemory", "DBInstanceIdentifier", "${var.project_name}-db"],
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", "${var.project_name}-db"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "RDS Database Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.main.arn_suffix],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.main.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", aws_lb.main.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", aws_lb.main.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.main.arn_suffix]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/S3", "BucketSizeBytes", "BucketName", aws_s3_bucket.documents.bucket, "StorageType", "StandardStorage"],
            ["AWS/S3", "NumberOfObjects", "BucketName", aws_s3_bucket.documents.bucket, "StorageType", "AllStorageTypes"]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "S3 Storage Metrics"
          period  = 86400
        }
      },
      {
        type   = "log"
        x      = 0
        y      = 12
        width  = 24
        height = 6
        properties = {
          query   = "SOURCE '/aws/ec2/${var.project_name}-ai-services' | fields @timestamp, @message | sort @timestamp desc | limit 100"
          region  = var.aws_region
          title   = "AI Services Logs"
          view    = "table"
        }
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ai_services" {
  name              = "/aws/ec2/${var.project_name}-ai-services"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-ai-services-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/app/${var.project_name}-application"
  retention_in_days = 30

  tags = {
    Name        = "${var.project_name}-application-logs"
    Environment = var.environment
  }
}

# CloudWatch Alarms - EC2
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.ai_services[0].id
  }

  tags = {
    Name        = "${var.project_name}-high-cpu-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory" {
  alarm_name          = "${var.project_name}-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ec2 memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.ai_services[0].id
  }

  tags = {
    Name        = "${var.project_name}-high-memory-alarm"
    Environment = var.environment
  }
}

# CloudWatch Alarms - RDS
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project_name}-rds-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors rds cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = {
    Name        = "${var.project_name}-rds-high-cpu-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.project_name}-rds-low-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "2000000000" # 2GB in bytes
  alarm_description   = "This metric monitors rds free storage space"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = {
    Name        = "${var.project_name}-rds-low-storage-alarm"
    Environment = var.environment
  }
}

# CloudWatch Alarms - Load Balancer
resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "${var.project_name}-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "5" # 5 seconds
  alarm_description   = "This metric monitors load balancer response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name        = "${var.project_name}-high-response-time-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "high_5xx_errors" {
  alarm_name          = "${var.project_name}-high-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors 5xx errors from load balancer"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = {
    Name        = "${var.project_name}-high-5xx-errors-alarm"
    Environment = var.environment
  }
}

# SNS Topic for Alerts
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"

  tags = {
    Name        = "${var.project_name}-alerts-topic"
    Environment = var.environment
  }
}

# SNS Topic Subscription (Email)
resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Custom Metrics
resource "aws_cloudwatch_log_metric_filter" "ai_service_errors" {
  name           = "${var.project_name}-ai-service-errors"
  log_group_name = aws_cloudwatch_log_group.ai_services.name
  pattern        = "[timestamp, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "AIServiceErrors"
    namespace = "VoiceLoopHR/AI"
    value     = "1"
  }
}

resource "aws_cloudwatch_log_metric_filter" "application_errors" {
  name           = "${var.project_name}-application-errors"
  log_group_name = aws_cloudwatch_log_group.application.name
  pattern        = "[timestamp, level=\"ERROR\", ...]"

  metric_transformation {
    name      = "ApplicationErrors"
    namespace = "VoiceLoopHR/Application"
    value     = "1"
  }
}

# CloudWatch Alarms for Custom Metrics
resource "aws_cloudwatch_metric_alarm" "ai_service_error_rate" {
  alarm_name          = "${var.project_name}-ai-service-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "AIServiceErrors"
  namespace           = "VoiceLoopHR/AI"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "This metric monitors AI service error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-ai-service-error-rate-alarm"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "application_error_rate" {
  alarm_name          = "${var.project_name}-application-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "ApplicationErrors"
  namespace           = "VoiceLoopHR/Application"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors application error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  tags = {
    Name        = "${var.project_name}-application-error-rate-alarm"
    Environment = var.environment
  }
}

# CloudWatch Insights Queries
resource "aws_cloudwatch_query_definition" "ai_service_performance" {
  name = "${var.project_name}-ai-service-performance"

  log_group_names = [
    aws_cloudwatch_log_group.ai_services.name
  ]

  query_string = <<EOF
fields @timestamp, @message
| filter @message like /processing_time/
| parse @message /processing_time: (?<processing_time>\d+)/
| stats avg(processing_time) as avg_processing_time, max(processing_time) as max_processing_time by bin(5m)
| sort @timestamp desc
EOF
}

resource "aws_cloudwatch_query_definition" "error_analysis" {
  name = "${var.project_name}-error-analysis"

  log_group_names = [
    aws_cloudwatch_log_group.ai_services.name,
    aws_cloudwatch_log_group.application.name
  ]

  query_string = <<EOF
fields @timestamp, @message, @logStream
| filter @message like /ERROR/
| parse @message /ERROR: (?<error_message>.*)/
| stats count() as error_count by error_message
| sort error_count desc
EOF
}

# Outputs
output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for alerts"
  value       = aws_sns_topic.alerts.arn
}
