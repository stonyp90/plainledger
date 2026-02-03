# ==============================================================================
# PlainLedger - Production Environment
# Region: ca-central-1 (Montreal)
# Domain: plainledger.ca
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "plainledger-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "ca-central-1"
    encrypt        = true
    dynamodb_table = "plainledger-terraform-lock"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# US East 1 provider for SES (SES is region-specific, plainledger.ca verified in us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# ECR Repositories (created first to avoid circular dependency)
# ------------------------------------------------------------------------------
resource "aws_ecr_repository" "web" {
  name                 = "${var.project}-${var.environment}-web"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-${var.environment}-api"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "keycloak" {
  name                 = "${var.project}-${var.environment}-keycloak"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "admin" {
  name                 = "${var.project}-${var.environment}-admin"
  image_tag_mutability = "MUTABLE"
  image_scanning_configuration { scan_on_push = true }
}

# ------------------------------------------------------------------------------
# S3 Bucket for File Uploads (logos, avatars, documents)
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project}-uploads"

  tags = {
    Name        = "${var.project}-uploads"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ------------------------------------------------------------------------------
# ACM Certificate (created but validation happens asynchronously)
# ------------------------------------------------------------------------------
resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  validation_method         = "DNS"
  subject_alternative_names = ["*.${var.domain_name}"]
  lifecycle { create_before_destroy = true }
}

# ACM Certificate for CloudFront (must be in us-east-1)
# ------------------------------------------------------------------------------
resource "aws_acm_certificate" "cloudfront" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  validation_method         = "DNS"
  subject_alternative_names = ["*.${var.domain_name}"]
  lifecycle { create_before_destroy = true }
}

# ------------------------------------------------------------------------------
# Networking Module
# ------------------------------------------------------------------------------
module "networking" {
  source = "../../modules/networking"

  project            = var.project
  environment        = var.environment
  aws_region         = var.aws_region
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = true
  enable_flow_logs   = true
  create_hosted_zone = var.create_hosted_zone
  domain_name        = var.domain_name
}

