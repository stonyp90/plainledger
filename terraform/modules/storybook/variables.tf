# ==============================================================================
# Storybook Module Variables
# ==============================================================================

variable "project" {
  description = "Project name"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "domain_name" {
  description = "Base domain name (e.g., plainledger.ca)"
  type        = string
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront (must be in us-east-1)"
  type        = string
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID (optional)"
  type        = string
  default     = null
}

variable "kms_key_arn" {
  description = "KMS key ARN for S3 encryption (optional)"
  type        = string
  default     = ""
}
