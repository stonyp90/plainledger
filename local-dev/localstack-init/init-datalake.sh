#!/bin/bash
# ============================================
# PlainLedger - LocalStack Datalake Initialization
# Creates S3 buckets and seeds demo data
# ============================================

set -e

echo "=========================================="
echo "Initializing PlainLedger Datalake..."
echo "=========================================="

# Create Bronze bucket (raw data)
echo "Creating Bronze bucket..."
awslocal s3 mb s3://plainledger-bronze || true
awslocal s3api put-bucket-versioning \
    --bucket plainledger-bronze \
    --versioning-configuration Status=Enabled || true

# Create Silver bucket (cleansed data)
echo "Creating Silver bucket..."
awslocal s3 mb s3://plainledger-silver || true
awslocal s3api put-bucket-versioning \
    --bucket plainledger-silver \
    --versioning-configuration Status=Enabled || true

# Create Gold bucket (analytics-ready)
echo "Creating Gold bucket..."
awslocal s3 mb s3://plainledger-gold || true
awslocal s3api put-bucket-versioning \
    --bucket plainledger-gold \
    --versioning-configuration Status=Enabled || true

# Create Quarantine bucket (for invalid/failed records)
echo "Creating Quarantine bucket..."
awslocal s3 mb s3://plainledger-quarantine || true
awslocal s3api put-bucket-versioning \
    --bucket plainledger-quarantine \
    --versioning-configuration Status=Enabled || true

# Create Athena results bucket (for future use)
echo "Creating Athena results bucket..."
awslocal s3 mb s3://plainledger-athena-results || true

# Create Uploads bucket (logos, avatars, etc.)
echo "Creating Uploads bucket..."
awslocal s3 mb s3://plainledger-uploads || true
# Set CORS for web access
awslocal s3api put-bucket-cors \
    --bucket plainledger-uploads \
    --cors-configuration '{
        "CORSRules": [
            {
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["ETag"],
                "MaxAgeSeconds": 3600
            }
        ]
    }' || true

# Create folder structure in buckets
echo "Creating folder structure..."
echo "" | awslocal s3 cp - s3://plainledger-bronze/quickbooks/ || true
echo "" | awslocal s3 cp - s3://plainledger-bronze/xero/ || true
echo "" | awslocal s3 cp - s3://plainledger-bronze/sage/ || true
echo "" | awslocal s3 cp - s3://plainledger-bronze/csv/ || true

echo "" | awslocal s3 cp - s3://plainledger-silver/accounts/ || true
echo "" | awslocal s3 cp - s3://plainledger-silver/contacts/ || true
echo "" | awslocal s3 cp - s3://plainledger-silver/transactions/ || true

echo "" | awslocal s3 cp - s3://plainledger-gold/dim_account/ || true
echo "" | awslocal s3 cp - s3://plainledger-gold/dim_contact/ || true
echo "" | awslocal s3 cp - s3://plainledger-gold/dim_organization/ || true
echo "" | awslocal s3 cp - s3://plainledger-gold/fact_transaction/ || true
echo "" | awslocal s3 cp - s3://plainledger-gold/fact_account_balance/ || true

echo "" | awslocal s3 cp - s3://plainledger-quarantine/accounts/ || true
echo "" | awslocal s3 cp - s3://plainledger-quarantine/contacts/ || true
echo "" | awslocal s3 cp - s3://plainledger-quarantine/transactions/ || true

# ============================================
# Seed Demo Data for Demo Real Estate Corp
# ============================================
echo ""
echo "Seeding demo data for demo-org..."

DEMO_ORG="demo-org"
TODAY=$(date +%Y-%m-%d)

