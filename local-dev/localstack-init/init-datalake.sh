#!/bin/bash
# ============================================
# PlainLedger - LocalStack Datalake Initialization
# Creates S3 buckets for medallion architecture
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
echo "=========================================="
