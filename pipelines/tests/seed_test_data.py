"""
Seed Test Data - Populates Bronze layer with sample data for E2E testing.

Uses shared fixtures from:
- fixtures/industries/ for industry-specific data
- fixtures/datalake/ for sample data layer files

Usage:
    python -m pipelines.tests.seed_test_data
    python -m pipelines.tests.seed_test_data --industry restaurant
    python -m pipelines.tests.seed_test_data --all-industries
    
Or via Docker:
    docker-compose --profile seed up etl-seeder
"""

import json
import os
import sys
import argparse
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
import boto3
from botocore.config import Config
import logging
from pathlib import Path

# Add project root to path for fixtures import
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from fixtures.loader import (
        load_industry,
        load_all_industries,
        get_industry_ids,
    )
    USE_FIXTURES = True
except ImportError:
    USE_FIXTURES = False
    print("Warning: fixtures module not found, using sample datalake fixtures")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://localhost:4566")
S3_BUCKET_BRONZE = os.getenv("S3_BUCKET_BRONZE", "plainledger-bronze")
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")

# Test organization
TEST_ORG_ID = os.getenv("TEST_ORG_ID", "test-org-001")


def get_s3_client():
    """Create S3 client configured for LocalStack."""
    return boto3.client(
        "s3",
        endpoint_url=S3_ENDPOINT,
        region_name=AWS_REGION,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "test"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "test"),
        config=Config(s3={"addressing_style": "path"}),
    )


def _load_datalake_fixture(filename: str) -> List[Dict[str, Any]]:
    """Load sample data from datalake fixtures."""
    fixture_path = PROJECT_ROOT / "fixtures" / "datalake" / "bronze" / filename
    
    if fixture_path.exists():
        with open(fixture_path) as f:
            data = json.load(f)
            # Handle Bronze format (has "records" wrapper)
            if isinstance(data, dict) and "records" in data:
                return data["records"]
            return data if isinstance(data, list) else [data]
    
    logger.warning(f"Fixture not found: {fixture_path}")
    return []


def load_sample_accounts() -> List[Dict[str, Any]]:
    """Load sample accounts from datalake fixtures or generate defaults."""
    records = _load_datalake_fixture("sample_accounts.json")
    
    if records:
        # Add test cases for validation/deduplication
        if len(records) > 0:
            # Add duplicate for deduplication testing
            duplicate = records[0].copy()
            duplicate["Name"] = f"{duplicate.get('Name', 'Account')} - Updated"
            duplicate["MetaData"] = {"CreateTime": datetime.utcnow().isoformat()}
            records.append(duplicate)
            
            # Add invalid record for validation testing
            records.append({
                "Id": str(len(records) + 1),
                "Name": "",  # Empty name - should be quarantined
                "AccountType": "Expense",
                "Active": True,
            })
        return records
    
    # Minimal fallback if fixtures not available
    logger.warning("Using minimal fallback accounts")
    return [
        {"Id": "1", "Name": "Bank Account", "AccountType": "Bank", "Active": True},
        {"Id": "2", "Name": "Revenue", "AccountType": "Income", "Active": True},
        {"Id": "3", "Name": "Expenses", "AccountType": "Expense", "Active": True},
    ]


def load_sample_contacts() -> List[Dict[str, Any]]:
    """Load sample contacts - simplified since datalake fixtures focus on accounts/transactions."""
    return [
        {
            "Id": "1",
            "DisplayName": "Acme Corporation",
            "CompanyName": "Acme Corporation",
            "PrimaryEmailAddr": {"Address": "contact@acme.com"},
            "PrimaryPhone": {"FreeFormNumber": "555-0100"},
            "BillAddr": {
                "Line1": "123 Main St",
                "City": "Montreal",
                "CountrySubDivisionCode": "QC",
                "PostalCode": "H2X 1X1",
                "Country": "CA",
            },
            "Active": True,
            "MetaData": {"CreateTime": datetime.utcnow().isoformat()},
        },
        {
            "Id": "2",
            "DisplayName": "Beta Industries",
            "CompanyName": "Beta Industries",
            "PrimaryEmailAddr": {"Address": "info@beta.com"},
            "Active": True,
            "MetaData": {"CreateTime": datetime.utcnow().isoformat()},
        },
    ]


def load_sample_transactions() -> List[Dict[str, Any]]:
    """Load sample transactions from datalake fixtures."""
    records = _load_datalake_fixture("sample_transactions.json")
    
    if records:
        return records
    
    # Minimal fallback
    logger.warning("Using minimal fallback transactions")
    base_date = datetime.now() - timedelta(days=30)
    return [
        {
            "Id": str(i + 1),
            "TxnDate": (base_date + timedelta(days=i * 3)).strftime("%Y-%m-%d"),
            "TotalAmt": 1000 + (i * 500),
            "DocNumber": f"INV-{1000 + i}",
            "CustomerRef": {"value": "1", "name": "Acme Corporation"},
            "Line": [{"Amount": 1000 + (i * 500), "DetailType": "SalesItemLineDetail"}],
            "MetaData": {"CreateTime": (base_date + timedelta(days=i * 3)).isoformat()},
        }
        for i in range(5)
    ]


