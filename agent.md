# Agent Guide for PlainLedger

This document serves as a comprehensive guide for LLM agents working on the PlainLedger codebase. Follow these standards and patterns to ensure consistency, maintainability, and brand compliance.

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Brand and Theme Standards](#2-brand-and-theme-standards)
3. [Demo Mode and New Signup Flow](#3-demo-mode-and-new-signup-flow)
4. [Entitlements System](#4-entitlements-system)
5. [Clean Architecture (Backend)](#5-clean-architecture-backend)
6. [Terraform Infrastructure](#6-terraform-infrastructure)
7. [Testing with Playwright](#7-testing-with-playwright)
8. [Internationalization](#8-internationalization)
9. [Key Development Guidelines](#9-key-development-guidelines)
10. [Important File References](#10-important-file-references)

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

## 9. Key Development Guidelines

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

### 5. Clean Architecture

- **Follow layers** - Domain → Application → Infrastructure
- Use dependency injection
- Keep business logic in use cases
- Value objects for domain primitives

### 6. Type Safety

- **Full TypeScript** - No `any` types
- Define interfaces for all data structures
- Use type guards for runtime validation

### 7. Testing

- **Write E2E tests** - Use Playwright for new features
- Test authenticated and unauthenticated flows
- Test in both languages
- Use proper file naming conventions

### 8. Demo Mode

- **New signups** - Automatically in `demo-signup` organization
- Show `DemoSignupWelcome` for demo users
- Display demo data with clear CTAs
- Never show real data to demo users

---

## 10. Important File References

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

- [ ] Logo uses green gradient (never gray/blue)
- [ ] Logo uses proper SVG (not Building2 icon)
- [ ] No gray backgrounds (use CSS variables)
- [ ] All text is bilingual (EN/FR)
- [ ] Premium features are gated with `PremiumFeatureGate`
- [ ] CTAs offer both Calendly and email form
- [ ] Demo users see `DemoSignupWelcome`
- [ ] Follow clean architecture layers
- [ ] Write Playwright tests for new features
- [ ] Use TypeScript types (no `any`)

---

**Last Updated**: January 2026
**Version**: 1.0.0
