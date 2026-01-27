# ==============================================================================
# AWS Athena Configuration for Power BI Direct Query
# ==============================================================================
# 
# This configuration sets up AWS Athena to enable Power BI to directly query
# the S3 Gold layer datalake. This provides real-time data access while
# maintaining security through IAM and organization-based partitioning.

# ------------------------------------------------------------------------------
# Athena Workgroup
# ------------------------------------------------------------------------------
resource "aws_athena_workgroup" "powerbi" {
  name = "${var.project}-${var.environment}-powerbi"

  configuration {
    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true

    result_configuration {
      output_location = "s3://${var.gold_bucket_name}/athena-results/"

      encryption_configuration {
        encryption_option = "SSE_S3"
      }
    }

    # Cost control - limit bytes scanned
    bytes_scanned_cutoff_per_query = 10737418240 # 10 GB

    engine_version {
      selected_engine_version = "Athena engine version 3"
    }
  }

  tags = {
    Name        = "${var.project}-${var.environment}-powerbi-workgroup"
    Project     = var.project
    Environment = var.environment
    Purpose     = "Power BI Direct Query"
  }
}

# ------------------------------------------------------------------------------
# Athena Database (Glue Data Catalog)
# ------------------------------------------------------------------------------
resource "aws_glue_catalog_database" "gold" {
  name        = "${replace(var.project, "-", "_")}_${var.environment}_gold"
  description = "Gold layer data for Power BI analytics"

  location_uri = "s3://${var.gold_bucket_name}/"
}

# ------------------------------------------------------------------------------
# Glue Tables for Gold Layer
# ------------------------------------------------------------------------------

# dim_account table
resource "aws_glue_catalog_table" "dim_account" {
  database_name = aws_glue_catalog_database.gold.name
  name          = "dim_account"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification"  = "parquet"
    "typeOfData"      = "file"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${var.gold_bucket_name}/dim_account/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "account_key"
      type = "string"
    }
    columns {
      name = "account_id"
      type = "string"
    }
    columns {
      name = "source_account_id"
      type = "string"
    }
    columns {
      name = "account_code"
      type = "string"
    }
    columns {
      name = "account_name"
      type = "string"
    }
    columns {
      name = "account_name_fr"
      type = "string"
    }
    columns {
      name = "account_type"
      type = "string"
    }
    columns {
      name = "account_subtype"
      type = "string"
    }
    columns {
      name = "is_active"
      type = "boolean"
    }
    columns {
      name = "hierarchy_level"
      type = "int"
    }
    columns {
      name = "hierarchy_path"
      type = "string"
    }
    columns {
      name = "is_debit_normal"
      type = "boolean"
    }
    columns {
      name = "balance_sheet_section"
      type = "string"
    }
    columns {
      name = "income_statement_section"
      type = "string"
    }
  }

  # Partition by organization for RLS and performance
  partition_keys {
    name = "organization_key"
    type = "string"
  }
}

# fact_transaction table
resource "aws_glue_catalog_table" "fact_transaction" {
  database_name = aws_glue_catalog_database.gold.name
  name          = "fact_transaction"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification"  = "parquet"
    "typeOfData"      = "file"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${var.gold_bucket_name}/fact_transaction/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "transaction_key"
      type = "string"
    }
    columns {
      name = "transaction_id"
      type = "string"
    }
    columns {
      name = "account_key"
      type = "string"
    }
    columns {
      name = "date_key"
      type = "int"
    }
    columns {
      name = "contact_key"
      type = "string"
    }
    columns {
      name = "transaction_type_key"
      type = "string"
    }
    columns {
      name = "transaction_date"
      type = "date"
    }
    columns {
      name = "posting_date"
      type = "date"
    }
    columns {
      name = "debit_amount"
      type = "decimal(18,2)"
    }
    columns {
      name = "credit_amount"
      type = "decimal(18,2)"
    }
    columns {
      name = "amount"
      type = "decimal(18,2)"
    }
    columns {
      name = "currency_code"
      type = "string"
    }
    columns {
      name = "exchange_rate"
      type = "decimal(10,6)"
    }
    columns {
      name = "amount_cad"
      type = "decimal(18,2)"
    }
    columns {
      name = "reference_number"
      type = "string"
    }
    columns {
      name = "memo"
      type = "string"
    }
    columns {
      name = "source_system"
      type = "string"
    }
    columns {
      name = "source_transaction_id"
      type = "string"
    }
  }

  partition_keys {
    name = "organization_key"
    type = "string"
  }
}

