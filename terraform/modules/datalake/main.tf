# ==============================================================================
# PlainLedger - Data Lake Module
# S3 Bronze/Silver/Gold + Glue + Athena + Lake Formation
# ==============================================================================

# ------------------------------------------------------------------------------
# KMS Key for Data Lake Encryption
# ------------------------------------------------------------------------------
resource "aws_kms_key" "datalake" {
  description             = "KMS key for ${var.project} data lake encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow Glue Service"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-datalake-kms"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_kms_alias" "datalake" {
  name          = "alias/${var.project}-${var.environment}-datalake"
  target_key_id = aws_kms_key.datalake.key_id
}

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# S3 Buckets - Bronze (Raw)
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "bronze" {
  bucket = "${var.project}-${var.environment}-bronze-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-${var.environment}-bronze"
    Project     = var.project
    Environment = var.environment
    Layer       = "bronze"
  }
}

resource "aws_s3_bucket_versioning" "bronze" {
  bucket = aws_s3_bucket.bronze.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "bronze" {
  bucket = aws_s3_bucket.bronze.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.datalake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "bronze" {
  bucket = aws_s3_bucket.bronze.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "bronze" {
  bucket = aws_s3_bucket.bronze.id

  rule {
    id     = "transition-to-glacier"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ------------------------------------------------------------------------------
# S3 Buckets - Silver (Clean)
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "silver" {
  bucket = "${var.project}-${var.environment}-silver-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-${var.environment}-silver"
    Project     = var.project
    Environment = var.environment
    Layer       = "silver"
  }
}

resource "aws_s3_bucket_versioning" "silver" {
  bucket = aws_s3_bucket.silver.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "silver" {
  bucket = aws_s3_bucket.silver.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.datalake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "silver" {
  bucket = aws_s3_bucket.silver.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "silver" {
  bucket = aws_s3_bucket.silver.id

  rule {
    id     = "transition-to-ia"
    status = "Enabled"

    filter {}

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ------------------------------------------------------------------------------
# S3 Buckets - Gold (Curated)
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "gold" {
  bucket = "${var.project}-${var.environment}-gold-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-${var.environment}-gold"
    Project     = var.project
    Environment = var.environment
    Layer       = "gold"
  }
}

resource "aws_s3_bucket_versioning" "gold" {
  bucket = aws_s3_bucket.gold.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "gold" {
  bucket = aws_s3_bucket.gold.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.datalake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "gold" {
  bucket = aws_s3_bucket.gold.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ------------------------------------------------------------------------------
# Athena Results Bucket
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "athena_results" {
  bucket = "${var.project}-${var.environment}-athena-results-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-${var.environment}-athena-results"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.datalake.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    id     = "expire-results"
    status = "Enabled"

    filter {}

    expiration {
      days = 7
    }
  }
}

# ------------------------------------------------------------------------------
# Glue Catalog Database
# ------------------------------------------------------------------------------
resource "aws_glue_catalog_database" "main" {
  name        = "${var.project}_${var.environment}"
  description = "Glue catalog database for ${var.project} data lake"

  location_uri = "s3://${aws_s3_bucket.gold.id}/"

  tags = {
    Name        = "${var.project}-${var.environment}"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Glue Crawler IAM Role
# ------------------------------------------------------------------------------
resource "aws_iam_role" "glue_crawler" {
  name = "${var.project}-${var.environment}-glue-crawler"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-glue-crawler"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "glue_crawler_service" {
  role       = aws_iam_role.glue_crawler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

resource "aws_iam_role_policy" "glue_crawler_s3" {
  name = "${var.project}-${var.environment}-glue-s3"
  role = aws_iam_role.glue_crawler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.bronze.arn,
          "${aws_s3_bucket.bronze.arn}/*",
          aws_s3_bucket.silver.arn,
          "${aws_s3_bucket.silver.arn}/*",
          aws_s3_bucket.gold.arn,
          "${aws_s3_bucket.gold.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.datalake.arn]
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Glue Crawlers
# ------------------------------------------------------------------------------
resource "aws_glue_crawler" "bronze" {
  database_name = aws_glue_catalog_database.main.name
  name          = "${var.project}-${var.environment}-bronze-crawler"
  role          = aws_iam_role.glue_crawler.arn

  s3_target {
    path = "s3://${aws_s3_bucket.bronze.id}/"
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "UPDATE_IN_DATABASE"
  }

  configuration = jsonencode({
    Version = 1.0
    Grouping = {
      TableGroupingPolicy = "CombineCompatibleSchemas"
    }
  })

  tags = {
    Name        = "${var.project}-${var.environment}-bronze-crawler"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_glue_crawler" "silver" {
  database_name = aws_glue_catalog_database.main.name
  name          = "${var.project}-${var.environment}-silver-crawler"
  role          = aws_iam_role.glue_crawler.arn

  s3_target {
    path = "s3://${aws_s3_bucket.silver.id}/"
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "UPDATE_IN_DATABASE"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-silver-crawler"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_glue_crawler" "gold" {
  database_name = aws_glue_catalog_database.main.name
  name          = "${var.project}-${var.environment}-gold-crawler"
  role          = aws_iam_role.glue_crawler.arn

  s3_target {
    path = "s3://${aws_s3_bucket.gold.id}/"
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "UPDATE_IN_DATABASE"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-gold-crawler"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Athena Workgroup
# ------------------------------------------------------------------------------
resource "aws_athena_workgroup" "main" {
  name        = "${var.project}-${var.environment}"
  description = "Athena workgroup for ${var.project}"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true

    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.id}/results/"

      encryption_configuration {
        encryption_option = "SSE_KMS"
        kms_key_arn       = aws_kms_key.datalake.arn
      }
    }

    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Lake Formation Settings
# ------------------------------------------------------------------------------
resource "aws_lakeformation_data_lake_settings" "main" {
  admins = [data.aws_caller_identity.current.arn]
}

resource "aws_lakeformation_resource" "bronze" {
  arn = aws_s3_bucket.bronze.arn
}

resource "aws_lakeformation_resource" "silver" {
  arn = aws_s3_bucket.silver.arn
}

resource "aws_lakeformation_resource" "gold" {
  arn = aws_s3_bucket.gold.arn
}
