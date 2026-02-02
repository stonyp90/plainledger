# PlainLedger

<div align="center">

**No surprises. Just numbers.**

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/stonyp90/plainledger)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/stonyp90/plainledger)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

**Enterprise Financial Reporting Platform for Canadian SMBs**

*Connect your accounting software. Generate IBCS-compliant reports. Make better decisions.*

[Documentation](#) • [API Reference](#) • [Pricing](https://plainledger.ca/pricing) • [Schedule Demo](https://calendly.com/anthonypaquet1508)

</div>

---

## 🎯 Value Proposition

PlainLedger is a financial reporting SaaS platform designed for **Canadian small and medium businesses** with **$2M-$20M+ annual revenue**. We transform your accounting data into actionable insights through:

- **🔗 Multi-Provider Integration** - Connect QuickBooks, Xero, Sage, FreshBooks, and more
- **📊 IBCS-Compliant Reports** - Financial statements following ISO 24896 standards
- **🤖 AI-Powered Anomaly Detection** - Catch duplicate payments, fraud patterns, and billing errors automatically
- **📈 Power BI Embedded** - White-label interactive dashboards for stakeholders
- **🏢 Multi-Tenant Architecture** - Support for multiple organizations with per-tenant branding
- **🔐 Enterprise Security** - Keycloak SSO, MFA, audit logs, and Canadian data residency

### Why PlainLedger?

| Traditional BI Tools | PlainLedger |
|---------------------|-------------|
| $50,000+/year | Starting at $500/month |
| 6-12 month implementation | Go live in days |
| Complex setup, IT-heavy | Self-service, CPA-supported |
| Generic dashboards | Industry-specific KPIs |
| US data centers | **Canadian data residency** |

**Average ROI: 340% in first year** • **Average savings: $847K annually**

---

## 🏗️ Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "👤 Client Layer"
        Web["🌐 React Web App<br/>TypeScript + Vite + TailwindCSS"]
        Mobile["📱 Mobile App<br/>React Native (Planned)"]
    end
    
    subgraph "🔐 Authentication & Gateway"
        Auth["🔑 Keycloak SSO<br/>SAML 2.0 / OIDC / MFA"]
        API["⚡ NestJS API<br/>GraphQL + REST<br/>Clean Architecture"]
    end
    
    subgraph "🧠 AI & Intelligence Layer"
        Bedrock["🤖 AWS Bedrock<br/>Claude 3 / RAG"]
        SageMaker["📊 AWS SageMaker<br/>ML Models"]
        PatternEngine["🔍 Pattern Recognition<br/>Industry Insights"]
        AnomalyDetect["⚠️ Anomaly Detection<br/>Fraud & Errors"]
    end
    
    subgraph "⚙️ Application Services"
        ETL["🔄 ETL Pipeline<br/>Bronze → Silver → Gold"]
        Reports["📑 Report Engine<br/>IBCS ISO 24896"]
        KPI["📈 Industry KPIs<br/>11+ Industries"]
        TaxCredits["💰 Tax Credits<br/>SR&ED Calculator"]
        Benchmarks["📊 Benchmarks<br/>Stats Can / ISED"]
        Scenarios["🎯 Scenario Engine<br/>What-If Analysis"]
    end
    
    subgraph "💾 Data Layer"
        PG[("🐘 PostgreSQL 15+<br/>Transactional Data")]
        Redis[("⚡ Redis 7+<br/>Cache & Sessions")]
        S3[("☁️ S3 Data Lake<br/>Bronze/Silver/Gold<br/>Parquet Format")]
        Athena["🔎 AWS Athena<br/>SQL Analytics"]
    end
    
    subgraph "🔌 Accounting Integrations"
        QB["QuickBooks Online"]
        Xero["Xero"]
        Sage["Sage"]
        FreshBooks["FreshBooks"]
        CSV["CSV Import"]
    end
    
    subgraph "🔗 External Services"
        PowerBI["📊 Power BI Embedded<br/>Interactive Dashboards"]
        Stripe["💳 Stripe<br/>Subscription Billing"]
        HubSpot["📞 HubSpot CRM<br/>Lead Management"]
        SES["📧 AWS SES<br/>Email Notifications"]
        Novu["🔔 Novu<br/>Multi-channel Alerts"]
    end
    
    subgraph "🏗️ Infrastructure"
        Docker["🐳 Docker<br/>Containerization"]
        Terraform["🏗️ Terraform<br/>IaC"]
        GitHub["⚙️ GitHub Actions<br/>CI/CD"]
        AWS["☁️ AWS Canada<br/>ECS / RDS / S3"]
    end

    %% Client connections
    Web --> Auth
    Mobile --> Auth
    Auth --> API
    
    %% API to Services
    API --> ETL
    API --> Reports
    API --> KPI
    API --> TaxCredits
    API --> Benchmarks
    API --> Scenarios
    
    %% AI connections
    API --> Bedrock
    API --> SageMaker
    Bedrock --> PatternEngine
    SageMaker --> AnomalyDetect
    PatternEngine --> S3
    AnomalyDetect --> S3
    
    %% Data connections
    ETL --> PG
    ETL --> S3
    Reports --> S3
    KPI --> S3
    API --> Redis
    Athena --> S3
    
    %% Integrations
    ETL --> QB
    ETL --> Xero
    ETL --> Sage
    ETL --> FreshBooks
    ETL --> CSV
    
    %% External services
    API --> PowerBI
    API --> Stripe
    API --> HubSpot
    API --> SES
    API --> Novu
    
    %% Infrastructure
    Docker --> AWS
    Terraform --> AWS
    GitHub --> Docker
```

### Data Lake Architecture (Medallion)

```mermaid
graph LR
    subgraph "🥉 Bronze Layer"
        B1["Raw QuickBooks Data"]
        B2["Raw Xero Data"]
        B3["Raw Sage Data"]
        B4["Raw CSV Imports"]
    end
    
    subgraph "🥈 Silver Layer"
        S1["Normalized Accounts"]
        S2["Standardized Transactions"]
        S3["Validated Balances"]
        S4["Deduplicated Records"]
    end
    
    subgraph "🥇 Gold Layer"
        G1["Financial Statements"]
        G2["KPI Metrics"]
        G3["Industry Benchmarks"]
        G4["Anomaly Scores"]
        G5["AI Insights"]
    end
    
    B1 --> S1
    B2 --> S1
    B3 --> S1
    B4 --> S1
    B1 --> S2
    B2 --> S2
    B3 --> S2
    B4 --> S2
    S1 --> G1
    S2 --> G1
    S3 --> G2
    S2 --> G3
    S4 --> G4
    S1 --> G5
```

### Clean Architecture (API)

```mermaid
graph TB
    subgraph "🎯 Domain Layer"
        Entities["Entities<br/>Account, Organization, DataSource"]
        ValueObjects["Value Objects<br/>Money, TenantId, AccountCode"]
        DomainServices["Domain Services<br/>Business Rules"]
    end
    
    subgraph "📋 Application Layer"
        UseCases["Use Cases<br/>ETL, Reports, KPIs"]
        Ports["Ports (Interfaces)<br/>IAccountingProvider<br/>IStorageProvider<br/>IAIProvider"]
        Services["Application Services<br/>PatternAggregation<br/>TaxCreditEligibility"]
    end
    
    subgraph "🔧 Infrastructure Layer"
        Controllers["Controllers<br/>REST + GraphQL"]
        Adapters["Adapters<br/>QuickBooks, Xero, Bedrock"]
        Repositories["Repositories<br/>Postgres, Redis, S3"]
    end
    
    Controllers --> UseCases
    UseCases --> Ports
    UseCases --> Entities
    UseCases --> DomainServices
    Adapters -.->|implements| Ports
    Repositories -.->|implements| Ports
    DomainServices --> Entities
    DomainServices --> ValueObjects
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript 5+, Vite 6, TailwindCSS, Recharts, Lucide Icons |
| **Backend** | NestJS 10, TypeScript, GraphQL (Apollo), REST, Clean Architecture |
| **Database** | PostgreSQL 15+ (TypeORM), Redis 7+ (Cache/Sessions) |
| **Data Lake** | AWS S3 / MinIO, Parquet, Bronze/Silver/Gold Medallion |
| **AI/ML** | AWS Bedrock (Claude 3), SageMaker, pgvector (Embeddings) |
| **Authentication** | Keycloak 22+ (SSO, MFA, SAML 2.0, OIDC) |
| **Analytics** | Power BI Embedded, AWS Athena, Stats Canada API |
| **Infrastructure** | Docker, Terraform, AWS (ECS, RDS, S3, SES) |
| **CI/CD** | GitHub Actions, AWS CodePipeline |
| **Testing** | Playwright (E2E), Vitest (Unit), Jest (API) |
| **Monitoring** | AWS CloudWatch, Sentry (planned) |

### Key Features by Layer

| Feature | Description |
|---------|-------------|
| **Multi-Provider ETL** | Unified data extraction from QuickBooks, Xero, Sage, FreshBooks |
| **IBCS Reports** | Financial statements following ISO 24896 standards |
| **AI Anomaly Detection** | Automatic detection of fraud, duplicates, billing errors |
| **Industry KPIs** | 11+ industry-specific KPI calculations (Restaurant, Real Estate, Healthcare...) |
| **Tax Credits** | SR&ED calculator, eligibility assessment, partner matching |
| **Scenario Planning** | What-if analysis, financial modeling, projections |
| **Benchmarking** | Stats Canada & ISED industry benchmarks comparison |
| **Multi-Tenancy** | Organization isolation, per-tenant branding, feature flags |

---

## 📊 Feature Comparison

| Feature | Essentiel<br/>($500/mo) | Professionnel<br/>($1,200/mo) | Premium<br/>($2,500/mo) | Enterprise<br/>(Custom) |
|---------|:----------------------:|:----------------------------:|:----------------------:|:----------------------:|
| **Users** | 3 included<br/>(+$50/user) | 5 included<br/>(+$75/user) | 10 included<br/>(+$100/user) | Unlimited |
| **Data Connections** | 3 | 10 | Unlimited | Unlimited |
| **Reports** | Unlimited | Unlimited | Unlimited | Unlimited |
| **AI Anomaly Detection** | ✅ | ✅ | ✅ | ✅ |
| **AI Insights** | ❌ | ✅ | ✅ | ✅ |
| **Power BI Embedded** | ❌ | ✅ | ✅ | ✅ |
| **Power BI White Label** | ❌ | ❌ | ❌ | ✅ |
| **API Access** | ❌ | ✅ | ✅ | ✅ |
| **SSO (SAML/OIDC)** | ❌ | ❌ | ❌ | ✅ |
| **Audit Logs** | ❌ | ❌ | ✅ | ✅ |
| **Custom Branding** | ❌ | ❌ | ✅ | ✅ |
| **Custom Domain** | ❌ | ❌ | ❌ | ✅ |
| **Dedicated CPA Support** | Email | Priority (48h) | Same-day | Dedicated Manager |
| **SLA** | - | - | - | 99.9% |

> **Note**: All plans include a **7-day free trial** (no credit card required). AI features are not available during trial period.

---

## 🚀 Quick Start

### Prerequisites

- **Docker** & Docker Compose (v2.0+)
- **Node.js** 20+ and npm/yarn
- **Git**

### Local Development Setup

#### Quick Start (Recommended)

```bash
# 1. Start infrastructure services (Docker)
npm run dev:infra

# 2. Install dependencies (first time only)
npm run install:all

# 3. Start API and Web locally (hot reload enabled)
npm run dev
```

This will:
- Start PostgreSQL, Redis, Keycloak, MinIO in Docker
- Run API locally on `http://localhost:3000` (hot reload)
- Run Web app locally on `http://localhost:5173` (hot reload)

#### Manual Setup

**1. Start Infrastructure Services**

```bash
# Start PostgreSQL, Redis, Keycloak, MinIO, LocalStack
docker-compose up -d keycloak-db app-db redis keycloak localstack minio
```

**2. Install Dependencies**

```bash
# Install API dependencies
cd apps/api && npm install && cd ../..

# Install Web dependencies
cd apps/web && npm install && cd ../..
```

**3. Start Development Servers**

```bash
# Terminal 1 - API (hot reload)
cd apps/api && npm run start:dev

# Terminal 2 - Web (hot reload)
cd apps/web && npm run dev
```

#### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Web App** | http://localhost:5173 | `demo@plainledger.com` / `DemoPass123!@#` |
| **API** | http://localhost:3000 | N/A |
| **Keycloak Admin** | http://localhost:8080 | `admin` / `admin` |
| **MinIO Console** | http://localhost:9001 | `plainledger` / `plainledger_secret` |

#### Development Commands

```bash
# Start infrastructure only
npm run dev:infra

# Start API locally
npm run dev:api

# Start Web locally
npm run dev:web

# Start both API and Web
npm run dev

# Stop all services
npm run dev:stop

# View logs
npm run dev:logs
```

---

## 🔐 Security & Compliance

### Data Residency

- **Primary**: Canadian data centers (AWS Canada Central)
- **Backup**: AWS Canada West
- **Compliance**: PIPEDA compliant

### Security Features

- ✅ **Encryption at Rest**: AES-256 encryption for all stored data
- ✅ **Encryption in Transit**: TLS 1.3 for all connections
- ✅ **SSO Support**: SAML 2.0, OIDC, LDAP
- ✅ **Multi-Factor Authentication**: TOTP, SMS, Email codes
- ✅ **Audit Logging**: Complete audit trail (Enterprise)
- ✅ **Role-Based Access Control**: Granular permissions
- ✅ **Data Isolation**: Multi-tenant architecture with strict isolation

### Compliance Roadmap

- ✅ **PIPEDA** (Personal Information Protection and Electronic Documents Act)
- ✅ **GDPR** (General Data Protection Regulation) - For EU customers
- ✅ **CCPA** (California Consumer Privacy Act) - For California customers
- 🔄 **ISO 27001** (Information Security Management System) - In progress, expected Q3 2026
- 📋 **ISO 27017** (Cloud Security) - Planned Q4 2026
- 📋 **ISO 27018** (Cloud Privacy) - Planned Q4 2026
- 📋 **CSA STAR Level 2** (Cloud Security Alliance) - Planned Q1 2027
- 📋 **PCI DSS Level 1** (Payment Card Industry Data Security Standard) - Planned Q2 2027
- 📋 **NIST Cybersecurity Framework** - Planned Q2 2027
- 📋 **CIS Controls** (Center for Internet Security) - Planned Q3 2027
- 📋 **HIPAA** (Health Insurance Portability and Accountability Act) - Planned Q4 2027
- 📋 **FedRAMP** (Federal Risk and Authorization Management Program) - Planned Q3 2028

---

## 📚 API Documentation

### Authentication

All API requests require authentication via Keycloak JWT tokens:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.plainledger.ca/api/datasources
```

### Core Endpoints

#### Data Sources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/datasources` | List all connections |
| `GET` | `/api/datasources/:id` | Get connection details |
| `POST` | `/api/datasources` | Create new connection |
| `POST` | `/api/datasources/:id/sync` | Trigger data sync |
| `DELETE` | `/api/datasources/:id` | Remove connection |
| `GET` | `/api/datasources/providers/available` | List available providers |

#### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/reports/balance-sheet` | Generate balance sheet |
| `GET` | `/api/reports/income-statement` | Generate income statement |
| `GET` | `/api/reports/cash-flow` | Generate cash flow statement |
| `GET` | `/api/reports/custom` | Generate custom report |

#### Anomaly Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/anomalies` | List detected anomalies |
| `POST` | `/api/anomalies/:id/resolve` | Mark anomaly as resolved |
| `GET` | `/api/anomalies/stats` | Get anomaly statistics |

> **Full API Documentation**: [api.plainledger.ca/docs](https://api.plainledger.ca/docs) (Swagger/OpenAPI)

---

## 🔌 Supported Integrations

### Accounting Software

- ✅ **QuickBooks Online** (OAuth 2.0)
- ✅ **Xero** (OAuth 2.0)
- ✅ **Sage** (API Key)
- ✅ **FreshBooks** (OAuth 2.0)
- ✅ **CSV Import** (Manual upload)
- 🔜 **Wave** (Coming Q2 2026)

### Analytics & BI

- ✅ **Power BI Embedded** (Azure AD)
- 🔜 **Tableau** (Planned Q3 2026)
- 🔜 **Looker** (Planned Q3 2026)

### CRM & Sales

- ✅ **HubSpot** (API integration)
- ✅ **Salesforce** (API integration)

### Payment Processing

- ✅ **Stripe** (Subscription billing)

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests (API)
cd apps/api
npm test

# Unit tests (Web)
cd apps/web
npm test

# E2E tests (Playwright)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# E2E tests in headed browser
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Test Coverage

| Suite | Description | Tests | Coverage |
|-------|-------------|-------|----------|
| Landing Page | Marketing, pricing, features | 7 | 95% |
| Authentication | Login, register, password reset | 9 | 92% |
| Dashboard | Layout, navigation, widgets | 9 | 88% |
| Connections | Provider connection flow | 10 | 90% |
| Reports | Financial report generation | 8 | 85% |
| Settings | Subscription, integrations | 20+ | 87% |

---

## 🚢 Deployment

### Cloud Deployment (AWS)

```bash
# Deploy infrastructure
cd terraform
terraform init
terraform plan
terraform apply

# Deploy applications
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

See `apps/web/env.example` and `apps/api/env.example` for required environment variables.

**Required for Production**:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `KEYCLOAK_URL` - Keycloak server URL
- `KEYCLOAK_CLIENT_SECRET` - Keycloak client secret
- `MINIO_ENDPOINT` - S3-compatible storage endpoint
- `STRIPE_SECRET_KEY` - Stripe API key for billing

### Docker Images

```bash
# Build API image
cd apps/api
docker build -t plainledger-api:latest .

# Build Web image
cd apps/web
docker build -t plainledger-web:latest .
```

---

## 📞 Support & SLA

### Support Tiers

| Plan | Support Level | Response Time | Channels |
|------|--------------|---------------|----------|
| **Essentiel** | Email Support | 48-72 hours | Email |
| **Professionnel** | Priority Support | 24-48 hours | Email, Chat |
| **Premium** | Same-Day Support | < 24 hours | Email, Chat, Phone |
| **Enterprise** | Dedicated Manager | < 4 hours | Email, Chat, Phone, Slack |

### Service Level Agreement (SLA)

- **Enterprise Plan**: 99.9% uptime guarantee
- **Premium Plan**: 99.5% uptime guarantee
- **Professionnel & Essentiel**: Best effort

**Support Email**: support@plainledger.ca  
**Sales**: sales@plainledger.ca  
**Schedule Demo**: [calendly.com/anthonypaquet1508](https://calendly.com/anthonypaquet1508)

---

## 💰 Pricing

### Subscription Plans

| Plan | Price (CAD) | Best For |
|------|-------------|----------|
| **Essentiel** | $500/month | Small businesses ($2M-$5M revenue) |
| **Professionnel** | $1,200/month | Growing businesses ($5M-$10M revenue) |
| **Premium** | $2,500/month | Established businesses ($10M-$20M revenue) |
| **Enterprise** | Custom | Large organizations ($20M+ revenue) |

**All plans include**:
- 7-day free trial (no credit card required)
- Unlimited reports
- AI-powered anomaly detection
- CPA email support
- Canadian data residency

**Yearly billing**: Save 20% with annual commitment

> **Enterprise Pricing**: Contact [sales@plainledger.ca](mailto:sales@plainledger.ca) for custom pricing, volume discounts, and on-premise deployment options.

---

## 📖 Project Structure

```
plainledger/
├── apps/
│   ├── api/                          # 🔧 NestJS API (Clean Architecture)
│   │   ├── src/
│   │   │   ├── domain/               # Domain Layer
│   │   │   │   ├── entities/         #   Account, Organization, DataSource
│   │   │   │   ├── value-objects/    #   Money, TenantId, AccountCode
│   │   │   │   ├── datalake/         #   Bronze/Silver/Gold schemas
│   │   │   │   └── market-analysis/  #   Benchmark types, NAICS mapping
│   │   │   │
│   │   │   ├── application/          # Application Layer
│   │   │   │   ├── ports/            #   Interfaces (IAccountingProvider, etc.)
│   │   │   │   ├── use-cases/        #   Business use cases
│   │   │   │   └── services/         #   ETL, KPIs, Tax Credits, Patterns
│   │   │   │
│   │   │   └── infrastructure/       # Infrastructure Layer
│   │   │       ├── adapters/         #   QuickBooks, Xero, S3, Power BI
│   │   │       ├── intelligence/     #   Bedrock, SageMaker adapters
│   │   │       ├── graphql/          #   GraphQL resolvers
│   │   │       ├── http/             #   REST controllers
│   │   │       ├── persistence/      #   Postgres, Redis, MongoDB repos
│   │   │       └── jobs/             #   Scheduled jobs (cron)
│   │   │
│   │   └── templates/                # Email templates (29 templates)
│   │
│   └── web/                          # 🌐 React + Vite Frontend
│       ├── src/
│       │   ├── pages/                # 40+ page components
│       │   │   ├── Dashboard.tsx     #   Main dashboard
│       │   │   ├── Reports.tsx       #   Financial reports
│       │   │   ├── Connections.tsx   #   Data source connections
│       │   │   └── ...
│       │   │
│       │   ├── components/           # 100+ shared components
│       │   │   ├── charts/           #   TrendChart, WaterfallChart, IBCS
│       │   │   ├── strategic/        #   Strategic planning components
│       │   │   └── ...
│       │   │
│       │   ├── contexts/             # React contexts
│       │   │   ├── TenantContext     #   Multi-tenant state
│       │   │   ├── ThemeContext      #   Dark/light mode
│       │   │   └── ...
│       │   │
│       │   ├── domain/               # Frontend domain models
│       │   │   ├── entities/         #   Account, Money
│       │   │   └── services/         #   AnomalyDetectionService
│       │   │
│       │   ├── features/             # Feature modules
│       │   │   ├── auth/             #   Authentication
│       │   │   ├── connections/      #   Data connections
│       │   │   ├── dashboard/        #   Dashboard features
│       │   │   └── reports/          #   Report generation
│       │   │
│       │   ├── hooks/                # Custom React hooks
│       │   │   ├── useBenchmarks     #   Industry benchmarks
│       │   │   ├── useGraphConfig    #   Chart configuration
│       │   │   └── useFinancialData  #   Financial data fetching
│       │   │
│       │   └── lib/                  # Utilities
│       │       ├── ibcs/             #   IBCS chart utilities
│       │       ├── nlq/              #   Natural language queries
│       │       └── graphql/          #   GraphQL client
│       │
│       └── Dockerfile
│
├── pipelines/                        # 🐍 Python ETL Pipelines (AWS Glue)
│   ├── extractors/                   # Data extractors
│   │   ├── quickbooks/               #   QuickBooks extractor
│   │   ├── xero/                     #   Xero extractor
│   │   └── sage/                     #   Sage extractor
│   ├── transformers/                 # Data transformers
│   │   ├── bronze_to_silver/         #   Normalization, validation
│   │   └── silver_to_gold/           #   Aggregation, metrics
│   └── orchestration/                # Glue job orchestration
│
├── keycloak/                         # 🔐 Authentication
│   ├── realms/                       # Realm configuration
│   └── themes/plainledger/           # Custom login theme
│
├── terraform/                        # 🏗️ Infrastructure as Code
│   ├── modules/                      # Reusable modules
│   │   ├── ecs/                      #   ECS cluster & services
│   │   ├── rds/                      #   PostgreSQL RDS
│   │   ├── s3/                       #   S3 buckets
│   │   └── vpc/                      #   VPC & networking
│   └── environments/                 # dev, staging, prod configs
│
├── e2e/                              # 🧪 E2E Tests (Playwright)
│   ├── landing.spec.ts               # Landing page tests
│   ├── auth.spec.ts                  # Authentication tests
│   ├── dashboard.spec.ts             # Dashboard tests
│   └── ...
│
├── local-dev/                        # 🐳 Local Development
│   ├── start.sh                      # Start all services
│   ├── stop.sh                       # Stop all services
│   └── init-*.sql                    # DB initialization
│
├── docs/                             # 📚 Documentation
├── fixtures/                         # 📋 Test fixtures
└── docker-compose.yml                # Local stack definition
```

---

## 🤝 Contributing

PlainLedger is currently a proprietary project. For enterprise partnerships, integrations, or feature requests, please contact:

- **Partnerships**: partnerships@plainledger.ca
- **Feature Requests**: [GitHub Issues](https://github.com/stonyp90/plainledger/issues)
- **Security Issues**: security@plainledger.ca

---

## 📄 License

**Proprietary** - All rights reserved.

Copyright © 2026 PlainLedger. This software and associated documentation files (the "Software") are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this Software, via any medium, is strictly prohibited.

---

## 🔗 Links

- **Website**: [plainledger.ca](https://plainledger.ca)
- **Documentation**: [docs.plainledger.ca](https://docs.plainledger.ca)
- **API Reference**: [api.plainledger.ca/docs](https://api.plainledger.ca/docs)
- **Pricing**: [plainledger.ca/pricing](https://plainledger.ca/pricing)
- **Schedule Demo**: [calendly.com/anthonypaquet1508](https://calendly.com/anthonypaquet1508)
- **Support**: [support@plainledger.ca](mailto:support@plainledger.ca)

---

<div align="center">

**Built with ❤️ in Canada**

[Privacy Policy](#) • [Terms of Service](#) • [Security](#)

</div>
