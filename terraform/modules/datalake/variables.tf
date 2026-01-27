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
  description = "Email address for ETL alerts (optional)"
  type        = string
  default     = ""
}
