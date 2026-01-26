# ==============================================================================
# PlainLedger - Database Module Outputs
# ==============================================================================

# RDS Outputs
output "rds_endpoint" {
  description = "RDS endpoint address"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "rds_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "db_credentials_secret_arn" {
  description = "Secrets Manager ARN for DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "db_credentials_secret_name" {
  description = "Secrets Manager name for DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.name
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

output "redis_auth_secret_arn" {
  description = "Secrets Manager ARN for Redis auth"
  value       = aws_secretsmanager_secret.redis_auth.arn
}

output "redis_auth_secret_name" {
  description = "Secrets Manager name for Redis auth"
  value       = aws_secretsmanager_secret.redis_auth.name
}

# KMS Key
output "kms_key_arn" {
  description = "KMS key ARN for database encryption"
  value       = aws_kms_key.database.arn
}

output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.database.key_id
}
