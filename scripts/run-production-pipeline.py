#!/usr/bin/env python3
"""
Run Production Pipeline Locally

This script runs the same pipeline that runs in production (via GitHub Actions/AWS Glue)
but uses LocalStack for local testing.

Pipeline: QuickBooks API → Bronze (S3) → Silver (S3) → Gold (S3)

Usage:
    python scripts/run-production-pipeline.py \
        --refresh-token=RT1-xxx \
        --realm-id=9341456072863003 \
        --organization-id=demo-org

Environment variables required:
    QUICKBOOKS_CLIENT_ID
    QUICKBOOKS_CLIENT_SECRET
"""

import os
import sys
import json
import asyncio
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

import boto3
from botocore.config import Config

# Add pipelines to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'pipelines'))

from extractors.quickbooks.extractor import QuickBooksExtractor
from extractors.base_extractor import OAuthTokens, EntityType

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://localhost:4566")
S3_REGION = os.getenv("S3_REGION", "us-east-1")
BRONZE_BUCKET = os.getenv("S3_BUCKET_BRONZE", "plainledger-bronze")
SILVER_BUCKET = os.getenv("S3_BUCKET_SILVER", "plainledger-silver")
GOLD_BUCKET = os.getenv("S3_BUCKET_GOLD", "plainledger-gold")
QUARANTINE_BUCKET = os.getenv("S3_BUCKET_QUARANTINE", "plainledger-quarantine")


def get_s3_client():
    """Get S3 client configured for LocalStack"""
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        region_name=S3_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "test"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "test"),
        config=Config(s3={"addressing_style": "path"}),
    )


def ensure_buckets(s3_client):
    """Ensure all required S3 buckets exist"""
    buckets = [BRONZE_BUCKET, SILVER_BUCKET, GOLD_BUCKET, QUARANTINE_BUCKET]
    
    for bucket in buckets:
        try:
            s3_client.head_bucket(Bucket=bucket)
            logger.info(f"✅ Bucket {bucket} exists")
        except:
            try:
                s3_client.create_bucket(Bucket=bucket)
                logger.info(f"📦 Created bucket {bucket}")
            except Exception as e:
                if "BucketAlreadyOwnedByYou" not in str(e):
                    logger.warning(f"Could not create bucket {bucket}: {e}")


