# E2E Testing Guide

Enterprise-grade end-to-end testing for PlainLedger with real QuickBooks sandbox integration.

## Prerequisites

1. **Docker Desktop** running
2. **QuickBooks Sandbox** credentials configured
3. **Node.js** 18+ installed

## Quick Start

### Option 1: Using docker-compose (Recommended for Local Dev)

```bash
# 1. Start all services
docker-compose up -d

# 2. Get QuickBooks tokens (first time only)
npx tsx scripts/providers/quickbooks/get-token.ts

# 3. Sync QuickBooks data to S3
npx tsx scripts/providers/quickbooks/sync-to-gold.ts

# 4. Run E2E tests
npm run test:e2e
```

### Option 2: Using Testcontainers (Recommended for CI/CD)

Testcontainers automatically manages Docker containers for isolated test environments.

```bash
# Tests will automatically start containers
npm run test:e2e
```

## Test Suites

### 1. QuickBooks Real Data Tests
Tests the complete flow with real QuickBooks sandbox data.

```bash
npx playwright test e2e/quickbooks-real-data.spec.ts
```

**What it tests:**
- QuickBooks sandbox sync to S3
- Real data display in dashboard
- Accounts and transactions from QuickBooks
- Connection status
- Cache invalidation

### 2. Industry-Specific Tests
Tests that each industry displays appropriate data and graphs.

```bash
npx playwright test e2e/industry-data.spec.ts
```

**Industries tested:**
- Real Estate
- Retail
- Professional Services
- Manufacturing
- Healthcare

### 3. Premium Member Full Flow
Complete user journey for premium members.

```bash
npx playwright test e2e/full-flow-premium.spec.ts
```

**What it tests:**
- Data verification checklist (4/4 items)
- Dashboard with real data
- All report sections
- Connections management
- Settings and subscription
- Empty states with CTAs

### 4. ETL Flow Tests
Tests the complete ETL pipeline.

```bash
npx playwright test e2e/etl-flow.spec.ts
```

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Suite
```bash
npx playwright test e2e/quickbooks-real-data.spec.ts
```

### Run in UI Mode (Debug)
```bash
npm run test:e2e:ui
```

### Run Headed (See Browser)
```bash
npm run test:e2e:headed
```

### Run with Debug
```bash
npm run test:e2e:debug
```

## Test Configuration

### Environment Variables

Create `.env.local` with:

```env
# QuickBooks Sandbox
QUICKBOOKS_REFRESH_TOKEN=your_refresh_token
QUICKBOOKS_REALM_ID=your_realm_id
QUICKBOOKS_CLIENT_ID=ABfRcpxnLneahacnWuQr29sTeIIZuBdMlXqaUYWT1UkyNFT6to
QUICKBOOKS_CLIENT_SECRET=DWyhuILmup8OWkeMRUoOhfZ44QYQdGKiNlmPS45z

# API Configuration
API_URL=http://localhost:3000
BASE_URL=http://localhost:5173
INTERNAL_API_TOKEN=change-me

# S3 (LocalStack)
S3_ENDPOINT=http://localhost:4566
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Playwright Configuration

See `playwright.config.ts` for:
- Test directories
- Browser configurations
- Retry strategies
- Screenshot/video settings

## Test Architecture

### Clean Architecture Compliance

```
e2e/
├── quickbooks-real-data.spec.ts    # Infrastructure layer tests
├── industry-data.spec.ts           # Domain layer tests
├── full-flow-premium.spec.ts       # Application layer tests
├── etl-flow.spec.ts                # Integration tests
└── testcontainers-setup.ts         # Test infrastructure
```

### Test Isolation

- Each test suite is independent
- Testcontainers provide isolated environments
- No shared state between tests
- Cleanup after each test run

## Debugging Failed Tests

### 1. Check Test Reports
```bash
npm run test:e2e:report
```

### 2. View Screenshots
Screenshots are saved in `test-results/` on failure.

### 3. View Videos
Videos are saved in `test-results/` on failure.

### 4. Check Logs
```bash
docker logs plainledger-api
docker logs plainledger-web
```

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull requests
- Push to main
- Scheduled nightly runs

### Testcontainers Benefits

- ✅ Isolated test environments
- ✅ No manual setup required
- ✅ Consistent across developers
- ✅ Works in CI/CD pipelines
- ✅ Automatic cleanup

## Troubleshooting

### Tests Fail with "Connection Refused"

1. Ensure Docker is running
2. Start services: `docker-compose up -d`
3. Wait for services to be healthy: `docker ps`

### QuickBooks Tests Skip

1. Check `.env.local` has QuickBooks credentials
2. Run: `npx tsx scripts/providers/quickbooks/get-token.ts`
3. Verify tokens are valid

### Tests Timeout

1. Increase timeout in `playwright.config.ts`
2. Check service health: `curl http://localhost:3000/health`
3. Verify network connectivity

## Best Practices

1. **Always use Testcontainers in CI/CD** - Ensures consistency
2. **Use docker-compose for local dev** - Faster iteration
3. **Test with real QuickBooks data** - Catches integration issues
4. **Test empty states** - Ensures proper UX when data is missing
5. **Test all industries** - Validates industry-specific features
6. **Clean up after tests** - Prevents state leakage

## Next Steps

1. Add more industry-specific test data
2. Add performance tests
3. Add accessibility tests
4. Add visual regression tests