# Create dim_account demo data (Chart of Accounts)
cat > /tmp/accounts.json << 'ACCOUNTS_EOF'
[
  {"account_key":"acc_001","account_id":"1","source_account_id":"1","organization_key":"demo-org","account_code":"1000","account_name":"Business Chequing - RBC","account_type":"ASSET","account_subtype":"Bank","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Assets/Bank","is_debit_normal":true,"balance_sheet_section":"current_assets"},
  {"account_key":"acc_002","account_id":"2","source_account_id":"2","organization_key":"demo-org","account_code":"1100","account_name":"Tenant Receivables","account_type":"ASSET","account_subtype":"AccountsReceivable","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Assets/Receivables","is_debit_normal":true,"balance_sheet_section":"current_assets"},
  {"account_key":"acc_010","account_id":"10","source_account_id":"10","organization_key":"demo-org","account_code":"1500","account_name":"Commercial Building - 123 Main St","account_type":"ASSET","account_subtype":"Buildings","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Assets/FixedAssets/Property","is_debit_normal":true,"balance_sheet_section":"fixed_assets"},
  {"account_key":"acc_020","account_id":"20","source_account_id":"20","organization_key":"demo-org","account_code":"2000","account_name":"Accounts Payable","account_type":"LIABILITY","account_subtype":"AccountsPayable","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Liabilities/CurrentLiabilities","is_debit_normal":false,"balance_sheet_section":"current_liabilities"},
  {"account_key":"acc_025","account_id":"25","source_account_id":"25","organization_key":"demo-org","account_code":"2500","account_name":"Commercial Mortgage","account_type":"LIABILITY","account_subtype":"NotesPayable","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Liabilities/LongTermDebt","is_debit_normal":false,"balance_sheet_section":"long_term_liabilities"},
  {"account_key":"acc_030","account_id":"30","source_account_id":"30","organization_key":"demo-org","account_code":"3000","account_name":"Share Capital","account_type":"EQUITY","account_subtype":"ShareCapital","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Equity/Capital","is_debit_normal":false,"balance_sheet_section":"equity"},
  {"account_key":"acc_040","account_id":"40","source_account_id":"40","organization_key":"demo-org","account_code":"4000","account_name":"Rental Income - Commercial","account_type":"REVENUE","account_subtype":"RentalIncome","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Revenue/RentalIncome","is_debit_normal":false,"income_statement_section":"operating_revenue"},
  {"account_key":"acc_050","account_id":"50","source_account_id":"50","organization_key":"demo-org","account_code":"5100","account_name":"Property Taxes","account_type":"EXPENSE","account_subtype":"TaxesPaid","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Expenses/PropertyTax","is_debit_normal":true,"income_statement_section":"operating_expenses"},
  {"account_key":"acc_051","account_id":"51","source_account_id":"51","organization_key":"demo-org","account_code":"5200","account_name":"Building Maintenance","account_type":"EXPENSE","account_subtype":"RepairMaintenance","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Expenses/Maintenance","is_debit_normal":true,"income_statement_section":"operating_expenses"},
  {"account_key":"acc_052","account_id":"52","source_account_id":"52","organization_key":"demo-org","account_code":"5300","account_name":"Property Insurance","account_type":"EXPENSE","account_subtype":"Insurance","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Expenses/Insurance","is_debit_normal":true,"income_statement_section":"operating_expenses"},
  {"account_key":"acc_053","account_id":"53","source_account_id":"53","organization_key":"demo-org","account_code":"5400","account_name":"Utilities","account_type":"EXPENSE","account_subtype":"Utilities","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Expenses/Utilities","is_debit_normal":true,"income_statement_section":"operating_expenses"},
  {"account_key":"acc_054","account_id":"54","source_account_id":"54","organization_key":"demo-org","account_code":"5500","account_name":"Mortgage Interest","account_type":"EXPENSE","account_subtype":"InterestPaid","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Expenses/Interest","is_debit_normal":true,"income_statement_section":"other_expenses"},
  {"account_key":"acc_055","account_id":"55","source_account_id":"55","organization_key":"demo-org","account_code":"6000","account_name":"Salaries and Wages","account_type":"EXPENSE","account_subtype":"PayrollExpense","is_active":true,"hierarchy_level":1,"hierarchy_path":"/Expenses/Payroll","is_debit_normal":true,"income_statement_section":"operating_expenses"}
]
ACCOUNTS_EOF

awslocal s3 cp /tmp/accounts.json "s3://plainledger-gold/dim_account/${DEMO_ORG}/accounts_${TODAY}.json" || true

