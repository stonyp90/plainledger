# ==============================================================================
# PlainLedger - Production Outputs
# ==============================================================================

output "app_url" {
  description = "Application URL"
  value       = "https://${var.domain_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.ecs.alb_dns_name
}

output "route53_zone_id" {
  description = "Route53 zone ID"
  value       = module.networking.route53_zone_id
}

output "route53_name_servers" {
  description = "Route53 name servers"
  value       = module.networking.route53_name_servers
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.database.rds_endpoint
  sensitive   = true
}

output "ecr_web_repository" {
  description = "ECR web repository URL"
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_api_repository" {
  description = "ECR API repository URL"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_keycloak_repository" {
  description = "ECR Keycloak repository URL"
  value       = aws_ecr_repository.keycloak.repository_url
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "bronze_bucket" {
  description = "Data Lake bronze bucket"
  value       = module.datalake.bronze_bucket_id
}

output "silver_bucket" {
  description = "Data Lake silver bucket"
  value       = module.datalake.silver_bucket_id
}

output "gold_bucket" {
  description = "Data Lake gold bucket"
  value       = module.datalake.gold_bucket_id
}
