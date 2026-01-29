# ==============================================================================
# PlainLedger - ECS Module
# ECS Fargate + ALB + Auto Scaling
# ==============================================================================

data "aws_caller_identity" "current" {}

# ------------------------------------------------------------------------------
# ECS Cluster
# ------------------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      kms_key_id = var.kms_key_arn
      logging    = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 1
    weight            = 100
    capacity_provider = "FARGATE"
  }
}

# ------------------------------------------------------------------------------
# CloudWatch Log Groups
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/aws/ecs/${var.project}-${var.environment}/exec"
  retention_in_days = 30
  # Note: KMS encryption disabled for exec logs due to key policy conflicts

  tags = {
    Name        = "${var.project}-${var.environment}-ecs-exec"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/aws/ecs/${var.project}-${var.environment}/web"
  retention_in_days = 30

  tags = {
    Name        = "${var.project}-${var.environment}-web-logs"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/ecs/${var.project}-${var.environment}/api"
  retention_in_days = 30

  tags = {
    Name        = "${var.project}-${var.environment}-api-logs"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "keycloak" {
  name              = "/aws/ecs/${var.project}-${var.environment}/keycloak"
  retention_in_days = 30

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak-logs"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# IAM Roles
# ------------------------------------------------------------------------------

# ECS Task Execution Role
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project}-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-ecs-execution"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${var.project}-${var.environment}-ecs-secrets"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = compact([
          var.db_credentials_secret_arn,
          var.redis_auth_secret_arn,
          var.stripe_secret_arn,
          var.novu_secret_arn,
          var.quickbooks_secret_arn,
          var.keycloak_client_secret_arn
        ])
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = [var.kms_key_arn]
      }
    ]
  })
}

# ECS Task Role
resource "aws_iam_role" "ecs_task" {
  name = "${var.project}-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-ecs-task"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${var.project}-${var.environment}-ecs-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = var.datalake_bucket_arns
      },
      {
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Application Load Balancer
# ------------------------------------------------------------------------------
resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false  # Allow deletion during development
  enable_http2               = true

  tags = {
    Name        = "${var.project}-${var.environment}-alb"
    Project     = var.project
    Environment = var.environment
  }
}

# HTTPS Listener (only when certificate is available)
resource "aws_lb_listener" "https" {
  count             = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }

  tags = {
    Name        = "${var.project}-${var.environment}-https"
    Project     = var.project
    Environment = var.environment
  }
}

# HTTP Listener - forwards to web when no certificate available
resource "aws_lb_listener" "http" {
  count             = var.acm_certificate_arn == "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }

  tags = {
    Name        = "${var.project}-${var.environment}-http"
    Project     = var.project
    Environment = var.environment
  }
}

# HTTP Listener - redirects to HTTPS when certificate is available
resource "aws_lb_listener" "http_redirect" {
  count             = var.acm_certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-http-redirect"
    Project     = var.project
    Environment = var.environment
  }
}

# HTTP Listener Rules for API (only when no HTTPS)
resource "aws_lb_listener_rule" "api_http" {
  count        = var.acm_certificate_arn == "" ? 1 : 0
  listener_arn = aws_lb_listener.http[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health", "/graphql"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-api-rule-http"
    Project     = var.project
    Environment = var.environment
  }
}

