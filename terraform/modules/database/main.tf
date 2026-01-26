# ==============================================================================
# PlainLedger - Database Module
# RDS PostgreSQL + ElastiCache Redis
# ==============================================================================

# ------------------------------------------------------------------------------
# KMS Key for Encryption
# ------------------------------------------------------------------------------
resource "aws_kms_key" "database" {
  description             = "KMS key for ${var.project} database encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name        = "${var.project}-${var.environment}-db-kms"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_kms_alias" "database" {
  name          = "alias/${var.project}-${var.environment}-database"
  target_key_id = aws_kms_key.database.key_id
}

# ------------------------------------------------------------------------------
# Secrets Manager - Database Credentials
# ------------------------------------------------------------------------------
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.project}/${var.environment}/db-credentials"
  description = "RDS PostgreSQL credentials for ${var.project}"
  kms_key_id  = aws_kms_key.database.arn

  tags = {
    Name        = "${var.project}-${var.environment}-db-credentials"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db_password.result
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = var.db_name
    engine   = "postgres"
  })
}

# ------------------------------------------------------------------------------
# RDS Subnet Group
# ------------------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name        = "${var.project}-${var.environment}-db-subnet"
  description = "Database subnet group for ${var.project}"
  subnet_ids  = var.data_subnet_ids

  tags = {
    Name        = "${var.project}-${var.environment}-db-subnet"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# RDS Parameter Group
# ------------------------------------------------------------------------------
resource "aws_db_parameter_group" "main" {
  name        = "${var.project}-${var.environment}-pg16"
  family      = "postgres16"
  description = "PostgreSQL 16 parameters for ${var.project}"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-pg16"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# RDS PostgreSQL Instance
# ------------------------------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier = "${var.project}-${var.environment}-postgres"

  # Engine
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = var.db_instance_class
  parameter_group_name = aws_db_parameter_group.main.name

  # Storage
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.database.arn

  # Database
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false
  port                   = 5432

  # High Availability
  multi_az = var.db_multi_az

  # Backup
  backup_retention_period = var.db_backup_retention
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot   = true
  skip_final_snapshot     = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${var.project}-${var.environment}-final-snapshot" : null

  # Monitoring
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id       = aws_kms_key.database.arn
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.rds_monitoring.arn
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

  # Other
  auto_minor_version_upgrade = true
  deletion_protection        = var.environment == "prod"

  tags = {
    Name        = "${var.project}-${var.environment}-postgres"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# RDS Monitoring Role
# ------------------------------------------------------------------------------
resource "aws_iam_role" "rds_monitoring" {
  name = "${var.project}-${var.environment}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-rds-monitoring"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# ------------------------------------------------------------------------------
# ElastiCache Subnet Group
# ------------------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.project}-${var.environment}-redis-subnet"
  description = "Redis subnet group for ${var.project}"
  subnet_ids  = var.data_subnet_ids

  tags = {
    Name        = "${var.project}-${var.environment}-redis-subnet"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# ElastiCache Parameter Group
# ------------------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.project}-${var.environment}-redis7"
  family      = "redis7"
  description = "Redis 7 parameters for ${var.project}"

  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-redis7"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# ElastiCache Redis Cluster
# ------------------------------------------------------------------------------
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${var.project}-${var.environment}-redis"
  description          = "Redis cluster for ${var.project}"

  # Engine
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.redis_node_type
  parameter_group_name = aws_elasticache_parameter_group.main.name

  # Cluster Mode
  num_cache_clusters = var.redis_num_cache_clusters

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_security_group_id]
  port               = 6379

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result
  kms_key_id                 = aws_kms_key.database.arn

  # Maintenance
  maintenance_window       = "Mon:05:00-Mon:06:00"
  snapshot_window          = "02:00-03:00"
  snapshot_retention_limit = var.redis_snapshot_retention
  auto_minor_version_upgrade = true

  # Failover
  automatic_failover_enabled = var.redis_num_cache_clusters > 1
  multi_az_enabled           = var.redis_num_cache_clusters > 1

  tags = {
    Name        = "${var.project}-${var.environment}-redis"
    Project     = var.project
    Environment = var.environment
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

# ------------------------------------------------------------------------------
# Secrets Manager - Redis Auth Token
# ------------------------------------------------------------------------------
resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.project}/${var.environment}/redis-auth"
  description = "Redis auth token for ${var.project}"
  kms_key_id  = aws_kms_key.database.arn

  tags = {
    Name        = "${var.project}-${var.environment}-redis-auth"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    host       = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
  })
}

# ------------------------------------------------------------------------------
# CloudWatch Alarms
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${var.project}-${var.environment}-db-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = {
    Name        = "${var.project}-${var.environment}-db-cpu-high"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "db_storage" {
  alarm_name          = "${var.project}-${var.environment}-db-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120 # 5GB
  alarm_description   = "RDS free storage is low"
  alarm_actions       = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.id
  }

  tags = {
    Name        = "${var.project}-${var.environment}-db-storage-low"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project}-${var.environment}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU utilization is high"
  alarm_actions       = var.alarm_sns_topic_arn != null ? [var.alarm_sns_topic_arn] : []

  dimensions = {
    CacheClusterId = "${var.project}-${var.environment}-redis-001"
  }

  tags = {
    Name        = "${var.project}-${var.environment}-redis-cpu-high"
    Project     = var.project
    Environment = var.environment
  }
}
