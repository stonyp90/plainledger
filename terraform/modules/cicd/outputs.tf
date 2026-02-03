# ==============================================================================
# PlainLedger - CI/CD Module Outputs
# ==============================================================================

# ECR Repositories
output "ecr_web_repository_url" {
  description = "ECR repository URL for web"
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_api_repository_url" {
  description = "ECR repository URL for api"
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_keycloak_repository_url" {
  description = "ECR repository URL for keycloak"
  value       = aws_ecr_repository.keycloak.repository_url
}

output "ecr_web_repository_arn" {
  description = "ECR repository ARN for web"
  value       = aws_ecr_repository.web.arn
}

output "ecr_api_repository_arn" {
  description = "ECR repository ARN for api"
  value       = aws_ecr_repository.api.arn
}

output "ecr_keycloak_repository_arn" {
  description = "ECR repository ARN for keycloak"
  value       = aws_ecr_repository.keycloak.arn
}

output "ecr_admin_repository_url" {
  description = "ECR repository URL for admin console"
  value       = aws_ecr_repository.admin.repository_url
}

output "ecr_admin_repository_arn" {
  description = "ECR repository ARN for admin console"
  value       = aws_ecr_repository.admin.arn
}

# GitHub OIDC
output "github_oidc_provider_arn" {
  description = "GitHub OIDC provider ARN"
  value       = aws_iam_openid_connect_provider.github.arn
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}

output "github_actions_role_name" {
  description = "IAM role name for GitHub Actions"
  value       = aws_iam_role.github_actions.name
}

# Terraform Backend
output "terraform_state_bucket" {
  description = "Terraform state S3 bucket name"
  value       = aws_s3_bucket.terraform_state.id
}

output "terraform_lock_table" {
  description = "Terraform lock DynamoDB table name"
  value       = aws_dynamodb_table.terraform_lock.name
}
