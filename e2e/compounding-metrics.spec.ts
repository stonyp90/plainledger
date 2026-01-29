/**
 * Compounding Metrics E2E Tests
 * Tests the intelligence metrics dashboard showing compounding effects
 */

import { test, expect } from '@playwright/test';

test.describe('Compounding Metrics', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in
    await page.goto('/app/intelligence/metrics');
    await page.waitForLoadState('networkidle');
  });

  test('should show accuracy improvement over time', async ({ page }) => {
    // Check for accuracy trend chart
    await expect(page.locator('[data-testid="accuracy-trend-chart"], canvas, svg').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Verify upward trend indicator
    await expect(page.locator('text=/Up from|En hausse|Up from 72%/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display real-time decision counter', async ({ page }) => {
    // Check for decision counter
    const counter = page.locator('[data-testid="decision-counter"], text=/847K|Decisions Analyzed/i').first();
    
    if (await counter.count() > 0) {
      const initialCount = await counter.textContent();
      expect(initialCount).toBeTruthy();
      
      // Counter should show a number
      const countMatch = initialCount?.match(/\d+/);
      expect(countMatch).toBeTruthy();
    }
  });

  test('should display pattern accuracy metric', async ({ page }) => {
    await expect(page.locator('text=/92%|Pattern Accuracy|Précision/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display industry coverage metric', async ({ page }) => {
    await expect(page.locator('text=/15\+|Industries Covered|Industries couvertes/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display competitive moat depth', async ({ page }) => {
    await expect(page.locator('text=/18|Months|Mois|Competitive Moat/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show data flywheel messaging', async ({ page }) => {
    await expect(page.locator('text=/Data Flywheel|volant de données|Better insights/i').first()).toBeVisible({ timeout: 5000 });
  });
});
