# ==============================================================================
# PlainLedger - Development Environment
# Region: ca-central-1 (Montreal)
# Domain: dev.plainledger.ca
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
    key            = "dev/terraform.tfstate"
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

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# ECR Repositories (shared with prod for cost savings, or separate)
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
  enable_nat_gateway = false  # Cost saving for dev
  enable_flow_logs   = false  # Cost saving for dev
  create_hosted_zone = false  # Use subdomain of prod
  domain_name        = var.domain_name
}

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

  # Smaller instances for dev
  db_instance_class        = var.db_instance_class
  db_allocated_storage     = var.db_allocated_storage
  db_max_allocated_storage = var.db_max_allocated_storage
  db_multi_az              = false  # Single AZ for dev
  db_backup_retention      = 1      # Minimal backups for dev

  redis_node_type          = var.redis_node_type
  redis_num_cache_clusters = 1      # Single node for dev
  redis_snapshot_retention = 1
}

# ------------------------------------------------------------------------------
# Data Lake Module
# ------------------------------------------------------------------------------
module "datalake" {
  source = "../../modules/datalake"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
}

# ------------------------------------------------------------------------------
# Application Secrets (Placeholder values for dev)
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "stripe" {
  name        = "${var.project}/${var.environment}/stripe"
  description = "Stripe API keys for ${var.project} (dev placeholder)"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "stripe" {
  secret_id = aws_secretsmanager_secret.stripe.id
  secret_string = jsonencode({
    secret_key      = "sk_test_placeholder"
    publishable_key = "pk_test_placeholder"
  })
}

resource "aws_secretsmanager_secret" "novu" {
  name        = "${var.project}/${var.environment}/novu"
  description = "Novu API keys for ${var.project} (dev placeholder)"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "novu" {
  secret_id = aws_secretsmanager_secret.novu.id
  secret_string = jsonencode({
    api_key = "placeholder"
    app_id  = "placeholder"
  })
}

resource "aws_secretsmanager_secret" "keycloak_smtp" {
  name        = "${var.project}/${var.environment}/keycloak/smtp"
  description = "SMTP credentials for Keycloak email sending (dev placeholder)"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "keycloak_smtp" {
  secret_id = aws_secretsmanager_secret.keycloak_smtp.id
  secret_string = jsonencode({
    host     = "email-smtp.us-east-1.amazonaws.com"
    port     = "587"
    user     = "PLACEHOLDER"
    password = "PLACEHOLDER"
    from     = "noreply@dev.plainledger.ca"
    reply_to = "support@dev.plainledger.ca"
  })
}

# ------------------------------------------------------------------------------
# QuickBooks Integration Secrets
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
    environment   = var.quickbooks_environment
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ------------------------------------------------------------------------------
# Power BI / Azure AD Integration Secrets
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "azure_ad" {
  name        = "${var.project}/${var.environment}/azure"
  description = "Azure AD credentials for Power BI integration"
  kms_key_id  = module.database.kms_key_arn
}

resource "aws_secretsmanager_secret_version" "azure_ad" {
  secret_id = aws_secretsmanager_secret.azure_ad.id
  secret_string = jsonencode({
    tenant_id     = var.azure_tenant_id
    client_id     = var.azure_client_id
    client_secret = var.azure_client_secret
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
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

  db_credentials_secret_arn = module.database.db_credentials_secret_arn
  redis_auth_secret_arn     = module.database.redis_auth_secret_arn
  stripe_secret_arn         = aws_secretsmanager_secret.stripe.arn
  novu_secret_arn           = aws_secretsmanager_secret.novu.arn
  keycloak_smtp_secret_arn  = aws_secretsmanager_secret.keycloak_smtp.arn
  quickbooks_secret_arn     = aws_secretsmanager_secret.quickbooks.arn
  azure_ad_secret_arn       = aws_secretsmanager_secret.azure_ad.arn
  kms_key_arn               = module.database.kms_key_arn

  ecr_web_repository_url      = aws_ecr_repository.web.repository_url
  ecr_api_repository_url      = aws_ecr_repository.api.repository_url
  ecr_keycloak_repository_url = aws_ecr_repository.keycloak.repository_url

  datalake_bucket_arns = module.datalake.datalake_bucket_arns

  acm_certificate_arn    = ""
  route53_zone_id        = ""
  create_route53_records = false

  # Minimal resources for dev
  web_cpu           = 256
  web_memory        = 512
  web_desired_count = 1
  web_min_count     = 1
  web_max_count     = 2

  api_cpu           = 256
  api_memory        = 512
  api_desired_count = 1
  api_min_count     = 1
  api_max_count     = 2

  keycloak_cpu           = 256
  keycloak_memory        = 512
  keycloak_desired_count = 1

  depends_on = [module.networking, module.database]
}

# ------------------------------------------------------------------------------
# GitHub OIDC Provider (reference existing or create new)
# ------------------------------------------------------------------------------
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Federated = data.aws_iam_openid_connect_provider.github.arn }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*" }
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
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["ecr:*"]
        Resource = [aws_ecr_repository.web.arn, aws_ecr_repository.api.arn, aws_ecr_repository.keycloak.arn]
      },
      {
        Effect = "Allow"
        Action = ["ecs:UpdateService", "ecs:DescribeServices", "ecs:DescribeClusters"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = ["iam:PassRole"]
        Resource = [module.ecs.ecs_execution_role_arn, module.ecs.ecs_task_role_arn]
      }
    ]
  })
}
