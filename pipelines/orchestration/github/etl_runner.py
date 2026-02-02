#!/usr/bin/env python3
"""
ETL Runner for GitHub Actions

This script runs individual ETL pipeline steps in CI/CD environments.
It's designed to be called by GitHub Actions workflows.

Now uses proper transformer modules (normalizer, validator, etc.) for
production-quality data transformations.

Usage:
    # Extract step
    python etl_runner.py --step extract --refresh-token RT1-xxx --realm-id 123
    
    # Transform steps
    python etl_runner.py --step bronze-to-silver --organization-id demo-org
    python etl_runner.py --step silver-to-gold --organization-id demo-org
"""

import os
import sys
import json
import asyncio
import argparse
import logging
import time
from dataclasses import asdict
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable, TypeVar
from functools import wraps

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

# Add pipelines to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from extractors.quickbooks.extractor import QuickBooksExtractor
from extractors.base_extractor import OAuthTokens, EntityType

# Import transformers
from transformers.bronze_to_silver.normalizer import SchemaNormalizer
from transformers.bronze_to_silver.quickbooks_normalizer import quickbooks_normalizer
from transformers.bronze_to_silver.validator import DataValidator, ValidationSeverity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize normalizer with QuickBooks plugin
normalizer = SchemaNormalizer()
normalizer.register_plugin(quickbooks_normalizer)

# Initialize validator
validator = DataValidator()

# Retry configuration
MAX_RETRIES = int(os.getenv("ETL_MAX_RETRIES", "3"))
RETRY_BACKOFF_BASE = float(os.getenv("ETL_RETRY_BACKOFF_BASE", "2.0"))
RETRY_MAX_DELAY = int(os.getenv("ETL_RETRY_MAX_DELAY", "60"))

T = TypeVar("T")


