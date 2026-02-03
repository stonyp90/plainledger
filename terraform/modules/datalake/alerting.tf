# ============================================================================
# ETL Alerting Infrastructure
# ============================================================================
# SNS topic for ETL alerts
# EventBridge rules for Glue job state changes
# Lambda function to send formatted emails via SES
# ============================================================================

# SNS Topic for ETL Alerts
resource "aws_sns_topic" "etl_alerts" {
  name              = "${var.environment}-etl-alerts"
  display_name      = "PlainLedger ETL Alerts"
  kms_master_key_id = var.kms_key_id != "" ? var.kms_key_id : null

  tags = merge(var.tags, {
    Name        = "${var.project}-${var.environment}-etl-alerts"
    Project     = var.project
    Environment = var.environment
  })
}

# SNS Topic Subscription (Primary Email)
resource "aws_sns_topic_subscription" "etl_alerts_email" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.etl_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email

  confirmation_timeout_in_minutes = 1
}

# SNS Topic Subscriptions (Additional Emails)
resource "aws_sns_topic_subscription" "etl_alerts_additional_emails" {
  count     = length(var.additional_alert_emails)
  topic_arn = aws_sns_topic.etl_alerts.arn
  protocol  = "email"
  endpoint  = var.additional_alert_emails[count.index]

  confirmation_timeout_in_minutes = 1
}

# EventBridge Rule: Glue Job State Change
resource "aws_cloudwatch_event_rule" "glue_state_change" {
  name        = "${var.environment}-glue-state-change"
  description = "Capture Glue job state changes for ETL alerting"

  event_pattern = jsonencode({
    source      = ["aws.glue"]
    detail-type = ["Glue Job State Change"]
    detail = {
      state = ["SUCCEEDED", "FAILED", "TIMEOUT", "STOPPED"]
    }
  })

  tags = merge(var.tags, {
    Name        = "${var.project}-${var.environment}-glue-state-change"
    Project     = var.project
    Environment = var.environment
  })
}

# EventBridge Target: Lambda Function
resource "aws_cloudwatch_event_target" "etl_alert_sender" {
  rule      = aws_cloudwatch_event_rule.glue_state_change.name
  target_id = "ETLAlertSenderLambda"
  arn       = aws_lambda_function.etl_alert_sender.arn
}

# Lambda Permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.etl_alert_sender.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.glue_state_change.arn
}

# Lambda Function: ETL Alert Sender
resource "aws_lambda_function" "etl_alert_sender" {
  filename         = data.archive_file.etl_alert_sender_zip.output_path
  function_name    = "${var.environment}-etl-alert-sender"
  role             = aws_iam_role.etl_alert_sender.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.etl_alert_sender_zip.output_base64sha256
  runtime          = "nodejs20.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      API_ENDPOINT       = var.api_endpoint
      ALERT_EMAIL        = var.alert_email
      SES_REGION         = var.ses_region
      FROM_EMAIL         = var.from_email
      INTERNAL_API_TOKEN = var.internal_api_token
    }
  }

  tags = merge(var.tags, {
    Name        = "${var.project}-${var.environment}-etl-alert-sender"
    Project     = var.project
    Environment = var.environment
  })
}

# IAM Role for Lambda
resource "aws_iam_role" "etl_alert_sender" {
  name = "${var.environment}-etl-alert-sender-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name        = "${var.project}-${var.environment}-etl-alert-sender-role"
    Project     = var.project
    Environment = var.environment
  })
}

# IAM Policy: SES Send Email
resource "aws_iam_role_policy" "etl_alert_sender_ses" {
  name = "${var.environment}-etl-alert-sender-ses"
  role = aws_iam_role.etl_alert_sender.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy: CloudWatch Logs
resource "aws_iam_role_policy" "etl_alert_sender_logs" {
  name = "${var.environment}-etl-alert-sender-logs"
  role = aws_iam_role.etl_alert_sender.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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

# Archive Lambda code
data "archive_file" "etl_alert_sender_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/etl-alert-sender/index.js"
  output_path = "${path.module}/lambda/etl-alert-sender.zip"
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "etl_alert_sender" {
  name              = "/aws/lambda/${aws_lambda_function.etl_alert_sender.function_name}"
  retention_in_days = 14

  tags = merge(var.tags, {
    Name        = "${var.project}-${var.environment}-etl-alert-sender-logs"
    Project     = var.project
    Environment = var.environment
  })
}

# Outputs
output "etl_alerts_sns_topic_arn" {
  description = "ARN of the ETL alerts SNS topic"
  value       = aws_sns_topic.etl_alerts.arn
}

output "etl_alert_sender_lambda_arn" {
  description = "ARN of the ETL alert sender Lambda function"
  value       = aws_lambda_function.etl_alert_sender.arn
}
