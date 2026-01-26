# ==============================================================================
# PlainLedger - Data Lake Module Outputs
# ==============================================================================

# S3 Buckets
output "bronze_bucket_id" {
  description = "Bronze bucket ID"
  value       = aws_s3_bucket.bronze.id
}

output "bronze_bucket_arn" {
  description = "Bronze bucket ARN"
  value       = aws_s3_bucket.bronze.arn
}

output "silver_bucket_id" {
  description = "Silver bucket ID"
  value       = aws_s3_bucket.silver.id
}

output "silver_bucket_arn" {
  description = "Silver bucket ARN"
  value       = aws_s3_bucket.silver.arn
}

output "gold_bucket_id" {
  description = "Gold bucket ID"
  value       = aws_s3_bucket.gold.id
}

output "gold_bucket_arn" {
  description = "Gold bucket ARN"
  value       = aws_s3_bucket.gold.arn
}

output "athena_results_bucket_id" {
  description = "Athena results bucket ID"
  value       = aws_s3_bucket.athena_results.id
}

output "datalake_bucket_arns" {
  description = "List of all data lake bucket ARNs"
  value = [
    aws_s3_bucket.bronze.arn,
    "${aws_s3_bucket.bronze.arn}/*",
    aws_s3_bucket.silver.arn,
    "${aws_s3_bucket.silver.arn}/*",
    aws_s3_bucket.gold.arn,
    "${aws_s3_bucket.gold.arn}/*"
  ]
}

# Glue
output "glue_database_name" {
  description = "Glue catalog database name"
  value       = aws_glue_catalog_database.main.name
}

output "glue_crawler_role_arn" {
  description = "Glue crawler IAM role ARN"
  value       = aws_iam_role.glue_crawler.arn
}

# Athena
output "athena_workgroup_name" {
  description = "Athena workgroup name"
  value       = aws_athena_workgroup.main.name
}

# KMS
output "kms_key_arn" {
  description = "Data lake KMS key ARN"
  value       = aws_kms_key.datalake.arn
}

output "kms_key_id" {
  description = "Data lake KMS key ID"
  value       = aws_kms_key.datalake.key_id
}
