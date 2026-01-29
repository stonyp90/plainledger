# ==============================================================================
# Intelligence Module Variables
# ==============================================================================

variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
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

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
  default     = null
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}