# Create dim_contact demo data (Customers/Vendors)
cat > /tmp/contacts.json << 'CONTACTS_EOF'
[
  {"contact_key":"cust_001","contact_id":"101","source_contact_id":"101","organization_key":"demo-org","contact_type":"CUSTOMER","display_name":"Tech Solutions Inc.","company_name":"Tech Solutions Incorporated","email":"jean@techsolutions.ca","is_customer":true,"is_vendor":false,"is_active":true},
  {"contact_key":"cust_002","contact_id":"102","source_contact_id":"102","organization_key":"demo-org","contact_type":"CUSTOMER","display_name":"Montreal Marketing Group","company_name":"Montreal Marketing Group Inc.","email":"info@mmg.ca","is_customer":true,"is_vendor":false,"is_active":true},
  {"contact_key":"cust_003","contact_id":"103","source_contact_id":"103","organization_key":"demo-org","contact_type":"CUSTOMER","display_name":"Quebec Consulting Partners","company_name":"Quebec Consulting Partners Ltd.","email":"contact@qcp.ca","is_customer":true,"is_vendor":false,"is_active":true},
  {"contact_key":"vend_001","contact_id":"201","source_contact_id":"201","organization_key":"demo-org","contact_type":"VENDOR","display_name":"City Maintenance Services","company_name":"City Maintenance Services Inc.","email":"service@citymaintenance.ca","is_customer":false,"is_vendor":true,"is_active":true},
  {"contact_key":"vend_002","contact_id":"202","source_contact_id":"202","organization_key":"demo-org","contact_type":"VENDOR","display_name":"Hydro Quebec","company_name":"Hydro-Québec","email":"commercial@hydroquebec.com","is_customer":false,"is_vendor":true,"is_active":true}
]
CONTACTS_EOF

awslocal s3 cp /tmp/contacts.json "s3://plainledger-gold/dim_contact/${DEMO_ORG}/contacts_${TODAY}.json" || true

