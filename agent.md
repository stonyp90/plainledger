# Agent Guide for PlainLedger

This document serves as a comprehensive guide for LLM agents working on the PlainLedger codebase. Follow these standards and patterns to ensure consistency, maintainability, and brand compliance.

## 🤖 Using Skills and Sub-Agents

**CRITICAL:** Always use available skills and sub-agents to maximize effectiveness and allow the AI to become smarter over time.

### Available Skills

When working on tasks, **ALWAYS check for available skills first** before implementing from scratch. Skills provide specialized capabilities:

- **Skill Creator** - Create new skills for specialized workflows
- **Skill Installer** - Install curated skills from repositories
- **Cursor Rules Creator** - Create persistent AI guidance rules
- **Cursor Settings Updater** - Modify editor settings and preferences

**How to Use Skills:**
1. Check if a skill exists for your task
2. Read the skill file to understand its capabilities
3. Use the skill instead of manual implementation
4. If no skill exists, consider creating one for future use

### Sub-Agents Pattern

For complex tasks, **ALWAYS delegate to specialized sub-agents** by referencing focused `agent.md` files in subdirectories:

**Available Sub-Agents:**
- [`apps/api/agent.md`](apps/api/agent.md) - Backend/API-specific guidance (NestJS, Clean Architecture)
- [`apps/web/agent.md`](apps/web/agent.md) - Frontend/React-specific guidance (React, TailwindCSS, i18n)
- [`terraform/agent.md`](terraform/agent.md) - Infrastructure-specific guidance (AWS, Terraform modules)
- [`e2e/agent.md`](e2e/agent.md) - Testing-specific guidance (Playwright, E2E patterns)

**When to Use Sub-Agents:**
1. Working on API endpoints → Read `apps/api/agent.md`
2. Working on React components → Read `apps/web/agent.md`
3. Working on infrastructure → Read `terraform/agent.md`
4. Writing E2E tests → Read `e2e/agent.md`

**Benefits:**
- Specialized knowledge per domain
- Better context awareness
- Reduced cognitive load
- Improved accuracy
- Faster development

### Self-Improvement Strategy

**CRITICAL: Allow AI to become smarter over time by continuously improving agent files.**

**How to Improve:**

1. **Document Patterns** - When you discover a better way to do something, add it to the relevant agent.md
2. **Create Skills** - Convert reusable workflows into skills for future use
3. **Update Guidelines** - Refine agent.md files based on learnings and mistakes
4. **Use Sub-Agents** - Always delegate to specialized agents for domain expertise
5. **Learn from Context** - Reference existing code patterns before creating new ones
6. **Share Learnings** - Update both sub-agent.md and main agent.md when patterns are cross-cutting

**When to Update Agent Files:**

- ✅ After discovering a better pattern
- ✅ When fixing recurring issues
- ✅ When adding new features that establish patterns
- ✅ When improving code quality or architecture
- ✅ When finding common mistakes to prevent
- ✅ When learning new best practices

**Update Pattern:**

```
1. Implement feature/fix
2. Identify reusable pattern
3. Document in relevant agent.md (sub-agent or main)
4. If cross-cutting, update main agent.md too
5. Reference pattern in future work
```

**Remember:** 
- Agent.md files are **living documents** that evolve with the codebase
- **Always check** existing agent.md files before starting work
- **Always update** agent.md files when you learn something new
- **Always use** skills and sub-agents to maximize effectiveness

**This creates a self-improving system where the AI becomes smarter with each interaction.**

## Table of Contents

