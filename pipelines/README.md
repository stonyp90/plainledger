# ETL Pipelines

Production-grade ETL pipeline architecture following the Medallion pattern (Bronze → Silver → Gold).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA SOURCES                                    │
├──────────────┬──────────────┬──────────────┬──────────────┬────────────────┤
│  QuickBooks  │     Xero     │     Sage     │  FreshBooks  │    Manual      │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┴───────┬────────┘
       │              │              │              │               │
       ▼              ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXTRACTORS (Provider-Specific)                       │
│  - OAuth token refresh                                                       │
│  - API pagination handling                                                   │
│  - Rate limiting                                                             │
│  - Raw JSON output                                                           │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BRONZE LAYER (S3)                               │
│  - Raw data as-is from source                                               │
│  - Partitioned by: source_system / entity_type / ingested_date              │
│  - Format: JSON/Parquet                                                      │
│  - Retention: 90 days                                                        │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BRONZE → SILVER TRANSFORMER                              │
│  - Schema normalization (provider-specific → standard)                       │
│  - Data type casting                                                         │
│  - Deduplication (keep latest by source_id)                                  │
│  - Sanitization (trim, control chars, unicode)                               │
│  - Validation (quarantine failures)                                          │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SILVER LAYER (S3)                               │
│  - Cleaned, deduplicated, validated                                          │
│  - Partitioned by: organization_id / entity_type                            │
│  - Format: Parquet (columnar)                                                │
│  - Retention: 1 year                                                         │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SILVER → GOLD TRANSFORMER                                │
│  - Dimension modeling (SCD Type 2)                                           │
│  - Fact table aggregation                                                    │
│  - KPI calculations                                                          │
│  - Cross-entity joins                                                        │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GOLD LAYER (S3)                                 │
│  - Analytics-ready dimensional model                                         │
│  - Partitioned by: organization_id                                           │
│  - Format: Parquet (optimized)                                               │
│  - Retention: Indefinite                                                     │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONSUMERS                                       │
├──────────────┬──────────────┬──────────────┬────────────────────────────────┤
│   API/Cache  │    Athena    │   Dashboards │      ML/Analytics              │
└──────────────┴──────────────┴──────────────┴────────────────────────────────┘
```

## Directory Structure

```
pipelines/
├── README.md                    # This file
├── config/                      # Environment configs
│   ├── dev.yaml
│   ├── staging.yaml
│   └── prod.yaml
│
├── extractors/                  # Data extraction (source-specific)
│   ├── base_extractor.py       # Abstract base class
│   ├── quickbooks/
│   │   ├── __init__.py
│   │   ├── extractor.py        # QuickBooks API extractor
│   │   ├── auth.py             # OAuth handling
│   │   └── entities.py         # Entity definitions
│   ├── xero/
│   │   └── ...
│   └── sage/
│       └── ...
│
├── transformers/                # Data transformation
│   ├── bronze_to_silver/
│   │   ├── __init__.py
│   │   ├── normalizer.py       # Schema normalization
│   │   ├── deduplicator.py     # Deduplication logic
│   │   ├── sanitizer.py        # Data sanitization
│   │   ├── validator.py        # Validation rules
│   │   └── plugins/            # Provider-specific transforms
│   │       ├── quickbooks.py
│   │       └── xero.py
│   └── silver_to_gold/
│       ├── __init__.py
│       ├── dimensions.py       # Dimension builders
│       ├── facts.py            # Fact table builders
│       └── kpis.py             # KPI calculations
│
├── loaders/                     # Data loading
│   ├── s3_loader.py            # S3 write operations
│   ├── postgres_loader.py      # PostgreSQL sync
│   └── cache_invalidator.py    # Redis cache invalidation
│
├── orchestration/               # Job orchestration
│   ├── glue_jobs/              # AWS Glue job definitions
│   │   ├── bronze_to_silver.py
│   │   ├── silver_to_gold.py
│   │   └── kpi_calculator.py
│   ├── triggers/               # Event triggers
│   │   └── eventbridge.tf
│   └── schedules/              # Cron schedules
│       └── scheduler.tf
│
├── schemas/                     # Schema definitions
│   ├── bronze/
│   │   ├── quickbooks.json
│   │   └── xero.json
│   ├── silver/
│   │   ├── accounts.json
│   │   ├── contacts.json
│   │   └── transactions.json
│   └── gold/
│       ├── dim_account.json
│       ├── dim_contact.json
│       └── fact_transaction.json
│
├── quality/                     # Data quality
│   ├── rules/
│   │   ├── bronze.dqdl
│   │   └── silver.dqdl
│   ├── expectations/           # Great Expectations (optional)
│   │   └── ...
│   └── monitoring/
│       └── metrics.py
│
└── tests/                       # Pipeline tests
    ├── unit/
    │   ├── test_normalizer.py
    │   ├── test_deduplicator.py
    │   └── test_validator.py
    ├── integration/
    │   ├── test_bronze_to_silver.py
    │   └── test_silver_to_gold.py
    └── fixtures/
        ├── quickbooks_sample.json
        └── xero_sample.json
