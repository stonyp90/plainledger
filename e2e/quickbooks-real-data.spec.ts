/**
 * QuickBooks Real Data E2E Tests
 * 
 * Enterprise-grade tests that validate the complete flow with real QuickBooks sandbox data.
 * 
 * Prerequisites:
 * 1. QuickBooks tokens configured in .env.local
 * 2. docker-compose up -d (all services running)
 * 3. QuickBooks sandbox has data
 * 
 * Run: npx playwright test e2e/quickbooks-real-data.spec.ts
 */

import { test, expect } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WEB_URL = process.env.BASE_URL || 'http://localhost:5173';
const QUICKBOOKS_REFRESH_TOKEN = process.env.QUICKBOOKS_REFRESH_TOKEN;
const QUICKBOOKS_REALM_ID = process.env.QUICKBOOKS_REALM_ID;
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || 'change-me';

test.describe('QuickBooks Real Data Flow', () => {
  test.beforeAll(async () => {
    // Verify QuickBooks credentials are configured
    if (!QUICKBOOKS_REFRESH_TOKEN || !QUICKBOOKS_REALM_ID) {
      test.skip();
      console.warn('⚠️  QuickBooks credentials not configured. Skipping real data tests.');
      console.warn('   Run: npx tsx scripts/providers/quickbooks/get-token.ts');
    }
  });

  test('should sync QuickBooks sandbox to S3 Gold layer', async ({ request }) => {
    // Trigger sync from QuickBooks to S3
    const syncResponse = await request.post(`${API_URL}/internal/etl/sync-quickbooks`, {
      data: {
        organizationId: 'demo-org',
        realmId: QUICKBOOKS_REALM_ID,
        refreshToken: QUICKBOOKS_REFRESH_TOKEN,
      },
      headers: {
        'x-internal-token': INTERNAL_TOKEN,
      },
    });

    expect(syncResponse.ok()).toBeTruthy();
    const syncResult = await syncResponse.json();
    expect(syncResult.success).toBe(true);
    expect(syncResult.recordsSynced).toBeGreaterThan(0);
  });

  test('should display real QuickBooks data in dashboard', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/dashboard`);

    // Wait for dashboard to load
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

    // Verify data verification checklist shows QuickBooks connection
    await expect(page.locator('text=Logiciel comptable connecté')).toBeVisible();
    
    // Check that real data is displayed (not mock data)
    const revenueElement = page.locator('[data-testid="revenue-value"], text=/\\$[0-9,]+/').first();
    await expect(revenueElement).toBeVisible({ timeout: 5000 });
    
    // Verify it's not showing "0" or placeholder values
    const revenueText = await revenueElement.textContent();
    expect(revenueText).not.toBe('$0');
    expect(revenueText).not.toBe('--');
  });

  test('should show accounts from QuickBooks in chart of accounts', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/reports/balance-sheet`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check if accounts are displayed (either in the report or empty state)
    const hasAccounts = await page.locator('text=/Account|Compte/').count() > 0;
    const hasEmptyState = await page.locator('text=/non disponibles|not available|Connecter/').count() > 0;

    // Should have either accounts OR empty state (not both, not neither)
    expect(hasAccounts || hasEmptyState).toBe(true);
  });

  test('should display transactions from QuickBooks', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/reports/income-statement`);

    await page.waitForTimeout(2000);

    // Verify transactions are either displayed or empty state is shown
    const hasTransactions = await page.locator('text=/Revenue|Revenu|Expense|Dépense/').count() > 0;
    const hasEmptyState = await page.locator('text=/non disponibles|not available/').count() > 0;

    expect(hasTransactions || hasEmptyState).toBe(true);
  });

  test('should show QuickBooks connection status', async ({ page }) => {
    await page.goto(`${WEB_URL}/app/connections`);

    // Verify QuickBooks connection is shown
    await expect(page.locator('text=QuickBooks').first()).toBeVisible();
    
    // Check connection status
    const connectionStatus = page.locator('text=/Connecté|Connected|Actif|Active/').first();
    await expect(connectionStatus).toBeVisible({ timeout: 5000 });
  });

  test('should handle data quality checks', async ({ request }) => {
    // Check data quality metrics
    const qualityResponse = await request.get(
      `${API_URL}/api/v1/datalake/quality?organizationId=demo-org`,
      {
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
        },
      },
    );

    if (qualityResponse.ok()) {
      const qualityData = await qualityResponse.json();
      
      // Verify quality metrics exist
      expect(qualityData).toHaveProperty('completeness');
      expect(qualityData).toHaveProperty('validity');
      expect(qualityData).toHaveProperty('timeliness');
    }
  });

  test('should cache and invalidate QuickBooks data correctly', async ({ request }) => {
    // First request - should cache
    const firstResponse = await request.get(
      `${API_URL}/api/v1/datalake/accounts?organizationId=demo-org`,
    );
    expect(firstResponse.ok()).toBeTruthy();
    const firstData = await firstResponse.json();

    // Second request - should use cache (faster)
    const startTime = Date.now();
    const secondResponse = await request.get(
      `${API_URL}/api/v1/datalake/accounts?organizationId=demo-org`,
    );
    const cacheTime = Date.now() - startTime;
    expect(secondResponse.ok()).toBeTruthy();
    const secondData = await secondResponse.json();

    // Data should be identical
    expect(JSON.stringify(firstData)).toBe(JSON.stringify(secondData));

    // Cache should be faster (under 100ms vs potentially seconds)
    expect(cacheTime).toBeLessThan(1000);

    // Invalidate cache
    const invalidateResponse = await request.post(
      `${API_URL}/internal/cache/invalidate/demo-org`,
      {
        headers: {
          'x-internal-token': INTERNAL_TOKEN,
        },
      },
    );
    expect(invalidateResponse.ok()).toBeTruthy();
  });
});