def with_retry(
    max_retries: int = MAX_RETRIES,
    backoff_base: float = RETRY_BACKOFF_BASE,
    max_delay: int = RETRY_MAX_DELAY,
    retryable_exceptions: tuple = (ClientError, ConnectionError, TimeoutError),
):
    """
    Decorator for retry logic with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        backoff_base: Base for exponential backoff calculation
        max_delay: Maximum delay between retries in seconds
        retryable_exceptions: Tuple of exception types to retry on
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt < max_retries:
                        delay = min(backoff_base ** attempt, max_delay)
                        logger.warning(
                            f"Retry {attempt + 1}/{max_retries} for {func.__name__} "
                            f"after {delay:.1f}s: {e}"
                        )
                        time.sleep(delay)
                    else:
                        logger.error(
                            f"All {max_retries} retries exhausted for {func.__name__}: {e}"
                        )
            
            raise last_exception
        
        return wrapper
    return decorator


async def with_retry_async(
    func: Callable,
    *args,
    max_retries: int = MAX_RETRIES,
    backoff_base: float = RETRY_BACKOFF_BASE,
    max_delay: int = RETRY_MAX_DELAY,
    retryable_exceptions: tuple = (ClientError, ConnectionError, TimeoutError),
    **kwargs,
) -> Any:
    """Async version of retry logic."""
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except retryable_exceptions as e:
            last_exception = e
            
            if attempt < max_retries:
                delay = min(backoff_base ** attempt, max_delay)
                logger.warning(
                    f"Retry {attempt + 1}/{max_retries} for {func.__name__} "
                    f"after {delay:.1f}s: {e}"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    f"All {max_retries} retries exhausted for {func.__name__}: {e}"
                )
    
    raise last_exception

# Configuration from environment
S3_ENDPOINT = os.getenv("S3_ENDPOINT")  # None for AWS, set for LocalStack
S3_REGION = os.getenv("AWS_DEFAULT_REGION", os.getenv("AWS_REGION", "ca-central-1"))
BRONZE_BUCKET = os.getenv("S3_BUCKET_BRONZE", "plainledger-prod-bronze")
SILVER_BUCKET = os.getenv("S3_BUCKET_SILVER", "plainledger-prod-silver")
GOLD_BUCKET = os.getenv("S3_BUCKET_GOLD", "plainledger-prod-gold")
QUARANTINE_BUCKET = os.getenv("S3_BUCKET_QUARANTINE", "plainledger-prod-quarantine")


def get_s3_client():
    """Get S3 client (AWS or LocalStack)"""
    config = Config(region_name=S3_REGION)
    
    if S3_ENDPOINT:
        # LocalStack
        return boto3.client(
            "s3",
            endpoint_url=S3_ENDPOINT,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "test"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "test"),
            config=Config(s3={"addressing_style": "path"}, region_name=S3_REGION),
        )
    else:
        # AWS (uses IAM role in GitHub Actions)
        return boto3.client("s3", config=config)


def write_to_bronze(
    s3_client,
    provider: str,
    entity_type: str,
    organization_id: str,
    records: List[Dict[str, Any]],
):
    """Write records to Bronze layer"""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    key = f"{provider}/{entity_type}/{organization_id}/{timestamp}.json"
    
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
    
    logger.info(f"📥 Bronze: Wrote {len(records)} {entity_type} records to s3://{BRONZE_BUCKET}/{key}")
    return key


async def run_extract_step(
    refresh_token: str,
    realm_id: str,
    organization_id: str,
):
    """Step 1: Extract from QuickBooks → Bronze"""
    logger.info("=" * 60)
    logger.info("EXTRACT: QuickBooks → Bronze")
    logger.info("=" * 60)
    
    s3_client = get_s3_client()
    
    # Validate credentials
    if not os.getenv("QUICKBOOKS_CLIENT_ID") or not os.getenv("QUICKBOOKS_CLIENT_SECRET"):
        raise ValueError("Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET")
    
    # Create OAuth tokens
    tokens = OAuthTokens(
        access_token="",
        refresh_token=refresh_token,
        expires_at=datetime.utcnow(),
        token_type="Bearer",
    )
    
    # Initialize extractor
    extractor = QuickBooksExtractor(
        organization_id=organization_id,
        tokens=tokens,
        realm_id=realm_id,
    )
    
    # Entity types to extract
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
    
    logger.info(f"  ✅ Extraction complete: {extraction_stats}")
    
    # Save stats
    with open("extraction_stats.json", "w") as f:
        json.dump(extraction_stats, f, indent=2)
    
    return extraction_stats


@with_retry()
def _read_s3_object(s3_client, bucket: str, key: str) -> Dict[str, Any]:
    """Read and parse S3 object with retry logic."""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    content = response["Body"].read().decode("utf-8")
    return json.loads(content)


@with_retry()
def _write_s3_object(s3_client, bucket: str, key: str, data: Any) -> None:
    """Write S3 object with retry logic."""
    s3_client.put_object(
        Bucket=bucket,
        Key=key,
        Body=json.dumps(data, indent=2, default=str),
        ContentType="application/json",
    )


def _normalize_record(
    record: Dict[str, Any],
    entity_type: str,
    organization_id: str,
    source_file: str,
) -> Dict[str, Any]:
    """
    Normalize a record using the appropriate normalizer plugin.
    
    Falls back to basic normalization if plugin not available.
    """
    # Add metadata
    record["_organization_id"] = organization_id
    record["_source_file"] = source_file
    
    try:
        # Map entity type to normalizer method
        if entity_type in ("account", "accounts"):
            normalized = normalizer.normalize_account(record, "quickbooks")
            return {**asdict(normalized), "_normalized_at": datetime.utcnow().isoformat()}
        elif entity_type in ("contact", "contacts", "customer", "customers", "vendor", "vendors"):
            normalized = normalizer.normalize_contact(record, "quickbooks")
            return {**asdict(normalized), "_normalized_at": datetime.utcnow().isoformat()}
        elif entity_type in ("invoice", "invoices", "bill", "bills", "transaction", "transactions"):
            normalized = normalizer.normalize_transaction(record, "quickbooks")
            # Convert enum to string
            result = asdict(normalized)
            result["transaction_type"] = result["transaction_type"].value
            result["_normalized_at"] = datetime.utcnow().isoformat()
            return result
    except Exception as e:
        logger.warning(f"Normalization failed for {entity_type}, using fallback: {e}")
    
    # Fallback to basic normalization
    return {
        **record,
        "_normalized_at": datetime.utcnow().isoformat(),
    }


def run_bronze_to_silver_step(organization_id: str):
    """
    Step 2: Transform Bronze → Silver
    
    Uses proper transformer modules:
    - SchemaNormalizer with provider-specific plugins
    - DataValidator for data quality checks
    - Quarantine mechanism for invalid records
    """
    logger.info("=" * 60)
    logger.info("TRANSFORM: Bronze → Silver (with proper transformers)")
    logger.info("=" * 60)
    
    s3_client = get_s3_client()
    
    stats = {
        "records_read": 0,
        "records_normalized": 0,
        "records_validated": 0,
        "records_written": 0,
        "records_quarantined": 0,
        "validation_warnings": 0,
    }
    
    # List Bronze files for this organization
    prefix = "quickbooks/"
    try:
        response = s3_client.list_objects_v2(Bucket=BRONZE_BUCKET, Prefix=prefix)
        bronze_files = [obj["Key"] for obj in response.get("Contents", [])]
    except ClientError as e:
        logger.error(f"Failed to list Bronze bucket: {e}")
        return {"success": False, "stats": stats}
    
    if not bronze_files:
        logger.warning("No Bronze files found")
        return {"success": True, "stats": stats}
    
    logger.info(f"  Found {len(bronze_files)} Bronze files")
    
    # Process each Bronze file
    for file_key in bronze_files:
        try:
            # Read Bronze file with retry
            bronze_data = _read_s3_object(s3_client, BRONZE_BUCKET, file_key)
            
            # Extract records
            records = bronze_data.get("records", [bronze_data])
            if not isinstance(records, list):
                records = [records]
            
            stats["records_read"] += len(records)
            
            # Extract entity type from path
            parts = file_key.split("/")
            entity_type = parts[1] if len(parts) > 1 else "unknown"
            
            # Step 1: Normalize records using proper transformer
            logger.info(f"    📐 Normalizing {len(records)} {entity_type} records...")
            normalized_records = []
            for record in records:
                try:
                    normalized = _normalize_record(record, entity_type, organization_id, file_key)
                    normalized_records.append(normalized)
                    stats["records_normalized"] += 1
                except Exception as e:
                    logger.warning(f"    ⚠️ Normalization failed for record: {e}")
                    # Still include with basic metadata for quarantine review
                    normalized_records.append({
                        **record,
                        "_normalization_error": str(e),
                        "_organization_id": organization_id,
                    })
            
            # Step 2: Validate records using DataValidator
            logger.info(f"    ✅ Validating {len(normalized_records)} {entity_type} records...")
            validation_result = validator.validate_batch(normalized_records, entity_type)
            
            stats["records_validated"] += len(validation_result.valid_records)
            stats["records_quarantined"] += len(validation_result.quarantined_records)
            
            # Count warnings from valid records
            for record in validation_result.valid_records:
                if record.get("_warnings"):
                    stats["validation_warnings"] += 1
            
            # Step 3: Write valid records to Silver
            if validation_result.valid_records:
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                silver_key = f"{entity_type}/{organization_id}/{timestamp}.json"
                
                _write_s3_object(s3_client, SILVER_BUCKET, silver_key, validation_result.valid_records)
                
                stats["records_written"] += len(validation_result.valid_records)
                logger.info(f"    ✅ Silver: {len(validation_result.valid_records)} records → {silver_key}")
            
            # Step 4: Write quarantined records
            if validation_result.quarantined_records:
                timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                quarantine_key = f"{entity_type}/{organization_id}/quarantine_{timestamp}.json"
                
                quarantine_data = [
                    {
                        "record": record,
                        "errors": [{"rule": e.rule_name, "field": e.field, "message": e.message} for e in errors],
                    }
                    for record, errors in validation_result.quarantined_records
                ]
                
                _write_s3_object(s3_client, QUARANTINE_BUCKET, quarantine_key, quarantine_data)
                logger.warning(f"    ⚠️ Quarantine: {len(quarantine_data)} records → {quarantine_key}")
                
        except Exception as e:
            logger.error(f"  ❌ Failed to process {file_key}: {e}", exc_info=True)
            stats["records_quarantined"] += 1
    
    # Calculate pass rate
    total_processed = stats["records_validated"] + stats["records_quarantined"]
    pass_rate = round(stats["records_validated"] / total_processed * 100, 2) if total_processed > 0 else 0
    stats["pass_rate"] = pass_rate
    
    logger.info(f"  ✅ Transformation complete:")
    logger.info(f"      Read: {stats['records_read']}")
    logger.info(f"      Normalized: {stats['records_normalized']}")
    logger.info(f"      Validated: {stats['records_validated']}")
    logger.info(f"      Written: {stats['records_written']}")
    logger.info(f"      Quarantined: {stats['records_quarantined']}")
    logger.info(f"      Pass Rate: {pass_rate}%")
    
    # Save stats
    with open("transform_bronze_silver_stats.json", "w") as f:
        json.dump(stats, f, indent=2)
    
    return {"success": True, "stats": stats}


def run_silver_to_gold_step(organization_id: str):
    """
    Step 3: Transform Silver → Gold (Star Schema)
    
    Creates dimension and fact tables with aggregations:
    - dim_account: Account dimension
    - dim_contact: Contact dimension
    - fact_transaction: Transaction facts
    - agg_monthly_financials: Monthly aggregations
    - agg_dashboard_summary: Dashboard metrics
    """
    logger.info("=" * 60)
    logger.info("TRANSFORM: Silver → Gold (Star Schema)")
    logger.info("=" * 60)
    
    s3_client = get_s3_client()
    
    stats = {
        "accounts": 0,
        "contacts": 0,
        "transactions": 0,
        "monthly_trends": 0,
        "files_processed": 0,
        "files_failed": 0,
    }
    
    # List Silver files
    try:
        response = s3_client.list_objects_v2(Bucket=SILVER_BUCKET, Prefix="")
        silver_files = [obj["Key"] for obj in response.get("Contents", [])]
    except ClientError as e:
        logger.error(f"Failed to list Silver bucket: {e}")
        return {"success": False, "stats": stats}
    
    if not silver_files:
        logger.warning("No Silver files found")
        return {"success": True, "stats": stats}
    
    logger.info(f"  Found {len(silver_files)} Silver files")
    
    # Process each entity type
    all_accounts = []
    all_contacts = []
    all_transactions = []
    
    for file_key in silver_files:
        # Skip quarantine files
        if "quarantine" in file_key.lower():
            continue
            
        try:
            records = _read_s3_object(s3_client, SILVER_BUCKET, file_key)
            
            if not isinstance(records, list):
                records = [records]
            
            # Use normalized field names from Silver layer
            if "account" in file_key.lower():
                all_accounts.extend(records)
            elif any(x in file_key.lower() for x in ("contact", "customer", "vendor")):
                all_contacts.extend(records)
            elif any(x in file_key.lower() for x in ("invoice", "bill", "transaction")):
                all_transactions.extend(records)
            
            stats["files_processed"] += 1
                
        except Exception as e:
            logger.warning(f"Failed to process {file_key}: {e}")
            stats["files_failed"] += 1
    
    logger.info(f"    Loaded: {len(all_accounts)} accounts, {len(all_contacts)} contacts, {len(all_transactions)} transactions")
    
    # Transform to Gold format (star schema)
    
    # dim_account - using normalized Silver field names
    dim_accounts = []
    for idx, acc in enumerate(all_accounts):
        dim_accounts.append({
            "account_key": f"acc_{acc.get('source_id', idx)}",
            "account_id": acc.get("source_id", str(idx)),
            "source_account_id": acc.get("source_id", ""),
            "organization_key": organization_id,
            "account_code": acc.get("account_code", str(1000 + idx * 10)),
            "account_name": acc.get("account_name", acc.get("Name", f"Account {idx}")),
            "account_type": str(acc.get("account_type", "OTHER")).upper().replace("STANDARDACCOUNTTYPE.", ""),
            "account_subtype": acc.get("account_subtype", ""),
            "normal_balance": acc.get("normal_balance", "DEBIT"),
            "currency_code": acc.get("currency_code", "CAD"),
            "is_active": acc.get("is_active", True),
            "current_balance": float(acc.get("current_balance", 0)),
        })
    stats["accounts"] = len(dim_accounts)
    
    # dim_contact - using normalized Silver field names
    dim_contacts = []
    for idx, contact in enumerate(all_contacts):
        dim_contacts.append({
            "contact_key": f"cont_{contact.get('source_id', idx)}",
            "contact_id": contact.get("source_id", str(idx)),
            "organization_key": organization_id,
            "contact_name": contact.get("display_name", contact.get("name", f"Contact {idx}")),
            "contact_type": contact.get("contact_type", "CUSTOMER"),
            "company_name": contact.get("company_name", ""),
            "email": contact.get("email", ""),
            "phone": contact.get("phone", ""),
            "is_active": contact.get("is_active", True),
            "city": contact.get("city", ""),
            "state": contact.get("state", ""),
            "country": contact.get("country", "CA"),
        })
    stats["contacts"] = len(dim_contacts)
    
    # fact_transactions + agg_monthly_financials - using normalized Silver field names
    monthly_totals = {}
    fact_transactions = []
    
    for idx, txn in enumerate(all_transactions):
        # Use normalized field names from Silver
        txn_date = txn.get("transaction_date", datetime.utcnow().strftime("%Y-%m-%d"))
        amount = float(txn.get("amount", 0))
        txn_type = str(txn.get("transaction_type", "INVOICE")).upper()
        
        fact_transactions.append({
            "transaction_key": f"txn_{txn.get('source_id', idx)}",
            "transaction_id": txn.get("source_id", str(idx)),
            "organization_key": organization_id,
            "transaction_date": txn_date,
            "posting_date": txn.get("posting_date", txn_date),
            "transaction_type": txn_type,
            "amount": amount,
            "currency_code": txn.get("currency_code", "CAD"),
            "description": txn.get("description", ""),
            "reference": txn.get("reference", ""),
            "account_id": txn.get("account_id", ""),
            "contact_id": txn.get("contact_id", ""),
            "is_reconciled": txn.get("is_reconciled", False),
        })
        
        # Aggregate monthly
        month = txn_date[:7] if len(txn_date) >= 7 else txn_date
        if month not in monthly_totals:
            monthly_totals[month] = {"revenue": 0, "expenses": 0, "count": 0}
        
        # Revenue = INVOICE, Expenses = BILL
        if txn_type in ("INVOICE", "PAYMENT"):
            monthly_totals[month]["revenue"] += amount
        else:
            monthly_totals[month]["expenses"] += abs(amount)
        monthly_totals[month]["count"] += 1
    
    stats["transactions"] = len(fact_transactions)
    
    # agg_monthly_financials
    monthly_trends = []
    for month, totals in sorted(monthly_totals.items()):
        monthly_trends.append({
            "period": month,
            "organization_key": organization_id,
            "revenue": round(totals["revenue"], 2),
            "expenses": round(totals["expenses"], 2),
            "net_income": round(totals["revenue"] - totals["expenses"], 2),
            "transaction_count": totals["count"],
            "gross_margin": round((totals["revenue"] - totals["expenses"]) / totals["revenue"] * 100, 2) if totals["revenue"] > 0 else 0,
        })
    stats["monthly_trends"] = len(monthly_trends)
    
    # agg_dashboard_summary
    total_revenue = sum(t.get("revenue", 0) for t in monthly_trends)
    total_expenses = sum(t.get("expenses", 0) for t in monthly_trends)
    
    summary = {
        "organization_key": organization_id,
        "as_of_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "total_accounts": len(dim_accounts),
        "total_contacts": len(dim_contacts),
        "total_transactions": len(fact_transactions),
        "total_revenue": round(total_revenue, 2),
        "total_expenses": round(total_expenses, 2),
        "net_income": round(total_revenue - total_expenses, 2),
        "gross_margin_pct": round((total_revenue - total_expenses) / total_revenue * 100, 2) if total_revenue > 0 else 0,
        "active_accounts": len([a for a in dim_accounts if a.get("is_active", True)]),
        "active_contacts": len([c for c in dim_contacts if c.get("is_active", True)]),
    }
    
    # Write Gold layer files with retry
    gold_files = [
        (f"{organization_id}/dim_account.json", dim_accounts),
        (f"{organization_id}/dim_contact.json", dim_contacts),
        (f"{organization_id}/fact_transaction.json", fact_transactions),
        (f"{organization_id}/agg_monthly_financials.json", monthly_trends),
        (f"{organization_id}/agg_dashboard_summary.json", summary),
    ]
    
    for key, data in gold_files:
        try:
            _write_s3_object(s3_client, GOLD_BUCKET, key, data)
            logger.info(f"    ✅ Gold: Wrote {key} ({len(data) if isinstance(data, list) else 1} records)")
        except Exception as e:
            logger.error(f"    ❌ Failed to write {key}: {e}")
    
    logger.info(f"  ✅ Gold transformation complete:")
    logger.info(f"      Accounts: {stats['accounts']}")
    logger.info(f"      Contacts: {stats['contacts']}")
    logger.info(f"      Transactions: {stats['transactions']}")
    logger.info(f"      Monthly Trends: {stats['monthly_trends']}")
    logger.info(f"      Total Revenue: ${total_revenue:,.2f}")
    logger.info(f"      Total Expenses: ${total_expenses:,.2f}")
    logger.info(f"      Net Income: ${total_revenue - total_expenses:,.2f}")
    
    # Save stats
    with open("transform_silver_gold_stats.json", "w") as f:
        json.dump(stats, f, indent=2)
    
    return {"success": True, "stats": stats}


async def main():
    parser = argparse.ArgumentParser(description="ETL Runner for GitHub Actions")
    parser.add_argument("--step", required=True, choices=["extract", "bronze-to-silver", "silver-to-gold"],
                       help="ETL step to run")
    parser.add_argument("--organization-id", default="demo-org", help="Organization ID")
    parser.add_argument("--refresh-token", help="QuickBooks refresh token (required for extract)")
    parser.add_argument("--realm-id", help="QuickBooks realm ID (required for extract)")
    
    args = parser.parse_args()
    
    try:
        if args.step == "extract":
            if not args.refresh_token or not args.realm_id:
                raise ValueError("--refresh-token and --realm-id required for extract step")
            
            await run_extract_step(
                refresh_token=args.refresh_token,
                realm_id=args.realm_id,
                organization_id=args.organization_id,
            )
            
        elif args.step == "bronze-to-silver":
            run_bronze_to_silver_step(args.organization_id)
            
        elif args.step == "silver-to-gold":
            run_silver_to_gold_step(args.organization_id)
            
        logger.info("✅ ETL step completed successfully")
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ ETL step failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