# fact_account_balance table
resource "aws_glue_catalog_table" "fact_account_balance" {
  database_name = aws_glue_catalog_database.gold.name
  name          = "fact_account_balance"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification"  = "parquet"
    "typeOfData"      = "file"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${var.gold_bucket_name}/fact_account_balance/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "balance_key"
      type = "string"
    }
    columns {
      name = "account_key"
      type = "string"
    }
    columns {
      name = "date_key"
      type = "int"
    }
    columns {
      name = "as_of_date"
      type = "date"
    }
    columns {
      name = "fiscal_year"
      type = "int"
    }
    columns {
      name = "fiscal_period"
      type = "int"
    }
    columns {
      name = "opening_balance"
      type = "decimal(18,2)"
    }
    columns {
      name = "debit_total"
      type = "decimal(18,2)"
    }
    columns {
      name = "credit_total"
      type = "decimal(18,2)"
    }
    columns {
      name = "net_change"
      type = "decimal(18,2)"
    }
    columns {
      name = "closing_balance"
      type = "decimal(18,2)"
    }
    columns {
      name = "balance_type"
      type = "string"
    }
    columns {
      name = "currency_code"
      type = "string"
    }
  }

  partition_keys {
    name = "organization_key"
    type = "string"
  }
}

# dim_contact table
resource "aws_glue_catalog_table" "dim_contact" {
  database_name = aws_glue_catalog_database.gold.name
  name          = "dim_contact"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification"  = "parquet"
    "typeOfData"      = "file"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${var.gold_bucket_name}/dim_contact/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "contact_key"
      type = "string"
    }
    columns {
      name = "contact_id"
      type = "string"
    }
    columns {
      name = "source_contact_id"
      type = "string"
    }
    columns {
      name = "contact_type"
      type = "string"
    }
    columns {
      name = "display_name"
      type = "string"
    }
    columns {
      name = "company_name"
      type = "string"
    }
    columns {
      name = "email"
      type = "string"
    }
    columns {
      name = "is_customer"
      type = "boolean"
    }
    columns {
      name = "is_vendor"
      type = "boolean"
    }
    columns {
      name = "is_active"
      type = "boolean"
    }
  }

  partition_keys {
    name = "organization_key"
    type = "string"
  }
}

# dim_date table (shared, no RLS)
resource "aws_glue_catalog_table" "dim_date" {
  database_name = aws_glue_catalog_database.gold.name
  name          = "dim_date"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification"  = "parquet"
    "typeOfData"      = "file"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${var.gold_bucket_name}/dim_date/"
    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "date_key"
      type = "int"
    }
    columns {
      name = "full_date"
      type = "date"
    }
    columns {
      name = "year"
      type = "int"
    }
    columns {
      name = "quarter"
      type = "int"
    }
    columns {
      name = "month"
      type = "int"
    }
    columns {
      name = "day"
      type = "int"
    }
    columns {
      name = "day_of_week"
      type = "int"
    }
    columns {
      name = "day_name"
      type = "string"
    }
    columns {
      name = "month_name"
      type = "string"
    }
    columns {
      name = "is_weekend"
      type = "boolean"
    }
    columns {
      name = "is_holiday"
      type = "boolean"
    }
    columns {
      name = "fiscal_year"
      type = "int"
    }
    columns {
      name = "fiscal_quarter"
      type = "int"
    }
    columns {
      name = "fiscal_period"
      type = "int"
    }
  }
}

# ------------------------------------------------------------------------------
# IAM Role for Power BI Athena Access
# ------------------------------------------------------------------------------
resource "aws_iam_role" "powerbi_athena" {
  name = "${var.project}-${var.environment}-powerbi-athena"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          # Allow the API service to assume this role
          AWS = var.api_role_arn
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project}-${var.environment}-powerbi-athena"
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "powerbi_athena" {
  name = "${var.project}-${var.environment}-powerbi-athena"
  role = aws_iam_role.powerbi_athena.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:StopQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:GetWorkGroup",
          "athena:ListDatabases",
          "athena:ListTableMetadata",
          "athena:ListDataCatalogs"
        ]
        Resource = [
          aws_athena_workgroup.powerbi.arn,
          "arn:aws:athena:${var.aws_region}:${data.aws_caller_identity.current.account_id}:datacatalog/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetDatabase",
          "glue:GetDatabases",
          "glue:GetTable",
          "glue:GetTables",
          "glue:GetPartition",
          "glue:GetPartitions"
        ]
        Resource = [
          aws_glue_catalog_database.gold.arn,
          "arn:aws:glue:${var.aws_region}:${data.aws_caller_identity.current.account_id}:catalog",
          "arn:aws:glue:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${aws_glue_catalog_database.gold.name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          var.gold_bucket_arn,
          "${var.gold_bucket_arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${var.gold_bucket_arn}/athena-results/*"
        ]
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------------------
output "athena_workgroup_name" {
  value       = aws_athena_workgroup.powerbi.name
  description = "Athena workgroup name for Power BI queries"
}

output "athena_database_name" {
  value       = aws_glue_catalog_database.gold.name
  description = "Glue database name for Athena queries"
}

output "powerbi_athena_role_arn" {
  value       = aws_iam_role.powerbi_athena.arn
  description = "IAM role ARN for Power BI Athena access"
}
