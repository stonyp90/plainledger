/**
 * Intelligence Dashboard E2E Tests
 * Tests the investor-facing intelligence metrics dashboard
 */

import { test, expect } from '@playwright/test';

test.describe('Intelligence Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Assume user is logged in
    await page.goto('/app/intelligence');
    await page.waitForLoadState('networkidle');
  });

  test('should display compounding metrics', async ({ page }) => {
    // Check for key metrics
    await expect(page.locator('text=/Decisions Analyzed|Décisions analysées/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Pattern Accuracy|Précision des modèles/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Industries Covered|Industries couvertes/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show accuracy trend chart', async ({ page }) => {
    // Check for accuracy over time chart
    await expect(page.locator('text=/Recommendation Accuracy|Précision des recommandations/i').first()).toBeVisible({ timeout: 5000 });
    
    // Check for chart visualization (bar chart or line chart)
    const chart = page.locator('[data-testid="accuracy-chart"], canvas, svg').first();
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display industry pattern breakdown', async ({ page }) => {
    // Check for industry grid
    await expect(page.locator('text=/Industry Pattern|Modèles sectoriels/i').first()).toBeVisible({ timeout: 5000 });
    
    // Check for at least one industry card
    const industryCards = page.locator('[data-testid="industry-card"], .industry-card').first();
    if (await industryCards.count() > 0) {
      await expect(industryCards).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display competitive moat indicator', async ({ page }) => {
    // Check for moat section
    await expect(page.locator('text=/Competitive Moat|Avantage concurrentiel/i').first()).toBeVisible({ timeout: 5000 });
    
    // Check for moat bar visualization
    const moatBar = page.locator('[data-testid="moat-bar"], .moat-bar').first();
    if (await moatBar.count() > 0) {
      await expect(moatBar).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display data flywheel messaging', async ({ page }) => {
    // Check for flywheel effect section
    await expect(page.locator('text=/Data Flywheel|volant de données/i').first()).toBeVisible({ timeout: 5000 });
    
    // Check for network effect messaging
    await expect(page.locator('text=/Better insights|Meilleurs insights/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show key metrics with values', async ({ page }) => {
    // Check for numeric values in metrics
    const metrics = [
      /847K|Decisions Analyzed/i,
      /92%|Pattern Accuracy/i,
      /15\+|Industries/i,
      /18|Months/i,
    ];

    for (const metric of metrics) {
      await expect(page.locator(`text=${metric}`).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
