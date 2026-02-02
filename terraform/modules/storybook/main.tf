# ==============================================================================
# Storybook Module
# S3 bucket + CloudFront distribution for static Storybook site
# Password-protected via Keycloak authentication (handled in Storybook app)
# ==============================================================================

data "aws_caller_identity" "current" {}

# S3 Bucket for Storybook static site
resource "aws_s3_bucket" "storybook" {
  bucket = "${var.project}-${var.environment}-storybook"

  tags = {
    Name        = "${var.project}-${var.environment}-storybook"
    Project     = var.project
    Environment = var.environment
    Purpose     = "Storybook component library"
  }
}

# Block all public access (CloudFront will access via OAI)
resource "aws_s3_bucket_public_access_block" "storybook" {
  bucket = aws_s3_bucket.storybook.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for rollback capability
resource "aws_s3_bucket_versioning" "storybook" {
  bucket = aws_s3_bucket.storybook.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "storybook" {
  bucket = aws_s3_bucket.storybook.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_arn != "" ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_arn != "" ? var.kms_key_arn : null
    }
    bucket_key_enabled = var.kms_key_arn != "" ? true : false
  }
}

# CloudFront Origin Access Identity (OAI) for secure S3 access
resource "aws_cloudfront_origin_access_identity" "storybook" {
  comment = "OAI for ${var.project}-${var.environment}-storybook"
}

# S3 Bucket Policy - allow CloudFront OAI access only
resource "aws_s3_bucket_policy" "storybook" {
  bucket = aws_s3_bucket.storybook.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.storybook.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.storybook.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_cloudfront_distribution.storybook]
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "storybook" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "Storybook component library for ${var.project}-${var.environment}"

  aliases = ["storybook.${var.domain_name}"]

  origin {
    domain_name = aws_s3_bucket.storybook.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.storybook.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.storybook.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.storybook.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-storybook"
    Project     = var.project
    Environment = var.environment
  }
}

# Route53 Record for storybook subdomain
resource "aws_route53_record" "storybook" {
  count   = var.route53_zone_id != null ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "storybook.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.storybook.domain_name
    zone_id                = aws_cloudfront_distribution.storybook.hosted_zone_id
    evaluate_target_health = false
  }
}
