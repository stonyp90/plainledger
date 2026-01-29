# ==============================================================================
# Document Share Module
# S3 bucket for password-protected document sharing with expiration
# ==============================================================================

# S3 Bucket for document shares
resource "aws_s3_bucket" "document_share" {
  bucket = "${var.project}-${var.environment}-document-share"

  tags = {
    Name        = "${var.project}-${var.environment}-document-share"
    Project     = var.project
    Environment = var.environment
    Purpose     = "Password-protected document sharing"
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "document_share" {
  bucket = aws_s3_bucket.document_share.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for audit trail
resource "aws_s3_bucket_versioning" "document_share" {
  bucket = aws_s3_bucket.document_share.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "document_share" {
  bucket = aws_s3_bucket.document_share.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.kms_key_arn != "" ? true : false
  }
}

# Lifecycle rules for automatic cleanup
resource "aws_s3_bucket_lifecycle_configuration" "document_share" {
  bucket = aws_s3_bucket.document_share.id

  # Delete expired shares after 90 days
  rule {
    id     = "cleanup-expired-shares"
    status = "Enabled"

    filter {
      prefix = "shares/"
    }

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  # Delete incomplete multipart uploads
  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# CORS configuration for web uploads
resource "aws_s3_bucket_cors_configuration" "document_share" {
  bucket = aws_s3_bucket.document_share.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.allowed_origins
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = 3600
  }
}

# Bucket policy for presigned URL access
resource "aws_s3_bucket_policy" "document_share" {
  bucket = aws_s3_bucket.document_share.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowPresignedURLAccess"
        Effect    = "Allow"
        Principal = { AWS = var.ecs_task_role_arn }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.document_share.arn}/*"
      },
      {
        Sid       = "AllowBucketListing"
        Effect    = "Allow"
        Principal = { AWS = var.ecs_task_role_arn }
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.document_share.arn
      }
    ]
  })
}
