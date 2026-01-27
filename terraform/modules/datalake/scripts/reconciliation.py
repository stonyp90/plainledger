"""
Daily Reconciliation Job
Verifies data integrity across Bronze/Silver/Gold layers
"""

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.context import SparkContext
from pyspark.sql import functions as F
import boto3
import json
from datetime import datetime

# Initialize
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)

args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'source_database',
    'gold_database',
    'sns_topic_arn'
])

job.init(args['JOB_NAME'], args)

# SNS client
sns = boto3.client('sns')

def send_alert(subject, message, severity='WARNING'):
    """Send alert to SNS"""
    try:
        sns.publish(
            TopicArn=args['sns_topic_arn'],
            Subject=f"[{severity}] PlainLedger Reconciliation: {subject}",
            Message=json.dumps({
                'timestamp': datetime.utcnow().isoformat(),
                'job_name': args['JOB_NAME'],
                'severity': severity,
                'message': message
            }, default=str)
        )
    except Exception as e:
        print(f"Failed to send alert: {e}")

def reconcile_layers(org_id, date):
    """Compare record counts and totals across layers"""
    
    checks = []
    
    # 1. Record count consistency
    bronze_count = spark.sql(f"""
        SELECT COUNT(*) as cnt FROM {args['source_database']}.bronze_transactions 
        WHERE organization_id = '{org_id}' 
        AND DATE(ingested_at) = '{date}'
    """).collect()[0]['cnt']
    
    silver_count = spark.sql(f"""
        SELECT COUNT(*) as cnt FROM {args['source_database']}.silver_transactions 
        WHERE organization_id = '{org_id}' 
        AND DATE(processed_at) = '{date}'
    """).collect()[0]['cnt']
    
    gold_count = spark.sql(f"""
        SELECT COUNT(*) as cnt FROM {args['gold_database']}.fact_transactions 
        WHERE organization_id = '{org_id}' 
        AND DATE(created_at) = '{date}'
    """).collect()[0]['cnt']
    
    # Allow 5% tolerance for filtered/quarantined records
    if silver_count < bronze_count * 0.95:
        checks.append({
            'check': 'bronze_to_silver_count',
            'status': 'FAILED',
            'message': f'Silver ({silver_count}) is {100 - (silver_count/bronze_count*100):.1f}% less than Bronze ({bronze_count})'
        })
    
    if gold_count < silver_count * 0.95:
        checks.append({
            'check': 'silver_to_gold_count',
            'status': 'FAILED',
            'message': f'Gold ({gold_count}) is {100 - (gold_count/silver_count*100):.1f}% less than Silver ({silver_count})'
        })
    
    # 2. Financial totals match
    silver_total = spark.sql(f"""
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM {args['source_database']}.silver_transactions 
        WHERE organization_id = '{org_id}'
    """).collect()[0]['total']
    
    gold_total = spark.sql(f"""
        SELECT COALESCE(SUM(debit_amount) - SUM(credit_amount), 0) as total 
        FROM {args['gold_database']}.fact_transactions 
        WHERE organization_id = '{org_id}'
    """).collect()[0]['total']
    
    if abs(float(silver_total) - float(gold_total)) > 0.01:
        checks.append({
            'check': 'silver_gold_total_match',
            'status': 'FAILED',
            'message': f'Total mismatch: Silver={silver_total}, Gold={gold_total}, Diff={abs(float(silver_total) - float(gold_total))}'
        })
    
    # 3. Balance sheet balances (Assets = Liabilities + Equity)
    balance_check = spark.sql(f"""
        SELECT 
            COALESCE(SUM(CASE WHEN d.account_type = 'ASSET' THEN f.closing_balance ELSE 0 END), 0) as assets,
            COALESCE(SUM(CASE WHEN d.account_type IN ('LIABILITY', 'EQUITY') THEN f.closing_balance ELSE 0 END), 0) as liab_equity
        FROM {args['gold_database']}.fact_account_balances f
        INNER JOIN {args['gold_database']}.dim_account d ON f.account_key = d.account_key
        WHERE f.organization_id = '{org_id}'
        AND f.balance_type = 'CUMULATIVE'
        AND f.as_of_date = (SELECT MAX(as_of_date) FROM {args['gold_database']}.fact_account_balances WHERE organization_id = '{org_id}')
    """).collect()[0]
    
    assets = float(balance_check['assets'] or 0)
    liab_equity = float(balance_check['liab_equity'] or 0)
    
    if abs(assets - liab_equity) > 0.01:
        checks.append({
            'check': 'balance_sheet_equation',
            'status': 'FAILED',
            'message': f'Balance sheet does not balance: Assets={assets}, L+E={liab_equity}, Diff={abs(assets - liab_equity)}'
        })
    
    return checks

try:
    # Get all organizations
    orgs = spark.sql(f"""
        SELECT DISTINCT organization_id 
        FROM {args['source_database']}.silver_transactions
    """).collect()
    
    today = datetime.now().strftime('%Y-%m-%d')
    all_checks = []
    
    for org_row in orgs:
        org_id = org_row['organization_id']
        print(f"Reconciling organization: {org_id}")
        
        checks = reconcile_layers(org_id, today)
        all_checks.extend(checks)
        
        if checks:
            for check in checks:
                print(f"  {check['check']}: {check['status']} - {check['message']}")
                if check['status'] == 'FAILED':
                    send_alert(
                        f"Reconciliation Failed: {check['check']}",
                        f"Org: {org_id}\n{check['message']}",
                        severity='WARNING'
                    )
    
    if not all_checks:
        print("All reconciliation checks passed")
        send_alert(
            "Reconciliation Completed Successfully",
            f"All checks passed for {len(orgs)} organizations",
            severity='INFO'
        )
    else:
        failed_count = len([c for c in all_checks if c['status'] == 'FAILED'])
        print(f"Reconciliation completed with {failed_count} failures")

except Exception as e:
    error_msg = f"Reconciliation job failed: {str(e)}"
    print(error_msg)
    send_alert("Reconciliation Job Failed", error_msg, severity='CRITICAL')
    raise

finally:
    job.commit()
