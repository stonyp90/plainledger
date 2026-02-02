# Application Configuration

This directory contains centralized configuration for the PlainLedger API.

## Overview

All hardcoded values have been moved to configurable environment variables with sensible defaults. This ensures:
- **Flexibility**: Easy to change values without code changes
- **Environment-specific**: Different values for dev/staging/prod
- **Security**: Sensitive values can be injected at runtime
- **Testability**: Easy to override for testing

## Exception: Demo Data for Free Users

As per requirements, demo data for free users remains intentionally hardcoded. This includes:
- Mock tenant data in `apps/web/src/contexts/TenantContext.tsx`
- Demo connection data in `apps/web/src/lib/connectionModels.ts`
- Sample financial data generators for free tier

## Configuration File

The main configuration is in `app.config.ts` which provides:
- Organization IDs (demo, e2e, fallback)
- User emails (admin, demo, accountant)
- S3 configuration (bucket, endpoint, region)
- QuickBooks URLs (sandbox, production)
- Financial calculation constants (tolerance, rounding, percentages)
- Cache TTLs
- Data recency thresholds

## Environment Variables

### Organization IDs

```bash
DEMO_ORG_ID=demo-org              # Demo organization for local dev
E2E_ORG_ID=e2e-org-123            # E2E test organization
FALLBACK_ORG_ID=org-123           # Fallback organization for testing
```

### User Emails

```bash
ADMIN_EMAIL=admin@plainledger.ca
DEMO_EMAIL=demo@plainledger.ca
ACCOUNTANT_EMAIL=accountant@plainledger.ca
```

### S3 Configuration

```bash
S3_BUCKET_GOLD=plainledger-gold
S3_ENDPOINT=http://localhost:4566  # For LocalStack (empty = AWS)
S3_REGION=us-east-1
```

### QuickBooks Configuration

```bash
QUICKBOOKS_SANDBOX_URL=https://sandbox-quickbooks.api.intuit.com/v3/company
QUICKBOOKS_PRODUCTION_URL=https://quickbooks.api.intuit.com/v3/company
SANDBOX_USERS=admin@plainledger.ca,demo@plainledger.ca  # Comma-separated list
```

### Financial Calculation Constants

```bash
ACCOUNTING_TOLERANCE=0.01                    # Tolerance for balance checks
FINANCIAL_ROUNDING_PRECISION=100            # 2 decimal places
PERCENTAGE_ROUNDING_PRECISION=10000         # 4 decimal places

# Cash Flow Calculation Percentages (fallback when actual data unavailable)
CASH_FLOW_SALARY_PCT=0.4                    # 40% of operating expenses
CASH_FLOW_SUPPLIER_PCT=0.35                 # 35% of operating expenses
CASH_FLOW_RENT_PCT=0.15                     # 15% of operating expenses
CASH_FLOW_DEBT_PCT=0.7                      # 70% of financing flows
CASH_FLOW_DIVIDEND_PCT=0.3                  # 30% of financing outflows
```

### Cache Configuration

```bash
CACHE_TTL_GOLD_SECONDS=300                  # 5 minutes
```

### Data Recency

```bash
DATA_RECENCY_HOURS=24                       # Hours threshold for "recent" data
MAX_TRANSACTION_FILES=5                     # Max files to load for trends
```

## Usage

```typescript
import { AppConfig, createAppConfig } from '@infrastructure/config/app.config';

// In a service constructor
constructor(
  private readonly configService: ConfigService,
) {
  this.appConfig = createAppConfig(configService);
}

// Use configuration
const demoOrgId = this.appConfig.demoOrgId;
const tolerance = this.appConfig.accountingTolerance;
```

## Account IDs in Industry Templates

The `accountId` values in `apps/web/src/lib/industries.ts` are **template identifiers**, not hardcoded database IDs. They represent semantic account types (e.g., 'property-taxes', 'maintenance', 'revenue') that are resolved to actual account IDs at runtime based on the organization's chart of accounts.

These are intentionally kept as semantic identifiers because:
1. Different organizations may have different account structures
2. Account IDs are resolved dynamically when loading financial data
3. They serve as mapping hints for industry-specific KPIs

## Migration Notes

When deploying to production:
1. Set all environment variables appropriately
2. Ensure `DEMO_ORG_ID` matches your demo organization tenant_id
3. Configure `SANDBOX_USERS` to include all test/demo user emails
4. Adjust financial calculation constants based on your accounting standards
5. Set appropriate cache TTLs based on your data freshness requirements
