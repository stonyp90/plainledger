# ==============================================================================
# PlainLedger - ECS Module Outputs
# ==============================================================================

output "cluster_id" {
  description = "ECS cluster ID"
  value       = aws_ecs_cluster.main.id
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "alb_zone_id" {
  description = "ALB zone ID"
  value       = aws_lb.main.zone_id
}

output "web_service_name" {
  description = "Web service name"
  value       = aws_ecs_service.web.name
}

output "api_service_name" {
  description = "API service name"
  value       = aws_ecs_service.api.name
}

output "keycloak_service_name" {
  description = "Keycloak service name"
  value       = aws_ecs_service.keycloak.name
}

output "web_target_group_arn" {
  description = "Web target group ARN"
  value       = aws_lb_target_group.web.arn
}

output "api_target_group_arn" {
  description = "API target group ARN"
  value       = aws_lb_target_group.api.arn
}

output "keycloak_target_group_arn" {
  description = "Keycloak target group ARN"
  value       = aws_lb_target_group.keycloak.arn
}

output "admin_service_name" {
  description = "Admin console service name"
  value       = aws_ecs_service.admin.name
}

output "admin_target_group_arn" {
  description = "Admin console target group ARN"
  value       = aws_lb_target_group.admin.arn
}

output "ecs_execution_role_arn" {
  description = "ECS execution role ARN"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}
