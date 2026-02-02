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
