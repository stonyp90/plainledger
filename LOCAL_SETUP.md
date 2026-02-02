# PlainLedger Local Development Setup

## Overview

This guide provides enterprise-grade local development setup with real QuickBooks sandbox integration.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  QuickBooks     │────▶│  PlainLedger    │────▶│  Frontend       │
│  Sandbox        │     │  API (NestJS)   │     │  (React/Vite)   │
│  $35M Real      │     │                 │     │                 │
│  Estate Data    │     │  - GraphQL      │     │  - Dashboard    │
│                 │     │  - Auth Guards  │     │  - Reports      │
│                 │     │  - Data Lake    │     │  - Checklist    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐            │
        │               │  S3 Gold Layer  │            │
        │               │  (LocalStack)   │            │
        │               └─────────────────┘            │
        │                       │                       │
        └───────────────────────┴───────────────────────┘
```

## Quick Start

### 1. Start Docker Services

```bash
cd /Users/tony/stonyp90-websites/plainledger
docker-compose up -d
```

Wait for services to be healthy (~1-2 minutes).

### 2. QuickBooks Sandbox Integration

#### Option A: Full QuickBooks Sync (Recommended)

Sync real data from your QuickBooks sandbox to the S3 Gold layer:

```bash
# Get a refresh token from the Intuit Developer Portal OAuth Playground
# https://developer.intuit.com/app/developer/playground

# Sync QuickBooks → S3 Gold layer
QUICKBOOKS_REFRESH_TOKEN=your_token npx tsx scripts/providers/quickbooks/sync-to-gold.ts
```

This fetches real data from QuickBooks and uploads to S3:
- Chart of Accounts (with balances)
- All invoices → revenue trends
- All bills → expense trends
- Dashboard summary metrics

#### Option B: Seed QuickBooks Sandbox (First Time Only)

If your QuickBooks sandbox is empty, seed it with realistic $35M real estate company data:

```bash
# Seed QuickBooks with demo data
QUICKBOOKS_REFRESH_TOKEN=your_token npx tsx scripts/seed-quickbooks-sandbox.ts

# Options:
# --realm-id <id>     QuickBooks Realm ID (default: from env)
# --months <n>        Number of months of historical data (default: 24)
# --dry-run           Preview what would be created
```

This creates:
- 60+ Chart of Accounts (proper hierarchy)
- 15+ Commercial Tenants
- 13+ Vendors
- 24 months of Invoices (~$35M annual revenue)
- 24 months of Bills (expenses)
- Opening Balance Journal Entry ($120M portfolio)

#### Option C: Mock Data Only (No QuickBooks)

For quick local testing without QuickBooks:

```bash
# Seed S3 with mock data
S3_ENDPOINT=http://localhost:4566 npx tsx scripts/seed-gold-s3.ts
```

### 3. Start API (Development Mode)

```bash
# Run API with auth bypass for local testing
cd apps/api && SKIP_AUTH=true npm run start:dev
```

### 4. Start Web App

```bash
# In another terminal
cd apps/web && npm run dev
```

### 5. Access the Application

Navigate to http://localhost:5173 and login with:

| Email | Password | Organization |
|-------|----------|--------------|
| `demo@plainledger.ca` | `DemoPass123!@#` | demo-org |
| `admin@plainledger.ca` | `AdminPass123!@#` | demo-org |

---

## Environment Variables

### Required for QuickBooks Integration

```bash
# .env file at project root
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/v1/datasources/oauth/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox
QUICKBOOKS_REALM_ID=your_realm_id  # Company ID from Intuit
```

### API Environment (apps/api/.env)

```bash
NODE_ENV=development
SKIP_AUTH=true  # LOCAL DEV ONLY - bypasses Keycloak auth
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plainledger
DB_USERNAME=plainledger
DB_PASSWORD=plainledger_secret
S3_ENDPOINT=http://localhost:4566
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
# Email (for local testing with Mailhog)
SES_ENDPOINT=http://localhost:1025  # Mailhog SMTP endpoint
SES_REGION=us-east-1
SES_FROM_ADDRESS=noreply@plainledger.local
SES_FROM_NAME=PlainLedger
APP_URL=http://localhost:5173
```

### Web Environment (apps/web/.env)

```bash
VITE_TEST_REAL_DATA=true  # Enables GraphQL queries in mock auth mode
```

---

## Data Verification Checklist

The platform includes a data readiness checklist that verifies:

| Item | Source | Status |
|------|--------|--------|
| **Logiciel comptable connecté** | GraphQL `dataSources` query | ✅ Mock QB connection in dev |
| **Plan comptable** | GraphQL `accounts` query | ✅ From S3 gold layer |
| **Historique des transactions** | GraphQL `financialTrends` query | ✅ From S3 gold layer |
| **Qualité des données** | Calculated from all above | ✅ Complete |

