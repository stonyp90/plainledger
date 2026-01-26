/**
 * Landing Page E2E Tests (Unauthenticated)
 * Tests public pages without authentication
 */

import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored auth state
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should display landing page', async ({ page }) => {
    // Check for PlainLedger branding
    await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    // Check for main CTA buttons
    const ctaButton = page.getByRole('link', { name: /Get.*Started|Commencer|Demo|Sign.*Up/i });
    await expect(ctaButton.first()).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Check at mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
    
    // Check at tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
    
    // Check at desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
  });
});

test.describe('Store Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/store');
  });

  test('should display store page', async ({ page }) => {
    // Check for pricing or store content
    await expect(page.locator('text=/PlainLedger/i').first()).toBeVisible();
  });

  test('should display pricing plans', async ({ page }) => {
    // Look for pricing-related content
    const pricingContent = page.locator('text=/Pricing|Prix|month|mois|\\$/i');
    await expect(pricingContent.first()).toBeVisible();
  });

  test('should have sign up CTA', async ({ page }) => {
    const signUpButton = page.getByRole('button', { name: /Sign.*Up|Start|Commencer|Subscribe/i });
    await expect(signUpButton.first()).toBeVisible();
  });

  test('should have feature descriptions', async ({ page }) => {
    // Look for feature highlights
    const features = page.locator('text=/Features|Fonctionnalités|Analytics|Reports/i');
    await expect(features.first()).toBeVisible();
  });
});

test.describe('Newsletter Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/newsletter');
  });

  test('should display newsletter signup', async ({ page }) => {
    // Check for newsletter form or content
    const newsletterContent = page.locator('text=/Newsletter|Subscribe|Email|Abonnement/i');
    await expect(newsletterContent.first()).toBeVisible();
  });

  test('should have email input', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /Email/i });
    // May or may not have explicit label
    const hasEmailInput = await emailInput.first().isVisible().catch(() => false);
    const hasAnyInput = await page.locator('input[type="email"]').first().isVisible().catch(() => false);
    
    expect(hasEmailInput || hasAnyInput).toBeTruthy();
  });
});

test.describe('Accessibility', () => {
  test('landing page should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility features
    // Main landmark
    const main = page.locator('main').first();
    const hasMain = await main.isVisible().catch(() => false);
    
    // Navigation
    const nav = page.locator('nav, [role="navigation"]').first();
    const hasNav = await nav.isVisible().catch(() => false);
    
    // At least one of these should exist
    expect(hasMain || hasNav).toBeTruthy();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });

  test('interactive elements should be focusable', async ({ page }) => {
    await page.goto('/');
    
    // Tab through the page
    await page.keyboard.press('Tab');
    
    // Check that something is focused
    const focusedElement = page.locator(':focus');
    const isFocused = await focusedElement.count() > 0;
    
    expect(isFocused).toBeTruthy();
  });
});