def upload_to_bronze(s3_client, entity_type: str, records: List[Dict[str, Any]]) -> None:
    """Upload records to Bronze layer."""
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    key = f"quickbooks/{entity_type}/{TEST_ORG_ID}/{timestamp}.json"
    
    # Add metadata to each record
    enriched_records = []
    for record in records:
        enriched = {
            **record,
            "organization_id": TEST_ORG_ID,
            "source_system": "QUICKBOOKS",
            "ingested_at": datetime.utcnow().isoformat(),
        }
        enriched_records.append(enriched)
    
    body = json.dumps(enriched_records, indent=2)
    
    s3_client.put_object(
        Bucket=S3_BUCKET_BRONZE,
        Key=key,
        Body=body,
        ContentType="application/json",
    )
    
    logger.info(f"Uploaded {len(records)} {entity_type} records to s3://{S3_BUCKET_BRONZE}/{key}")


def generate_industry_accounts(industry_id: str) -> List[Dict[str, Any]]:
    """Generate accounts from industry fixtures."""
    if not USE_FIXTURES:
        return load_sample_accounts()
    
    industry = load_industry(industry_id)
    accounts = []
    
    for idx, acc in enumerate(industry.get('accounts', []), start=1):
        accounts.append({
            "Id": str(idx),
            "Name": acc['name'],
            "AccountType": acc['type'],
            "AccountSubType": acc.get('subtype', ''),
            "AcctNum": str(1000 + idx * 10),
            "Active": True,
            "CurrencyRef": {"value": "CAD"},
            "MetaData": {"CreateTime": datetime.utcnow().isoformat()},
        })
    
    return accounts


def generate_industry_transactions(
    industry_id: str,
    accounts: List[Dict[str, Any]],
    months: int = 6
) -> List[Dict[str, Any]]:
    """Generate realistic transactions based on industry configuration."""
    if not USE_FIXTURES:
        return load_sample_transactions()
    
    industry = load_industry(industry_id)
    transactions = []
    
    # Get revenue/expense config from fixtures
    txn_config = industry.get('transactions', {})
    revenue_range = txn_config.get('revenue_range', [50000, 150000])
    expense_ratio = txn_config.get('expense_ratio', 0.60)
    
    # Find revenue and expense accounts
    revenue_accounts = [a for a in accounts if a['AccountType'] == 'Income']
    expense_accounts = [a for a in accounts if a['AccountType'] in ('Expense', 'Cost of Goods Sold')]
    
    if not revenue_accounts:
        revenue_accounts = [{"Id": "1", "Name": "Revenue"}]
    if not expense_accounts:
        expense_accounts = [{"Id": "2", "Name": "Expense"}]
    
    base_date = datetime.now() - timedelta(days=months * 30)
    txn_id = 1
    
    # Generate monthly transactions
    for month in range(months):
        month_date = base_date + timedelta(days=month * 30)
        monthly_revenue = random.uniform(revenue_range[0] / 12, revenue_range[1] / 12)
        monthly_expense = monthly_revenue * expense_ratio
        
        # Revenue transactions (3-5 per month)
        for _ in range(random.randint(3, 5)):
            rev_account = random.choice(revenue_accounts)
            amount = monthly_revenue / 4 * random.uniform(0.5, 1.5)
            transactions.append({
                "Id": str(txn_id),
                "TxnDate": (month_date + timedelta(days=random.randint(0, 28))).strftime("%Y-%m-%d"),
                "TotalAmt": round(amount, 2),
                "DocNumber": f"INV-{txn_id:04d}",
                "AccountRef": {"value": rev_account["Id"], "name": rev_account["Name"]},
                "Line": [{
                    "Amount": round(amount, 2),
                    "DetailType": "SalesItemLineDetail",
                    "Description": f"{industry['name']} Revenue",
                }],
                "MetaData": {"CreateTime": month_date.isoformat()},
            })
            txn_id += 1
        
        # Expense transactions (4-6 per month)
        for _ in range(random.randint(4, 6)):
            exp_account = random.choice(expense_accounts)
            amount = monthly_expense / 5 * random.uniform(0.5, 1.5)
            transactions.append({
                "Id": str(txn_id),
                "TxnDate": (month_date + timedelta(days=random.randint(0, 28))).strftime("%Y-%m-%d"),
                "TotalAmt": round(amount, 2),
                "DocNumber": f"BILL-{txn_id:04d}",
                "AccountRef": {"value": exp_account["Id"], "name": exp_account["Name"]},
                "Line": [{
                    "Amount": round(amount, 2),
                    "DetailType": "AccountBasedExpenseLineDetail",
                    "Description": f"{industry['name']} Expense",
                }],
                "MetaData": {"CreateTime": month_date.isoformat()},
            })
            txn_id += 1
    
    return transactions


