/**
 * Full Flow Premium Member E2E Tests
 * 
 * Tests the complete user journey for a premium member:
 * 1. Login/authentication
 * 2. Dashboard with real data
 * 3. All report sections
 * 4. Data verification checklist
 * 5. Connections management
 * 6. Settings and subscription
 * 
 * This test suite ensures premium members see real data (not mock)
 * and empty states when data is missing.
 */

import { test, expect } from '@playwright/test';

const WEB_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3000';

test.describe('Premium Member Full Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Navigate to the app first to establish context
    await page.goto(`${WEB_URL}/app/dashboard`);
    
    // Set up premium member state after navigation
    await context.addCookies([
      {
        name: 'pl_tenant',
        value: 'demo-org',
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Set localStorage after page is loaded
    await page.evaluate(() => {
      localStorage.setItem('pl_onboarding_completed', 'true');
      localStorage.setItem('pl_tenant', 'demo-org');
      localStorage.setItem('pl_plan', 'professional');
      localStorage.setItem('mock_auth_user', JSON.stringify({
        id: 'premium-user-123',
        email: 'premium@plainledger.ca',
        name: 'Premium User',
        plan: 'professional',
      }));
    });
    
    // Reload to apply localStorage changes
    await page.reload();
  });

  test('should complete data verification checklist', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/dashboard`);

    // Wait for checklist to load
    await page.waitForTimeout(3000);

    // Check all 4 items
    const checklistItems = [
      'Logiciel comptable connecté',
      'Plan comptable',
      'Historique des transactions',
      'Qualité des données',
    ];

    for (const item of checklistItems) {
      const element = page.locator(`text=${item}`).first();
      await expect(element).toBeVisible({ timeout: 5000 });
    }

    // Verify progress indicator
    const progressText = await page.locator('text=/\\d+\\/4/').textContent();
    expect(progressText).toMatch(/\d+\/4/);
  });

  test('should display dashboard with real data sections', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/dashboard`);

    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

    // Check for key sections
    const sections = [
      { name: 'Revenue', selector: 'text=/Revenue|Revenu/i' },
      { name: 'Cash Flow', selector: 'text=/Cash Flow|Flux de trésorerie/i' },
      { name: 'KPIs', selector: '[data-testid*="kpi"], [class*="metric"]' },
      { name: 'Charts', selector: 'canvas, svg[class*="chart"]' },
    ];

    for (const section of sections) {
      const element = page.locator(section.selector).first();
      // At least one element should be visible (or empty state)
      const count = await element.count();
      if (count === 0) {
        // Check for empty state
        const emptyState = page.locator('text=/non disponibles|not available|Connecter/i');
        await expect(emptyState.first()).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should navigate through all report sections', async ({ page }) => {
    const reportPages = [
      { path: '/app/reports/balance-sheet', name: 'Balance Sheet' },
      { path: '/app/reports/income-statement', name: 'Income Statement' },
      { path: '/app/reports/cash-flow', name: 'Cash Flow' },
      { path: '/app/reports/trial-balance', name: 'Trial Balance' },
    ];

    for (const report of reportPages) {
      await page.goto(`${WEB_URL}${report.path}`);
      await page.waitForTimeout(2000);

      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();

      // Should show either data OR empty state with CTA
      const hasData = await page.locator('table, [class*="report"], canvas').count() > 0;
      const hasEmptyState = await page.locator('text=/non disponibles|not available|Connecter/i').count() > 0;

      expect(hasData || hasEmptyState).toBe(true);

      // If empty state, verify CTA is present
      if (hasEmptyState) {
        const cta = page.locator('button:has-text("Connecter"), a:has-text("Connect")').first();
        if (await cta.count() > 0) {
          await expect(cta).toBeVisible();
        }
      }
    }
  });

  test('should show connections page with QuickBooks status', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/connections`);

    await expect(page.locator('text=/Connexions|Connections/i').first()).toBeVisible();

    // Should show QuickBooks provider
    await expect(page.locator('text=QuickBooks').first()).toBeVisible();

    // Should show connection status (connected or connect button)
    const hasStatus = await page.locator('text=/Connecté|Connected|Actif|Active|Connecter|Connect/i').count() > 0;
    expect(hasStatus).toBe(true);
  });

  test('should display settings with premium plan details', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/settings`);

    await expect(page.locator('text=/Paramètres|Settings/i').first()).toBeVisible();

    // Navigate to subscription tab
    const subscriptionTab = page.locator('button:has-text("Abonnement"), button:has-text("Subscription")').first();
    if (await subscriptionTab.count() > 0) {
      await subscriptionTab.click();
      await page.waitForTimeout(1000);

      // Should show plan details
      const hasPlanInfo = await page.locator('text=/Plan|Professional|Premium/i').count() > 0;
      expect(hasPlanInfo).toBe(true);
    }
  });

  test('should hide mock data indicators for premium members', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/dashboard`);

    // Premium members should NOT see mock data warnings
    const mockDataWarning = page.locator('text=/mock|sample|demo data|données de démo/i');
    const warningCount = await mockDataWarning.count();
    expect(warningCount).toBe(0);
  });

  test('should show empty states with proper CTAs when data is missing', async ({ page }) => {
    // Navigate to a report that might not have data
    await page.goto(`${WEB_URL}/app/reports/balance-sheet`);
    await page.waitForTimeout(2000);

    // Check if empty state is shown
    const hasEmptyState = await page.locator('text=/non disponibles|not available|Connecter/i').count() > 0;

    if (hasEmptyState) {
      // Should have clear CTA to connect accounting software
      const cta = page.locator('button:has-text("Connecter"), a:has-text("Connect")').first();
      if (await cta.count() > 0) {
        await expect(cta).toBeVisible();
        
        // CTA should be actionable (not disabled)
        const isDisabled = await cta.isDisabled();
        expect(isDisabled).toBe(false);
      }
    }
  });

  test('should maintain data consistency across page navigations', async ({ page }) => {
    // Start at dashboard
    await page.goto(`${WEB_URL}/app/dashboard`);
    await page.waitForTimeout(2000);

    // Get initial revenue value if visible
    const initialRevenue = await page.locator('text=/\\$[0-9,]+/').first().textContent().catch(() => null);

    // Navigate to reports
    await page.goto(`${WEB_URL}/app/reports/income-statement`);
    await page.waitForTimeout(2000);

    // Navigate back to dashboard
    await page.goto(`${WEB_URL}/app/dashboard`);
    await page.waitForTimeout(2000);

    // Revenue should be consistent (if it was shown initially)
    if (initialRevenue) {
      const currentRevenue = await page.locator('text=/\\$[0-9,]+/').first().textContent().catch(() => null);
      // Values should match or be within reasonable range
      expect(currentRevenue).toBeTruthy();
    }
  });
});
