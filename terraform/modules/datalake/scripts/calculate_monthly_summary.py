"""
Monthly Summary Calculator ETL Job

Aggregates Gold layer transaction data into fact_monthly_summary for
pre-computed financial metrics used in dashboards and reports.

Usage: AWS Glue Job with PySpark
"""

import sys
from datetime import datetime, date
from decimal import Decimal

from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql.functions import (
    col, sum as spark_sum, year, month, 
    when, lit, last_day, date_format
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DecimalType, 
    IntegerType, DateType
)

# Initialize Glue context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)

# Get job parameters
args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'gold_bucket',
    'database_name'
])

job.init(args['JOB_NAME'], args)

GOLD_BUCKET = args['gold_bucket']
DATABASE_NAME = args['database_name']


def main():
    """Main ETL job logic."""
    print(f"Starting Monthly Summary Calculator ETL Job")
    print(f"Gold Bucket: {GOLD_BUCKET}")
    
    # Read accounts
    try:
        accounts_df = spark.read.parquet(f"s3://{GOLD_BUCKET}/dim_account/")
        print(f"Loaded {accounts_df.count()} accounts")
    except:
        try:
            accounts_df = spark.read.json(f"s3://{GOLD_BUCKET}/dim_account/")
        except Exception as e:
            print(f"Error reading accounts: {e}")
            job.commit()
            return
    
    # Read transactions
    try:
        transactions_df = spark.read.parquet(f"s3://{GOLD_BUCKET}/fact_transaction/")
        print(f"Loaded {transactions_df.count()} transactions")
    except:
        try:
            transactions_df = spark.read.json(f"s3://{GOLD_BUCKET}/fact_transaction/")
        except Exception as e:
            print(f"Error reading transactions: {e}")
            job.commit()
            return
    
    # Join transactions with accounts to get account types
    txn_with_accounts = transactions_df.alias("t").join(
        accounts_df.alias("a"),
        col("t.account_key") == col("a.account_key"),
        "left"
    ).select(
        col("t.organization_key"),
        col("t.transaction_date"),
        col("t.debit_amount"),
        col("t.credit_amount"),
        col("t.amount"),
        col("a.account_type")
    )
    
    # Add year and month columns
    txn_with_period = txn_with_accounts.withColumn(
        "fiscal_year", year(col("transaction_date"))
    ).withColumn(
        "fiscal_period", month(col("transaction_date"))
    )
    
    # Calculate monthly summaries by organization
    monthly_summary = txn_with_period.groupBy(
        "organization_key",
        "fiscal_year",
        "fiscal_period"
    ).agg(
        # Revenue (typically credits to revenue accounts)
        spark_sum(
            when(col("account_type") == "REVENUE", col("credit_amount"))
            .otherwise(0)
        ).alias("total_revenue"),
        
        # Expenses (typically debits to expense accounts)
        spark_sum(
            when(col("account_type") == "EXPENSE", col("debit_amount"))
            .otherwise(0)
        ).alias("total_expenses"),
        
        # Assets
        spark_sum(
            when(col("account_type") == "ASSET", 
                 col("debit_amount") - col("credit_amount"))
            .otherwise(0)
        ).alias("total_assets"),
        
        # Liabilities
        spark_sum(
            when(col("account_type") == "LIABILITY",
                 col("credit_amount") - col("debit_amount"))
            .otherwise(0)
        ).alias("total_liabilities"),
        
        # Equity
        spark_sum(
            when(col("account_type") == "EQUITY",
                 col("credit_amount") - col("debit_amount"))
            .otherwise(0)
        ).alias("total_equity")
    )
    
    # Calculate net income
    monthly_summary = monthly_summary.withColumn(
        "net_income",
        col("total_revenue") - col("total_expenses")
    )
    
    # Add summary key and date key
    monthly_summary = monthly_summary.withColumn(
        "summary_key",
        date_format(
            lit(date.today().strftime("%Y-%m-%d")),
            "'summary_'yyyyMMdd"
        )
    ).withColumn(
        "date_key",
        (col("fiscal_year") * 10000 + col("fiscal_period") * 100 + 1).cast(IntegerType())
    )
    
    # Add business unit key (null for now)
    monthly_summary = monthly_summary.withColumn(
        "business_unit_key",
        lit(None).cast(StringType())
    )
    
    # Select final columns in correct order
    final_df = monthly_summary.select(
        "summary_key",
        "organization_key",
        "business_unit_key",
        "date_key",
        "fiscal_year",
        "fiscal_period",
        "total_revenue",
        "total_expenses",
        "net_income",
        "total_assets",
        "total_liabilities",
        "total_equity"
    )
    
    # Write to Gold layer
    output_path = f"s3://{GOLD_BUCKET}/fact_monthly_summary/"
    
    final_df.write \
        .mode("overwrite") \
        .partitionBy("organization_key", "fiscal_year") \
        .parquet(output_path)
    
    print(f"Wrote monthly summary to {output_path}")
    
    job.commit()
    print("Monthly Summary Calculator ETL Job completed successfully")


if __name__ == "__main__":
    main()
