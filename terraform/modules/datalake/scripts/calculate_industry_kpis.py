"""
Industry KPI Calculator ETL Job

Calculates industry-specific KPIs from Gold layer data and writes to fact_industry_kpis.
Supports: Restaurant, Retail, Real Estate, Construction, Professional Services, etc.

Usage: AWS Glue Job with PySpark
"""

import sys
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Any

from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkContext
from pyspark.sql import SparkSession, DataFrame
from pyspark.sql.functions import (
    col, sum as spark_sum, avg, count, when, lit, 
    year, month, to_date, current_date, abs as spark_abs
)
from pyspark.sql.types import (
    StructType, StructField, StringType, DecimalType, 
    IntegerType, DateType, TimestampType
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

# =============================================================================
# Industry Account Mappings
# =============================================================================

INDUSTRY_MAPPINGS = {
    "restaurant": {
        "categories": {
            "food_cost": {
                "keywords": ["food", "groceries", "ingredients", "produce", "meat", "dairy"],
                "account_types": ["EXPENSE"],
                "subtypes": ["SuppliesMaterials", "CostOfGoodsSold"]
            },
            "beverage_cost": {
                "keywords": ["beverage", "drinks", "alcohol", "wine", "beer", "liquor"],
                "account_types": ["EXPENSE"],
                "subtypes": ["SuppliesMaterials", "CostOfGoodsSold"]
            },
            "labor_cost": {
                "keywords": ["wages", "salaries", "payroll", "benefits", "employee"],
                "account_types": ["EXPENSE"],
                "subtypes": ["PayrollExpenses", "CostOfLaborCos"]
            },
            "food_sales": {
                "keywords": ["food sales", "restaurant sales", "dining", "menu"],
                "account_types": ["REVENUE"],
                "subtypes": ["SalesOfProductIncome", "ServiceFeeIncome"]
            },
            "beverage_sales": {
                "keywords": ["beverage sales", "bar sales", "drinks"],
                "account_types": ["REVENUE"],
                "subtypes": ["SalesOfProductIncome"]
            },
            "total_revenue": {
                "keywords": ["sales", "revenue", "income"],
                "account_types": ["REVENUE"],
                "subtypes": ["SalesOfProductIncome", "ServiceFeeIncome", "OtherPrimaryIncome"]
            }
        },
        "kpis": [
            {"id": "food_cost_pct", "formula": "food_cost / food_sales * 100", "benchmark": (28, 35)},
            {"id": "beverage_cost_pct", "formula": "beverage_cost / beverage_sales * 100", "benchmark": (18, 24)},
            {"id": "labor_cost_pct", "formula": "labor_cost / total_revenue * 100", "benchmark": (25, 35)},
            {"id": "prime_cost_pct", "formula": "(food_cost + beverage_cost + labor_cost) / total_revenue * 100", "benchmark": (55, 65)}
        ]
    },
    "retail": {
        "categories": {
            "cogs": {
                "keywords": ["cost of goods", "cogs", "merchandise", "inventory cost"],
                "account_types": ["EXPENSE"],
                "subtypes": ["CostOfGoodsSold"]
            },
            "sales": {
                "keywords": ["sales", "retail sales", "merchandise sales"],
                "account_types": ["REVENUE"],
                "subtypes": ["SalesOfProductIncome"]
            },
            "inventory": {
                "keywords": ["inventory", "stock", "merchandise"],
                "account_types": ["ASSET"],
                "subtypes": ["Inventory", "OtherCurrentAssets"]
            }
        },
        "kpis": [
            {"id": "gross_margin_pct", "formula": "(sales - cogs) / sales * 100", "benchmark": (30, 50)},
            {"id": "inventory_turnover", "formula": "cogs / inventory", "benchmark": (4, 12)}
        ]
    },
    "real_estate": {
        "categories": {
            "rental_income": {
                "keywords": ["rent", "rental", "lease", "loyer"],
                "account_types": ["REVENUE"],
                "subtypes": ["RentalIncome", "OtherPrimaryIncome"]
            },
            "operating_expenses": {
                "keywords": ["maintenance", "repairs", "utilities", "insurance", "property tax"],
                "account_types": ["EXPENSE"],
                "subtypes": ["RepairMaintenance", "Utilities", "Insurance", "Taxes"]
            },
            "property_value": {
                "keywords": ["building", "property", "land", "real estate"],
                "account_types": ["ASSET"],
                "subtypes": ["FixedAsset", "Buildings"]
            }
        },
        "kpis": [
            {"id": "re_noi", "formula": "rental_income - operating_expenses", "benchmark": None},
            {"id": "re_cap_rate", "formula": "(rental_income - operating_expenses) / property_value * 100", "benchmark": (4, 10)},
            {"id": "re_expense_ratio", "formula": "operating_expenses / rental_income * 100", "benchmark": (30, 50)}
        ]
    },
    "construction": {
        "categories": {
            "project_revenue": {
                "keywords": ["contract", "project", "job", "construction"],
                "account_types": ["REVENUE"],
                "subtypes": ["SalesOfProductIncome", "ServiceFeeIncome"]
            },
            "direct_costs": {
                "keywords": ["materials", "labor", "subcontractor", "equipment"],
                "account_types": ["EXPENSE"],
                "subtypes": ["CostOfGoodsSold", "CostOfLaborCos", "SuppliesMaterials"]
            },
            "wip": {
                "keywords": ["WIP", "work in progress", "unbilled"],
                "account_types": ["ASSET"],
                "subtypes": ["OtherCurrentAssets"]
            }
        },
        "kpis": [
            {"id": "job_margin_pct", "formula": "(project_revenue - direct_costs) / project_revenue * 100", "benchmark": (15, 30)},
            {"id": "wip_balance", "formula": "wip", "benchmark": None}
        ]
    },
    "professional_services": {
        "categories": {
            "billable_revenue": {
                "keywords": ["consulting", "professional fees", "billable", "services"],
                "account_types": ["REVENUE"],
                "subtypes": ["ServiceFeeIncome", "ConsultingIncome"]
            },
            "salaries": {
                "keywords": ["salaries", "wages", "payroll", "compensation"],
                "account_types": ["EXPENSE"],
                "subtypes": ["PayrollExpenses"]
            },
            "accounts_receivable": {
                "keywords": ["receivable", "A/R", "clients"],
                "account_types": ["ASSET"],
                "subtypes": ["AccountsReceivable"]
            }
        },
        "kpis": [
            {"id": "ar_days", "formula": "accounts_receivable / billable_revenue * 365", "benchmark": (30, 60)}
        ]
    }
}


def match_account_to_category(
    account_name: str, 
    account_type: str, 
    account_subtype: str,
    industry_id: str
) -> Optional[str]:
    """Match an account to an industry category based on name keywords and type."""
    if industry_id not in INDUSTRY_MAPPINGS:
        return None
    
    mapping = INDUSTRY_MAPPINGS[industry_id]
    name_lower = account_name.lower() if account_name else ""
    
    for category_id, category in mapping["categories"].items():
        # Check account type first
        if account_type not in category["account_types"]:
            continue
            
        # Check keywords in account name
        for keyword in category["keywords"]:
            if keyword.lower() in name_lower:
                return category_id
        
        # Check subtype match
        if account_subtype and account_subtype in category.get("subtypes", []):
            # Additional keyword check to avoid false positives
            for keyword in category["keywords"]:
                if keyword.lower() in name_lower:
                    return category_id
    
    return None


def calculate_kpis_for_organization(
    org_id: str,
    industry_id: str,
    accounts_df: DataFrame,
    transactions_df: DataFrame,
    as_of_date: date
) -> Dict[str, Any]:
    """Calculate industry KPIs for a single organization."""
    
    if industry_id not in INDUSTRY_MAPPINGS:
        return {"organization_key": org_id, "industry": industry_id}
    
    mapping = INDUSTRY_MAPPINGS[industry_id]
    
    # Collect accounts and match to categories
    accounts = accounts_df.filter(col("organization_key") == org_id).collect()
    account_categories = {}
    
    for acc in accounts:
        category = match_account_to_category(
            acc.account_name,
            acc.account_type,
            acc.account_subtype,
            industry_id
        )
        if category:
            account_categories[acc.account_key] = category
            if acc.source_account_id:
                account_categories[acc.source_account_id] = category
    
    # Calculate category totals from transactions
    org_transactions = transactions_df.filter(col("organization_key") == org_id).collect()
    
    category_totals = {}
    for txn in org_transactions:
        account_key = txn.account_key
        category = account_categories.get(account_key)
        
        if category:
            if category not in category_totals:
                category_totals[category] = Decimal(0)
            # Use absolute amount for aggregation
            amount = abs(Decimal(str(txn.amount or 0)))
            category_totals[category] += amount
    
    # Calculate KPIs
    kpi_values = {
        "organization_key": org_id,
        "industry": industry_id,
        "date_key": int(as_of_date.strftime("%Y%m%d")),
    }
    
    for kpi_def in mapping["kpis"]:
        kpi_id = kpi_def["id"]
        formula = kpi_def["formula"]
        
        try:
            # Simple formula evaluation
            # Replace category names with values
            eval_formula = formula
            for cat_id, total in category_totals.items():
                eval_formula = eval_formula.replace(cat_id, str(float(total)))
            
            # Check if all categories in formula have values
            has_all_values = True
            for cat_id in mapping["categories"].keys():
                if cat_id in formula and cat_id not in category_totals:
                    has_all_values = False
                    break
            
            if has_all_values:
                result = eval(eval_formula)
                if result is not None and not (isinstance(result, float) and (result != result)):  # NaN check
                    kpi_values[kpi_id] = round(float(result), 2)
        except Exception as e:
            print(f"Error calculating KPI {kpi_id} for org {org_id}: {e}")
    
    return kpi_values


def main():
    """Main ETL job logic."""
    print(f"Starting Industry KPI Calculator ETL Job")
    print(f"Gold Bucket: {GOLD_BUCKET}")
    print(f"Database: {DATABASE_NAME}")
    
    # Read organization data to get industries
    try:
        org_df = spark.read.parquet(f"s3://{GOLD_BUCKET}/dim_organization/")
        print(f"Loaded {org_df.count()} organizations")
    except Exception as e:
        print(f"Error reading organizations: {e}")
        # Try JSON format as fallback
        try:
            org_df = spark.read.json(f"s3://{GOLD_BUCKET}/dim_organization/")
            print(f"Loaded {org_df.count()} organizations from JSON")
        except:
            print("No organization data found, exiting")
            job.commit()
            return
    
    # Read accounts
    try:
        accounts_df = spark.read.parquet(f"s3://{GOLD_BUCKET}/dim_account/")
        print(f"Loaded {accounts_df.count()} accounts")
    except:
        try:
            accounts_df = spark.read.json(f"s3://{GOLD_BUCKET}/dim_account/")
            print(f"Loaded {accounts_df.count()} accounts from JSON")
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
            print(f"Loaded {transactions_df.count()} transactions from JSON")
        except Exception as e:
            print(f"Error reading transactions: {e}")
            job.commit()
            return
    
    # Process each organization
    as_of_date = date.today()
    kpi_records = []
    
    organizations = org_df.select("organization_key", "organization_id", "industry").distinct().collect()
    
    for org in organizations:
        org_key = org.organization_key or org.organization_id
        industry = org.industry
        
        if not industry:
            print(f"Skipping org {org_key} - no industry specified")
            continue
        
        print(f"Processing org {org_key} with industry {industry}")
        
        kpi_values = calculate_kpis_for_organization(
            org_key,
            industry,
            accounts_df,
            transactions_df,
            as_of_date
        )
        
        kpi_records.append(kpi_values)
    
    if not kpi_records:
        print("No KPI records to write")
        job.commit()
        return
    
    # Create DataFrame and write to Gold layer
    kpi_schema = StructType([
        StructField("kpi_key", StringType(), True),
        StructField("organization_key", StringType(), True),
        StructField("date_key", IntegerType(), True),
        StructField("industry", StringType(), True),
        # Restaurant KPIs
        StructField("food_cost_pct", DecimalType(5, 2), True),
        StructField("beverage_cost_pct", DecimalType(5, 2), True),
        StructField("labor_cost_pct", DecimalType(5, 2), True),
        StructField("prime_cost_pct", DecimalType(5, 2), True),
        StructField("average_check", DecimalType(18, 2), True),
        StructField("covers_per_day", IntegerType(), True),
        # Retail KPIs
        StructField("gross_margin_pct", DecimalType(5, 2), True),
        StructField("inventory_turnover", DecimalType(8, 2), True),
        StructField("sales_per_sqft", DecimalType(18, 2), True),
        StructField("shrinkage_pct", DecimalType(5, 2), True),
        # Professional Services
        StructField("utilization_rate", DecimalType(5, 2), True),
        StructField("realization_rate", DecimalType(5, 2), True),
        StructField("effective_rate", DecimalType(18, 2), True),
        StructField("ar_days", IntegerType(), True),
        StructField("wip_days", IntegerType(), True),
        # Construction
        StructField("job_margin_pct", DecimalType(5, 2), True),
        StructField("wip_balance", DecimalType(18, 2), True),
        StructField("retention_balance", DecimalType(18, 2), True),
        StructField("backlog_value", DecimalType(18, 2), True),
        # Real Estate
        StructField("re_occupancy_rate", DecimalType(5, 2), True),
        StructField("re_cap_rate", DecimalType(5, 2), True),
        StructField("re_noi", DecimalType(18, 2), True),
        StructField("re_rent_per_sqft", DecimalType(10, 2), True),
        StructField("re_vacancy_rate", DecimalType(5, 2), True),
        StructField("re_expense_ratio", DecimalType(5, 2), True),
        StructField("re_cash_on_cash", DecimalType(5, 2), True),
        # Hospitality
        StructField("occupancy_rate", DecimalType(5, 2), True),
        StructField("adr", DecimalType(18, 2), True),
        StructField("revpar", DecimalType(18, 2), True),
        StructField("trevpar", DecimalType(18, 2), True),
        StructField("cpor", DecimalType(18, 2), True),
    ])
    
    # Normalize records to match schema
    normalized_records = []
    for record in kpi_records:
        org_key = record.get("organization_key", "")
        date_key = record.get("date_key", int(as_of_date.strftime("%Y%m%d")))
        
        normalized = {
            "kpi_key": f"kpi_{org_key}_{date_key}",
            "organization_key": org_key,
            "date_key": date_key,
            "industry": record.get("industry"),
            # Restaurant
            "food_cost_pct": record.get("food_cost_pct"),
            "beverage_cost_pct": record.get("beverage_cost_pct"),
            "labor_cost_pct": record.get("labor_cost_pct"),
            "prime_cost_pct": record.get("prime_cost_pct"),
            "average_check": record.get("average_check"),
            "covers_per_day": record.get("covers_per_day"),
            # Retail
            "gross_margin_pct": record.get("gross_margin_pct"),
            "inventory_turnover": record.get("inventory_turnover"),
            "sales_per_sqft": record.get("sales_per_sqft"),
            "shrinkage_pct": record.get("shrinkage_pct"),
            # Professional Services
            "utilization_rate": record.get("utilization_rate"),
            "realization_rate": record.get("realization_rate"),
            "effective_rate": record.get("effective_rate"),
            "ar_days": record.get("ar_days"),
            "wip_days": record.get("wip_days"),
            # Construction
            "job_margin_pct": record.get("job_margin_pct"),
            "wip_balance": record.get("wip_balance"),
            "retention_balance": record.get("retention_balance"),
            "backlog_value": record.get("backlog_value"),
            # Real Estate
            "re_occupancy_rate": record.get("re_occupancy_rate"),
            "re_cap_rate": record.get("re_cap_rate"),
            "re_noi": record.get("re_noi"),
            "re_rent_per_sqft": record.get("re_rent_per_sqft"),
            "re_vacancy_rate": record.get("re_vacancy_rate"),
            "re_expense_ratio": record.get("re_expense_ratio"),
            "re_cash_on_cash": record.get("re_cash_on_cash"),
            # Hospitality
            "occupancy_rate": record.get("occupancy_rate"),
            "adr": record.get("adr"),
            "revpar": record.get("revpar"),
            "trevpar": record.get("trevpar"),
            "cpor": record.get("cpor"),
        }
        normalized_records.append(normalized)
    
    kpi_df = spark.createDataFrame(normalized_records, kpi_schema)
    
    # Write to Gold layer with partitioning
    output_path = f"s3://{GOLD_BUCKET}/fact_industry_kpis/"
    
    kpi_df.write \
        .mode("overwrite") \
        .partitionBy("organization_key") \
        .parquet(output_path)
    
    print(f"Wrote {len(kpi_records)} KPI records to {output_path}")
    
    job.commit()
    print("Industry KPI Calculator ETL Job completed successfully")


if __name__ == "__main__":
    main()
