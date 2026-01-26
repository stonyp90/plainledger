# PlainLedger

**No surprises. Just numbers.**

PlainLedger is a financial reporting SaaS platform that connects to your accounting software and generates IBCS-compliant financial reports.

## Features

- 🔗 **Provider Connections** - Connect QuickBooks, Xero, Sage, FreshBooks, and more
- 📊 **IBCS Reports** - Financial statements following ISO 24896 standards  
- 📈 **Power BI Embedded** - White-label interactive dashboards
- 🏢 **Multi-tenant** - Support for multiple organizations with per-tenant branding
- 🔐 **Secure** - Keycloak SSO authentication with custom theme
- ☁️ **Data Lake** - S3-compatible storage for your financial data
- 💳 **Entitlements System** - Tier-based feature access (Free, Starter, Professional, Enterprise)
- 🌐 **Landing Page** - Marketing site with pricing tiers

## Subscription Tiers

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Data Sources | 1 | 2 | 10 | Unlimited |
| Reports/month | 5 | 25 | Unlimited | Unlimited |
| IBCS Compliant | ❌ | ✅ | ✅ | ✅ |
| Power BI Embedded | ❌ | ❌ | ✅ | ✅ |
| Power BI White Label | ❌ | ❌ | ❌ | ✅ |
| SSO | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ❌ | ✅ |

## Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm or yarn

### 1. Start Infrastructure

```bash
# Start all services (PostgreSQL, Redis, Keycloak, MinIO)
chmod +x local-dev/start.sh
./local-dev/start.sh
```

### 2. Configure Environment

```bash
# API Configuration
cd apps/api
cat > .env.local << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://plainledger:plainledger_secret@localhost:5432/plainledger
REDIS_URL=redis://localhost:6379
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=plainledger
KEYCLOAK_CLIENT_ID=plainledger-api
KEYCLOAK_CLIENT_SECRET=change-me-in-production
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=plainledger
MINIO_SECRET_KEY=plainledger_secret
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
EOF
```

### 3. Start Applications

```bash
# Terminal 1 - API
cd apps/api
npm install
npm run start:dev

# Terminal 2 - Web
cd apps/web
npm install
npm run dev
```

### 4. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| Web App | http://localhost:5173 | demo@plainledger.ca / demo123 |
| API | http://localhost:3000 | - |
| Keycloak Admin | http://localhost:8080 | admin / admin |
| MinIO Console | http://localhost:9001 | plainledger / plainledger_secret |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PlainLedger                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   React     │────▶│   NestJS    │────▶│  PostgreSQL │       │
│  │   Web App   │     │     API     │     │             │       │
│  └─────────────┘     └──────┬──────┘     └─────────────┘       │
│         │                   │                                    │
│         │                   │            ┌─────────────┐       │
│         │                   ├───────────▶│    Redis    │       │
│         │                   │            └─────────────┘       │
│         │                   │                                    │
│         │                   │            ┌─────────────┐       │
│         └───────────────────┼───────────▶│  Keycloak   │       │
│                             │            └─────────────┘       │
│                             │                                    │
│                             │            ┌─────────────┐       │
│                             └───────────▶│  MinIO/S3   │       │
│                                          │ (Data Lake) │       │
│                                          └─────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
financial-reporting-saas/
├── apps/
│   ├── api/                 # NestJS API (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/      # Domain entities, value objects
│   │   │   ├── application/ # Use cases, ports
│   │   │   └── infrastructure/ # Controllers, repositories
│   │   └── Dockerfile
│   │
│   └── web/                 # React + Vite frontend
│       ├── src/
│       │   ├── pages/       # Page components
│       │   ├── components/  # Shared components
│       │   └── lib/         # Utilities, hooks
│       └── Dockerfile
│
├── keycloak/
│   ├── realms/              # Realm configuration
│   └── themes/plainledger/  # Custom theme
│
├── terraform/               # AWS infrastructure
│   ├── modules/
│   └── environments/
│
├── local-dev/               # Local development scripts
└── docker-compose.yml       # Local development stack
```

## API Endpoints

### Data Sources (Provider Connections)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/datasources` | List all connections |
| GET | `/api/datasources/:id` | Get connection details |
| POST | `/api/datasources` | Create new connection |
| POST | `/api/datasources/:id/sync` | Trigger sync |
| DELETE | `/api/datasources/:id` | Remove connection |
| GET | `/api/datasources/providers/available` | List available providers |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/balance-sheet` | Generate balance sheet |
| GET | `/api/reports/income-statement` | Generate income statement |
| GET | `/api/reports/cash-flow` | Generate cash flow statement |

## Supported Providers

- ✅ QuickBooks Online
- ✅ Xero
- ✅ Sage
- ✅ FreshBooks
- 🔜 Wave
- ✅ CSV Import

## Configuration

### Environment Variables

See `apps/web/env.example` and `apps/api/env.example` for all available configuration options.

### Power BI Integration

To enable Power BI Embedded dashboards:

1. Create an Azure AD App Registration
2. Grant Power BI API permissions
3. Configure environment variables:

```bash
VITE_POWERBI_ENABLED=true
VITE_POWERBI_TENANT_ID=your-azure-tenant-id
VITE_POWERBI_CLIENT_ID=your-app-client-id
VITE_POWERBI_GROUP_ID=your-powerbi-workspace-id
VITE_POWERBI_REPORT_ID=your-report-id
```

#### White Label Options

```bash
VITE_POWERBI_HIDE_NAV=true      # Hide Power BI navigation
VITE_POWERBI_HIDE_FILTERS=false # Hide filter pane
VITE_POWERBI_CUSTOM_THEME='{}'  # Custom theme JSON
```

### Entitlements System

The entitlements system controls feature access based on subscription tier. Configure in `apps/web/src/lib/entitlements.ts`.

Key features controlled by entitlements:
- Number of data source connections
- Reports per month
- Power BI features (Embedded, White Label)
- API access and rate limits
- Branding options (custom logo, colors, domain)

## Development

### Running Tests

```bash
# API unit tests
cd apps/api
npm test

# E2E tests (Playwright)
cd /path/to/financial-reporting-saas

# Run all unauthenticated tests (18 tests)
npm run test:e2e:unauthenticated

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed browser
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### E2E Test Coverage

| Suite | Description | Tests |
|-------|-------------|-------|
| Landing Page | Marketing page, pricing, features | 7 |
| Authentication | Login, register, forgot password | 9 |
| Registration | Registration form validation | 2 |
| Dashboard | Dashboard layout and navigation | 9 |
| Connections | Provider connection interface | 10 |
| Settings | Subscription, Power BI, integrations | 20+ |
| Reports | Balance sheet, financial reports | 8 |

### Building for Production

```bash
# Build API
cd apps/api
npm run build

# Build Web
cd apps/web
npm run build
```

## License

Proprietary - All rights reserved.
