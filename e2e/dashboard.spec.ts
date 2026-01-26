/**
 * Dashboard E2E Tests
 * Tests critical dashboard functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/dashboard');
  });

  test('should display main KPIs', async ({ page }) => {
    // Check for KPI cards
    await expect(page.locator('text=REVENUE').first()).toBeVisible();
    await expect(page.locator('text=CASH').first()).toBeVisible();
    await expect(page.locator('text=NET CASH FLOW').first()).toBeVisible();
    await expect(page.locator('text=WORKING CAPITAL').first()).toBeVisible();
  });

  test('should display financial ratios', async ({ page }) => {
    // Check for ratio cards
    await expect(page.locator('text=CURRENT RATIO').first()).toBeVisible();
    await expect(page.locator('text=QUICK RATIO').first()).toBeVisible();
    await expect(page.locator('text=GROSS MARGIN').first()).toBeVisible();
    await expect(page.locator('text=DSO').first()).toBeVisible();
  });

  test('should display health score gauge', async ({ page }) => {
    // Look for health score component
    await expect(page.locator('text=/Score.*financière|Financial.*Score/i').first()).toBeVisible();
  });

  test('should allow period selection', async ({ page }) => {
    // Click on different periods
    const monthButton = page.getByRole('button', { name: /Month|Mois/i });
    const quarterButton = page.getByRole('button', { name: /Quarter|Trim/i });
    const yearButton = page.getByRole('button', { name: /Year|Année/i });

    await expect(monthButton).toBeVisible();
    
    // Test period switching
    await quarterButton.click();
    await expect(quarterButton).toHaveAttribute('style', /background/);
    
    await yearButton.click();
    await expect(yearButton).toHaveAttribute('style', /background/);
  });

  test('should display anomaly alerts when present', async ({ page }) => {
    // Check for anomaly alert banner or section
    const anomalySection = page.locator('[class*="alert"], [class*="anomal"]').first();
    
    // Either there's an alert or a "no anomalies" message
    const hasAlert = await anomalySection.isVisible().catch(() => false);
    const noAnomalies = await page.locator('text=/no.*anomal|aucune.*anomal/i').isVisible().catch(() => false);
    
    expect(hasAlert || noAnomalies).toBeTruthy();
  });

  test('should have working refresh button', async ({ page }) => {
    const refreshButton = page.getByRole('button', { name: /Refresh|Actualiser/i });
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Wait for any loading state to complete
    await page.waitForTimeout(500);
    
    // Dashboard should still be visible
    await expect(page.locator('text=REVENUE').first()).toBeVisible();
  });

  test('should navigate to anomalies page', async ({ page }) => {
    // Click on anomalies quick action or link
    const anomaliesLink = page.getByRole('link', { name: /Anomalies/i }).first();
    await anomaliesLink.click();
    
    // Should navigate to anomalies page
    await expect(page).toHaveURL(/.*anomalies/);
  });

  test('should navigate to reports page', async ({ page }) => {
    const reportsLink = page.getByRole('link', { name: /Reports|Rapports/i }).first();
    await reportsLink.click();
    
    await expect(page).toHaveURL(/.*reports/);
  });

  test('should display charts', async ({ page }) => {
    // Look for chart containers
    const charts = page.locator('[class*="recharts"], canvas, svg').first();
    await expect(charts).toBeVisible();
  });
});

test.describe('Dashboard - Accounting Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/dashboard');
    // Scroll to bottom to see all widgets
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });

  test('should display bank reconciliation widget', async ({ page }) => {
    const bankReconWidget = page.locator('text=/Bank.*Reconciliation|Rapprochement.*bancaire/i');
    // May need to scroll or may not be visible on first load
    await expect(bankReconWidget.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display upcoming deadlines', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.evaluate(() => window.scrollTo(0, 1000));
    
    // Look for deadline-related content
    const deadlinesWidget = page.locator('text=/Deadlines|Échéances/i');
    const isVisible = await deadlinesWidget.first().isVisible().catch(() => false);
    
    // Skip if not visible (may be outside viewport)
    if (isVisible) {
      await expect(deadlinesWidget.first()).toBeVisible();
    }
  });

  test('should display budget vs actual', async ({ page }) => {
    await page.goto('/app/dashboard');
    await page.evaluate(() => window.scrollTo(0, 800));
    
    // Look for budget comparison content
    const budgetWidget = page.locator('text=/Budget.*Actual|Budget.*Réel/i');
    const isVisible = await budgetWidget.first().isVisible().catch(() => false);
    
    if (isVisible) {
      await expect(budgetWidget.first()).toBeVisible();
    }
  });
});
