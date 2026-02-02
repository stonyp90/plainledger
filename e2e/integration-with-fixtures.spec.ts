/**
 * Integration E2E Tests with Fixtures
 * 
 * Tests full user flows using fixtures for test data.
 * Uses testcontainers for isolated infrastructure.
 */

import { test, expect } from '@playwright/test';
import { TestData } from './helpers/fixtures';

test.describe('Integration Tests with Fixtures', () => {
  test.beforeEach(async ({ page }) => {
    // Use fixture data for test setup
    const org = TestData.professionalOrg();
    const user = TestData.adminUser();

    // Set up test state
    await page.goto('/');
    
    // Mock authenticated state with fixture data
    await page.evaluate(({ org, user }) => {
      localStorage.setItem('pl_organization', JSON.stringify(org));
      localStorage.setItem('pl_user', JSON.stringify(user));
      localStorage.setItem('pl_onboarding_completed', 'true');
    }, { org, user });
  });

  test('should display dashboard with restaurant industry data', async ({ page }) => {
    const restaurant = TestData.restaurant();
    const expectedKPIs = TestData.getExpectedKPIsForIndustry('restaurant');

    await page.goto('/app/dashboard');

    // Verify industry-specific KPIs are displayed
    for (const kpi of expectedKPIs.slice(0, 5)) {
      // Check for KPI name (supporting both EN/FR)
      await expect(
        page.locator(`text=/${kpi.name}|${kpi.name_fr}/i`).first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should create report using fixture organization', async ({ page }) => {
    const org = TestData.professionalOrg();

    await page.goto('/app/reports');
    
    // Click create report button
    await page.getByRole('button', { name: /Create|Créer/i }).click();

    // Fill form with organization data
    await page.fill('input[name="name"]', `Report for ${org.name}`);
    
    // Select organization from fixture
    await page.selectOption('select[name="organization"]', org.id);

    // Submit
    await page.getByRole('button', { name: /Save|Enregistrer/i }).click();

    // Verify report created
    await expect(page.locator(`text=${org.name}`)).toBeVisible();
  });

  test('should validate KPI benchmarks using fixtures', async ({ page }) => {
    const restaurant = TestData.restaurant();
    const foodCostKPI = TestData.getKPIBenchmarkRange('restaurant', 'food_cost_percent');

    await page.goto('/app/dashboard');

    // Find food cost KPI card
    const foodCostCard = page.locator('text=/Food Cost|Coût.*alimentaire/i').first();
    await expect(foodCostCard).toBeVisible();

    // Get displayed value
    const displayedValue = await foodCostCard
      .locator('..')
      .locator('[data-testid="kpi-value"]')
      .textContent();

    if (displayedValue && foodCostKPI) {
      const numericValue = parseFloat(displayedValue.replace('%', ''));
      expect(numericValue).toBeGreaterThanOrEqual(foodCostKPI.min);
      expect(numericValue).toBeLessThanOrEqual(foodCostKPI.max);
    }
  });

  test('should handle edge case: empty data', async ({ page }) => {
    const emptyDataFixture = TestData.getEdgeCaseScenario('empty_data');

    await page.goto('/app/dashboard');

    // Simulate empty data scenario
    await page.evaluate(() => {
      // Clear localStorage to simulate empty state
      localStorage.removeItem('pl_data');
    });

    // Should show empty state message
    await expect(
      page.locator('text=/No data|Aucune donnée|Connect.*data|Connecter.*données/i'),
    ).toBeVisible();
  });

  test('should display industry-specific accounts using fixtures', async ({ page }) => {
    const restaurant = TestData.restaurant();

    await page.goto('/app/accounts');

    // Verify restaurant-specific accounts are displayed
    const restaurantAccounts = restaurant.accounts.slice(0, 5);
    
    for (const account of restaurantAccounts) {
      await expect(
        page.locator(`text=/${account.name}/i`).first(),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
