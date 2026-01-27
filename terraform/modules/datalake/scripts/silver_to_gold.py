"""
Silver to Gold Layer ETL Transformation
Transforms cleaned Silver layer data into Power BI optimized star schema
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
from pyspark.sql.window import Window
import boto3
import json
from datetime import datetime, timedelta
from decimal import Decimal

# Import provider mappings
sys.path.append('/tmp')
from provider_mappings import (
    map_quickbooks_account_type,
    map_xero_account_type,
    generate_account_code,
    get_default_dimension_key,
    is_debit_normal,
    get_balance_sheet_section,
    get_income_statement_section,
    get_cash_flow_category,
    DEFAULT_DIMENSION_KEYS
)

# Initialize
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)

args = getResolvedOptions(sys.argv, [
    'JOB_NAME',
    'organization_id',
    'source_database',
    'target_database',
    'gold_bucket',
    'sns_topic_arn'
])

job.init(args['JOB_NAME'], args)

# SNS client for alerts
sns = boto3.client('sns')

def send_alert(subject, message, severity='INFO'):
    """Send alert to SNS topic"""
    try:
        sns.publish(
            TopicArn=args['sns_topic_arn'],
            Subject=f"[{severity}] PlainLedger ETL: {subject}",
            Message=json.dumps({
                'timestamp': datetime.utcnow().isoformat(),
                'job_name': args['JOB_NAME'],
                'organization_id': args['organization_id'],
                'severity': severity,
                'message': message
            }, default=str)
        )
    except Exception as e:
        print(f"Failed to send alert: {e}")

def create_date_dimension(start_date='1990-01-01', end_date='2050-12-31'):
    """Create shared date dimension table"""
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')
    
    dates = []
    current = start
    while current <= end:
        year = current.year
        quarter = (current.month - 1) // 3 + 1
        month = current.month
        day = current.day
        day_of_week = current.weekday() + 1  # Monday = 1
        week_of_year = current.isocalendar()[1]
        
        dates.append({
            'date_key': int(current.strftime('%Y%m%d')),
            'full_date': current.date(),
            'year': year,
            'quarter': quarter,
            'month': month,
            'month_name': current.strftime('%B'),
            'month_name_fr': current.strftime('%B'),  # TODO: Translate
            'day_of_month': day,
            'day_of_week': day_of_week,
            'day_name': current.strftime('%A'),
            'week_of_year': week_of_year,
            'is_weekend': day_of_week in [6, 7],
            'is_month_end': (current + timedelta(days=1)).month != month,
            'is_quarter_end': quarter != ((current + timedelta(days=1)).month - 1) // 3 + 1,
            'is_year_end': current.month == 12 and current.day == 31,
            'is_ca_holiday': False,  # TODO: Add Canadian holidays
            'ca_holiday_name': None,
            'fiscal_year': None,  # Populated per-org
            'fiscal_quarter': None,
            'fiscal_month': None,
            'fiscal_period_name': None,
        })
        current += timedelta(days=1)
    
    return spark.createDataFrame(dates)

def create_default_dimension_rows(org_key):
    """Create default rows for dimensions to handle NULLs"""
    defaults = {
        'dim_contact': [{
            'contact_key': DEFAULT_DIMENSION_KEYS['contact'],
            'contact_id': DEFAULT_DIMENSION_KEYS['contact'],
            'source_contact_id': None,
            'organization_key': org_key,
            'contact_type': 'UNKNOWN',
            'contact_name': 'Unknown Contact',
            'display_name': 'Unknown Contact',
            'company_name': None,
            'email': None,
            'phone': None,
            'address_city': None,
            'address_province_state': None,
            'address_country': None,
            'is_customer': False,
            'is_vendor': False,
            'is_active': True,
            'payment_terms': None,
            'tax_number': None,
        }],
        'dim_item': [{
            'item_key': DEFAULT_DIMENSION_KEYS['item'],
            'item_id': DEFAULT_DIMENSION_KEYS['item'],
            'source_item_id': None,
            'organization_key': org_key,
            'item_code': 'NO_ITEM',
            'item_name': 'No Item',
            'item_description': None,
            'item_type': 'NON_INVENTORY',
            'category': None,
            'income_account_key': None,
            'expense_account_key': None,
            'unit_price': None,
            'unit_cost': None,
            'is_active': True,
            'is_taxable': False,
        }],
        'dim_class': [{
            'class_key': DEFAULT_DIMENSION_KEYS['class'],
            'class_id': DEFAULT_DIMENSION_KEYS['class'],
            'source_class_id': None,
            'organization_key': org_key,
            'class_name': 'Unclassified',
            'class_code': 'UNCLASSIFIED',
            'parent_class_key': None,
            'hierarchy_level': 0,
            'hierarchy_path': '/Unclassified',
            'is_active': True,
        }],
        'dim_location': [{
            'location_key': DEFAULT_DIMENSION_KEYS['location'],
            'location_id': DEFAULT_DIMENSION_KEYS['location'],
            'source_location_id': None,
            'organization_key': org_key,
            'location_name': 'No Location',
            'location_code': 'NO_LOCATION',
            'address_city': None,
            'address_province_state': None,
            'parent_location_key': None,
            'is_active': True,
        }],
    }
    return defaults

try:
    org_id = args['organization_id']
    
    # Read Silver layer data
    print(f"Reading Silver layer data for organization: {org_id}")
    silver_transactions = glueContext.create_dynamic_frame.from_catalog(
        database=args['source_database'],
        table_name="transactions",
        push_down_predicate=f"organization_id='{org_id}'"
    )
    
    silver_accounts = glueContext.create_dynamic_frame.from_catalog(
        database=args['source_database'],
        table_name="accounts",
        push_down_predicate=f"organization_id='{org_id}'"
    )
    
    silver_contacts = glueContext.create_dynamic_frame.from_catalog(
        database=args['source_database'],
        table_name="contacts",
        push_down_predicate=f"organization_id='{org_id}'"
    )
    
    # Convert to Spark DataFrames
    transactions_df = silver_transactions.toDF()
    accounts_df = silver_accounts.toDF()
    contacts_df = silver_contacts.toDF()
    
    if transactions_df.count() == 0:
        print(f"No transactions found for organization {org_id}")
        send_alert("No Data", f"No transactions found for org {org_id}", severity='WARNING')
        job.commit()
        sys.exit(0)
    
    # Get organization info (from accounts or transactions)
    org_info = transactions_df.select('organization_id', 'organization_name', 'fiscal_year_end_month', 'currency').first()
    org_key = f"org_{org_id}"
    fiscal_year_end_month = org_info.fiscal_year_end_month if org_info.fiscal_year_end_month else 12
    
    # Create date dimension (if not exists, append only)
    date_dim = create_date_dimension()
    
    # Transform accounts to dim_account
    print("Transforming accounts to dim_account...")
    
    def transform_account(row):
        """Transform account row with provider mappings"""
        source_type = row.get('source_account_type', '')
        source_subtype = row.get('source_account_subtype', '')
        source_system = row.get('source_system', '').upper()
        
        # Map to standard account type
        if source_system == 'QUICKBOOKS':
            account_type = map_quickbooks_account_type(source_type, source_subtype)
        elif source_system == 'XERO':
            account_type = map_xero_account_type(source_type, source_subtype)
        else:
            account_type = 'EXPENSE'  # Default
        
        # Generate account code if missing
        account_code = row.get('account_code')
        if not account_code or account_code == '':
            account_code = generate_account_code(row.get('account_id', ''), account_type)
        
        return {
            'account_key': f"acc_{row.get('account_id', '')}",
            'account_id': row.get('account_id', ''),
            'source_account_id': row.get('source_account_id', ''),
            'organization_key': org_key,
            'account_code': account_code,
            'account_name': row.get('account_name', ''),
            'account_name_fr': row.get('account_name_fr', ''),
            'account_type_key': account_type.lower(),
            'account_type': account_type,
            'account_subtype': source_subtype or '',
            'source_account_type': source_type,
            'source_account_subtype': source_subtype,
            'parent_account_key': f"acc_{row.get('parent_account_id', '')}" if row.get('parent_account_id') else None,
            'hierarchy_level': row.get('hierarchy_level', 0),
            'hierarchy_path': row.get('hierarchy_path', ''),
            'is_active': row.get('is_active', True),
            'is_system': row.get('is_system', False),
            'display_order': row.get('display_order', 0),
            'is_debit_normal': is_debit_normal(account_type),
            'balance_sheet_section': get_balance_sheet_section(account_type, source_subtype),
            'income_statement_section': get_income_statement_section(account_type, source_subtype),
            'cash_flow_section': get_cash_flow_category(account_type),
            'is_gst_hst_collected': False,  # TODO: Detect from account name/type
            'is_gst_hst_paid': False,
            'is_pst_qst_collected': False,
            'gifi_code': None,
            'is_sred_eligible': False,
            'is_apprentice_wage': False,
            'is_digital_media_labour': False,
            'is_clean_tech_asset': False,
        }
    
    # Transform accounts
    dim_account_rows = accounts_df.rdd.map(transform_account).collect()
    dim_account_df = spark.createDataFrame(dim_account_rows)
    
    # Add default dimension rows
    defaults = create_default_dimension_rows(org_key)
    dim_contact_default = spark.createDataFrame(defaults['dim_contact'])
    dim_item_default = spark.createDataFrame(defaults['dim_item'])
    dim_class_default = spark.createDataFrame(defaults['dim_class'])
    dim_location_default = spark.createDataFrame(defaults['dim_location'])
    
    # Transform contacts
    print("Transforming contacts to dim_contact...")
    if contacts_df.count() > 0:
        dim_contact_df = contacts_df.select(
            F.concat(F.lit('cont_'), F.col('contact_id')).alias('contact_key'),
            F.col('contact_id'),
            F.col('source_contact_id'),
            F.lit(org_key).alias('organization_key'),
            F.col('contact_type'),
            F.col('contact_name'),
            F.col('display_name'),
            F.col('company_name'),
            F.col('email'),
            F.col('phone'),
            F.col('address_city'),
            F.col('address_province_state'),
            F.col('address_country'),
            F.col('is_customer'),
            F.col('is_vendor'),
            F.col('is_active'),
            F.col('payment_terms'),
            F.col('tax_number'),
        )
        dim_contact_df = dim_contact_df.union(dim_contact_default)
    else:
        dim_contact_df = dim_contact_default
    
    # Transform transactions to fact_transactions
    print("Transforming transactions to fact_transactions...")
    
    fact_transactions_df = transactions_df.select(
        F.concat(F.lit('txn_'), F.col('transaction_id')).alias('transaction_key'),
        F.col('transaction_id'),
        F.lit(org_key).alias('organization_key'),
        F.when(F.col('business_unit_id').isNotNull(), 
               F.concat(F.lit('bu_'), F.col('business_unit_id')))
         .otherwise(F.lit(DEFAULT_DIMENSION_KEYS['business_unit'])).alias('business_unit_key'),
        F.when(F.col('account_id').isNotNull(),
               F.concat(F.lit('acc_'), F.col('account_id')))
         .otherwise(None).alias('account_key'),
        F.date_format(F.col('transaction_date'), 'yyyyMMdd').cast('int').alias('date_key'),
        F.when(F.col('contact_id').isNotNull(),
               F.concat(F.lit('cont_'), F.col('contact_id')))
         .otherwise(F.lit(DEFAULT_DIMENSION_KEYS['contact'])).alias('contact_key'),
        F.when(F.col('item_id').isNotNull(),
               F.concat(F.lit('item_'), F.col('item_id')))
         .otherwise(F.lit(DEFAULT_DIMENSION_KEYS['item'])).alias('item_key'),
        F.when(F.col('class_id').isNotNull(),
               F.concat(F.lit('class_'), F.col('class_id')))
         .otherwise(F.lit(DEFAULT_DIMENSION_KEYS['class'])).alias('class_key'),
        F.when(F.col('location_id').isNotNull(),
               F.concat(F.lit('loc_'), F.col('location_id')))
         .otherwise(F.lit(DEFAULT_DIMENSION_KEYS['location'])).alias('location_key'),
        F.lower(F.col('transaction_type')).alias('transaction_type_key'),
        F.col('transaction_date'),
        F.col('posting_date'),
        F.col('debit_amount'),
        F.col('credit_amount'),
        (F.col('debit_amount') - F.col('credit_amount')).alias('amount'),
        F.col('currency_code'),
        F.col('exchange_rate'),
        (F.col('amount') * F.coalesce(F.col('exchange_rate'), F.lit(1.0))).alias('amount_cad'),
        F.col('reference_number'),
        F.col('memo'),
        F.col('source_system'),
        F.col('source_transaction_id'),
        F.col('created_at'),
        F.col('updated_at'),
    )
    
    # Calculate fiscal year for partitioning
    fact_transactions_df = fact_transactions_df.withColumn(
        'fiscal_year',
        F.when(F.month('transaction_date') > fiscal_year_end_month,
               F.year('transaction_date') + 1)
         .otherwise(F.year('transaction_date'))
    )
    
    # Write Gold layer tables
    print("Writing Gold layer tables...")
    
    gold_path = f"s3://{args['gold_bucket']}/gold"
    
    # Write dimensions
    glueContext.write_dynamic_frame.from_options(
        frame=DynamicFrame.fromDF(dim_account_df, glueContext, "dim_account"),
        connection_type="s3",
        format="parquet",
        connection_options={
            "path": f"{gold_path}/dim_account/org={org_id}/",
            "partitionKeys": ["organization_id"]
        },
        format_options={
            "compression": "snappy"
        }
    )
    
    glueContext.write_dynamic_frame.from_options(
        frame=DynamicFrame.fromDF(dim_contact_df, glueContext, "dim_contact"),
        connection_type="s3",
        format="parquet",
        connection_options={
            "path": f"{gold_path}/dim_contact/org={org_id}/",
            "partitionKeys": ["organization_id"]
        },
        format_options={
            "compression": "snappy"
        }
    )
    
    # Write fact table
    glueContext.write_dynamic_frame.from_options(
        frame=DynamicFrame.fromDF(fact_transactions_df, glueContext, "fact_transactions"),
        connection_type="s3",
        format="parquet",
        connection_options={
            "path": f"{gold_path}/fact_transactions/org={org_id}/",
            "partitionKeys": ["organization_id", "fiscal_year"]
        },
        format_options={
            "compression": "snappy"
        }
    )
    
    record_count = fact_transactions_df.count()
    send_alert(
        "ETL Job Completed Successfully",
        f"Processed {record_count} transactions for org {org_id}",
        severity='INFO'
    )
    
    print(f"Successfully processed {record_count} transactions")

except Exception as e:
    error_msg = f"Error: {str(e)}\nStack trace: {sys.exc_info()[2]}"
    print(error_msg)
    send_alert(
        "ETL Job Failed",
        error_msg,
        severity='CRITICAL'
    )
    raise

finally:
    job.commit()