```

## Running Pipelines

### Local Development (LocalStack)

```bash
# Start local environment
./local-dev/start.sh

# Run Bronze → Silver transformation
python -m pipelines.orchestration.glue_jobs.bronze_to_silver \
  --bronze-bucket=plainledger-bronze \
  --silver-bucket=plainledger-silver \
  --local

# Run Silver → Gold transformation
python -m pipelines.orchestration.glue_jobs.silver_to_gold \
  --silver-bucket=plainledger-silver \
  --gold-bucket=plainledger-gold \
  --local
```

### AWS (Production)

```bash
# Via AWS Console
# Glue Jobs → Run job

# Via CLI
aws glue start-job-run --job-name plainledger-prod-bronze-to-silver

# Via GitHub Actions
# Push to main branch or manual dispatch
```

### Manual Trigger

```bash
# API endpoint (authenticated)
curl -X POST https://api.plainledger.com/internal/etl/trigger \
  -H "X-Internal-Token: $INTERNAL_TOKEN" \
  -d '{"job": "bronze_to_silver", "organizations": ["org-123"]}'
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `S3_ENDPOINT` | S3 endpoint (empty for AWS) | No |
| `S3_BUCKET_BRONZE` | Bronze bucket name | Yes |
| `S3_BUCKET_SILVER` | Silver bucket name | Yes |
| `S3_BUCKET_GOLD` | Gold bucket name | Yes |
| `S3_BUCKET_QUARANTINE` | Quarantine bucket | Yes |
| `GLUE_DATABASE` | Glue catalog database | Yes |
| `ALERT_EMAIL` | Email for alerts | Yes |

## Data Quality Rules

### Bronze Layer
- Source ID not null
- Organization ID not null
- Ingested timestamp present

### Silver Layer
- All Bronze rules
- Account name not empty
- Account type valid enum
- Transaction date within range (1990-today)
- Amount within bounds (-999M to 999M)

### Gold Layer
- All Silver rules
- Referential integrity (FK checks)
- No orphan records

## Monitoring

### CloudWatch Metrics
- `ETL/RecordsProcessed`
- `ETL/RecordsQuarantined`
- `ETL/DuplicatesRemoved`
- `ETL/JobDuration`

### Alerts
- Job failure → Email
- Quarantine rate > 5% → Email
- Job duration > 2x baseline → Warning

## Adding a New Provider

1. Create extractor: `extractors/{provider}/extractor.py`
2. Create auth handler: `extractors/{provider}/auth.py`
3. Add schema mapping: `transformers/bronze_to_silver/plugins/{provider}.py`
4. Add schema definition: `schemas/bronze/{provider}.json`
5. Add test fixtures: `tests/fixtures/{provider}_sample.json`
6. Update ROADMAP.md
