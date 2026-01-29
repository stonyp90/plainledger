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

# ETL Jobs
output "etl_scripts_bucket_id" {
  description = "ETL scripts bucket ID"
  value       = aws_s3_bucket.etl_scripts.id
}

output "glue_etl_role_arn" {
  description = "Glue ETL IAM role ARN"
  value       = aws_iam_role.glue_etl.arn
}

output "silver_to_gold_job_name" {
  description = "Silver to Gold ETL job name"
  value       = aws_glue_job.silver_to_gold.name
}

output "industry_kpi_calculator_job_name" {
  description = "Industry KPI Calculator ETL job name"
  value       = aws_glue_job.industry_kpi_calculator.name
}

output "monthly_summary_job_name" {
  description = "Monthly Summary Calculator ETL job name"
  value       = aws_glue_job.monthly_summary_calculator.name
}
