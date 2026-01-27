# ==============================================================================
# PlainLedger - Analytics Module Variables
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

variable "azure_location" {
  description = "Azure region for resources"
  type        = string
  default     = "canadacentral"
}

variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

variable "gold_bucket_arn" {
  description = "ARN of the Gold layer S3 bucket"
  type        = string
}

variable "gold_bucket_name" {
  description = "Name of the Gold layer S3 bucket"
  type        = string
}

variable "azure_storage_account_name" {
  description = "Azure Storage Account name (output from storage module)"
  type        = string
  default     = ""
}

variable "azure_storage_account_key" {
  description = "Azure Storage Account access key (sensitive)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "allowed_ip_ranges" {
  description = "List of IP ranges allowed to access Azure Storage"
  type        = list(string)
  default     = []
}

# AWS Athena Configuration
variable "aws_region" {
  description = "AWS region for Athena"
  type        = string
  default     = "ca-central-1"
}

variable "api_role_arn" {
  description = "ARN of the API service IAM role for Athena access"
  type        = string
  default     = ""
}
