/**
 * Landing Page E2E Tests (Unauthenticated)
 * Tests public pages without authentication
 * 
 * Focus: Core user journeys and content visibility, not implementation details
 */

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should display branding and hero content', async ({ page }) => {
    // Core branding must be visible
    await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
    
    // Hero section should have a headline
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should be responsive across viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1280, height: 720 },  // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
    }
  });

  test('should navigate to store page', async ({ page }) => {
    // Click any link that goes to store/pricing
    const storeLink = page.locator('a[href*="store"], a[href*="pricing"]').first();
    
    if (await storeLink.isVisible()) {
      await storeLink.click();
      await expect(page).toHaveURL(/store|pricing/);
    }
  });
});

test.describe('Store Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/store');
  });

  test('should display pricing information', async ({ page }) => {
    // Pricing content should be visible (prices, plans, or pricing-related text)
    const pricingContent = page.locator('text=/\\$|Pricing|Prix|month|mois/i');
    await expect(pricingContent.first()).toBeVisible();
  });

  test('should have call-to-action buttons', async ({ page }) => {
    // Store page should have actionable CTAs for signing up
    const ctaButtons = page.locator('button, a[href*="signup"], a[href*="login"]');
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Newsletter Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/newsletter');
  });

  test('should display newsletter content', async ({ page }) => {
    // Newsletter branding or signup content
    const content = page.locator('text=/Newsletter|Subscribe|OffBalance|Abonnement/i');
    await expect(content.first()).toBeVisible();
  });

  test('should have a way to subscribe', async ({ page }) => {
    // Should have an email input field for subscription
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput.first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have consistent header across pages', async ({ page }) => {
    const pages = ['/', '/store', '/newsletter'];
    
    for (const url of pages) {
      await page.goto(url);
      // PlainLedger branding should appear on all pages
      await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
    }
  });

  test('should be able to return to home from any page', async ({ page }) => {
    await page.goto('/store');
    
    // Click on logo/brand link to go home
    const homeLink = page.locator('a[href="/"]').first();
    await homeLink.click();
    
    await expect(page).toHaveURL('/');
  });
});
