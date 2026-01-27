# ==============================================================================
# Gold Layer - Star Schema Tables (Power BI Optimized)
# ==============================================================================

# ------------------------------------------------------------------------------
# Dimension Tables
# ------------------------------------------------------------------------------

# dim_organization - Slowly Changing Dimension Type 2
resource "aws_glue_catalog_table" "dim_organization" {
  name          = "dim_organization"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
    "typeOfData" = "file"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_organization/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_organization"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      parameters = {
        "serialization.format" = "1"
      }
    }

    columns {
      name = "organization_key"
      type = "string"
      comment = "Surrogate key for Power BI"
    }
    columns {
      name = "organization_id"
      type = "string"
      comment = "Natural key (UUID)"
    }
    columns {
      name = "organization_name"
      type = "string"
    }
    columns {
      name = "legal_name"
      type = "string"
    }
    columns {
      name = "tax_number"
      type = "string"
    }
    columns {
      name = "currency_code"
      type = "string"
      comment = "CAD, USD"
    }
    columns {
      name = "fiscal_year_end_month"
      type = "int"
    }
    columns {
      name = "industry"
      type = "string"
    }
    columns {
      name = "industry_category"
      type = "string"
      comment = "CONSTRUCTION, MANUFACTURING, RETAIL, etc."
    }
    columns {
      name = "accounting_standard"
      type = "string"
      comment = "ASPE, IFRS, US_GAAP"
    }
    columns {
      name = "country_code"
      type = "string"
    }
    columns {
      name = "province_state"
      type = "string"
    }
    columns {
      name = "is_current"
      type = "boolean"
      comment = "SCD Type 2"
    }
    columns {
      name = "valid_from"
      type = "timestamp"
    }
    columns {
      name = "valid_to"
      type = "timestamp"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_business_unit
resource "aws_glue_catalog_table" "dim_business_unit" {
  name          = "dim_business_unit"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_business_unit/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_business_unit"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "business_unit_key"
      type = "string"
    }
    columns {
      name = "business_unit_id"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "business_unit_name"
      type = "string"
    }
    columns {
      name = "business_unit_code"
      type = "string"
    }
    columns {
      name = "parent_business_unit_key"
      type = "string"
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
      name = "is_active"
      type = "boolean"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_account - Chart of Accounts
resource "aws_glue_catalog_table" "dim_account" {
  name          = "dim_account"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_account/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_account"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
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
      comment = "QuickBooks/Xero ID"
    }
    columns {
      name = "organization_key"
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
      name = "account_type_key"
      type = "string"
    }
    columns {
      name = "account_type"
      type = "string"
      comment = "ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE"
    }
    columns {
      name = "account_subtype"
      type = "string"
    }
    columns {
      name = "source_account_type"
      type = "string"
    }
    columns {
      name = "source_account_subtype"
      type = "string"
    }
    columns {
      name = "parent_account_key"
      type = "string"
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
      name = "is_active"
      type = "boolean"
    }
    columns {
      name = "is_system"
      type = "boolean"
    }
    columns {
      name = "display_order"
      type = "int"
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
    columns {
      name = "cash_flow_section"
      type = "string"
    }
    columns {
      name = "is_gst_hst_collected"
      type = "boolean"
    }
    columns {
      name = "is_gst_hst_paid"
      type = "boolean"
    }
    columns {
      name = "is_pst_qst_collected"
      type = "boolean"
    }
    columns {
      name = "gifi_code"
      type = "string"
    }
    columns {
      name = "is_sred_eligible"
      type = "boolean"
    }
    columns {
      name = "is_apprentice_wage"
      type = "boolean"
    }
    columns {
      name = "is_digital_media_labour"
      type = "boolean"
    }
    columns {
      name = "is_clean_tech_asset"
      type = "boolean"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_contact - Customers & Vendors
resource "aws_glue_catalog_table" "dim_contact" {
  name          = "dim_contact"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_contact/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_contact"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
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
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "contact_type"
      type = "string"
      comment = "CUSTOMER, VENDOR, BOTH"
    }
    columns {
      name = "contact_name"
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
      name = "phone"
      type = "string"
    }
    columns {
      name = "address_city"
      type = "string"
    }
    columns {
      name = "address_province_state"
      type = "string"
    }
    columns {
      name = "address_country"
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
    columns {
      name = "payment_terms"
      type = "string"
    }
    columns {
      name = "tax_number"
      type = "string"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_item - Products & Services
resource "aws_glue_catalog_table" "dim_item" {
  name          = "dim_item"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_item/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_item"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "item_key"
      type = "string"
    }
    columns {
      name = "item_id"
      type = "string"
    }
    columns {
      name = "source_item_id"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "item_code"
      type = "string"
    }
    columns {
      name = "item_name"
      type = "string"
    }
    columns {
      name = "item_description"
      type = "string"
    }
    columns {
      name = "item_type"
      type = "string"
      comment = "INVENTORY, SERVICE, NON_INVENTORY"
    }
    columns {
      name = "category"
      type = "string"
    }
    columns {
      name = "income_account_key"
      type = "string"
    }
    columns {
      name = "expense_account_key"
      type = "string"
    }
    columns {
      name = "unit_price"
      type = "decimal(18,4)"
    }
    columns {
      name = "unit_cost"
      type = "decimal(18,4)"
    }
    columns {
      name = "is_active"
      type = "boolean"
    }
    columns {
      name = "is_taxable"
      type = "boolean"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_class - Departments/Tracking Categories
resource "aws_glue_catalog_table" "dim_class" {
  name          = "dim_class"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_class/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_class"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "class_key"
      type = "string"
    }
    columns {
      name = "class_id"
      type = "string"
    }
    columns {
      name = "source_class_id"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "class_name"
      type = "string"
    }
    columns {
      name = "class_code"
      type = "string"
    }
    columns {
      name = "parent_class_key"
      type = "string"
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
      name = "is_active"
      type = "boolean"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_location - Locations/Branches
resource "aws_glue_catalog_table" "dim_location" {
  name          = "dim_location"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_location/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_location"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "location_key"
      type = "string"
    }
    columns {
      name = "location_id"
      type = "string"
    }
    columns {
      name = "source_location_id"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "location_name"
      type = "string"
    }
    columns {
      name = "location_code"
      type = "string"
    }
    columns {
      name = "address_city"
      type = "string"
    }
    columns {
      name = "address_province_state"
      type = "string"
    }
    columns {
      name = "parent_location_key"
      type = "string"
    }
    columns {
      name = "is_active"
      type = "boolean"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
}

# dim_date - Shared Date Dimension
resource "aws_glue_catalog_table" "dim_date" {
  name          = "dim_date"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_date/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_date"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "date_key"
      type = "int"
      comment = "YYYYMMDD format"
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
      name = "month_name"
      type = "string"
    }
    columns {
      name = "month_name_fr"
      type = "string"
    }
    columns {
      name = "day_of_month"
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
      name = "week_of_year"
      type = "int"
    }
    columns {
      name = "is_weekend"
      type = "boolean"
    }
    columns {
      name = "is_month_end"
      type = "boolean"
    }
    columns {
      name = "is_quarter_end"
      type = "boolean"
    }
    columns {
      name = "is_year_end"
      type = "boolean"
    }
    columns {
      name = "is_ca_holiday"
      type = "boolean"
    }
    columns {
      name = "ca_holiday_name"
      type = "string"
    }
    columns {
      name = "fiscal_year"
      type = "int"
      comment = "Populated per-org during ETL"
    }
    columns {
      name = "fiscal_quarter"
      type = "int"
    }
    columns {
      name = "fiscal_month"
      type = "int"
    }
    columns {
      name = "fiscal_period_name"
      type = "string"
      comment = "P1, P2, ... P12"
    }
  }
}

# dim_account_type - Reference Lookup
resource "aws_glue_catalog_table" "dim_account_type" {
  name          = "dim_account_type"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_account_type/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_account_type"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "account_type_key"
      type = "string"
    }
    columns {
      name = "account_type_code"
      type = "string"
      comment = "ASSET, LIABILITY, etc."
    }
    columns {
      name = "account_type_name"
      type = "string"
    }
    columns {
      name = "account_type_name_fr"
      type = "string"
    }
    columns {
      name = "normal_balance"
      type = "string"
      comment = "DEBIT or CREDIT"
    }
    columns {
      name = "financial_statement"
      type = "string"
      comment = "BALANCE_SHEET or INCOME_STATEMENT"
    }
    columns {
      name = "cash_flow_category"
      type = "string"
      comment = "OPERATING, INVESTING, FINANCING"
    }
    columns {
      name = "display_order"
      type = "int"
    }
  }
}

# dim_transaction_type - Source Type Mapping
resource "aws_glue_catalog_table" "dim_transaction_type" {
  name          = "dim_transaction_type"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/dim_transaction_type/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "dim_transaction_type"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "transaction_type_key"
      type = "string"
    }
    columns {
      name = "transaction_type_code"
      type = "string"
      comment = "INVOICE, BILL, PAYMENT, JOURNAL, etc."
    }
    columns {
      name = "transaction_type_name"
      type = "string"
    }
    columns {
      name = "transaction_type_name_fr"
      type = "string"
    }
    columns {
      name = "source_system"
      type = "string"
      comment = "QUICKBOOKS, XERO, SAGE, CSV"
    }
    columns {
      name = "source_type"
      type = "string"
    }
    columns {
      name = "affects_ar"
      type = "boolean"
    }
    columns {
      name = "affects_ap"
      type = "boolean"
    }
    columns {
      name = "affects_cash"
      type = "boolean"
    }
  }
}

# ------------------------------------------------------------------------------
# Fact Tables
# ------------------------------------------------------------------------------

# fact_transactions - Transaction-level detail
resource "aws_glue_catalog_table" "fact_transactions" {
  name          = "fact_transactions"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/fact_transactions/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "fact_transactions"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
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
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "business_unit_key"
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
      name = "item_key"
      type = "string"
    }
    columns {
      name = "class_key"
      type = "string"
    }
    columns {
      name = "location_key"
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
      comment = "Signed: debit positive, credit negative"
    }
    columns {
      name = "currency_code"
      type = "string"
    }
    columns {
      name = "exchange_rate"
      type = "decimal(12,6)"
    }
    columns {
      name = "amount_cad"
      type = "decimal(18,2)"
      comment = "Normalized to CAD"
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
    columns {
      name = "created_at"
      type = "timestamp"
    }
    columns {
      name = "updated_at"
      type = "timestamp"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
  partition_keys {
    name = "fiscal_year"
    type = "int"
  }
}

# fact_account_balances - Period-end balances
resource "aws_glue_catalog_table" "fact_account_balances" {
  name          = "fact_account_balances"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/fact_account_balances/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "fact_account_balances"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "balance_key"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "business_unit_key"
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
      comment = "MTD, QTD, YTD, CUMULATIVE"
    }
    columns {
      name = "currency_code"
      type = "string"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
  partition_keys {
    name = "as_of_date"
    type = "date"
  }
}

# fact_monthly_summary - Pre-aggregated KPIs
resource "aws_glue_catalog_table" "fact_monthly_summary" {
  name          = "fact_monthly_summary"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/fact_monthly_summary/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "fact_monthly_summary"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "summary_key"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "business_unit_key"
      type = "string"
    }
    columns {
      name = "date_key"
      type = "int"
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
      name = "total_revenue"
      type = "decimal(18,2)"
    }
    columns {
      name = "total_expenses"
      type = "decimal(18,2)"
    }
    columns {
      name = "net_income"
      type = "decimal(18,2)"
    }
    columns {
      name = "total_assets"
      type = "decimal(18,2)"
    }
    columns {
      name = "total_liabilities"
      type = "decimal(18,2)"
    }
    columns {
      name = "total_equity"
      type = "decimal(18,2)"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
  partition_keys {
    name = "fiscal_year"
    type = "int"
  }
}

# fact_industry_kpis - Industry-specific metrics
resource "aws_glue_catalog_table" "fact_industry_kpis" {
  name          = "fact_industry_kpis"
  database_name = aws_glue_catalog_database.main.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "classification" = "parquet"
    "compressionType" = "snappy"
  }

  storage_descriptor {
    location      = "s3://${aws_s3_bucket.gold.id}/gold/fact_industry_kpis/"
    input_format  = "org.apache.hadoop.mapred.TextInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat"

    ser_de_info {
      name                  = "fact_industry_kpis"
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    columns {
      name = "kpi_key"
      type = "string"
    }
    columns {
      name = "organization_key"
      type = "string"
    }
    columns {
      name = "date_key"
      type = "int"
    }
    columns {
      name = "industry"
      type = "string"
    }
    # Restaurant KPIs
    columns {
      name = "food_cost_pct"
      type = "decimal(5,2)"
    }
    columns {
      name = "labor_cost_pct"
      type = "decimal(5,2)"
    }
    columns {
      name = "prime_cost_pct"
      type = "decimal(5,2)"
    }
    columns {
      name = "beverage_cost_pct"
      type = "decimal(5,2)"
    }
    columns {
      name = "average_check"
      type = "decimal(18,2)"
    }
    columns {
      name = "covers_per_day"
      type = "int"
    }
    # Hotel KPIs
    columns {
      name = "occupancy_rate"
      type = "decimal(5,2)"
    }
    columns {
      name = "adr"
      type = "decimal(18,2)"
      comment = "Average Daily Rate"
    }
    columns {
      name = "revpar"
      type = "decimal(18,2)"
      comment = "Revenue Per Available Room"
    }
    columns {
      name = "trevpar"
      type = "decimal(18,2)"
    }
    columns {
      name = "cpor"
      type = "decimal(18,2)"
    }
    # Retail KPIs
    columns {
      name = "inventory_turnover"
      type = "decimal(8,2)"
    }
    columns {
      name = "gmroi"
      type = "decimal(8,2)"
    }
    columns {
      name = "gross_margin_pct"
      type = "decimal(5,2)"
    }
    columns {
      name = "sales_per_sqft"
      type = "decimal(18,2)"
    }
    columns {
      name = "shrinkage_pct"
      type = "decimal(5,2)"
    }
    # Professional Services KPIs
    columns {
      name = "utilization_rate"
      type = "decimal(5,2)"
    }
    columns {
      name = "realization_rate"
      type = "decimal(5,2)"
    }
    columns {
      name = "effective_rate"
      type = "decimal(18,2)"
    }
    columns {
      name = "wip_days"
      type = "int"
    }
    columns {
      name = "ar_days"
      type = "int"
    }
    # Construction KPIs
    columns {
      name = "job_margin_pct"
      type = "decimal(5,2)"
    }
    columns {
      name = "wip_balance"
      type = "decimal(18,2)"
    }
    columns {
      name = "retention_balance"
      type = "decimal(18,2)"
    }
    columns {
      name = "backlog_value"
      type = "decimal(18,2)"
    }
    # Real Estate / Immobilier KPIs
    columns {
      name = "re_occupancy_rate"
      type = "decimal(5,2)"
      comment = "Real estate occupancy rate (occupied units / total units)"
    }
    columns {
      name = "re_cap_rate"
      type = "decimal(5,2)"
      comment = "Capitalization rate (NOI / property value)"
    }
    columns {
      name = "re_noi"
      type = "decimal(18,2)"
      comment = "Net Operating Income"
    }
    columns {
      name = "re_rent_per_sqft"
      type = "decimal(10,2)"
      comment = "Rent per square foot"
    }
    columns {
      name = "re_vacancy_rate"
      type = "decimal(5,2)"
      comment = "Vacancy rate percentage"
    }
    columns {
      name = "re_cash_on_cash"
      type = "decimal(5,2)"
      comment = "Cash-on-cash return (annual cash flow / total cash invested)"
    }
    columns {
      name = "re_expense_ratio"
      type = "decimal(5,2)"
      comment = "Operating expense ratio"
    }
  }

  partition_keys {
    name = "organization_id"
    type = "string"
  }
  partition_keys {
    name = "fiscal_year"
    type = "int"
  }
}
