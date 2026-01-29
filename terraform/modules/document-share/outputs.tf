# ==============================================================================
# Document Share Module - Outputs
# ==============================================================================

output "bucket_name" {
  description = "Name of the document share S3 bucket"
  value       = aws_s3_bucket.document_share.id
}

output "bucket_arn" {
  description = "ARN of the document share S3 bucket"
  value       = aws_s3_bucket.document_share.arn
}

output "bucket_regional_domain" {
  description = "Regional domain name of the bucket"
  value       = aws_s3_bucket.document_share.bucket_regional_domain_name
}
