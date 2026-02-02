# ==============================================================================
# Storybook Module Outputs
# ==============================================================================

output "s3_bucket_id" {
  description = "S3 bucket ID for Storybook"
  value       = aws_s3_bucket.storybook.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN for Storybook"
  value       = aws_s3_bucket.storybook.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.storybook.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.storybook.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.storybook.domain_name
}

output "storybook_url" {
  description = "Storybook URL"
  value       = "https://storybook.${var.domain_name}"
}
