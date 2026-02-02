/**
 * Performance E2E Tests
 * 
 * Tests Web Vitals and performance metrics
 */

import { test, expect } from '@playwright/test';
import { createObservabilityHelper } from './helpers/observability';

test.describe('Performance', () => {
  test('dashboard should load within performance budgets', async ({ page }) => {
    const obs = createObservabilityHelper(page);

    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait a bit for Web Vitals to settle
    await page.waitForTimeout(2000);

    const vitals = await obs.getWebVitals();
    const timing = await obs.getPerformanceTiming();

    // Assert performance thresholds
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(2500); // Good LCP threshold
    }

    if (vitals.fcp) {
      expect(vitals.fcp).toBeLessThan(1800); // Good FCP threshold
    }

    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(0.1); // Good CLS threshold
    }

    // TTFB check
    if (timing.ttfb) {
      expect(timing.ttfb).toBeLessThan(800); // Good TTFB threshold
    }
  });

  test('should have no console errors', async ({ page }) => {
    const obs = createObservabilityHelper(page);

    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    obs.assertNoConsoleErrors();
  });

  test('should have no failed HTTP requests', async ({ page }) => {
    const obs = createObservabilityHelper(page);

    await page.goto('/app/dashboard');
    await page.waitForLoadState('networkidle');

    obs.assertNoFailedRequests();
  });

  test('should load reports page efficiently', async ({ page }) => {
    const obs = createObservabilityHelper(page);

    await page.goto('/app/reports');
    await page.waitForLoadState('networkidle');

    const vitals = await obs.getWebVitals();

    // Reports page should load quickly
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(3000); // Slightly more lenient for reports
    }
  });
});
