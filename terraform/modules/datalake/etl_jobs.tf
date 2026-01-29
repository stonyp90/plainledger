# ==============================================================================
# Glue ETL Jobs for PlainLedger Data Lake
# Transforms Silver → Gold and calculates Industry KPIs
# ==============================================================================

# ------------------------------------------------------------------------------
# ETL Scripts Bucket
# ------------------------------------------------------------------------------
resource "aws_s3_bucket" "etl_scripts" {
  bucket = "${var.project}-${var.environment}-etl-scripts-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project}-${var.environment}-etl-scripts"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "etl_scripts" {
  bucket = aws_s3_bucket.etl_scripts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "etl_scripts" {
  bucket = aws_s3_bucket.etl_scripts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ------------------------------------------------------------------------------
# Glue ETL IAM Role
# ------------------------------------------------------------------------------
resource "aws_iam_role" "glue_etl" {
  name = "${var.project}-${var.environment}-glue-etl"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-glue-etl"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "glue_etl_service" {
  role       = aws_iam_role.glue_etl.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

resource "aws_iam_role_policy" "glue_etl_s3" {
  name = "${var.project}-${var.environment}-glue-etl-s3"
  role = aws_iam_role.glue_etl.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.bronze.arn,
          "${aws_s3_bucket.bronze.arn}/*",
          aws_s3_bucket.silver.arn,
          "${aws_s3_bucket.silver.arn}/*",
          aws_s3_bucket.gold.arn,
          "${aws_s3_bucket.gold.arn}/*",
          aws_s3_bucket.etl_scripts.arn,
          "${aws_s3_bucket.etl_scripts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = [aws_kms_key.datalake.arn]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:/aws-glue/*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Silver to Gold ETL Job
# ------------------------------------------------------------------------------
resource "aws_glue_job" "silver_to_gold" {
  name     = "${var.project}-${var.environment}-silver-to-gold"
  role_arn = aws_iam_role.glue_etl.arn

  command {
    script_location = "s3://${aws_s3_bucket.etl_scripts.id}/silver_to_gold.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"                     = "python"
    "--enable-continuous-cloudwatch-log" = "true"
    "--enable-metrics"                   = "true"
    "--enable-spark-ui"                  = "true"
    "--spark-event-logs-path"            = "s3://${aws_s3_bucket.etl_scripts.id}/spark-logs/"
    "--TempDir"                          = "s3://${aws_s3_bucket.etl_scripts.id}/temp/"
    "--silver_bucket"                    = aws_s3_bucket.silver.id
    "--gold_bucket"                      = aws_s3_bucket.gold.id
    "--database_name"                    = aws_glue_catalog_database.main.name
  }

  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  timeout           = 60

  execution_property {
    max_concurrent_runs = 1
  }

  tags = {
    Name        = "${var.project}-${var.environment}-silver-to-gold"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Industry KPI Calculator ETL Job
# ------------------------------------------------------------------------------
resource "aws_glue_job" "industry_kpi_calculator" {
  name     = "${var.project}-${var.environment}-industry-kpi-calculator"
  role_arn = aws_iam_role.glue_etl.arn

  command {
    script_location = "s3://${aws_s3_bucket.etl_scripts.id}/calculate_industry_kpis.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"                     = "python"
    "--enable-continuous-cloudwatch-log" = "true"
    "--enable-metrics"                   = "true"
    "--TempDir"                          = "s3://${aws_s3_bucket.etl_scripts.id}/temp/"
    "--gold_bucket"                      = aws_s3_bucket.gold.id
    "--database_name"                    = aws_glue_catalog_database.main.name
  }

  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  timeout           = 30

  execution_property {
    max_concurrent_runs = 1
  }

  tags = {
    Name        = "${var.project}-${var.environment}-industry-kpi-calculator"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# Monthly Summary Calculator ETL Job
# ------------------------------------------------------------------------------
resource "aws_glue_job" "monthly_summary_calculator" {
  name     = "${var.project}-${var.environment}-monthly-summary"
  role_arn = aws_iam_role.glue_etl.arn

  command {
    script_location = "s3://${aws_s3_bucket.etl_scripts.id}/calculate_monthly_summary.py"
    python_version  = "3"
  }

  default_arguments = {
    "--job-language"                     = "python"
    "--enable-continuous-cloudwatch-log" = "true"
    "--enable-metrics"                   = "true"
    "--TempDir"                          = "s3://${aws_s3_bucket.etl_scripts.id}/temp/"
    "--gold_bucket"                      = aws_s3_bucket.gold.id
    "--database_name"                    = aws_glue_catalog_database.main.name
  }

  glue_version      = "4.0"
  worker_type       = "G.1X"
  number_of_workers = 2
  timeout           = 30

  execution_property {
    max_concurrent_runs = 1
  }

  tags = {
    Name        = "${var.project}-${var.environment}-monthly-summary"
    Project     = var.project
    Environment = var.environment
  }
}

# ------------------------------------------------------------------------------
# ETL Workflow Trigger (Daily)
# ------------------------------------------------------------------------------
resource "aws_glue_trigger" "daily_etl" {
  name     = "${var.project}-${var.environment}-daily-etl"
  type     = "SCHEDULED"
  schedule = "cron(0 6 * * ? *)" # Run at 6 AM UTC daily

  actions {
    job_name = aws_glue_job.silver_to_gold.name
  }

  tags = {
    Name        = "${var.project}-${var.environment}-daily-etl"
    Project     = var.project
    Environment = var.environment
  }
}

# Chain the KPI calculator after silver_to_gold completes
resource "aws_glue_trigger" "kpi_after_gold" {
  name = "${var.project}-${var.environment}-kpi-after-gold"
  type = "CONDITIONAL"

  predicate {
    conditions {
      job_name = aws_glue_job.silver_to_gold.name
      state    = "SUCCEEDED"
    }
  }

  actions {
    job_name = aws_glue_job.industry_kpi_calculator.name
  }

  actions {
    job_name = aws_glue_job.monthly_summary_calculator.name
  }

  tags = {
    Name        = "${var.project}-${var.environment}-kpi-after-gold"
    Project     = var.project
    Environment = var.environment
  }
}
