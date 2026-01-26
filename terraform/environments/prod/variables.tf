# ==============================================================================
# PlainLedger - Production Variables
# ==============================================================================

variable "project" {
  description = "Project name"
  type        = string
  default     = "plainledger"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "prod"
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

variable "create_hosted_zone" {
  description = "Create Route53 hosted zone"
  type        = bool
  default     = true
}

# VPC
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["ca-central-1a", "ca-central-1b"]
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max storage in GB"
  type        = number
  default     = 100
}

# Redis
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# GitHub
variable "github_org" {
  description = "GitHub organization"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository"
  type        = string
  default     = "plainledger"
}

# Stripe
variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable API key"
  type        = string
}

# Novu
variable "novu_api_key" {
  description = "Novu API key"
  type        = string
  sensitive   = true
}

variable "novu_app_id" {
  description = "Novu App ID"
  type        = string
}

# Terraform Backend
variable "terraform_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
  default     = "plainledger-terraform-state"
}

variable "terraform_lock_table" {
  description = "DynamoDB table for Terraform lock"
  type        = string
  default     = "plainledger-terraform-lock"
}
