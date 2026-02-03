# ==============================================================================
# PlainLedger - Data Lake Module Variables
# ==============================================================================

variable "project" {
  description = "Project name"
  type        = string
  default     = "plainledger"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}

variable "alert_email" {
  description = "Primary email address for ETL alerts"
  type        = string
  default     = ""
}

variable "additional_alert_emails" {
  description = "Additional email addresses for ETL alerts"
  type        = list(string)
  default     = []
}

variable "from_email" {
  description = "From email address for ETL alerts (must be verified in SES)"
  type        = string
  default     = "noreply@plainledger.ca"
}

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch metric alarms and dashboard (costs ~$0.10/alarm/month after free tier)"
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "KMS key ID for encrypting SNS topics"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "api_endpoint" {
  description = "API endpoint URL for ETL alerts"
  type        = string
  default     = ""
}

variable "ses_region" {
  description = "AWS region for SES"
  type        = string
  default     = "us-east-1"
}

variable "internal_api_token" {
  description = "Internal API token for Lambda to API communication"
  type        = string
  default     = ""
  sensitive   = true
}
