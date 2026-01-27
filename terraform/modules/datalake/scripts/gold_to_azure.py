"""
Gold Layer to Azure Blob Delta Sync
Only transfers changed partitions since last sync
"""

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql import functions as F
from pyspark.sql.types import *
import boto3
from datetime import datetime, timedelta
import json

# Azure Blob Storage SDK
try:
    from azure.storage.blob import BlobServiceClient
except ImportError:
    print("Warning: azure-storage-blob not installed. Install with: pip install azure-storage-blob")
    BlobServiceClient = None

# Initialize
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)

args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'gold_database',
    'gold_bucket',
    'azure_storage_account',
    'azure_container',
    'sns_topic_arn'
])

job.init(args['JOB_NAME'], args)

# SNS client
sns = boto3.client('sns')

def send_alert(subject, message, severity='INFO'):
    """Send alert to SNS"""
    try:
        sns.publish(
            TopicArn=args['sns_topic_arn'],
            Subject=f"[{severity}] PlainLedger Azure Sync: {subject}",
            Message=json.dumps({
                'timestamp': datetime.utcnow().isoformat(),
                'job_name': args['JOB_NAME'],
                'severity': severity,
                'message': message
            }, default=str)
        )
    except Exception as e:
        print(f"Failed to send alert: {e}")

def get_last_sync_timestamp():
    """Get timestamp of last successful sync from S3 metadata"""
    s3 = boto3.client('s3')
    try:
        # Check for sync marker file
        response = s3.get_object(
            Bucket=args['gold_bucket'],
            Key='_sync/last_sync_timestamp.json'
        )
        data = json.loads(response['Body'].read())
        return datetime.fromisoformat(data['timestamp'])
    except:
        # First sync - go back 7 days
        return datetime.utcnow() - timedelta(days=7)

def save_sync_timestamp():
    """Save current sync timestamp"""
    s3 = boto3.client('s3')
    data = {
        'timestamp': datetime.utcnow().isoformat(),
        'job_name': args['JOB_NAME']
    }
    s3.put_object(
        Bucket=args['gold_bucket'],
        Key='_sync/last_sync_timestamp.json',
        Body=json.dumps(data)
    )

try:
    last_sync = get_last_sync_timestamp()
    print(f"Last sync: {last_sync}")
    
    # Read Gold layer tables
    print("Reading Gold layer data...")
    
    # Get changed partitions (updated since last sync)
    fact_transactions = glueContext.create_dynamic_frame.from_catalog(
        database=args['gold_database'],
        table_name="fact_transactions",
        push_down_predicate=f"updated_at >= '{last_sync.isoformat()}'"
    )
    
    fact_account_balances = glueContext.create_dynamic_frame.from_catalog(
        database=args['gold_database'],
        table_name="fact_account_balances",
        push_down_predicate=f"as_of_date >= '{last_sync.date().isoformat()}'"
    )
    
    # Convert to DataFrames
    transactions_df = fact_transactions.toDF()
    balances_df = fact_account_balances.toDF()
    
    record_count = transactions_df.count() + balances_df.count()
    
    if record_count == 0:
        print("No changes detected since last sync")
        send_alert("Delta Sync - No Changes", "No data changes since last sync", severity='INFO')
        job.commit()
        sys.exit(0)
    
    print(f"Found {record_count} changed records")
    
    # Write to Azure Blob Storage using Azure SDK
    # Note: This requires azure-storage-blob package in Glue environment
    # Alternative: Use Azure Data Factory or write via REST API
    
    # For now, we'll write to a staging location and use Azure CLI/Data Factory
    # to copy to Azure Blob
    
    # Write Parquet files to S3 staging for Azure transfer
    staging_path = f"s3://{args['gold_bucket']}/_azure_staging/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}/"
    
    glueContext.write_dynamic_frame.from_options(
        frame=fact_transactions,
        connection_type="s3",
        format="parquet",
        connection_options={
            "path": f"{staging_path}fact_transactions/",
            "partitionKeys": ["organization_id", "fiscal_year"]
        },
        format_options={
            "compression": "snappy"
        }
    )
    
    glueContext.write_dynamic_frame.from_options(
        frame=fact_account_balances,
        connection_type="s3",
        format="parquet",
        connection_options={
            "path": f"{staging_path}fact_account_balances/",
            "partitionKeys": ["organization_id", "as_of_date"]
        },
        format_options={
            "compression": "snappy"
        }
    )
    
    save_sync_timestamp()
    
    send_alert(
        "Delta Sync Completed",
        f"Synced {record_count} records to Azure staging. Manual transfer to Azure Blob required.",
        severity='INFO'
    )
    
    print(f"Successfully staged {record_count} records for Azure transfer")

except Exception as e:
    error_msg = f"Azure sync failed: {str(e)}"
    print(error_msg)
    send_alert("Azure Sync Failed", error_msg, severity='CRITICAL')
    raise

finally:
    job.commit()
