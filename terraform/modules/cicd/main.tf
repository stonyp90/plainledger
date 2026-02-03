# ==============================================================================
# PlainLedger - CI/CD Module
# GitHub OIDC + ECR + IAM Roles
# ==============================================================================

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# ECR Repositories
# ------------------------------------------------------------------------------
resource "aws_ecr_repository" "web" {
  name                 = "${var.project}-${var.environment}-web"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name        = "${var.project}-${var.environment}-web"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-${var.environment}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name        = "${var.project}-${var.environment}-api"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "keycloak" {
  name                 = "${var.project}-${var.environment}-keycloak"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_ecr_repository" "admin" {
  name                 = "${var.project}-${var.environment}-admin"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = var.kms_key_arn
  }

  tags = {
    Name        = "${var.project}-${var.environment}-admin"
    Project     = var.project
    Environment = var.environment
  }
}

# ECR Lifecycle Policies
resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy     = aws_ecr_lifecycle_policy.web.policy
}

resource "aws_ecr_lifecycle_policy" "keycloak" {
  repository = aws_ecr_repository.keycloak.name
  policy     = aws_ecr_lifecycle_policy.web.policy
}

resource "aws_ecr_lifecycle_policy" "admin" {
  repository = aws_ecr_repository.admin.name
  policy     = aws_ecr_lifecycle_policy.web.policy
}

# ------------------------------------------------------------------------------
# GitHub OIDC Provider
# ------------------------------------------------------------------------------
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1", "1c58a3a8518e8759bf075b76b750d4f2df264fcd"]

  tags = {
    Name        = "github-actions-oidc"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# IAM Role for GitHub Actions
# ------------------------------------------------------------------------------
resource "aws_iam_role" "github_actions" {
  name = "${var.project}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_repo}:*"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-github-actions"
    Project     = var.project
    Environment = var.environment
  }
}

# GitHub Actions Policy - ECR Access
resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "${var.project}-${var.environment}-github-ecr"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = [
          aws_ecr_repository.web.arn,
          aws_ecr_repository.api.arn,
          aws_ecr_repository.keycloak.arn,
          aws_ecr_repository.admin.arn
        ]
      }
    ]
  })
}

# GitHub Actions Policy - ECS Deployment
resource "aws_iam_role_policy" "github_actions_ecs" {
  name = "${var.project}-${var.environment}-github-ecs"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECS service operations (tagged resources)
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:ListTasks",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:ResourceTag/Project" = var.project
          }
        }
      },
      # Task definition operations (no tag condition - task defs use name prefix)
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition"
        ]
        Resource = "*"
      },
      # Wait for services stable
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices"
        ]
        Resource = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/${var.project}-${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeClusters"
        ]
        Resource = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:cluster/${var.project}-${var.environment}"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          var.ecs_execution_role_arn,
          var.ecs_task_role_arn
        ]
      }
    ]
  })
}

# GitHub Actions Policy - S3 Access (for Terraform state)
resource "aws_iam_role_policy" "github_actions_s3" {
  name = "${var.project}-${var.environment}-github-s3"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.terraform_state_bucket}",
          "arn:aws:s3:::${var.terraform_state_bucket}/*"
        ]
      }
    ]
  })
}

# GitHub Actions Policy - DynamoDB (for Terraform locking)
resource "aws_iam_role_policy" "github_actions_dynamodb" {
  name = "${var.project}-${var.environment}-github-dynamodb"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.terraform_lock_table}"
      }
    ]
  })
}

# GitHub Actions Policy - KMS
resource "aws_iam_role_policy" "github_actions_kms" {
  name = "${var.project}-${var.environment}-github-kms"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Terraform State Backend Resources
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.terraform_state_bucket

  tags = {
    Name        = var.terraform_state_bucket
    Project     = var.project
    Environment = var.environment
    Purpose     = "terraform-state"
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = var.kms_key_arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_lock" {
  name         = var.terraform_lock_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = var.terraform_lock_table
    Project     = var.project
    Environment = var.environment
    Purpose     = "terraform-lock"
  }
}