def write_to_bronze(
    s3_client,
    provider: str,
    entity_type: str,
    organization_id: str,
    records: List[Dict[str, Any]],
):
    """Write records to Bronze layer (production format)"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    key = f"{provider}/{entity_type}/{organization_id}/{timestamp}.json"
    
    # Production format: wrap records with metadata
    bronze_record = {
        "extraction_timestamp": datetime.utcnow().isoformat(),
        "source_system": provider.upper(),
        "entity_type": entity_type,
        "organization_id": organization_id,
        "record_count": len(records),
        "records": records,
    }
    
    body = json.dumps(bronze_record, indent=2, default=str)
    
    s3_client.put_object(
        Bucket=BRONZE_BUCKET,
        Key=key,
        Body=body,
        ContentType="application/json",
    )
    
    logger.info(f"📥 Bronze: Wrote {len(records)} {entity_type} records to {key}")
    return key


async def extract_quickbooks_data(
    refresh_token: str,
    realm_id: str,
    organization_id: str,
    s3_client,
) -> Dict[str, int]:
    """
    Step 1: Extract data from QuickBooks and write to Bronze layer
    
    This mirrors what the API service does in production via ETLPipelineService
    """
    logger.info("=" * 60)
    logger.info("STEP 1: QUICKBOOKS EXTRACTION → BRONZE")
    logger.info("=" * 60)
    
    # Create OAuth tokens
    tokens = OAuthTokens(
        access_token="",  # Will be refreshed
        refresh_token=refresh_token,
        expires_at=datetime.utcnow(),  # Force refresh
        token_type="Bearer",
    )
    
    # Initialize extractor
    extractor = QuickBooksExtractor(
        organization_id=organization_id,
        tokens=tokens,
        realm_id=realm_id,
    )
    
    # Entity types to extract (production list)
    entities_to_extract = [
        EntityType.ACCOUNT,
        EntityType.CONTACT,
        EntityType.INVOICE,
        EntityType.BILL,
    ]
    
    extraction_stats = {}
    
    for entity_type in entities_to_extract:
        logger.info(f"  📤 Extracting {entity_type.value}...")
        
        all_records = []
        try:
            async for result in extractor.extract_entity(entity_type):
                all_records.extend(result.records)
        except Exception as e:
            logger.error(f"  ❌ Failed to extract {entity_type.value}: {e}")
            continue
        
        if all_records:
            write_to_bronze(
                s3_client,
                "quickbooks",
                entity_type.value.lower(),
                organization_id,
                all_records,
            )
            extraction_stats[entity_type.value] = len(all_records)
        else:
            logger.info(f"  ⚠️ No {entity_type.value} records found")
            extraction_stats[entity_type.value] = 0
    
    logger.info(f"  📊 Extraction complete: {extraction_stats}")
    return extraction_stats


def run_bronze_to_silver(organization_id: str, s3_client) -> Dict[str, Any]:
    """
    Step 2: Transform Bronze → Silver
    
    Simplified version of the AWS Glue job for local testing.
    Production job: pipelines/orchestration/glue_jobs/bronze_to_silver.py
    """
    logger.info("=" * 60)
    logger.info("STEP 2: BRONZE → SILVER TRANSFORMATION")
    logger.info("=" * 60)
    
    stats = {
        "records_read": 0,
        "records_written": 0,
        "records_quarantined": 0,
    }
    
    # List Bronze files
    try:
        response = s3_client.list_objects_v2(Bucket=BRONZE_BUCKET, Prefix="")
        bronze_files = [obj["Key"] for obj in response.get("Contents", [])]
    except Exception as e:
        logger.error(f"Failed to list Bronze bucket: {e}")
        return {"success": False, "stats": stats}
    
    if not bronze_files:
        logger.warning("No Bronze files found")
        return {"success": True, "stats": stats}
    
    logger.info(f"  Found {len(bronze_files)} Bronze files")
    
    # Process each Bronze file
    for file_key in bronze_files:
        try:
            # Read Bronze file
            response = s3_client.get_object(Bucket=BRONZE_BUCKET, Key=file_key)
            content = response["Body"].read().decode("utf-8")
            bronze_data = json.loads(content)
            
            # Extract records from Bronze format
            records = bronze_data.get("records", [bronze_data])
            if not isinstance(records, list):
                records = [records]
            
            stats["records_read"] += len(records)
            
            # Extract entity type from path
            parts = file_key.split("/")
            entity_type = parts[1] if len(parts) > 1 else "unknown"
            
            # Normalize records (simplified - just pass through with metadata)
            normalized_records = []
            for record in records:
                normalized = {
                    **record,
                    "_source_file": file_key,
                    "_normalized_at": datetime.utcnow().isoformat(),
                    "_organization_id": organization_id,
                }
                normalized_records.append(normalized)
            
            # Write to Silver
            if normalized_records:
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                silver_key = f"{entity_type}/{organization_id}/{timestamp}.json"
                
                s3_client.put_object(
                    Bucket=SILVER_BUCKET,
                    Key=silver_key,
                    Body=json.dumps(normalized_records, indent=2, default=str),
                    ContentType="application/json",
                )
                
                stats["records_written"] += len(normalized_records)
                logger.info(f"  ✅ Silver: {len(normalized_records)} records → {silver_key}")
                
        except Exception as e:
            logger.error(f"  ❌ Failed to process {file_key}: {e}")
            stats["records_quarantined"] += 1
    
    return {"success": True, "stats": stats}


def run_silver_to_gold(organization_id: str, s3_client) -> Dict[str, Any]:
    """
    Step 3: Transform Silver → Gold
    
    Simplified version of the Glue job for local testing.
    In production, this runs via: terraform/modules/datalake/scripts/silver_to_gold.py
    """
    logger.info("=" * 60)
    logger.info("STEP 3: SILVER → GOLD TRANSFORMATION")
    logger.info("=" * 60)
    
    stats = {
        "accounts": 0,
        "contacts": 0,
        "transactions": 0,
        "monthly_trends": 0,
    }
    
    # List Silver files
    try:
        response = s3_client.list_objects_v2(Bucket=SILVER_BUCKET, Prefix="")
        silver_files = [obj["Key"] for obj in response.get("Contents", [])]
    except Exception as e:
        logger.error(f"Failed to list Silver bucket: {e}")
        return stats
    
    if not silver_files:
        logger.warning("No Silver files found")
        return stats
    
    # Process each entity type
    all_accounts = []
    all_contacts = []
    all_transactions = []
    
    for file_key in silver_files:
        try:
            response = s3_client.get_object(Bucket=SILVER_BUCKET, Key=file_key)
            content = response["Body"].read().decode("utf-8")
            records = json.loads(content)
            
            if "account" in file_key.lower():
                all_accounts.extend(records if isinstance(records, list) else [records])
            elif "contact" in file_key.lower() or "customer" in file_key.lower():
                all_contacts.extend(records if isinstance(records, list) else [records])
            elif "invoice" in file_key.lower() or "bill" in file_key.lower():
                all_transactions.extend(records if isinstance(records, list) else [records])
                
        except Exception as e:
            logger.warning(f"Failed to process {file_key}: {e}")
    
    # Transform to Gold format (star schema)
    
    # dim_account
    dim_accounts = []
    for idx, acc in enumerate(all_accounts):
        dim_accounts.append({
            "account_key": f"acc_{acc.get('id', idx)}",
            "account_id": acc.get("id", str(idx)),
            "source_account_id": acc.get("source_id", acc.get("Id", "")),
            "organization_key": organization_id,
            "account_code": str(1000 + idx * 10),
            "account_name": acc.get("name", acc.get("Name", f"Account {idx}")),
            "account_type": acc.get("account_type", acc.get("AccountType", "OTHER")).upper(),
            "account_subtype": acc.get("account_subtype", acc.get("AccountSubType", "")),
            "is_active": acc.get("is_active", acc.get("Active", True)),
            "current_balance": acc.get("current_balance", acc.get("CurrentBalance", 0)),
        })
    stats["accounts"] = len(dim_accounts)
    
    # dim_contact
    dim_contacts = []
    for idx, contact in enumerate(all_contacts):
        dim_contacts.append({
            "contact_key": f"cont_{contact.get('id', idx)}",
            "contact_id": contact.get("id", str(idx)),
            "organization_key": organization_id,
            "contact_name": contact.get("name", contact.get("DisplayName", f"Contact {idx}")),
            "company_name": contact.get("company_name", contact.get("CompanyName", "")),
            "email": contact.get("email", ""),
            "is_active": contact.get("is_active", True),
        })
    stats["contacts"] = len(dim_contacts)
    
    # fact_transactions + agg_monthly_financials
    monthly_totals = {}
    fact_transactions = []
    
    for idx, txn in enumerate(all_transactions):
        # Determine transaction type and amount
        txn_date = txn.get("transaction_date", txn.get("TxnDate", datetime.utcnow().strftime("%Y-%m-%d")))
        amount = float(txn.get("amount", txn.get("TotalAmt", 0)))
        txn_type = "invoice" if "invoice" in str(txn).lower() or txn.get("CustomerRef") else "bill"
        
        fact_transactions.append({
            "transaction_key": f"txn_{idx}",
            "transaction_id": txn.get("id", txn.get("Id", str(idx))),
            "organization_key": organization_id,
            "transaction_date": txn_date,
            "transaction_type": txn_type,
            "amount": amount,
            "description": txn.get("description", txn.get("DocNumber", "")),
        })
        
        # Aggregate monthly
        month = txn_date[:7] if len(txn_date) >= 7 else txn_date
        if month not in monthly_totals:
            monthly_totals[month] = {"revenue": 0, "expenses": 0}
        
        if txn_type == "invoice":
            monthly_totals[month]["revenue"] += amount
        else:
            monthly_totals[month]["expenses"] += amount
    
    stats["transactions"] = len(fact_transactions)
    
    # agg_monthly_financials
    monthly_trends = []
    for month, totals in sorted(monthly_totals.items()):
        monthly_trends.append({
            "period": month,
            "revenue": totals["revenue"],
            "expenses": totals["expenses"],
            "net_income": totals["revenue"] - totals["expenses"],
        })
    stats["monthly_trends"] = len(monthly_trends)
    
    # agg_dashboard_summary
    summary = {
        "organization_key": organization_id,
        "as_of_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "total_accounts": len(dim_accounts),
        "total_contacts": len(dim_contacts),
        "total_transactions": len(fact_transactions),
        "total_revenue": sum(t.get("revenue", 0) for t in monthly_trends),
        "total_expenses": sum(t.get("expenses", 0) for t in monthly_trends),
    }
    
    # Write Gold layer files
    gold_files = [
        (f"{organization_id}/dim_account.json", dim_accounts),
        (f"{organization_id}/dim_contact.json", dim_contacts),
        (f"{organization_id}/fact_transaction.json", fact_transactions),
        (f"{organization_id}/agg_monthly_financials.json", monthly_trends),
        (f"{organization_id}/agg_dashboard_summary.json", summary),
    ]
    
    for key, data in gold_files:
        s3_client.put_object(
            Bucket=GOLD_BUCKET,
            Key=key,
            Body=json.dumps(data, indent=2, default=str),
            ContentType="application/json",
        )
        logger.info(f"  ✅ Gold: Wrote {key}")
    
    return stats


async def main():
    parser = argparse.ArgumentParser(description="Run Production Pipeline Locally")
    parser.add_argument("--refresh-token", required=True, help="QuickBooks refresh token")
    parser.add_argument("--realm-id", required=True, help="QuickBooks realm ID")
    parser.add_argument("--organization-id", default=os.getenv("DEMO_ORG_ID", "demo-org"), help="Organization ID")
    
    args = parser.parse_args()
    
    # Validate environment
    if not os.getenv("QUICKBOOKS_CLIENT_ID") or not os.getenv("QUICKBOOKS_CLIENT_SECRET"):
        logger.error("❌ Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET")
        sys.exit(1)
    
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  PRODUCTION PIPELINE - LOCAL EXECUTION                       ║")
    print("║                                                              ║")
    print("║  QuickBooks → Bronze → Silver → Gold                         ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    
    start_time = datetime.utcnow()
    
    # Initialize S3
    s3_client = get_s3_client()
    ensure_buckets(s3_client)
    
    # Step 1: Extract from QuickBooks → Bronze
    extraction_stats = await extract_quickbooks_data(
        refresh_token=args.refresh_token,
        realm_id=args.realm_id,
        organization_id=args.organization_id,
        s3_client=s3_client,
    )
    
    # Step 2: Bronze → Silver
    silver_result = run_bronze_to_silver(args.organization_id, s3_client)
    
    # Step 3: Silver → Gold
    gold_stats = run_silver_to_gold(args.organization_id, s3_client)
    
    duration = (datetime.utcnow() - start_time).total_seconds()
    
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ✅ PRODUCTION PIPELINE COMPLETE                             ║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print(f"║  Duration: {duration:.2f}s".ljust(63) + "║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print("║  EXTRACTION (QuickBooks → Bronze):".ljust(63) + "║")
    for entity, count in extraction_stats.items():
        print(f"║    {entity}: {count}".ljust(63) + "║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print("║  TRANSFORMATION (Bronze → Silver → Gold):".ljust(63) + "║")
    print(f"║    Records processed: {silver_result.get('stats', {}).get('records_written', 0)}".ljust(63) + "║")
    print(f"║    Records quarantined: {silver_result.get('stats', {}).get('records_quarantined', 0)}".ljust(63) + "║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print("║  GOLD LAYER:".ljust(63) + "║")
    for key, value in gold_stats.items():
        print(f"║    {key}: {value}".ljust(63) + "║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    print("💡 Next steps:")
    print("   1. Start the API: cd apps/api && SKIP_AUTH=true npm run start:dev")
    print("   2. Start the web: cd apps/web && npm run dev")
    print("   3. Navigate to http://localhost:5173")
    print()


if __name__ == "__main__":
    asyncio.run(main())
