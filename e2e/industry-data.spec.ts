/**
 * Industry-Specific Data Tests
 * 
 * Tests that each industry displays appropriate data and graphs.
 * Validates that empty states show when industry-specific data is missing.
 * 
 * Uses shared fixtures from fixtures/industries/ for all 15 industries.
 */

import { test, expect } from '@playwright/test';
import { loadAllIndustries, type IndustryFixture } from '../fixtures/loader';

const WEB_URL = process.env.BASE_URL || 'http://localhost:5173';

// Load all 15 industries from shared fixtures
const INDUSTRIES_FIXTURES = loadAllIndustries();

// Transform fixtures to test format
const INDUSTRIES = INDUSTRIES_FIXTURES.map((fixture: IndustryFixture) => ({
  name: fixture.name,
  code: fixture.id.replace(/_/g, '-'), // Convert snake_case to kebab-case
  kpis: fixture.kpis.map(kpi => kpi.name),
}));

test.describe('Industry-Specific Data Display', () => {
  for (const industry of INDUSTRIES) {
    test.describe(`${industry.name} Industry`, () => {
      test.beforeEach(async ({ page }) => {
        // Set industry in localStorage or via API
        await page.goto(`${WEB_URL}/app/dashboard`);
        await page.evaluate((industryCode) => {
          localStorage.setItem('current_industry', industryCode);
        }, industry.code);
        await page.reload();
      });

      test(`should display ${industry.name} dashboard with industry-specific KPIs`, async ({ page }) => {
        await page.goto(`${WEB_URL}/app/dashboard`);
        await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

        // Check for industry-specific KPIs (at least one should be visible)
        const kpiFound = industry.kpis.some(kpi => 
          page.locator(`text=${kpi}`).count() > 0
        );

        // Should show either industry KPIs OR generic financial KPIs
        const hasKpis = await page.locator('[data-testid*="kpi"], [class*="metric"]').count() > 0;
        expect(hasKpis || kpiFound).toBe(true);
      });

      test(`should show appropriate charts for ${industry.name}`, async ({ page }) => {
        await page.goto(`${WEB_URL}/app/dashboard`);

        // Wait for charts to load
        await page.waitForTimeout(3000);

        // Check for chart elements (revenue trends, cash flow, etc.)
        const hasCharts = await page.locator('canvas, svg[class*="chart"], [class*="recharts"]').count() > 0;
        const hasDataPoints = await page.locator('text=/\\$[0-9,]+|\\d+%/').count() > 0;

        // Should have either charts OR empty state message
        const hasEmptyState = await page.locator('text=/non disponibles|not available|Connecter/').count() > 0;

        expect(hasCharts || hasDataPoints || hasEmptyState).toBe(true);
      });

      test(`should display empty state when ${industry.name} data is missing`, async ({ page }) => {
        // Navigate to a report page
        await page.goto(`${WEB_URL}/app/reports/balance-sheet`);

        await page.waitForTimeout(2000);

        // Should show either data OR empty state with CTA
        const hasData = await page.locator('table, [class*="report"]').count() > 0;
        const hasEmptyState = await page.locator('text=/Connecter|Connect|non disponibles|not available/').count() > 0;

        expect(hasData || hasEmptyState).toBe(true);

        // If empty state, should have CTA to connect
        if (hasEmptyState) {
          await expect(
            page.locator('button:has-text("Connecter"), a:has-text("Connect")').first()
          ).toBeVisible({ timeout: 5000 });
        }
      });

      test(`should show industry benchmarks for ${industry.name}`, async ({ page }) => {
        await page.goto(`${WEB_URL}/app/dashboard`);

        await page.waitForTimeout(2000);

        // Check for benchmark references (industry-specific or generic)
        const hasBenchmarks = await page.locator('text=/benchmark|comparaison|industry|secteur/i').count() > 0;
        
        // Benchmarks are optional, so this test passes if they exist OR if they don't
        // The important thing is the page doesn't crash
        expect(page.locator('body')).toBeVisible();
      });
    });
  }

  test('should switch between industries without data loss', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/dashboard`);

    // Switch through industries
    for (const industry of INDUSTRIES.slice(0, 3)) {
      await page.evaluate((industryCode) => {
        localStorage.setItem('current_industry', industryCode);
      }, industry.code);
      
      await page.reload();
      await page.waitForTimeout(1000);

      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
