# ==============================================================================
# Document Share Module - Variables
# ==============================================================================

variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}

variable "kms_key_arn" {
  description = "KMS key ARN for encryption (optional, defaults to AES256)"
  type        = string
  default     = ""
}

variable "ecs_task_role_arn" {
  description = "ARN of the ECS task role that needs S3 access"
  type        = string
}

variable "allowed_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}
