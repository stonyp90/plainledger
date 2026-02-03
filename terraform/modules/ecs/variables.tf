# ==============================================================================
# PlainLedger - ECS Module Variables
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

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "plainledger.ca"
}

# Network
variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALB security group ID"
  type        = string
}

variable "ecs_security_group_id" {
  description = "ECS security group ID"
  type        = string
}

# Secrets
variable "db_credentials_secret_arn" {
  description = "ARN of DB credentials secret"
  type        = string
}

variable "redis_auth_secret_arn" {
  description = "ARN of Redis auth secret"
  type        = string
}

variable "stripe_secret_arn" {
  description = "ARN of Stripe API keys secret"
  type        = string
}

variable "novu_secret_arn" {
  description = "ARN of Novu API keys secret"
  type        = string
}

variable "keycloak_smtp_secret_arn" {
  description = "ARN of AWS Secrets Manager secret containing Keycloak SMTP credentials"
  type        = string
}

variable "keycloak_client_secret_arn" {
  description = "ARN of AWS Secrets Manager secret containing Keycloak API client secret"
  type        = string
  default     = ""
}

variable "quickbooks_secret_arn" {
  description = "ARN of QuickBooks OAuth credentials secret"
  type        = string
  default     = ""
}

variable "mongodb_secret_arn" {
  description = "ARN of MongoDB Atlas connection secret"
  type        = string
  default     = ""
}

variable "hubspot_secret_arn" {
  description = "ARN of HubSpot CRM API secret"
  type        = string
  default     = ""
}

variable "posthog_secret_arn" {
  description = "ARN of PostHog analytics API secret"
  type        = string
  default     = ""
}

variable "kms_key_arn" {
  description = "KMS key ARN"
  type        = string
}

# ECR
variable "ecr_web_repository_url" {
  description = "ECR repository URL for web"
  type        = string
}

variable "ecr_api_repository_url" {
  description = "ECR repository URL for api"
  type        = string
}

variable "ecr_keycloak_repository_url" {
  description = "ECR repository URL for keycloak"
  type        = string
}

# Data Lake
variable "datalake_bucket_arns" {
  description = "List of data lake bucket ARNs"
  type        = list(string)
  default     = []
}

# File Uploads Bucket
variable "uploads_bucket_arn" {
  description = "ARN of the S3 bucket for file uploads (logos, avatars, etc.)"
  type        = string
  default     = ""
}

# ALB
variable "acm_certificate_arn" {
  description = "ACM certificate ARN"
  type        = string
}

variable "alb_logs_bucket" {
  description = "S3 bucket for ALB logs"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 zone ID"
  type        = string
  default     = null
}

variable "create_route53_records" {
  description = "Create Route53 records"
  type        = bool
  default     = true
}

# Web Service
variable "web_cpu" {
  description = "CPU units for web task"
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Memory for web task"
  type        = number
  default     = 512
}

variable "web_desired_count" {
  description = "Desired count for web service"
  type        = number
  default     = 2
}

variable "web_min_count" {
  description = "Minimum count for web service"
  type        = number
  default     = 2
}

variable "web_max_count" {
  description = "Maximum count for web service"
  type        = number
  default     = 10
}

# API Service
variable "api_cpu" {
  description = "CPU units for api task"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for api task"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired count for api service"
  type        = number
  default     = 2
}

variable "api_min_count" {
  description = "Minimum count for api service"
  type        = number
  default     = 2
}

variable "api_max_count" {
  description = "Maximum count for api service"
  type        = number
  default     = 10
}

# Keycloak Service
variable "keycloak_cpu" {
  description = "CPU units for keycloak task"
  type        = number
  default     = 512
}

variable "keycloak_memory" {
  description = "Memory for keycloak task"
  type        = number
  default     = 1024
}

variable "keycloak_desired_count" {
  description = "Desired count for keycloak service"
  type        = number
  default     = 2
}

# Admin Console Service
variable "admin_cpu" {
  description = "CPU units for admin task"
  type        = number
  default     = 256
}

variable "admin_memory" {
  description = "Memory for admin task"
  type        = number
  default     = 512
}

variable "admin_desired_count" {
  description = "Desired count for admin service"
  type        = number
  default     = 1
}

variable "admin_min_count" {
  description = "Minimum count for admin service"
  type        = number
  default     = 1
}

variable "admin_max_count" {
  description = "Maximum count for admin service"
  type        = number
  default     = 4
}

variable "ecr_admin_repository_url" {
  description = "ECR repository URL for admin console"
  type        = string
}
