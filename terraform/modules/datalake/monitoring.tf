# ==============================================================================
# ETL Monitoring & Alerting Infrastructure
# ==============================================================================

# NOTE: SNS Topic for ETL Alerts is defined in alerting.tf (aws_sns_topic.etl_alerts)
# NOTE: Email subscriptions are defined in alerting.tf

# ------------------------------------------------------------------------------
# Quarantine Bucket for Bad Records
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "quarantine" {
  bucket = "${var.project}-${var.environment}-quarantine-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-${var.environment}-quarantine"
    Project     = var.project
    Environment = var.environment
    Purpose     = "ETL Quarantine"
  }
}

resource "aws_s3_bucket_versioning" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.datalake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "quarantine_lifecycle" {
  bucket = aws_s3_bucket.quarantine.id

  rule {
    id     = "expire-old-quarantine"
    status = "Enabled"

    expiration {
      days = 90  # Keep quarantined records for 90 days
    }
    
    transition {
      days          = 30
      storage_class = "GLACIER"
    }
  }
}

# ------------------------------------------------------------------------------
# EventBridge Rules for Glue Job Monitoring
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "glue_job_failure" {
  name        = "${var.project}-${var.environment}-glue-job-failure"
  description = "Capture Glue job failures and timeouts"

  event_pattern = jsonencode({
    source      = ["aws.glue"]
    detail-type = ["Glue Job State Change"]
    detail = {
      state = ["FAILED", "TIMEOUT", "ERROR"]
    }
  })

  tags = {
    Name        = "${var.project}-${var.environment}-glue-job-failure"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "glue_failure_sns" {
  rule      = aws_cloudwatch_event_rule.glue_job_failure.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.etl_alerts.arn
  
  input_transformer {
    input_paths = {
      jobName   = "$.detail.jobName"
      state     = "$.detail.state"
      message   = "$.detail.message"
      timestamp = "$.time"
    }
    input_template = <<EOF
{
  "severity": "CRITICAL",
  "source": "EventBridge",
  "job": <jobName>,
  "state": <state>,
  "message": <message>,
  "timestamp": <timestamp>
}
EOF
  }
}

# EventBridge rule for Data Quality failures
resource "aws_cloudwatch_event_rule" "data_quality_failure" {
  name        = "${var.project}-${var.environment}-data-quality-failure"
  description = "Capture Data Quality rule failures"

  event_pattern = jsonencode({
    source      = ["aws.glue-dataquality"]
    detail-type = ["Data Quality Evaluation Results Available"]
    detail = {
      state = ["FAILED"]
    }
  })

  tags = {
    Name        = "${var.project}-${var.environment}-data-quality-failure"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "dq_failure_sns" {
  rule      = aws_cloudwatch_event_rule.data_quality_failure.name
  target_id = "SendDQToSNS"
  arn       = aws_sns_topic.etl_alerts.arn
  
  input_transformer {
    input_paths = {
      evaluationId = "$.detail.evaluationId"
      state        = "$.detail.state"
      timestamp    = "$.time"
    }
    input_template = <<EOF
{
  "severity": "WARNING",
  "source": "DataQuality",
  "evaluationId": <evaluationId>,
  "state": <state>,
  "timestamp": <timestamp>
}
EOF
  }
}

# ------------------------------------------------------------------------------
# CloudWatch Alarms
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "etl_failure_rate" {
  alarm_name          = "${var.project}-${var.environment}-etl-high-failure-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "glue.driver.aggregate.numFailedTasks"
  namespace           = "AWS/Glue"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "ETL jobs failing at high rate"
  treat_missing_data  = "notBreaching"
  
  alarm_actions = [aws_sns_topic.etl_alerts.arn]
  ok_actions    = [aws_sns_topic.etl_alerts.arn]
  
  dimensions = {
    Type    = "gauge"
    JobName = "ALL"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-etl-failure-rate"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# CloudWatch Dashboard
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_dashboard" "etl_monitoring" {
  dashboard_name = "${var.project}-${var.environment}-ETL-Monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Glue Job Success Rate"
          region = var.aws_region
          metrics = [
            ["AWS/Glue", "glue.driver.aggregate.numCompletedTasks", "Type", "gauge", { stat = "Sum" }],
            [".", "glue.driver.aggregate.numFailedTasks", ".", ".", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title  = "Data Quality Score"
          region = var.aws_region
          metrics = [
            ["AWS/Glue/DataQuality", "RulesSucceeded", { stat = "Sum" }],
            [".", "RulesFailed", { stat = "Sum" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Records Processed"
          region = var.aws_region
          metrics = [
            ["AWS/Glue", "glue.driver.aggregate.recordsRead", "Type", "gauge", { stat = "Sum" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Job Duration"
          region = var.aws_region
          metrics = [
            ["AWS/Glue", "glue.driver.aggregate.elapsedTime", "Type", "gauge", { stat = "Average" }]
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "Quarantined Records"
          region = var.aws_region
          metrics = [
            ["PlainLedger/ETL", "QuarantinedRecords", "Environment", var.environment, { stat = "Sum" }]
          ]
        }
      },
      {
        type   = "alarm"
        x      = 0
        y      = 12
        width  = 24
        height = 4
        properties = {
          title  = "Active Alarms"
          alarms = [
            aws_cloudwatch_metric_alarm.etl_failure_rate.arn
          ]
        }
      }
    ]
  })
}

# NOTE: Glue Job IAM Role (glue_etl) is defined in etl_jobs.tf
# NOTE: Glue Job for Silver to Gold is defined in etl_jobs.tf

