# ==============================================================================
# AWS DataSync for S3 to Azure Blob Replication
# ==============================================================================

# DataSync Agent (if using on-premises or EC2 agent)
# For cloud-to-cloud, we'll use DataSync with S3 source and Azure Blob destination

# Note: AWS DataSync doesn't natively support Azure Blob Storage.
# Alternative approaches:
# 1. Use Azure Data Factory with AWS S3 connector
# 2. Use AWS Glue with Azure Blob connector
# 3. Use custom Lambda/ECS task with Azure SDK

# For this implementation, we'll use AWS Glue job to write directly to Azure Blob
# This is more cost-effective than running a DataSync agent

# ------------------------------------------------------------------------------
# IAM Role for Glue to Write to Azure Blob
# ------------------------------------------------------------------------------
resource "aws_iam_role" "glue_azure_sync" {
  name = "${var.project}-${var.environment}-glue-azure-sync"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-glue-azure-sync"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "glue_azure_sync" {
  name = "${var.project}-${var.environment}-glue-azure-sync"
  role = aws_iam_role.glue_azure_sync.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.gold_bucket_arn,
          "${var.gold_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Glue Job for Delta Sync to Azure Blob
# ------------------------------------------------------------------------------
resource "aws_glue_job" "gold_to_azure" {
  name     = "${var.project}-${var.environment}-gold-to-azure"
  role_arn = aws_iam_role.glue_azure_sync.arn

  command {
    script_location = "s3://${var.gold_bucket_name}/scripts/gold_to_azure.py"
    python_version  = "3"
  }

  default_arguments = {
    "--TempDir"                        = "s3://${var.gold_bucket_name}/temp/"
    "--enable-metrics"                 = ""
    "--enable-spark-ui"                = "true"
    "--spark-event-logs-path"          = "s3://${var.gold_bucket_name}/spark-logs/"
    "--enable-continuous-cloudwatch-log" = "true"
    "--azure_storage_account"          = azurerm_storage_account.powerbi.name
    "--azure_container"                = "gold"
  }

  max_retries = 2
  timeout     = 60

  execution_property {
    max_concurrent_runs = 3
  }

  glue_version = "4.0"

  tags = {
    Name        = "${var.project}-${var.environment}-gold-to-azure"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# EventBridge Rule for Scheduled Delta Sync
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "delta_sync_schedule" {
  name                = "${var.project}-${var.environment}-delta-sync-schedule"
  description         = "Trigger delta sync to Azure Blob 4x daily"
  schedule_expression = "cron(0 */6 * * ? *)" # Every 6 hours

  tags = {
    Name        = "${var.project}-${var.environment}-delta-sync-schedule"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_target" "delta_sync_trigger" {
  rule      = aws_cloudwatch_event_rule.delta_sync_schedule.name
  target_id = "TriggerGlueJob"
  arn       = aws_glue_job.gold_to_azure.arn
  role_arn  = aws_iam_role.eventbridge_glue.arn
}

resource "aws_iam_role" "eventbridge_glue" {
  name = "${var.project}-${var.environment}-eventbridge-glue"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "eventbridge_glue" {
  name = "${var.project}-${var.environment}-eventbridge-glue"
  role = aws_iam_role.eventbridge_glue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "glue:StartJobRun"
        ]
        Resource = [aws_glue_job.gold_to_azure.arn]
      }
    ]
  })
}
