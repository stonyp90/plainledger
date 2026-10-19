# E2E Testing Agent Guide

This is a specialized agent guide for PlainLedger E2E testing (Playwright + Testcontainers). For general project guidance, see the [main agent.md](../agent.md).

## 🤖 Using Skills and Sub-Agents

**ALWAYS** check for available skills and use sub-agents when appropriate:
- Use skills for testing tasks (test generation, debugging)
- Reference this file for Playwright/E2E-specific patterns
- Delegate to feature-specific test patterns when appropriate
- Update this file when discovering better patterns
- **ALWAYS use fixtures** from `@fixtures` directory for test data

## Quick Reference

- **Main Agent Guide:** [`../agent.md`](../agent.md)
- **Testing Framework:** Playwright + Testcontainers
- **Test Directory:** `e2e/`
- **Config:** [`playwright.config.ts`](../playwright.config.ts)
- **Fixtures:** [`fixtures/loader.ts`](../fixtures/loader.ts)
- **Testcontainers:** [`e2e/testcontainers-setup.ts`](testcontainers-setup.ts)
- **Auth State:** `e2e/.auth/user.json`

## Test Organization

### File Naming Conventions

- `*.unauth.spec.ts` - Unauthenticated tests (public routes)
- `*.spec.ts` - Authenticated tests (requires auth)
- `*.setup.ts` - Auth setup (login flow)
- `*.mobile.spec.ts` - Mobile device tests

### Test Projects

**Configuration:** [`playwright.config.ts`](../playwright.config.ts)

- `unauthenticated` - Public routes, no auth needed
- `chromium` - Authenticated tests (desktop)
- `mobile` - Mobile device tests
- `setup` - Authentication setup

## Test Patterns

