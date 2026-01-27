# ==============================================================================
# PlainLedger - Development Variables
# ==============================================================================

variable "project" {
  description = "Project name"
  type        = string
  default     = "plainledger"
}

variable "environment" {
  description = "Environment"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ca-central-1"
}

variable "domain_name" {
  description = "Domain name"
  type        = string
  default     = "dev.plainledger.ca"
}

# VPC
variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.1.0.0/16"  # Different CIDR from prod
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["ca-central-1a", "ca-central-1b"]
}

# Database - Smaller for dev
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"  # Smallest for dev
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max storage in GB"
  type        = number
  default     = 50
}

# Redis - Smaller for dev
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

# ==============================================================================
# Integration Credentials (set via terraform.tfvars or environment)
# ==============================================================================

# QuickBooks Integration
variable "quickbooks_client_id" {
  description = "QuickBooks OAuth Client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "quickbooks_client_secret" {
  description = "QuickBooks OAuth Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "quickbooks_environment" {
  description = "QuickBooks environment (sandbox or production)"
  type        = string
  default     = "sandbox"
}

# Azure AD / Power BI Integration
variable "azure_tenant_id" {
  description = "Azure AD Tenant ID for Power BI"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_client_id" {
  description = "Azure AD Application (client) ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_client_secret" {
  description = "Azure AD Client Secret"
  type        = string
  default     = ""
  sensitive   = true
}