# Create fact_transaction demo data (12 months of transactions)
# Includes credit_amount (revenue) and debit_amount (expenses) for trend calculation
cat > /tmp/transactions.json << 'TRANSACTIONS_EOF'
[
  {"transaction_key":"txn_001","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-03-01","credit_amount":8500,"debit_amount":0,"amount":8500,"transaction_type_key":"invoice","memo":"Rent - Tech Solutions"},
  {"transaction_key":"txn_002","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-03-01","credit_amount":7200,"debit_amount":0,"amount":7200,"transaction_type_key":"invoice","memo":"Rent - Montreal Marketing"},
  {"transaction_key":"txn_003","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-03-01","credit_amount":6800,"debit_amount":0,"amount":6800,"transaction_type_key":"invoice","memo":"Rent - Quebec Consulting"},
  {"transaction_key":"txn_004","organization_key":"demo-org","account_key":"acc_050","transaction_date":"2025-03-15","credit_amount":0,"debit_amount":4000,"amount":4000,"transaction_type_key":"bill","memo":"Property Taxes Q1"},
  {"transaction_key":"txn_005","organization_key":"demo-org","account_key":"acc_051","transaction_date":"2025-03-15","credit_amount":0,"debit_amount":2900,"amount":2900,"transaction_type_key":"bill","memo":"Building Maintenance"},
  {"transaction_key":"txn_006","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-04-01","credit_amount":8500,"debit_amount":0,"amount":8500,"transaction_type_key":"invoice","memo":"Rent - Tech Solutions"},
  {"transaction_key":"txn_007","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-04-01","credit_amount":7200,"debit_amount":0,"amount":7200,"transaction_type_key":"invoice","memo":"Rent - Montreal Marketing"},
  {"transaction_key":"txn_008","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-04-01","credit_amount":6800,"debit_amount":0,"amount":6800,"transaction_type_key":"invoice","memo":"Rent - Quebec Consulting"},
  {"transaction_key":"txn_009","organization_key":"demo-org","account_key":"acc_052","transaction_date":"2025-04-15","credit_amount":0,"debit_amount":1500,"amount":1500,"transaction_type_key":"bill","memo":"Property Insurance"},
  {"transaction_key":"txn_010","organization_key":"demo-org","account_key":"acc_053","transaction_date":"2025-04-15","credit_amount":0,"debit_amount":2000,"amount":2000,"transaction_type_key":"bill","memo":"Utilities"},
  {"transaction_key":"txn_011","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-05-01","credit_amount":8500,"debit_amount":0,"amount":8500,"transaction_type_key":"invoice","memo":"Rent - Tech Solutions"},
  {"transaction_key":"txn_012","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-05-01","credit_amount":7200,"debit_amount":0,"amount":7200,"transaction_type_key":"invoice","memo":"Rent - Montreal Marketing"},
  {"transaction_key":"txn_013","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-05-01","credit_amount":6800,"debit_amount":0,"amount":6800,"transaction_type_key":"invoice","memo":"Rent - Quebec Consulting"},
  {"transaction_key":"txn_014","organization_key":"demo-org","account_key":"acc_054","transaction_date":"2025-05-15","credit_amount":0,"debit_amount":6000,"amount":6000,"transaction_type_key":"bill","memo":"Mortgage Interest"},
  {"transaction_key":"txn_015","organization_key":"demo-org","account_key":"acc_055","transaction_date":"2025-05-15","credit_amount":0,"debit_amount":4500,"amount":4500,"transaction_type_key":"bill","memo":"Salaries"},
  {"transaction_key":"txn_016","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-06-01","credit_amount":8700,"debit_amount":0,"amount":8700,"transaction_type_key":"invoice","memo":"Rent - Tech Solutions"},
  {"transaction_key":"txn_017","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-06-01","credit_amount":7400,"debit_amount":0,"amount":7400,"transaction_type_key":"invoice","memo":"Rent - Montreal Marketing"},
  {"transaction_key":"txn_018","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-06-01","credit_amount":7000,"debit_amount":0,"amount":7000,"transaction_type_key":"invoice","memo":"Rent - Quebec Consulting"},
  {"transaction_key":"txn_019","organization_key":"demo-org","account_key":"acc_050","transaction_date":"2025-06-15","credit_amount":0,"debit_amount":4100,"amount":4100,"transaction_type_key":"bill","memo":"Property Taxes Q2"},
  {"transaction_key":"txn_020","organization_key":"demo-org","account_key":"acc_051","transaction_date":"2025-06-15","credit_amount":0,"debit_amount":3100,"amount":3100,"transaction_type_key":"bill","memo":"Building Maintenance"},
  {"transaction_key":"txn_021","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-07-01","credit_amount":8800,"debit_amount":0,"amount":8800,"transaction_type_key":"invoice","memo":"Rent - Tech Solutions"},
  {"transaction_key":"txn_022","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-07-01","credit_amount":7500,"debit_amount":0,"amount":7500,"transaction_type_key":"invoice","memo":"Rent - Montreal Marketing"},
  {"transaction_key":"txn_023","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-07-01","credit_amount":7100,"debit_amount":0,"amount":7100,"transaction_type_key":"invoice","memo":"Rent - Quebec Consulting"},
  {"transaction_key":"txn_024","organization_key":"demo-org","account_key":"acc_053","transaction_date":"2025-07-15","credit_amount":0,"debit_amount":2200,"amount":2200,"transaction_type_key":"bill","memo":"Utilities"},
  {"transaction_key":"txn_025","organization_key":"demo-org","account_key":"acc_055","transaction_date":"2025-07-15","credit_amount":0,"debit_amount":4600,"amount":4600,"transaction_type_key":"bill","memo":"Salaries"},
  {"transaction_key":"txn_026","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-08-01","credit_amount":9000,"debit_amount":0,"amount":9000,"transaction_type_key":"invoice","memo":"Rent - Tech Solutions"},
  {"transaction_key":"txn_027","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-08-01","credit_amount":7600,"debit_amount":0,"amount":7600,"transaction_type_key":"invoice","memo":"Rent - Montreal Marketing"},
  {"transaction_key":"txn_028","organization_key":"demo-org","account_key":"acc_040","transaction_date":"2025-08-01","credit_amount":7200,"debit_amount":0,"amount":7200,"transaction_type_key":"invoice","memo":"Rent - Quebec Consulting"},
  {"transaction_key":"txn_029","organization_key":"demo-org","account_key":"acc_051","transaction_date":"2025-08-15","credit_amount":0,"debit_amount":3200,"amount":3200,"transaction_type_key":"bill","memo":"Building Maintenance"},
  {"transaction_key":"txn_030","organization_key":"demo-org","account_key":"acc_054","transaction_date":"2025-08-15","credit_amount":0,"debit_amount":5900,"amount":5900,"transaction_type_key":"bill","memo":"Mortgage Interest"}
]
TRANSACTIONS_EOF

awslocal s3 cp /tmp/transactions.json "s3://plainledger-gold/fact_transaction/${DEMO_ORG}/transactions_${TODAY}.json" || true

# Cleanup temp files
rm -f /tmp/accounts.json /tmp/contacts.json /tmp/transactions.json

echo "=========================================="
echo "Datalake initialization complete!"
echo ""
echo "Buckets created:"
echo "  - plainledger-bronze (raw data)"
echo "  - plainledger-silver (cleansed data)"
echo "  - plainledger-gold (analytics-ready)"
echo "  - plainledger-quarantine (invalid records)"
echo "  - plainledger-athena-results"
echo "  - plainledger-uploads (logos, avatars)"
echo ""
echo "Demo data seeded for: demo-org"
echo "  - 13 accounts (Chart of Accounts)"
echo "  - 5 contacts (Customers/Vendors)"
echo "  - 20 transactions (sample data)"
echo "=========================================="