# HTTP Listener Rules for Keycloak (only when no HTTPS)
resource "aws_lb_listener_rule" "keycloak_http" {
  count        = var.acm_certificate_arn == "" ? 1 : 0
  listener_arn = aws_lb_listener.http[0].arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    path_pattern {
      values = ["/auth/*", "/realms/*"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak-rule-http"
    Project     = var.project
    Environment = var.environment
  }
}

# HTTPS Listener Rules (only when certificate is available)
resource "aws_lb_listener_rule" "api" {
  count        = var.acm_certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health", "/graphql"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-api-rule"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_lb_listener_rule" "keycloak" {
  count        = var.acm_certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    path_pattern {
      values = ["/realms/*"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak-rule"
    Project     = var.project
    Environment = var.environment
  }
}

# Keycloak admin console
resource "aws_lb_listener_rule" "keycloak_admin" {
  count        = var.acm_certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 150

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    path_pattern {
      values = ["/admin/*"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak-admin-rule"
    Project     = var.project
    Environment = var.environment
  }
}

# Keycloak static resources (CSS, JS, images)
resource "aws_lb_listener_rule" "keycloak_resources" {
  count        = var.acm_certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 175

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    path_pattern {
      values = ["/resources/*"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak-resources-rule"
    Project     = var.project
    Environment = var.environment
  }
}

# Keycloak host-based routing (auth.${domain_name})
resource "aws_lb_listener_rule" "keycloak_host" {
  count        = var.acm_certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 50

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.keycloak.arn
  }

  condition {
    host_header {
      values = ["auth.${var.domain_name}"]
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak-host-rule"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Target Groups
# ------------------------------------------------------------------------------
resource "aws_lb_target_group" "web" {
  name        = "${var.project}-${var.environment}-web"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/"
    matcher             = "200-399"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-web"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.project}-${var.environment}-api"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-api"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "keycloak" {
  name        = "${var.project}-${var.environment}-keycloak"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health/ready"
    matcher             = "200"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# ECS Task Definitions
# ------------------------------------------------------------------------------

# Web Task Definition
resource "aws_ecs_task_definition" "web" {
  family                   = "${var.project}-${var.environment}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = "${var.ecr_web_repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "VITE_API_URL", value = "https://${var.domain_name}/api" },
        { name = "VITE_GRAPHQL_URL", value = "https://${var.domain_name}/graphql" },
        { name = "VITE_KEYCLOAK_URL", value = "https://auth.${var.domain_name}" },
        { name = "VITE_KEYCLOAK_REALM", value = "plainledger" },
        { name = "VITE_KEYCLOAK_CLIENT_ID", value = "plainledger-web" },
        { name = "VITE_NOVU_APP_ID", value = "FNfEAbhmW05j" },
        { name = "VITE_STRIPE_PUBLISHABLE_KEY", value = "pk_live_vvnFU7D7nv59fLWYOsVG8BQV" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.web.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "web"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.project}-${var.environment}-web"
    Project     = var.project
    Environment = var.environment
  }
}

# API Task Definition
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = "${var.ecr_api_repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "DB_PORT", value = "5432" },
        { name = "REDIS_PORT", value = "6379" },
        { name = "KEYCLOAK_URL", value = "https://${var.domain_name}" },
        { name = "KEYCLOAK_REALM", value = "plainledger" },
        { name = "KEYCLOAK_CLIENT_ID", value = "plainledger-api" },
        { name = "KEYCLOAK_ADMIN_CLIENT_ID", value = "plainledger-api" },
        { name = "CORS_ORIGIN", value = "https://${var.domain_name},https://www.${var.domain_name}" },
        { name = "APP_URL", value = "https://${var.domain_name}" }
      ]

      secrets = concat([
        {
          name      = "DB_HOST"
          valueFrom = "${var.db_credentials_secret_arn}:host::"
        },
        {
          name      = "DB_USERNAME"
          valueFrom = "${var.db_credentials_secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_credentials_secret_arn}:password::"
        },
        {
          name      = "DB_NAME"
          valueFrom = "${var.db_credentials_secret_arn}:dbname::"
        },
        {
          name      = "REDIS_HOST"
          valueFrom = "${var.redis_auth_secret_arn}:host::"
        },
        {
          name      = "REDIS_AUTH_TOKEN"
          valueFrom = "${var.redis_auth_secret_arn}:auth_token::"
        },
        {
          name      = "NOVU_API_KEY"
          valueFrom = "${var.novu_secret_arn}:api_key::"
        },
        {
          name      = "NOVU_APP_ID"
          valueFrom = "${var.novu_secret_arn}:app_id::"
        },
        {
          name      = "STRIPE_SECRET_KEY"
          valueFrom = "${var.stripe_secret_arn}:secret_key::"
        },
        {
          name      = "STRIPE_PUBLISHABLE_KEY"
          valueFrom = "${var.stripe_secret_arn}:publishable_key::"
        }
      ], var.keycloak_client_secret_arn != "" ? [
        {
          name      = "KEYCLOAK_CLIENT_SECRET"
          valueFrom = "${var.keycloak_client_secret_arn}:secret::"
        }
      ] : [], var.quickbooks_secret_arn != "" ? [
        {
          name      = "QUICKBOOKS_CLIENT_ID"
          valueFrom = "${var.quickbooks_secret_arn}:client_id::"
        },
        {
          name      = "QUICKBOOKS_CLIENT_SECRET"
          valueFrom = "${var.quickbooks_secret_arn}:client_secret::"
        },
        {
          name      = "QUICKBOOKS_REDIRECT_URI"
          valueFrom = "${var.quickbooks_secret_arn}:redirect_uri::"
        },
        {
          name      = "QUICKBOOKS_ENVIRONMENT"
          valueFrom = "${var.quickbooks_secret_arn}:environment::"
        }
      ] : [])

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "api"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.project}-${var.environment}-api"
    Project     = var.project
    Environment = var.environment
  }
}

# Keycloak Task Definition
resource "aws_ecs_task_definition" "keycloak" {
  family                   = "${var.project}-${var.environment}-keycloak"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.keycloak_cpu
  memory                   = var.keycloak_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "keycloak"
      image     = "${var.ecr_keycloak_repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "KC_PROXY", value = "edge" },
        { name = "KC_HOSTNAME", value = "${var.domain_name}" },
        { name = "KC_HOSTNAME_STRICT", value = "true" },
        { name = "KC_HOSTNAME_STRICT_HTTPS", value = "true" },
        { name = "KC_HTTP_ENABLED", value = "true" },
        { name = "KC_HEALTH_ENABLED", value = "true" },
        { name = "KC_DB", value = "postgres" },
        { name = "KC_DB_URL_DATABASE", value = "keycloak" },
        # SMTP configuration
        { name = "SMTP_HOST", value = "email-smtp.us-east-1.amazonaws.com" },
        { name = "SMTP_PORT", value = "587" },
        { name = "SMTP_FROM", value = "noreply@plainledger.ca" },
        { name = "SMTP_REPLY_TO", value = "support@plainledger.ca" },
        { name = "SMTP_SSL", value = "false" },
        { name = "SMTP_STARTTLS", value = "true" },
        { name = "SMTP_AUTH", value = "true" }
      ]

      secrets = concat([
        {
          name      = "KC_DB_URL_HOST"
          valueFrom = "${var.db_credentials_secret_arn}:host::"
        },
        {
          name      = "KC_DB_USERNAME"
          valueFrom = "${var.db_credentials_secret_arn}:username::"
        },
        {
          name      = "KC_DB_PASSWORD"
          valueFrom = "${var.db_credentials_secret_arn}:password::"
        },
        {
          name      = "SMTP_USER"
          valueFrom = "${var.keycloak_smtp_secret_arn}:user::"
        },
        {
          name      = "SMTP_PASSWORD"
          valueFrom = "${var.keycloak_smtp_secret_arn}:password::"
        }
      ], var.keycloak_client_secret_arn != "" ? [
        {
          # This secret is used by Keycloak during realm import to substitute
          # ${API_CLIENT_SECRET:default} placeholders in plainledger-realm.json
          name      = "API_CLIENT_SECRET"
          valueFrom = "${var.keycloak_client_secret_arn}:secret::"
        }
      ] : [])

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.keycloak.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "keycloak"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# ECS Services
# ------------------------------------------------------------------------------
resource "aws_ecs_service" "web" {
  name                               = "${var.project}-${var.environment}-web"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.web.arn
  desired_count                      = var.web_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60
  enable_execute_command             = true

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 80
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-web"
    Project     = var.project
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "api" {
  name                               = "${var.project}-${var.environment}-api"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.api.arn
  desired_count                      = var.api_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60
  enable_execute_command             = true

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-api"
    Project     = var.project
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

resource "aws_ecs_service" "keycloak" {
  name                               = "${var.project}-${var.environment}-keycloak"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.keycloak.arn
  desired_count                      = var.keycloak_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 120
  enable_execute_command             = true

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.keycloak.arn
    container_name   = "keycloak"
    container_port   = 8080
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = {
    Name        = "${var.project}-${var.environment}-keycloak"
    Project     = var.project
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ------------------------------------------------------------------------------
# Auto Scaling
# ------------------------------------------------------------------------------
resource "aws_appautoscaling_target" "web" {
  max_capacity       = var.web_max_count
  min_capacity       = var.web_min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.web.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "web_cpu" {
  name               = "${var.project}-${var.environment}-web-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.web.resource_id
  scalable_dimension = aws_appautoscaling_target.web.scalable_dimension
  service_namespace  = aws_appautoscaling_target.web.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

resource "aws_appautoscaling_target" "api" {
  max_capacity       = var.api_max_count
  min_capacity       = var.api_min_count
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "${var.project}-${var.environment}-api-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ------------------------------------------------------------------------------
# Route53 Records
# ------------------------------------------------------------------------------
resource "aws_route53_record" "main" {
  count   = var.create_route53_records ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  count   = var.create_route53_records ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