1. [Using Skills and Sub-Agents](#-using-skills-and-sub-agents)
2. [Project Overview](#1-project-overview)
3. [Brand and Theme Standards](#2-brand-and-theme-standards)
4. [Demo Mode and New Signup Flow](#3-demo-mode-and-new-signup-flow)
5. [Entitlements System](#4-entitlements-system)
6. [Clean Architecture (Backend)](#5-clean-architecture-backend)
7. [Terraform Infrastructure](#6-terraform-infrastructure)
8. [Testing with Playwright](#7-testing-with-playwright)
9. [Internationalization](#8-internationalization)
10. [Development Velocity & Quality Tools](#9-development-velocity--quality-tools)
11. [Local Development Requirements (CRITICAL)](#10-local-development-requirements-critical)
12. [Key Development Guidelines](#11-key-development-guidelines)
13. [Important File References](#12-important-file-references)

---

## 1. Project Overview

**PlainLedger** is an enterprise financial reporting SaaS platform designed for **Canadian small and medium businesses** with **$2M-$20M+ annual revenue**.

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: NestJS, TypeScript, Clean Architecture
- **Database**: PostgreSQL 15+, Redis 7+
- **Authentication**: Keycloak 22+ (SSO, MFA, SAML/OIDC)
- **Storage**: AWS S3 / MinIO (S3-compatible)
- **Infrastructure**: Docker, Docker Compose, Terraform, AWS
- **Testing**: Playwright (E2E), Vitest (Unit)

### Target Market

Canadian SMBs seeking IBCS-compliant financial reports, multi-provider accounting integrations, and AI-powered anomaly detection.

---

## 2. Brand and Theme Standards

### Colors

**Primary (Trust Green)**: Emerald green palette (`--color-primary-*`)
- Primary: `rgb(var(--color-primary-500))` - `#10b981`
- Dark: `rgb(var(--color-primary-700))` - `#047857`
- Light: `rgb(var(--color-primary-100))` - `#d1fae5`

**Accent (Prosperity Gold)**: Amber/gold palette (`--color-accent-*`)
- Accent: `rgb(var(--color-accent-500))` - `#f59e0b`
- Dark: `rgb(var(--color-accent-700))` - `#b45309`

**NEVER use gray backgrounds** - Always use CSS variables:
- Light mode: `--color-bg` (white), `--color-bg-subtle` (very light slate)
- Dark mode: `--color-bg` (navy), `--color-surface` (dark slate)

Reference: [`apps/web/src/styles/globals.css`](apps/web/src/styles/globals.css)

### PlainLedger Logo

**ALWAYS use the branded logo with these exact specifications:**

```tsx
// Logo container - ALWAYS use green gradient, never gray
<Link to="/" className="flex items-center gap-2 group">
  <div 
    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
    style={{ 
      background: 'linear-gradient(135deg, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-700)) 100%)',
      boxShadow: '0 2px 8px rgb(var(--color-primary-500) / 0.3)'
    }}
  >
    {/* SVG ledger icon with green checkmark */}
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="5" width="3" height="22" rx="1" fill="rgba(255,255,255,0.5)"/>
      <rect x="8" y="5" width="20" height="22" rx="2" fill="white"/>
      <line x1="11" y1="10" x2="25" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="11" y1="15" x2="25" y2="15" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="11" y1="20" x2="20" y2="20" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M17 21 L20 24 L26 17" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
  {/* Brand name - "Ledger" can be highlighted in primary color */}
  <span className="font-semibold text-lg" style={{ color: 'rgb(var(--color-text))' }}>
    PlainLedger
  </span>
</Link>
```

**Logo Sizes:**
- Small (sidebar/header): `w-8 h-8` container with `w-5 h-5` or `w-6 h-6` SVG
- Large (marketing): Scale proportionally

**Key Logo Rules:**
- Container: **ALWAYS** green gradient (`--color-primary-500` to `--color-primary-700`)
- Never use gray, blue, or other background colors
- Add subtle green box-shadow for depth: `0 2px 8px rgb(var(--color-primary-500) / 0.3)`
- Checkmark in the SVG: **ALWAYS** green (`#22c55e`)
- Use `group-hover:scale-105` for interactive hover effect
- **DO NOT** use generic icons like `Building2` from lucide-react as the logo

**Correct Logo Implementations** (copy from these):
- [`apps/web/src/components/Layout.tsx`](apps/web/src/components/Layout.tsx) (lines 146-162) - Header/sidebar logo
- [`apps/web/src/pages/Store.tsx`](apps/web/src/pages/Store.tsx) (lines 208-227) - Marketing page header
- [`apps/web/src/pages/Login.tsx`](apps/web/src/pages/Login.tsx) (lines 168-186) - Login page logo

### Component Classes

**Buttons:**
- `btn-primary` - Green primary button
- `btn-accent` - Gold accent button (for premium CTAs)
- `btn-secondary` - Secondary button
- `btn-ghost` - Ghost button

**Cards:**
- `card` - Base card
- `card-interactive` - Interactive card with hover
- `card-highlight` - Highlighted card with green border

**Store/Marketing:**
- `store-trust-badge` - Trust badge with green/gold gradient
- `store-cta-button` - CTA button with gold accent
- `store-feature-icon-*` - Feature icon containers

Reference: [`apps/web/src/styles/globals.css`](apps/web/src/styles/globals.css)

---

## 3. Demo Mode and New Signup Flow

### Architecture

New signups are automatically placed in the `demo-signup` organization, which:
- Auto-enables demo mode showing sample financial data
- Displays `DemoSignupWelcome` component with subscription tiers
- Shows CTAs for upgrading to connect real accounting software

**Key Check:**
```tsx
const isDemoSignupUser = user?.organization === 'demo-signup';
```

Reference: [`apps/web/src/contexts/DemoModeContext.tsx`](apps/web/src/contexts/DemoModeContext.tsx)

### Components

**DemoSignupWelcome** - Shows subscription tiers and CTAs for demo-signup users
- Location: [`apps/web/src/components/DemoSignupWelcome.tsx`](apps/web/src/components/DemoSignupWelcome.tsx)
- Displays: Starter, Professional, Enterprise tiers
- CTAs: Calendly link + email form option

**DemoBanner** - General demo data indicator with upgrade CTA
- Location: [`apps/web/src/components/DemoBanner.tsx`](apps/web/src/components/DemoBanner.tsx)
- Shows: "Viewing Test Data" message
- CTA: Link to Calendly

**DemoLockOverlay** - Locks features with upgrade prompt
- Location: [`apps/web/src/components/DemoLockOverlay.tsx`](apps/web/src/components/DemoLockOverlay.tsx)
- Used: To overlay premium features in demo mode

### CTA Strategy

All upgrade CTAs should offer **both** options:

1. **Primary**: Calendly link (`https://calendly.com/anthonypaquet1508`)
   - Opens in new tab
   - Use `window.open(CALENDLY_URL, '_blank')`

2. **Secondary**: Email form via `UpgradeRequestForm` component
   - Location: [`apps/web/src/components/UpgradeRequestForm.tsx`](apps/web/src/components/UpgradeRequestForm.tsx)
   - Collects: Name, email, company, message
   - Can toggle between form and Calendly link

**Example Pattern:**
```tsx
const [showEmailForm, setShowEmailForm] = useState(false);

{showEmailForm ? (
  <UpgradeRequestForm
    feature={feature}
    showCalendlyOption={true}
    onSubmitted={() => setShowEmailForm(false)}
  />
) : (
  <div className="flex gap-3">
    <button onClick={() => setShowEmailForm(true)}>
      Request Information
    </button>
    <button onClick={() => window.open(CALENDLY_URL, '_blank')}>
      Schedule Call
    </button>
  </div>
)}
```

---

## 4. Entitlements System

### Subscription Tiers

Four subscription tiers with granular feature access:

- `free` - Trial/demo access
- `starter` - Basic features ($500/month)
- `professional` - Advanced features ($1,200/month)
- `enterprise` - Full features (custom pricing)

Reference: [`apps/web/src/lib/entitlements.ts`](apps/web/src/lib/entitlements.ts)

### Feature Gating

**Component Pattern:**
```tsx
import PremiumFeatureGate, { usePremiumFeature } from '../components/PremiumFeatureGate';

// Wrap premium content
<PremiumFeatureGate feature="aiInsights">
  <YourPremiumComponent />
</PremiumFeatureGate>

// Or check access programmatically
const { hasAccess, requiredPlan, currentPlan } = usePremiumFeature('aiInsights');
```

**Premium Features:**
- `aiInsights` - AI-powered insights
- `customReports` - Custom report generation
- `powerBI` - Power BI integration
- `apiAccess` - API access
- `auditLogs` - Audit logging
- `webhooks` - Webhook support
- `sso` - Single Sign-On
- `strategicPlanning` - Strategic planning tools
- `advancedAnalytics` - Advanced analytics
- `boardMeeting` - Board meeting tools

Reference: [`apps/web/src/components/PremiumFeatureGate.tsx`](apps/web/src/components/PremiumFeatureGate.tsx)

### Entitlement Categories

**Data Sources:**
- Max connections per tier
- Provider access (QuickBooks, Xero, Sage, etc.)

**Reports:**
- Monthly report limits
- Report types (Balance Sheet, Income Statement, Cash Flow, Custom)

**Power BI:**
- Embedded dashboards
- White-label support
- Custom themes
- Max dashboards

**Data Lake:**
- Storage limits (GB)
- Query access
- AI insights availability

**Security:**
- SSO support
- MFA availability
- Audit logs
- Data retention (days)
- Custom roles

**API:**
- Rate limits (requests/hour)
- Webhook support

**Support:**
- Support level (community, email, priority, dedicated)
- SLA availability
- SLA response time (days)

---

## 5. Clean Architecture (Backend)

### Structure

```
apps/api/src/
├── domain/           # Entities, Value Objects, Domain Errors
│   ├── entities/     # Organization, Account, DataSource
│   ├── value-objects/# TenantId, Money, AccountCode
│   └── errors/       # DomainError, EntityNotFoundError
├── application/      # Use Cases, Ports
│   ├── use-cases/    # Business logic (GenerateBalanceSheet, etc.)
│   ├── services/     # Application services
│   └── ports/        # Interfaces (IRepository, IService)
│       └── outbound/  # Outbound ports (repositories, external services)
└── infrastructure/   # Controllers, Repositories, External Services
    ├── http/         # REST controllers
    ├── graphql/      # GraphQL resolvers
    ├── persistence/  # Postgres repositories
    ├── auth/         # Keycloak integration
    └── integrations/ # External service integrations
```

### Patterns

**Dependency Injection:**
```typescript
@Injectable()
export class GenerateBalanceSheetUseCase {
  constructor(
    @Inject("IOrganizationRepository")
    private readonly organizationRepository: IOrganizationRepository,
  ) {}
}
```

**Value Objects:**
```typescript
export class TenantId {
  private constructor(private readonly value: string) {}
  
  static create(value: string): TenantId {
    // Validation logic
    return new TenantId(value);
  }
}
```

**Repository Pattern:**
- Define interfaces in `application/ports/outbound/`
- Implement in `infrastructure/persistence/`
- Inject via `@Inject("IRepositoryName")`

**Use Cases:**
- Business logic lives in `application/use-cases/`
- Use cases orchestrate domain entities and repositories
- Return DTOs, not domain entities

**Example Use Case:**
Reference: [`apps/api/src/application/use-cases/generate-balance-sheet.use-case.ts`](apps/api/src/application/use-cases/generate-balance-sheet.use-case.ts)

---

## 6. Terraform Infrastructure

### Module Structure

```
terraform/
├── modules/
│   ├── datalake/     # S3 Bronze/Silver/Gold, Glue, Athena, Lake Formation
│   ├── ecs/          # Container orchestration
│   ├── database/     # RDS PostgreSQL
│   ├── networking/   # VPC, subnets, security groups
│   ├── analytics/    # Athena, Power BI integration
│   └── cicd/         # Deployment pipeline
└── environments/
    ├── dev/          # Development environment
    └── prod/         # Production environment
```

### Key Modules

**Data Lake** (`modules/datalake/`):
- S3 buckets: Bronze (raw), Silver (clean), Gold (curated)
- AWS Glue for schema discovery
- Athena for querying
- Lake Formation for access control
- KMS encryption

**ECS** (`modules/ecs/`):
- Fargate tasks for API and Web
- Application Load Balancer
- Auto-scaling configuration

**Database** (`modules/database/`):
- RDS PostgreSQL with Multi-AZ
- Automated backups
- Read replicas for scaling

**Networking** (`modules/networking/`):
- VPC with public/private subnets
- NAT Gateway for outbound traffic
- Security groups

Reference: [`terraform/modules/datalake/main.tf`](terraform/modules/datalake/main.tf)

### Environments

- **dev**: Development/testing environment
- **prod**: Production environment

Each environment has its own `main.tf`, `variables.tf`, and `outputs.tf`.

---

## 7. Testing with Playwright

### Configuration

**Test Directory:** `e2e/`

**Projects:**
- `unauthenticated` - Public routes (landing page, etc.)
- `chromium` - Authenticated tests (requires setup)
- `mobile` - Mobile device tests
- `setup` - Authentication setup

**Auth State:** Stored in `e2e/.auth/user.json`

Reference: [`playwright.config.ts`](playwright.config.ts)

### File Naming Conventions

- `*.unauth.spec.ts` - Unauthenticated tests (landing page, public routes)
- `*.spec.ts` - Authenticated tests (requires auth setup)
- `*.setup.ts` - Auth setup (login flow)

### Test Patterns

**Unauthenticated Tests:**
```typescript
test.beforeEach(async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/');
});
```

**Authenticated Tests:**
```typescript
test.use({ 
  storageState: 'e2e/.auth/user.json',
});
```

**Localization:**
- Default language: French (`fr`)
- Test against localized content
- Use text matchers that work in both languages

**Example Test:**
Reference: [`e2e/landing.unauthenticated.spec.ts`](e2e/landing.unauthenticated.spec.ts)

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run in headed browser
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

---

## 8. Internationalization

### Supported Languages

- **French (`fr`)** - Default language
- **English (`en`)** - Secondary language

### Implementation

**Hook:**
```tsx
import { useI18n } from '../lib/i18n';

const { language } = useI18n();
const isEn = language === 'en';
```

**Pattern:**
```tsx
{isEn ? 'English Text' : 'Texte français'}
```

**Translation File:**
Reference: [`apps/web/src/lib/i18n/translations.ts`](apps/web/src/lib/i18n/translations.ts)

### Guidelines

- **Always** support both languages in user-facing text
- Use conditional rendering: `{isEn ? '...' : '...'}`
- Keep translations consistent across components
- Test UI in both languages

---

## 9. Development Velocity & Quality Tools

### Tooling vs AI Agent Mode

**Cursor Agent Mode** helps you write code correctly by following patterns and architecture.  
**Tooling** catches mistakes automatically and prevents regressions.

They work together: Agent Mode writes good code → Tools ensure it stays good.

### Pre-commit Hooks

**Setup:** Run `./scripts/setup-pre-commit.sh` to install Husky and lint-staged.

**What it does:**
- Runs ESLint and Prettier before commits
- Auto-fixes formatting issues
- Prevents lint/type errors from reaching CI
- Saves 5-10 minutes per PR cycle

**Configuration:** See `package.json` → `lint-staged` section.

### CI/CD Quality Gates

**Test Coverage:** CI enforces minimum coverage thresholds (currently 50%, increasing incrementally).

**Coverage Checks:**
- API: `npm run test:cov` with thresholds
- Web: `npm run test:coverage` with thresholds
- Currently non-blocking (will become blocking as coverage improves)

**E2E Tests:** Playwright tests run in CI (when implemented) to catch integration bugs.

### Dependency Management

**Dependabot:** Automatically creates PRs for:
- Security patches (weekly)
- Dependency updates (weekly)
- GitHub Actions updates (monthly)

**Configuration:** `.github/dependabot.yml`

### Performance Monitoring

**Current:** CloudWatch logs enabled  
**Recommended:** Add performance interceptors to track:
- API response times
- Slow database queries (>500ms)
- GraphQL query complexity

### Regression Prevention Strategy

1. **Pre-commit hooks** → Catch errors before commit
2. **CI coverage checks** → Prevent coverage regression
3. **E2E tests in CI** → Catch integration bugs
4. **Performance monitoring** → Detect slow queries/APIs
5. **Dependabot** → Automatic security patches

### Quick Wins (Implemented)

✅ **Dependabot** - Automatic dependency updates  
✅ **PR Template** - Consistent code reviews  
✅ **CI Coverage Checks** - Visibility into test coverage  
✅ **Pre-commit Setup Script** - Ready to run (`./scripts/setup-pre-commit.sh`)

### Priority Improvements

**This Week:**
- Run pre-commit setup script
- Monitor test coverage trends
- Review Dependabot PRs

**This Month:**
- Add E2E tests to CI
- Implement structured logging with correlation IDs
- Add performance monitoring interceptors

**Next Quarter:**
- Feature flags for safe deployments
- Contract testing for API changes
- Visual regression testing

---

## 10. Local Development Requirements (CRITICAL)

**Every new feature or technology MUST be runnable locally. No exceptions.**

### When Adding New Features/Technologies

**ALWAYS update these files:**

| File | What to Add |
|------|-------------|
| `docker-compose.yml` | Service definition, health checks, volumes, networks |
| `LOCAL_SETUP.md` | Setup instructions, prerequisites, troubleshooting |
| `apps/api/env.example` | Required environment variables with descriptions |

### External Services Must Have Local Alternatives

| Production Service | Local Alternative |
|-------------------|-------------------|
| AWS S3 | LocalStack (`localhost:4566`) |
| AWS SES | Mailhog/MailDev |
| PostgreSQL RDS | Local PostgreSQL |
| Redis ElastiCache | Local Redis |
| MongoDB Atlas | Local MongoDB |
| Keycloak Cloud | Local Keycloak |

**Rule:** If it runs in production, it MUST have a local equivalent in `docker-compose.yml`.

### Prohibited Patterns

❌ **NEVER** require cloud services for local development
❌ **NEVER** hardcode cloud URLs without local fallbacks
❌ **NEVER** skip updating `LOCAL_SETUP.md`
❌ **NEVER** add services without health checks

✅ **ALWAYS** provide LocalStack/mock alternatives
✅ **ALWAYS** use environment variables for URLs
✅ **ALWAYS** document local setup steps
✅ **ALWAYS** test `docker-compose up` works from scratch

### docker-compose.yml Service Template

```yaml
new-service:
  image: service-image:version
  container_name: plainledger-new-service
  environment:
    - SERVICE_VAR=${SERVICE_VAR:-default}
  ports:
    - "PORT:PORT"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:PORT/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  networks:
    - plainledger-network
  depends_on:
    postgres:
      condition: service_healthy
```

### LOCAL_SETUP.md Section Template

```markdown
### New Service Name

**Prerequisites:**
- Prerequisite 1
- Prerequisite 2

**Starting:**
\`\`\`bash
docker-compose up new-service
\`\`\`

**Verification:**
\`\`\`bash
curl http://localhost:PORT/health
\`\`\`

**Troubleshooting:**
- Issue 1 → Solution 1
- Issue 2 → Solution 2
```

**Reference:** See `LOCAL_SETUP.md` for complete local development guide.

---

## 11. Key Development Guidelines

### 1. Brand Compliance

- **NEVER use gray backgrounds** - Always use design system CSS variables
- **ALWAYS use green gradient** for logo containers
- **ALWAYS use branded SVG logo** - Never use generic icons

### 2. Internationalization

- **Always bilingual** - Support EN/FR in all user-facing text
- Use `useI18n()` hook for language detection
- Test components in both languages

### 3. CTA Strategy

- **Offer both options** - Calendly link + email form
- Use `UpgradeRequestForm` component for email collection
- Calendly URL: `https://calendly.com/anthonypaquet1508`

### 4. Feature Gating

- **Use entitlements** - Check subscription tier before showing features
- Wrap premium content with `<PremiumFeatureGate>`
- Use `usePremiumFeature()` hook for programmatic checks

### 5. Clean Architecture & Domain-Driven Design

- **Follow layers** - Domain → Application → Infrastructure
- **Domain-Driven Design** - Rich domain models, value objects, aggregates
- **Class size limit** - Maximum 1000 lines per class (check with `npm run check:class-sizes`)
- **Modularity** - Decouple when complexity increases
- Use dependency injection
- Keep business logic in use cases
- Value objects for domain primitives
- **Extract services** - Split large classes by responsibility
- **Provider-agnostic** - All external integrations must use interfaces (see below)

**Current violations to refactor:**
- `apps/api/src/infrastructure/ai/ai.service.ts` (1719 lines)
- `apps/api/src/infrastructure/services/datalake-data.service.ts` (1766 lines)
- `apps/api/src/application/services/etl-pipeline.service.ts` (1369 lines)

### 5b. Provider-Agnostic Architecture

**CRITICAL:** All external integrations MUST be technology and provider agnostic.

**Pattern: Port (Interface) + Provider (Implementation) + Factory**

```
application/ports/outbound/
├── IAccountingProvider.ts     # Interface - QuickBooks, Xero, Sage all implement this
├── IStorageProvider.ts        # Interface - S3, MinIO, Azure all implement this
└── IAIProvider.ts             # Interface - OpenAI, Anthropic, Bedrock all implement this

infrastructure/integrations/
├── quickbooks/                # QuickBooks-specific implementation
├── xero/                      # Xero-specific implementation
└── sage/                      # Sage-specific implementation

application/services/
└── provider-factory.service.ts  # Factory to select provider at runtime
```

**Key Rules:**

1. **Business logic depends ONLY on interfaces**, never concrete providers
2. **All providers return normalized types** (our schema, not vendor schema)
3. **Use factory pattern** to select provider at runtime
4. **Configuration-driven** - provider selection via environment variables
5. **Easy testing** - mock providers implement same interface

**Providers to Abstract:**

| Domain | Port Interface | Implementations |
|--------|---------------|-----------------|
| Accounting | `IAccountingProvider` | QuickBooks, Xero, Sage, FreshBooks |
| Storage | `IStorageProvider` | AWS S3, MinIO, Azure Blob, GCS |
| Email | `IEmailProvider` | AWS SES, SendGrid, Mailgun |
| AI/LLM | `IAIProvider` | OpenAI, Anthropic, AWS Bedrock |
| Cache | `ICacheProvider` | Redis, Memcached, In-memory |
| Auth | `IAuthProvider` | Keycloak, Auth0, Cognito |

**Reference:** See `apps/api/agent.md` for detailed implementation patterns and examples.

### 6. Type Safety

- **Full TypeScript** - No `any` types
- Define interfaces for all data structures
- Use type guards for runtime validation

### 7. Testing & API Contracts

**CRITICAL:** All API endpoints MUST have:
- Swagger decorators (`@ApiOperation`, `@ApiResponse`, `@ApiTags`)
- Contract tests (see `apps/api/test/contract/api.contract.spec.ts`)
- OpenAPI spec generation (automatic from decorators)

**Test Coverage Requirements:**
- **Domain Layer:** 100% coverage (entities, value objects, domain services)
- **Application Layer:** 80% coverage (use cases, services)
- **Infrastructure Layer:** 70% coverage (controllers, repositories)

**E2E Testing with Testcontainers:**
- **Use testcontainers** for isolated infrastructure (PostgreSQL, Redis, S3)
- **Use fixtures** from `@fixtures` directory for all test data
- **Playwright** for browser-based E2E tests
- **Run:** `npm run test:e2e:containers` (with testcontainers) or `npm run test:e2e` (docker-compose)

**Important Features to Test:**
1. **Authentication** - Login, token refresh, logout, roles (use `fixtures/auth/`)
2. **Authorization** - Role-based access, feature gates, multi-tenancy
3. **Data Sync** - ETL pipeline, data transformation, provider integrations (use `fixtures/providers/`)
4. **Financial Calculations** - Balance sheets, reports, KPIs (use `fixtures/industries/`)
5. **Multi-tenancy** - Tenant isolation, data segregation
6. **API Contracts** - Request/response validation, schema changes

**Test Types:**
- **Unit Tests** - Fast, isolated, mock dependencies (Jest/Vitest)
- **Integration Tests** - Test layers together, use testcontainers + fixtures
- **Contract Tests** - Validate API contracts (`npm run test:contract`)
- **E2E Tests** - Full user flows with Playwright + testcontainers + fixtures (`npm run test:e2e:containers`)

**Fixtures Usage:**
```typescript
import { TestData } from './helpers/fixtures';

// Use fixtures in tests
const restaurant = TestData.restaurant();
const org = TestData.professionalOrg();
const expectedKPIs = TestData.getExpectedKPIsForIndustry('restaurant');
```

**Run Tests:**
```bash
# Unit tests
npm test                    # API
npm run test:run           # Web

# Contract tests
npm run test:contract      # API contract validation

# E2E tests
npm run test:e2e          # Playwright

# Check class sizes
npm run check:class-sizes # Enforce 1000 line limit
```

### 8. Demo Mode

- **New signups** - Automatically in `demo-signup` organization
- Show `DemoSignupWelcome` for demo users
- Display demo data with clear CTAs
- Never show real data to demo users

---

## 12. Sub-Agent References

**Always check these specialized guides when working in specific domains:**

| Sub-Agent | Location | Use When |
|-----------|----------|----------|
| **API Agent** | [`apps/api/agent.md`](apps/api/agent.md) | Working on backend, NestJS, use cases, repositories |
| **Web Agent** | [`apps/web/agent.md`](apps/web/agent.md) | Working on frontend, React components, UI, styling |
| **Terraform Agent** | [`terraform/agent.md`](terraform/agent.md) | Working on infrastructure, AWS, Terraform modules |
| **E2E Agent** | [`e2e/agent.md`](e2e/agent.md) | Writing E2E tests, Playwright, test patterns |

**Pattern:** Read the relevant sub-agent.md **before** starting work in that domain.

### Reference Implementations

**Use these as templates for new features:**

| Feature | Location | Demonstrates |
|---------|----------|--------------|
| **Visualization System** | `apps/web/src/components/visualization/` | Component groups, index exports, types in lib, sub-component composition, error boundaries |
| **Charts** | `apps/web/src/components/charts/` | Reusable chart components, compound pattern |
| **Strategic Planning** | `apps/web/src/components/strategic/` | Complex feature module, many sub-components |

**Key Files to Reference:**
- Types pattern: `apps/web/src/lib/visualizationTypes.ts`
- Schema pattern: `apps/web/src/lib/goldSchema.ts`
- Index pattern: `apps/web/src/components/visualization/index.ts`
- Main component: `apps/web/src/components/visualization/VisualizationBuilder.tsx`

## 13. Domain Documentation Quick Reference

**CRITICAL:** Reference existing documentation instead of creating new files. This optimizes token usage.

| Domain | Patterns | Documentation | Code Location |
|--------|----------|---------------|---------------|
| **Infrastructure** | `terraform/agent.md` | `terraform/README.md` | `terraform/modules/*/main.tf` |
| **ETL/Pipelines** | N/A | `pipelines/README.md` | `pipelines/extractors/`, `pipelines/transformers/` |
| **Authentication** | N/A | `keycloak/realms/plainledger-realm.json` | `apps/api/src/infrastructure/auth/` |
| **API** | `apps/api/agent.md` | N/A | `apps/api/src/` |
| **Web** | `apps/web/agent.md` | N/A | `apps/web/src/` |
| **Testing** | `e2e/agent.md` | N/A | `e2e/*.spec.ts` |
| **Local Setup** | N/A | `LOCAL_SETUP.md` | `local-dev/`, `docker-compose.yml` |
| **QuickBooks** | N/A | `QUICKBOOKS_SETUP_GUIDE.md` | `apps/api/src/infrastructure/integrations/quickbooks/` |

**Token Optimization:**
- Read only the relevant `agent.md` for patterns
- Read only the relevant `README.md` for domain details
- Use semantic search for specific code patterns
- Reference files by path, don't copy entire content

## 14. Important File References

### Theme & Styling
- **CSS Variables & Design System**: [`apps/web/src/styles/globals.css`](apps/web/src/styles/globals.css)
- **Component Styles**: See `@layer components` in globals.css

### Entitlements & Feature Gating
- **Entitlements Config**: [`apps/web/src/lib/entitlements.ts`](apps/web/src/lib/entitlements.ts)
- **Premium Gate Component**: [`apps/web/src/components/PremiumFeatureGate.tsx`](apps/web/src/components/PremiumFeatureGate.tsx)

### Demo Mode
- **Demo Context**: [`apps/web/src/contexts/DemoModeContext.tsx`](apps/web/src/contexts/DemoModeContext.tsx)
- **Demo Welcome**: [`apps/web/src/components/DemoSignupWelcome.tsx`](apps/web/src/components/DemoSignupWelcome.tsx)
- **Demo Banner**: [`apps/web/src/components/DemoBanner.tsx`](apps/web/src/components/DemoBanner.tsx)

### Authentication
- **Keycloak Integration**: [`apps/web/src/lib/keycloak.tsx`](apps/web/src/lib/keycloak.tsx)
- **Auth Controller**: [`apps/api/src/infrastructure/http/controllers/auth.controller.ts`](apps/api/src/infrastructure/http/controllers/auth.controller.ts)

### Internationalization
- **Translations**: [`apps/web/src/lib/i18n/translations.ts`](apps/web/src/lib/i18n/translations.ts)
- **i18n Hook**: [`apps/web/src/lib/i18n/index.tsx`](apps/web/src/lib/i18n/index.tsx)

### Logo Implementations
**Correct (copy from these):**
- **Layout/Header**: [`apps/web/src/components/Layout.tsx`](apps/web/src/components/Layout.tsx) (lines 146-162)
- **Store Page**: [`apps/web/src/pages/Store.tsx`](apps/web/src/pages/Store.tsx) (lines 208-227)
- **Login Page**: [`apps/web/src/pages/Login.tsx`](apps/web/src/pages/Login.tsx) (lines 168-186)

**Needs Fixing:**
- **Signup Page**: [`apps/web/src/pages/Signup.tsx`](apps/web/src/pages/Signup.tsx) (lines 276-286) - Currently uses Building2 icon

### Backend Architecture
- **Use Case Example**: [`apps/api/src/application/use-cases/generate-balance-sheet.use-case.ts`](apps/api/src/application/use-cases/generate-balance-sheet.use-case.ts)
- **Domain Entity Example**: [`apps/api/src/domain/entities/Organization.ts`](apps/api/src/domain/entities/Organization.ts)
- **App Module**: [`apps/api/src/app.module.ts`](apps/api/src/app.module.ts)

### Infrastructure
- **Terraform Data Lake**: [`terraform/modules/datalake/main.tf`](terraform/modules/datalake/main.tf)
- **Docker Compose**: [`docker-compose.yml`](docker-compose.yml)

### Testing
- **Playwright Config**: [`playwright.config.ts`](playwright.config.ts)
- **E2E Test Example**: [`e2e/landing.unauthenticated.spec.ts`](e2e/landing.unauthenticated.spec.ts)

---

## Quick Reference Checklist

When working on PlainLedger, ensure:

**Before Starting:**
- [ ] Checked for available skills
- [ ] Read relevant sub-agent.md (api/web/terraform/e2e)
- [ ] Reviewed main agent.md for patterns

**During Development:**
- [ ] Logo uses green gradient (never gray/blue)
- [ ] Logo uses proper SVG (not Building2 icon)
- [ ] No gray backgrounds (use CSS variables)
- [ ] All text is bilingual (EN/FR)
- [ ] Premium features are gated with `PremiumFeatureGate`
- [ ] CTAs offer both Calendly and email form
- [ ] Demo users see `DemoSignupWelcome`
- [ ] Follow clean architecture layers (Domain → Application → Infrastructure)
- [ ] Apply Domain-Driven Design (rich domain models, value objects)
- [ ] Class size under 1000 lines (check with `./scripts/check-class-sizes.sh`)
- [ ] API endpoints have Swagger decorators (`@ApiOperation`, `@ApiResponse`)
- [ ] Write Playwright tests for new features
- [ ] Use TypeScript types (no `any`)

**After Completing:**
- [ ] Documented new patterns in relevant agent.md
- [ ] Updated agent.md if pattern is reusable
- [ ] Shared learnings with main agent.md if cross-cutting
- [ ] Added contract tests for new API endpoints
- [ ] Verified class size (run `./scripts/check-class-sizes.sh`)
- [ ] OpenAPI spec generated and exported

**🐳 Local Development Requirements (MANDATORY for new features/technologies):**
- [ ] Service runs locally via `docker-compose up`
- [ ] `docker-compose.yml` updated with service definition + health check
- [ ] `LOCAL_SETUP.md` updated with setup instructions
- [ ] `apps/api/env.example` updated with new environment variables
- [ ] External services have local alternatives (e.g., LocalStack for AWS)
- [ ] Works offline or has graceful degradation

---

**Last Updated**: February 2026
**Version**: 2.2.0

**Sub-Agents:**
- [`apps/api/agent.md`](apps/api/agent.md) v1.1.0 (Added: Architecture enforcement, contract testing, DDD)
- [`apps/web/agent.md`](apps/web/agent.md) v1.1.0 (Added: Component size limits, refactoring patterns)
- [`terraform/agent.md`](terraform/agent.md) v1.0.0
- [`e2e/agent.md`](e2e/agent.md) v1.0.0

**Documentation:**
- Infrastructure: `terraform/README.md`
- ETL/Pipelines: `pipelines/README.md`
- Authentication: `keycloak/realms/plainledger-realm.json`
- Local Setup: `LOCAL_SETUP.md`
- QuickBooks: `QUICKBOOKS_SETUP_GUIDE.md`

**Tools & Scripts:**
- Class size checker: `npm run check:class-sizes`
- Contract tests: `npm run test:contract` (API)
- OpenAPI spec: Auto-generated, available at `/api/docs`
