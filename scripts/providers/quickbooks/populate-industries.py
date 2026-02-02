#!/usr/bin/env python3
"""
Populate QuickBooks Sandbox with Industry-Specific Data

This script creates accounts, customers, and transactions in QuickBooks sandbox
to simulate data for all 15 PlainLedger industries.

Usage:
    python scripts/providers/quickbooks/populate-industries.py \
        --refresh-token=RT1-xxx \
        --realm-id=9341456072863003

Environment variables:
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
from typing import Dict, Any, List, Optional
import httpx

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# QuickBooks API Base URL (Sandbox)
QB_API_BASE = "https://sandbox-quickbooks.api.intuit.com"
QB_OAUTH_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"


# ============================================================================
# INDUSTRY DEFINITIONS
# ============================================================================

INDUSTRIES = {
    "real_estate": {
        "name": "Real Estate",
        "accounts": [
            {"Name": "Rental Income - Residential", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Rental Income - Commercial", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Property Management Fees", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Property Maintenance", "AccountType": "Expense", "AccountSubType": "RepairMaintenance"},
            {"Name": "Property Insurance", "AccountType": "Expense", "AccountSubType": "Insurance"},
            {"Name": "Property Taxes", "AccountType": "Expense", "AccountSubType": "TaxesPaid"},
            {"Name": "Mortgage Interest", "AccountType": "Expense", "AccountSubType": "InterestPaid"},
            {"Name": "Building - Properties", "AccountType": "Fixed Asset", "AccountSubType": "Buildings"},
        ],
        "revenue_range": (150000, 350000),
        "expense_ratio": 0.45,
    },
    "restaurant": {
        "name": "Restaurant",
        "accounts": [
            {"Name": "Food Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Beverage Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Catering Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Food Cost - Inventory", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Beverage Cost", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Kitchen Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Front of House Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Kitchen Equipment", "AccountType": "Fixed Asset", "AccountSubType": "FurnitureAndFixtures"},
        ],
        "revenue_range": (80000, 200000),
        "expense_ratio": 0.65,
    },
    "hospitality": {
        "name": "Hospitality/Hotel",
        "accounts": [
            {"Name": "Room Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Food & Beverage Revenue", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Spa & Amenities Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Housekeeping Expense", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Front Desk Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Utilities - Hotel", "AccountType": "Expense", "AccountSubType": "Utilities"},
            {"Name": "Guest Supplies", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
        ],
        "revenue_range": (200000, 500000),
        "expense_ratio": 0.55,
    },
    "retail": {
        "name": "Retail",
        "accounts": [
            {"Name": "Product Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Online Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Returns & Allowances", "AccountType": "Income", "AccountSubType": "DiscountsRefundsGiven"},
            {"Name": "Cost of Goods Sold - Merchandise", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Store Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Store Rent", "AccountType": "Expense", "AccountSubType": "RentOrLeaseOfBuildings"},
            {"Name": "Inventory Shrinkage", "AccountType": "Expense", "AccountSubType": "OtherMiscellaneousServiceCost"},
        ],
        "revenue_range": (100000, 300000),
        "expense_ratio": 0.70,
    },
    "construction": {
        "name": "Construction",
        "accounts": [
            {"Name": "Contract Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Change Orders", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Materials Cost", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Subcontractor Costs", "AccountType": "Cost of Goods Sold", "AccountSubType": "CostOfLaborCos"},
            {"Name": "Construction Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Equipment Rental", "AccountType": "Expense", "AccountSubType": "EquipmentRental"},
            {"Name": "Heavy Equipment", "AccountType": "Fixed Asset", "AccountSubType": "MachineryAndEquipment"},
        ],
        "revenue_range": (300000, 800000),
        "expense_ratio": 0.75,
    },
    "professional_services": {
        "name": "Professional Services",
        "accounts": [
            {"Name": "Consulting Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Advisory Fees", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Retainer Income", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Professional Salaries", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Professional Development", "AccountType": "Expense", "AccountSubType": "Entertainment"},
            {"Name": "Office Rent", "AccountType": "Expense", "AccountSubType": "RentOrLeaseOfBuildings"},
            {"Name": "Software Subscriptions", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
        ],
        "revenue_range": (150000, 400000),
        "expense_ratio": 0.50,
    },
    "manufacturing": {
        "name": "Manufacturing",
        "accounts": [
            {"Name": "Product Sales - Manufactured", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Wholesale Revenue", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Raw Materials", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Direct Labor", "AccountType": "Cost of Goods Sold", "AccountSubType": "CostOfLaborCos"},
            {"Name": "Manufacturing Overhead", "AccountType": "Expense", "AccountSubType": "OtherMiscellaneousServiceCost"},
            {"Name": "Factory Rent", "AccountType": "Expense", "AccountSubType": "RentOrLeaseOfBuildings"},
            {"Name": "Manufacturing Equipment", "AccountType": "Fixed Asset", "AccountSubType": "MachineryAndEquipment"},
        ],
        "revenue_range": (400000, 1000000),
        "expense_ratio": 0.72,
    },
    "agriculture": {
        "name": "Agriculture",
        "accounts": [
            {"Name": "Crop Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Livestock Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Farm Subsidies", "AccountType": "Other Income", "AccountSubType": "OtherInvestmentIncome"},
            {"Name": "Seeds & Fertilizer", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Farm Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Fuel - Farm Equipment", "AccountType": "Expense", "AccountSubType": "Auto"},
            {"Name": "Farm Equipment", "AccountType": "Fixed Asset", "AccountSubType": "MachineryAndEquipment"},
        ],
        "revenue_range": (200000, 600000),
        "expense_ratio": 0.68,
    },
    "transport": {
        "name": "Transportation",
        "accounts": [
            {"Name": "Freight Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Delivery Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Fuel Surcharges", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Fuel Expense", "AccountType": "Expense", "AccountSubType": "Auto"},
            {"Name": "Driver Wages", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Vehicle Maintenance", "AccountType": "Expense", "AccountSubType": "RepairMaintenance"},
            {"Name": "Fleet Vehicles", "AccountType": "Fixed Asset", "AccountSubType": "Vehicles"},
        ],
        "revenue_range": (250000, 700000),
        "expense_ratio": 0.78,
    },
    "healthcare": {
        "name": "Healthcare",
        "accounts": [
            {"Name": "Patient Services Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Insurance Reimbursements", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Lab Services", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Medical Supplies", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
            {"Name": "Clinical Staff Wages", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Medical Equipment Lease", "AccountType": "Expense", "AccountSubType": "EquipmentRental"},
            {"Name": "Medical Equipment", "AccountType": "Fixed Asset", "AccountSubType": "MachineryAndEquipment"},
        ],
        "revenue_range": (300000, 800000),
        "expense_ratio": 0.60,
    },
    "education": {
        "name": "Education",
        "accounts": [
            {"Name": "Tuition Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Course Fees", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Grants & Funding", "AccountType": "Other Income", "AccountSubType": "OtherInvestmentIncome"},
            {"Name": "Instructor Salaries", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Learning Materials", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
            {"Name": "Facility Rent", "AccountType": "Expense", "AccountSubType": "RentOrLeaseOfBuildings"},
        ],
        "revenue_range": (150000, 400000),
        "expense_ratio": 0.58,
    },
    "wholesale": {
        "name": "Wholesale",
        "accounts": [
            {"Name": "Wholesale Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Distribution Revenue", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Cost of Goods - Wholesale", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Warehouse Labor", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Warehouse Rent", "AccountType": "Expense", "AccountSubType": "RentOrLeaseOfBuildings"},
            {"Name": "Shipping Costs", "AccountType": "Expense", "AccountSubType": "ShippingFreightDelivery"},
        ],
        "revenue_range": (500000, 1200000),
        "expense_ratio": 0.82,
    },
    "automotive": {
        "name": "Automotive",
        "accounts": [
            {"Name": "Vehicle Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Service & Repair Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Parts Sales", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Vehicle Inventory Cost", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Parts Cost", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Technician Wages", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Shop Equipment", "AccountType": "Fixed Asset", "AccountSubType": "MachineryAndEquipment"},
        ],
        "revenue_range": (400000, 1000000),
        "expense_ratio": 0.75,
    },
    "beauty_wellness": {
        "name": "Beauty & Wellness",
        "accounts": [
            {"Name": "Service Revenue - Salon", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Product Sales - Beauty", "AccountType": "Income", "AccountSubType": "SalesOfProductIncome"},
            {"Name": "Membership Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Beauty Products Cost", "AccountType": "Cost of Goods Sold", "AccountSubType": "SuppliesMaterialsCogs"},
            {"Name": "Stylist Wages", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "Salon Rent", "AccountType": "Expense", "AccountSubType": "RentOrLeaseOfBuildings"},
            {"Name": "Salon Equipment", "AccountType": "Fixed Asset", "AccountSubType": "FurnitureAndFixtures"},
        ],
        "revenue_range": (80000, 200000),
        "expense_ratio": 0.55,
    },
    "technology": {
        "name": "Technology",
        "accounts": [
            {"Name": "Software License Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "SaaS Subscription Revenue", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Implementation Services", "AccountType": "Income", "AccountSubType": "ServiceFeeIncome"},
            {"Name": "Cloud Hosting Costs", "AccountType": "Expense", "AccountSubType": "OfficeGeneralAdministrativeExpenses"},
            {"Name": "Developer Salaries", "AccountType": "Expense", "AccountSubType": "PayrollExpenses"},
            {"Name": "R&D Expenses", "AccountType": "Expense", "AccountSubType": "OtherMiscellaneousServiceCost"},
            {"Name": "Computer Equipment", "AccountType": "Fixed Asset", "AccountSubType": "ComputerSoftware"},
        ],
        "revenue_range": (200000, 600000),
        "expense_ratio": 0.35,
    },
}


# ============================================================================
# QUICKBOOKS API CLIENT
# ============================================================================

class QuickBooksClient:
    """Client for QuickBooks API operations"""
    
    def __init__(self, realm_id: str, access_token: str):
        self.realm_id = realm_id
        self.access_token = access_token
        self.base_url = f"{QB_API_BASE}/v3/company/{realm_id}"
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
    ) -> Dict:
        """Make authenticated request to QuickBooks API"""
        url = f"{self.base_url}/{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(url, headers=headers)
            elif method == "POST":
                response = await client.post(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
    
    async def query(self, query: str) -> List[Dict]:
        """Execute a QuickBooks query"""
        result = await self._request("GET", "query", None)
        # Note: QuickBooks query endpoint expects query param
        url = f"{self.base_url}/query?query={query}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.json().get("QueryResponse", {})
    
    async def create_account(self, account: Dict) -> Dict:
        """Create an account in QuickBooks"""
        try:
            result = await self._request("POST", "account", account)
            return result.get("Account", {})
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                # Account might already exist or have validation error
                error_data = e.response.json()
                logger.warning(f"Account creation warning: {error_data}")
                return {}
            raise
    
    async def create_customer(self, customer: Dict) -> Dict:
        """Create a customer in QuickBooks"""
        try:
            result = await self._request("POST", "customer", customer)
            return result.get("Customer", {})
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                error_data = e.response.json()
                logger.warning(f"Customer creation warning: {error_data}")
                return {}
            raise
    
    async def create_vendor(self, vendor: Dict) -> Dict:
        """Create a vendor in QuickBooks"""
        try:
            result = await self._request("POST", "vendor", vendor)
            return result.get("Vendor", {})
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                error_data = e.response.json()
                logger.warning(f"Vendor creation warning: {error_data}")
                return {}
            raise
    
    async def create_invoice(self, invoice: Dict) -> Dict:
        """Create an invoice in QuickBooks"""
        try:
            result = await self._request("POST", "invoice", invoice)
            return result.get("Invoice", {})
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                error_data = e.response.json()
                logger.warning(f"Invoice creation warning: {error_data}")
                return {}
            raise
    
    async def create_bill(self, bill: Dict) -> Dict:
        """Create a bill in QuickBooks"""
        try:
            result = await self._request("POST", "bill", bill)
            return result.get("Bill", {})
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                error_data = e.response.json()
                logger.warning(f"Bill creation warning: {error_data}")
                return {}
            raise


# ============================================================================
# TOKEN REFRESH
# ============================================================================

async def refresh_access_token(refresh_token: str) -> Dict[str, str]:
    """Refresh QuickBooks access token"""
    client_id = os.getenv("QUICKBOOKS_CLIENT_ID")
    client_secret = os.getenv("QUICKBOOKS_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        raise ValueError("Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            QB_OAUTH_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
            auth=(client_id, client_secret),
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        return response.json()


# ============================================================================
# INDUSTRY DATA POPULATION
# ============================================================================

async def get_existing_accounts(qb_client: QuickBooksClient) -> Dict[str, str]:
    """Get existing accounts mapped by name"""
    query_result = await qb_client.query("SELECT * FROM Account MAXRESULTS 1000")
    accounts = query_result.get("Account", [])
    return {acc["Name"]: acc["Id"] for acc in accounts}


async def get_existing_customers(qb_client: QuickBooksClient) -> Dict[str, str]:
    """Get existing customers mapped by name"""
    query_result = await qb_client.query("SELECT * FROM Customer MAXRESULTS 1000")
    customers = query_result.get("Customer", [])
    return {cust["DisplayName"]: cust["Id"] for cust in customers}


async def get_existing_vendors(qb_client: QuickBooksClient) -> Dict[str, str]:
    """Get existing vendors mapped by name"""
    query_result = await qb_client.query("SELECT * FROM Vendor MAXRESULTS 1000")
    vendors = query_result.get("Vendor", [])
    return {vend["DisplayName"]: vend["Id"] for vend in vendors}


async def populate_industry_data(
    qb_client: QuickBooksClient,
    industry_key: str,
    industry_config: Dict,
    existing_accounts: Dict[str, str],
) -> Dict[str, Any]:
    """Populate data for a specific industry"""
    logger.info(f"  📊 Populating {industry_config['name']} data...")
    
    stats = {"accounts_created": 0, "invoices_created": 0, "bills_created": 0}
    account_ids = {}
    
    # Create industry-specific accounts
    for account_def in industry_config["accounts"]:
        account_name = account_def["Name"]
        
        if account_name in existing_accounts:
            account_ids[account_name] = existing_accounts[account_name]
            logger.info(f"    ✓ Account exists: {account_name}")
        else:
            account = await qb_client.create_account(account_def)
            if account:
                account_ids[account_name] = account.get("Id")
                existing_accounts[account_name] = account.get("Id")
                stats["accounts_created"] += 1
                logger.info(f"    + Created account: {account_name}")
    
    return stats


async def main():
    parser = argparse.ArgumentParser(description="Populate QuickBooks with Industry Data")
    parser.add_argument("--refresh-token", required=True, help="QuickBooks refresh token")
    parser.add_argument("--realm-id", required=True, help="QuickBooks realm ID")
    parser.add_argument("--industries", nargs="*", help="Specific industries to populate (default: all)")
    
    args = parser.parse_args()
    
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  QUICKBOOKS INDUSTRY DATA POPULATION                         ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    
    # Refresh token
    logger.info("🔑 Refreshing access token...")
    tokens = await refresh_access_token(args.refresh_token)
    access_token = tokens["access_token"]
    new_refresh_token = tokens.get("refresh_token", args.refresh_token)
    
    logger.info(f"   ✅ Token refreshed")
    logger.info(f"   📝 New refresh token: {new_refresh_token}")
    
    # Initialize client
    qb_client = QuickBooksClient(args.realm_id, access_token)
    
    # Get existing data
    logger.info("📋 Fetching existing accounts...")
    existing_accounts = await get_existing_accounts(qb_client)
    logger.info(f"   Found {len(existing_accounts)} existing accounts")
    
    # Determine industries to process
    if args.industries:
        industries_to_process = {k: v for k, v in INDUSTRIES.items() if k in args.industries}
    else:
        industries_to_process = INDUSTRIES
    
    # Populate each industry
    total_stats = {"accounts_created": 0, "invoices_created": 0, "bills_created": 0}
    
    print()
    logger.info(f"🏭 Populating data for {len(industries_to_process)} industries...")
    print()
    
    for industry_key, industry_config in industries_to_process.items():
        stats = await populate_industry_data(
            qb_client,
            industry_key,
            industry_config,
            existing_accounts,
        )
        
        for key in total_stats:
            total_stats[key] += stats.get(key, 0)
    
    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ✅ INDUSTRY DATA POPULATION COMPLETE                        ║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print(f"║  Accounts created: {total_stats['accounts_created']}".ljust(63) + "║")
    print(f"║  Industries processed: {len(industries_to_process)}".ljust(63) + "║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print(f"║  New refresh token:".ljust(63) + "║")
    print(f"║  {new_refresh_token}".ljust(63) + "║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    print("💡 Next: Run the production pipeline to sync data:")
    print(f"   python scripts/run-production-pipeline.py \\")
    print(f"       --refresh-token=\"{new_refresh_token}\" \\")
    print(f"       --realm-id=\"{args.realm_id}\" \\")
    print(f"       --organization-id=\"demo-org\"")
    print()


if __name__ == "__main__":
    asyncio.run(main())