### Unauthenticated Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Public Routes', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies to ensure no auth state
    await context.clearCookies();
    await page.goto('/');
  });

  test('should load landing page', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Authenticated Test Pattern

```typescript
import { test, expect } from '@playwright/test';

test.use({ 
  storageState: 'e2e/.auth/user.json',
});

test.describe('Dashboard', () => {
  test('should display dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });
});
```

### Auth Setup Pattern

```typescript
import { test as setup } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'demo@plainledger.com');
  await page.fill('input[name="password"]', 'DemoPass123!@#');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: STORAGE_STATE });
});
```

### Internationalization Testing

**ALWAYS test in both languages:**

```typescript
test('should display bilingual content', async ({ page }) => {
  await page.goto('/');
  
  // Test French (default)
  await expect(page.locator('text=Texte français')).toBeVisible();
  
  // Switch to English
  await page.click('[data-testid="language-toggle"]');
  await expect(page.locator('text=English Text')).toBeVisible();
});
```

### Feature Gating Testing

```typescript
test('should show upgrade prompt for premium features', async ({ page }) => {
  await page.goto('/premium-feature');
  
  // Should show upgrade prompt for free tier
  await expect(page.locator('text=Upgrade to access')).toBeVisible();
  
  // Should have Calendly link
  const calendlyLink = page.locator('a[href*="calendly.com"]');
  await expect(calendlyLink).toBeVisible();
});
```

### Demo Mode Testing

```typescript
test('should show demo banner for demo users', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Should show demo banner
  await expect(page.locator('[data-testid="demo-banner"]')).toBeVisible();
  await expect(page.locator('text=Viewing Test Data')).toBeVisible();
});
```

## Common Test Scenarios with Fixtures

### Form Submission with Fixture Data

```typescript
import { TestData } from './helpers/fixtures';

test('should submit form with fixture data', async ({ page }) => {
  const org = TestData.professionalOrg();
  
  await page.goto('/form-page');
  
  await page.fill('input[name="name"]', org.name);
  await page.fill('input[name="industry"]', org.industry);
  await page.click('button[type="submit"]');
  
  await expect(page.locator('text=Success')).toBeVisible();
});
```

### Dashboard with Industry Fixtures

```typescript
import { TestData } from './helpers/fixtures';

test('should display industry KPIs from fixtures', async ({ page }) => {
  const restaurant = TestData.restaurant();
  const expectedKPIs = TestData.getExpectedKPIsForIndustry('restaurant');
  
  await page.goto('/app/dashboard');
  
  // Verify KPIs match fixture expectations
  for (const kpi of expectedKPIs.slice(0, 5)) {
    await expect(
      page.locator(`text=/${kpi.name}|${kpi.name_fr}/i`).first()
    ).toBeVisible();
  }
});
```

### API Testing with Fixtures

```typescript
import { test, expect } from '@playwright/test';
import { TestData } from './helpers/fixtures';

test('should create organization using fixture', async ({ request }) => {
  const org = TestData.professionalOrg();
  
  const response = await request.post('/api/organizations', {
    data: {
      tenantId: org.id,
      name: org.name,
      industry: org.industry,
    },
  });
  
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.name).toBe(org.name);
});
```

### Navigation Testing

```typescript
test('should navigate between pages', async ({ page }) => {
  await page.goto('/dashboard');
  
  await page.click('a[href="/reports"]');
  await expect(page).toHaveURL('/reports');
  
  await page.click('a[href="/settings"]');
  await expect(page).toHaveURL('/settings');
});
```

### API Integration Testing

```typescript
test('should load data from API', async ({ page }) => {
  // Intercept API call
  await page.route('**/api/v1/data', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ data: 'test' }),
    });
  });
  
  await page.goto('/data-page');
  await expect(page.locator('text=test')).toBeVisible();
});
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` for setup
- Clear state between tests

### 2. Selectors

**Prefer:**
- `data-testid` attributes
- Role-based selectors
- Text content (for user-facing elements)

**Avoid:**
- CSS class names (can change)
- XPath (fragile)
- Position-based selectors

### 3. Waiting

**ALWAYS wait explicitly:**
```typescript
// Good
await expect(page.locator('element')).toBeVisible();
await page.waitForURL('/dashboard');

// Bad
await page.waitForTimeout(1000); // Don't use fixed timeouts
```

### 4. Assertions

**Use Playwright assertions:**
```typescript
await expect(page.locator('element')).toBeVisible();
await expect(page.locator('element')).toHaveText('expected text');
await expect(page).toHaveURL('/expected-url');
```

### 5. Debugging

**Use Playwright tools:**
```bash
# Run in headed mode
npm run test:e2e:headed

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run specific project
npm run test:e2e:chromium
npm run test:e2e:unauthenticated

# Run with UI
npm run test:e2e:ui

# View report
npm run test:e2e:report
```

## Testcontainers & Fixtures

### Using Testcontainers

**When to use:**
- Need isolated infrastructure (database, Redis, S3)
- CI/CD environments (no docker-compose available)
- Integration tests requiring real services

**Setup:**
```typescript
import { setupTestContainers, seedTestData } from './testcontainers-setup';

// In global setup
const containers = await setupTestContainers();
await seedTestData(containers, {
  industry: 'restaurant',
  organization: 'professional',
  users: true,
  bronzeData: true,
});
```

**Enable in Playwright:**
```bash
USE_TESTCONTAINERS=true npm run test:e2e
```

### Using Fixtures

**ALWAYS use fixtures for test data:**
```typescript
import { TestData } from './helpers/fixtures';

// Use fixture data
const restaurant = TestData.restaurant();
const org = TestData.professionalOrg();
const user = TestData.adminUser();
const expectedKPIs = TestData.getExpectedKPIsForIndustry('restaurant');
```

**Available Fixtures:**
- Industries: `TestData.restaurant()`, `TestData.realEstate()`, etc.
- Users: `TestData.adminUser()`, `TestData.regularUser()`
- Organizations: `TestData.professionalOrg()`, `TestData.enterpriseOrg()`
- KPIs: `TestData.getExpectedKPIsForIndustry(industryId)`
- Edge cases: `TestData.getEdgeCaseScenario('rate_limit')`

**Fixture Locations:**
- Industry data: `fixtures/industries/*.json`
- Auth data: `fixtures/auth/*.json`
- Provider mocks: `fixtures/providers/*/*.json`
- Edge cases: `fixtures/edge_cases/*.json`

### E2E Test Pattern with Fixtures

```typescript
import { test, expect } from '@playwright/test';
import { TestData } from './helpers/fixtures';

test.describe('Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup with fixture data
    const org = TestData.professionalOrg();
    const user = TestData.adminUser();
    
    await page.goto('/');
    await page.evaluate(({ org, user }) => {
      localStorage.setItem('pl_organization', JSON.stringify(org));
      localStorage.setItem('pl_user', JSON.stringify(user));
    }, { org, user });
  });

  test('should work with fixture data', async ({ page }) => {
    // Test implementation using fixtures
  });
});
```

## Important Features to Test

**CRITICAL paths (must have E2E tests):**

1. **Authentication Flow**
   - Login with fixture users
   - Token refresh
   - Logout
   - Role-based access

2. **Dashboard Data Loading**
   - Load with industry fixtures
   - Display KPIs from fixtures
   - Validate benchmarks

3. **Data Sync**
   - ETL pipeline with fixture data
   - Provider integration with mocks
   - Data transformation

4. **Financial Calculations**
   - Balance sheets with fixture accounts
   - Reports with fixture transactions
   - KPI calculations

5. **Multi-tenancy**
   - Tenant isolation
   - Organization switching
   - Data segregation

## Self-Improvement

### Disposable account and membership checks (October 2026)

- Use the strict configuration for real Keycloak PKCE and accounting verification. Synthetic account-creation tests must validate the exact loopback stack, disposable credentials and database bootstrap marker before writing.
- Invitation acceptance starts with a verified Keycloak identity that has no database membership. Keep a separate fixture identity for a retry so consumed invitations and removed memberships are never reset to make a test pass.
- Check role changes with the same signed access token. Current database membership must govern permission changes and removal immediately.
- Public registration checks must inspect both Keycloak identity and PostgreSQL state. With SMTP disabled, require unverified accounts and `verificationEmailSent: false`; never count account creation as verified email delivery or a completed signup journey.
- Derive the isolated API service account from the reviewed production realm. Keycloak realm role lookup requires `view-realm` in addition to user management; do not borrow development client administration or grant `realm-admin` to make registration tests pass.

**Update this file when:**
- Discovering better test patterns
- Fixing flaky tests
- Adding new test utilities
- Improving test reliability
- Adding new fixtures

**Pattern to Follow:**
1. Write test using fixtures
2. Document pattern if reusable
3. Update this agent.md
4. Share learnings with main agent.md if applicable
5. **Add fixtures** for new test scenarios

---

**Last Updated:** February 2026  
**Related:** [`../agent.md`](../agent.md)
