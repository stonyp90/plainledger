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

# QuickBooks
variable "quickbooks_client_id" {
  description = "QuickBooks OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "quickbooks_client_secret" {
  description = "QuickBooks OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "quickbooks_environment" {
  description = "QuickBooks environment (sandbox or production)"
  type        = string
  default     = "production"  # Production uses real QBO data
}

# Keycloak
variable "keycloak_client_secret" {
  description = "Keycloak API client secret for Admin API (service account). REQUIRED for authentication. Get from Keycloak Admin Console: Realm 'plainledger' → Clients → 'plainledger-api' → Credentials tab"
  type        = string
  sensitive   = true
  # No default - must be set explicitly to ensure production security
}

# SES SMTP (for Keycloak and API email sending)
variable "ses_smtp_user" {
  description = "AWS SES SMTP username (IAM Access Key ID)"
  type        = string
  sensitive   = true
  default     = ""  # Set via terraform.tfvars or environment
}

variable "ses_smtp_password" {
  description = "AWS SES SMTP password (IAM Secret converted for SES)"
  type        = string
  sensitive   = true
  default     = ""  # Set via terraform.tfvars or environment
}

# MongoDB Atlas (Analytics & Audit)
variable "mongodb_uri" {
  description = "MongoDB Atlas connection URI"
  type        = string
  sensitive   = true
  default     = ""  # Set via terraform.tfvars or environment
}

variable "mongodb_database" {
  description = "MongoDB database name"
  type        = string
  default     = "plainledger_analytics"
}

# HubSpot CRM
variable "hubspot_access_token" {
  description = "HubSpot Private App access token"
  type        = string
  sensitive   = true
  default     = ""  # Set via terraform.tfvars or environment
}

# PostHog Analytics
variable "posthog_api_key" {
  description = "PostHog API key for server-side tracking"
  type        = string
  sensitive   = true
  default     = ""  # Set via terraform.tfvars or environment
}

variable "posthog_host" {
  description = "PostHog API host"
  type        = string
  default     = "https://us.i.posthog.com"
}

# ETL Pipeline Alerts
variable "etl_alert_emails" {
  description = "List of email addresses for ETL pipeline failure notifications"
  type        = list(string)
  default     = ["tony@plainledger.ca", "bartosz@plainledger.ca"]
}

variable "alert_email" {
  description = "Primary email for ETL alerts (Lambda will use this)"
  type        = string
  default     = "tony@plainledger.ca"
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