# ACM DNS Validation Records (created in Route53 for when DNS propagates)
resource "aws_route53_record" "acm_validation" {
  for_each = var.create_hosted_zone ? {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = module.networking.route53_zone_id
}

# NOTE: Certificate validation is NOT waited on - it will happen when DNS propagates
# Once validated, run terraform apply again to enable HTTPS

# ------------------------------------------------------------------------------
# Database Module
# ------------------------------------------------------------------------------
module "database" {
  source = "../../modules/database"

  project                 = var.project
  environment             = var.environment
  data_subnet_ids         = module.networking.data_subnet_ids
  rds_security_group_id   = module.networking.rds_security_group_id
  redis_security_group_id = module.networking.redis_security_group_id

  # MVP cost optimization: smaller instance, no Multi-AZ
  db_instance_class        = "db.t3.micro"
  db_allocated_storage     = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
  db_multi_az              = false
  db_backup_retention      = 7

  # MVP cost optimization: single Redis node
  redis_node_type          = var.redis_node_type
  redis_num_cache_clusters = 1
  redis_snapshot_retention = 7
}

# ------------------------------------------------------------------------------
# Data Lake Module
# ------------------------------------------------------------------------------
module "datalake" {
  source = "../../modules/datalake"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region

  # ETL Pipeline Alert Configuration
  alert_email             = var.alert_email
  additional_alert_emails = ["bartosz@plainledger.ca"]
  from_email              = "noreply@${var.domain_name}"
}

# ------------------------------------------------------------------------------
# Application Secrets (Stripe, Novu)
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "stripe" {
  name        = "${var.project}/${var.environment}/stripe"
  description = "Stripe API keys for ${var.project}"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "stripe" {
  secret_id = aws_secretsmanager_secret.stripe.id
  secret_string = jsonencode({
    secret_key      = var.stripe_secret_key
    publishable_key = var.stripe_publishable_key
  })
}

resource "aws_secretsmanager_secret" "novu" {
  name        = "${var.project}/${var.environment}/novu"
  description = "Novu API keys for ${var.project}"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "novu" {
  secret_id = aws_secretsmanager_secret.novu.id
  secret_string = jsonencode({
    api_key = var.novu_api_key
    app_id  = var.novu_app_id
  })
}

# ------------------------------------------------------------------------------
# QuickBooks Integration Secret
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "quickbooks" {
  name        = "${var.project}/${var.environment}/quickbooks"
  description = "QuickBooks OAuth credentials for ${var.project}"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "quickbooks" {
  secret_id = aws_secretsmanager_secret.quickbooks.id
  secret_string = jsonencode({
    client_id     = var.quickbooks_client_id
    client_secret = var.quickbooks_client_secret
    redirect_uri  = "https://${var.domain_name}/api/v1/datasources/oauth/quickbooks/callback"
    environment   = var.quickbooks_environment # "production" for real QBO data
  })
}

# ------------------------------------------------------------------------------
# AWS SES Configuration (Email Sending)
# Note: SES resources are in us-east-1, domain verification done via console
# ------------------------------------------------------------------------------

# SES Configuration Set for email tracking and deliverability
resource "aws_ses_configuration_set" "tracking" {
  provider = aws.us_east_1
  name     = "${var.project}-tracking"
}

# SNS Topic for email events (bounces, complaints)
resource "aws_sns_topic" "ses_events" {
  provider = aws.us_east_1
  name     = "${var.project}-ses-events"
}

# SES Event Destination for tracking
resource "aws_ses_event_destination" "sns" {
  provider               = aws.us_east_1
  name                   = "sns-events"
  configuration_set_name = aws_ses_configuration_set.tracking.name
  enabled                = true
  matching_types         = ["bounce", "complaint", "delivery", "reject"]

  sns_destination {
    topic_arn = aws_sns_topic.ses_events.arn
  }
}

# ------------------------------------------------------------------------------
# Keycloak SMTP Secret (uses SES SMTP credentials)
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "keycloak_smtp" {
  name        = "${var.project}/${var.environment}/keycloak/smtp"
  description = "SMTP credentials for Keycloak email sending via AWS SES"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "keycloak_smtp" {
  secret_id = aws_secretsmanager_secret.keycloak_smtp.id
  secret_string = jsonencode({
    host     = "email-smtp.us-east-1.amazonaws.com"
    port     = "587"
    user     = var.ses_smtp_user
    password = var.ses_smtp_password
    from     = "noreply@${var.domain_name}"
    reply_to = "support@${var.domain_name}"
  })
}

# ------------------------------------------------------------------------------
# Keycloak Client Secret (for Admin API)
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "keycloak_client" {
  name        = "${var.project}/${var.environment}/keycloak-client"
  description = "Keycloak API client credentials for Admin API"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "keycloak_client" {
  secret_id = aws_secretsmanager_secret.keycloak_client.id
  secret_string = jsonencode({
    secret = var.keycloak_client_secret
  })
}

# ------------------------------------------------------------------------------
# MongoDB Atlas (Analytics & Audit Database)
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "mongodb" {
  name        = "${var.project}/${var.environment}/mongodb"
  description = "MongoDB Atlas connection for analytics and audit logging"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "mongodb" {
  secret_id = aws_secretsmanager_secret.mongodb.id
  secret_string = jsonencode({
    uri      = var.mongodb_uri
    database = var.mongodb_database
  })
}

# ------------------------------------------------------------------------------
# HubSpot CRM
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "hubspot" {
  name        = "${var.project}/${var.environment}/hubspot"
  description = "HubSpot CRM API credentials"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "hubspot" {
  secret_id = aws_secretsmanager_secret.hubspot.id
  secret_string = jsonencode({
    access_token = var.hubspot_access_token
  })
}

# ------------------------------------------------------------------------------
# PostHog Analytics
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "posthog" {
  name        = "${var.project}/${var.environment}/posthog"
  description = "PostHog analytics API key"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "posthog" {
  secret_id = aws_secretsmanager_secret.posthog.id
  secret_string = jsonencode({
    api_key = var.posthog_api_key
    host    = var.posthog_host
  })
}

# ------------------------------------------------------------------------------
# ECS Module
# ------------------------------------------------------------------------------
module "ecs" {
  source = "../../modules/ecs"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  domain_name = var.domain_name

  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  private_subnet_ids = module.networking.private_subnet_ids

  alb_security_group_id = module.networking.alb_security_group_id
  ecs_security_group_id = module.networking.ecs_security_group_id

  db_credentials_secret_arn  = module.database.db_credentials_secret_arn
  redis_auth_secret_arn      = module.database.redis_auth_secret_arn
  stripe_secret_arn          = aws_secretsmanager_secret.stripe.arn
  novu_secret_arn            = aws_secretsmanager_secret.novu.arn
  keycloak_smtp_secret_arn   = aws_secretsmanager_secret.keycloak_smtp.arn
  keycloak_client_secret_arn = aws_secretsmanager_secret.keycloak_client.arn
  quickbooks_secret_arn      = aws_secretsmanager_secret.quickbooks.arn
  mongodb_secret_arn         = aws_secretsmanager_secret.mongodb.arn
  hubspot_secret_arn         = aws_secretsmanager_secret.hubspot.arn
  posthog_secret_arn         = aws_secretsmanager_secret.posthog.arn
  kms_key_arn                = module.database.kms_key_arn

  ecr_web_repository_url      = aws_ecr_repository.web.repository_url
  ecr_api_repository_url      = aws_ecr_repository.api.repository_url
  ecr_keycloak_repository_url = aws_ecr_repository.keycloak.repository_url
  ecr_admin_repository_url    = aws_ecr_repository.admin.repository_url

  datalake_bucket_arns = module.datalake.datalake_bucket_arns
  uploads_bucket_arn   = aws_s3_bucket.uploads.arn

  acm_certificate_arn    = aws_acm_certificate.main.arn
  route53_zone_id        = module.networking.route53_zone_id
  create_route53_records = var.create_hosted_zone

  # MVP configuration - single instance per service (cost optimization)
  web_cpu           = 256
  web_memory        = 512
  web_desired_count = 1
  web_min_count     = 1
  web_max_count     = 4

  api_cpu           = 512
  api_memory        = 1024
  api_desired_count = 1
  api_min_count     = 1
  api_max_count     = 4

  keycloak_cpu           = 512
  keycloak_memory        = 1024
  keycloak_desired_count = 1

  depends_on = [module.networking, module.database]
}

# ------------------------------------------------------------------------------
# Route53 Record for auth.plainledger.ca (Keycloak)
# ------------------------------------------------------------------------------
resource "aws_route53_record" "auth" {
  count   = var.create_hosted_zone ? 1 : 0
  zone_id = module.networking.route53_zone_id
  name    = "auth.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.ecs.alb_dns_name
    zone_id                = module.ecs.alb_zone_id
    evaluate_target_health = true
  }
}

# ------------------------------------------------------------------------------
# Storybook Module (S3 + CloudFront)
# ------------------------------------------------------------------------------
module "storybook" {
  source = "../../modules/storybook"

  project             = var.project
  environment         = var.environment
  domain_name         = var.domain_name
  acm_certificate_arn = aws_acm_certificate.cloudfront.arn
  route53_zone_id     = module.networking.route53_zone_id
  kms_key_arn         = module.database.kms_key_arn
}

# CloudFront Certificate DNS Validation Records
resource "aws_route53_record" "cloudfront_cert_validation" {
  for_each = var.create_hosted_zone ? {
    for dvo in aws_acm_certificate.cloudfront.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = module.networking.route53_zone_id
}

# ------------------------------------------------------------------------------
# GitHub OIDC Provider
# ------------------------------------------------------------------------------
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike   = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*" }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "${var.project}-${var.environment}-github-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["ecr:*"]
        Resource = [aws_ecr_repository.web.arn, aws_ecr_repository.api.arn, aws_ecr_repository.keycloak.arn, aws_ecr_repository.admin.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["ecs:UpdateService", "ecs:DescribeServices", "ecs:DescribeClusters"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [module.ecs.ecs_execution_role_arn, module.ecs.ecs_task_role_arn]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${module.storybook.s3_bucket_arn}",
          "${module.storybook.s3_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = module.storybook.cloudfront_distribution_arn
      }
    ]
  })
}