All 4 items show as complete when running locally with `SKIP_AUTH=true`.

---

## Services

| Service | URL | Status |
|---------|-----|--------|
| Web App | http://localhost:5173 | ✅ |
| API | http://localhost:3000 | ✅ |
| GraphQL Playground | http://localhost:3000/graphql | ✅ |
| Keycloak | http://localhost:8080 | ✅ |
| PostgreSQL | localhost:5432 | ✅ |
| Redis | localhost:6379 | ✅ |
| MinIO Console | http://localhost:9001 | ✅ |
| LocalStack (S3) | http://localhost:4566 | ✅ |
| Mailhog (SMTP) | localhost:1025 | ✅ |
| Mailhog (Web UI) | http://localhost:8025 | ✅ |

---

## Email Testing with Mailhog

Mailhog is included for local email testing. When you share visualizations or send emails from the app, they will be captured by Mailhog instead of being sent to real recipients.

### Access Mailhog Web UI

Open http://localhost:8025 in your browser to view all captured emails.

### Testing Email Features

1. **Share Visualization**: Click the share button on any chart, enter email addresses, and send
2. **View in Mailhog**: Open http://localhost:8025 to see the email with embedded chart image
3. **Verify Email Content**: Check that chart images render correctly, links work, etc.

### Email Configuration

**Note**: The current SES adapter uses AWS SDK which doesn't support SMTP endpoints directly. For local email testing with Mailhog, you have two options:

1. **Production Testing**: Use AWS SES sandbox mode (recommended for testing email templates)
2. **Local SMTP**: Enhance the SES adapter to support nodemailer with Mailhog's SMTP endpoint (`localhost:1025`) for local development

Mailhog is included in docker-compose for future SMTP support. Currently, emails sent from the API will use AWS SES (or fail gracefully if not configured).

---

## Clean Architecture

### Domain Layer
```
apps/api/src/domain/
├── datalake/           # Datalake entities (QuickBooks types)
├── entities/           # Core business entities
└── value-objects/      # Immutable value objects
```

### Application Layer
```
apps/api/src/application/
├── ports/              # Interfaces (inbound/outbound)
│   ├── inbound/        # Use case interfaces
│   └── outbound/       # Repository interfaces
└── services/           # Application services
```

### Infrastructure Layer
```
apps/api/src/infrastructure/
├── graphql/            # GraphQL resolvers, guards
├── integrations/       # External services (QuickBooks, etc.)
├── persistence/        # Database repositories
└── datalake/           # S3 data lake services
```

---

## Testing

### Unit Tests
```bash
npm run test           # Run all tests
npm run test:cov       # With coverage
```

### Integration Tests
```bash
npm run test:e2e       # End-to-end tests
```

### E2E Tests (Enterprise-Grade)

#### Quick Start
```bash
# Run complete E2E validation
./scripts/run-e2e-validation.sh
```

#### Manual Steps
```bash
# 1. Start services
docker-compose up -d

# 2. Get QuickBooks tokens (first time)
npx tsx scripts/providers/quickbooks/get-token.ts

# 3. Sync QuickBooks data
npx tsx scripts/providers/quickbooks/sync-to-gold.ts

# 4. Run E2E tests
npm run test:e2e
```

#### Test Suites
- **QuickBooks Real Data**: `e2e/quickbooks-real-data.spec.ts`
- **Industry-Specific**: `e2e/industry-data.spec.ts`
- **Premium Member Flow**: `e2e/full-flow-premium.spec.ts`
- **ETL Pipeline**: `e2e/etl-flow.spec.ts`

See `e2e/README.md` for complete documentation.

---

## Troubleshooting

### API Returns 401 Unauthorized

Ensure `SKIP_AUTH=true` is set in the API environment:

```bash
cd apps/api && SKIP_AUTH=true npm run start:dev
```

### Data Checklist Shows Items Missing

1. Check API is running: `curl http://localhost:3000/graphql`
2. Check S3 has data: `aws --endpoint-url http://localhost:4566 s3 ls s3://plainledger-gold/`
3. Ensure `SKIP_AUTH=true` is set for mock QuickBooks connection

### TypeScript Compilation Errors

```bash
# Rebuild the API
cd apps/api && npm run build
```

---

## Production Safety

All local development changes include production safety checks:

1. `SKIP_AUTH` only works when `NODE_ENV !== 'production'`
2. Mock QuickBooks connection only returned when `SKIP_AUTH=true` AND not production
3. All sensitive environment variables are validated on startup

---

## Next Steps

1. **Real QuickBooks Connection**: Connect your actual QuickBooks sandbox via OAuth
2. **Sync Data**: Use the Connections page to sync data from QuickBooks
3. **View Dashboard**: All reports will populate with real financial data