def seed_industry(s3_client, industry_id: str, org_id: str) -> Dict[str, int]:
    """Seed Bronze layer with industry-specific data."""
    logger.info(f"  Seeding {industry_id}...")
    
    # Generate industry-specific accounts
    if USE_FIXTURES:
        accounts = generate_industry_accounts(industry_id)
    else:
        accounts = load_sample_accounts()
    upload_to_bronze(s3_client, "account", accounts, org_id)
    
    # Generate industry-specific contacts
    contacts = load_sample_contacts()
    upload_to_bronze(s3_client, "contact", contacts, org_id)
    
    # Generate industry-specific transactions
    if USE_FIXTURES:
        transactions = generate_industry_transactions(industry_id, accounts)
    else:
        transactions = load_sample_transactions()
    upload_to_bronze(s3_client, "transaction", transactions, org_id)
    
    return {
        "accounts": len(accounts),
        "contacts": len(contacts),
        "transactions": len(transactions),
    }


def upload_to_bronze(s3_client, entity_type: str, records: List[Dict[str, Any]], org_id: str = None) -> None:
    """Upload records to Bronze layer."""
    org = org_id or TEST_ORG_ID
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    key = f"quickbooks/{entity_type}/{org}/{timestamp}.json"
    
    # Add metadata to each record
    enriched_records = []
    for record in records:
        enriched = {
            **record,
            "organization_id": org,
            "source_system": "QUICKBOOKS",
            "ingested_at": datetime.utcnow().isoformat(),
        }
        enriched_records.append(enriched)
    
    body = json.dumps(enriched_records, indent=2)
    
    s3_client.put_object(
        Bucket=S3_BUCKET_BRONZE,
        Key=key,
        Body=body,
        ContentType="application/json",
    )
    
    logger.info(f"    Uploaded {len(records)} {entity_type} records to s3://{S3_BUCKET_BRONZE}/{key}")


def main():
    """Seed Bronze layer with test data."""
    parser = argparse.ArgumentParser(description="Seed Bronze layer with test data")
    parser.add_argument("--industry", help="Specific industry to seed (e.g., restaurant, retail)")
    parser.add_argument("--all-industries", action="store_true", help="Seed all 15 industries")
    parser.add_argument("--org-id", default=TEST_ORG_ID, help="Organization ID")
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("Seeding Bronze layer with test data...")
    if USE_FIXTURES:
        logger.info("Using fixtures from fixtures/industries/")
    else:
        logger.info("Using legacy data generators (fixtures not available)")
    logger.info("=" * 60)
    
    s3_client = get_s3_client()
    
    if args.all_industries and USE_FIXTURES:
        # Seed all 15 industries
        industries = get_industry_ids()
        total_stats = {"accounts": 0, "contacts": 0, "transactions": 0}
        
        for industry_id in industries:
            stats = seed_industry(s3_client, industry_id, f"{args.org_id}-{industry_id}")
            for key in total_stats:
                total_stats[key] += stats[key]
        
        logger.info("=" * 60)
        logger.info(f"Seeded {len(industries)} industries!")
        logger.info(f"  Total Accounts: {total_stats['accounts']}")
        logger.info(f"  Total Contacts: {total_stats['contacts']}")
        logger.info(f"  Total Transactions: {total_stats['transactions']}")
        
    elif args.industry and USE_FIXTURES:
        # Seed specific industry
        stats = seed_industry(s3_client, args.industry, args.org_id)
        logger.info("=" * 60)
        logger.info(f"Seeded {args.industry} industry!")
        logger.info(f"  Accounts: {stats['accounts']}")
        logger.info(f"  Contacts: {stats['contacts']}")
        logger.info(f"  Transactions: {stats['transactions']}")
        
    else:
        # Load sample data from fixtures/datalake
        accounts = load_sample_accounts()
        upload_to_bronze(s3_client, "account", accounts, args.org_id)
        
        contacts = load_sample_contacts()
        upload_to_bronze(s3_client, "contact", contacts, args.org_id)
        
        transactions = load_sample_transactions()
        upload_to_bronze(s3_client, "transaction", transactions, args.org_id)
        
        logger.info("=" * 60)
        logger.info("Test data seeding complete (from fixtures/datalake)!")
        logger.info(f"  Organization: {args.org_id}")
        logger.info(f"  Accounts: {len(accounts)} (including test cases for validation)")
        logger.info(f"  Contacts: {len(contacts)}")
        logger.info(f"  Transactions: {len(transactions)}")
    
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
