/**
 * Landing Page - Compounding Intelligence Section E2E Tests
 * Tests the new compounding intelligence and AI technology sections
 */

import { test, expect } from '@playwright/test';

test.describe('Landing - Compounding Intelligence Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display compounding intelligence section', async ({ page }) => {
    // Scroll to the compounding intelligence section
    await page.locator('#compounding-intelligence').scrollIntoViewIfNeeded();
    
    // Check section is visible
    await expect(page.locator('#compounding-intelligence')).toBeVisible();
    
    // Check for the "Getting Smarter Every Day" badge
    await expect(page.locator('text=/Getting Smarter|Plus intelligent/i').first()).toBeVisible();
  });

  test('should display flywheel visualization', async ({ page }) => {
    await page.locator('#compounding-intelligence').scrollIntoViewIfNeeded();
    
    // Check for the flywheel center (Brain icon area)
    const flywheelCenter = page.locator('#compounding-intelligence svg, #compounding-intelligence [class*="rounded-full"]').first();
    await expect(flywheelCenter).toBeVisible();
  });

  test('should display key metrics (decisions, accuracy, industries)', async ({ page }) => {
    await page.locator('#compounding-intelligence').scrollIntoViewIfNeeded();
    
    // Check for key metrics
    await expect(page.locator('text=847K+').first()).toBeVisible();
    await expect(page.locator('text=92%').first()).toBeVisible();
    await expect(page.locator('text=15+').first()).toBeVisible();
    await expect(page.locator('text=18mo').first()).toBeVisible();
  });

  test('should display data flywheel messaging', async ({ page }) => {
    await page.locator('#compounding-intelligence').scrollIntoViewIfNeeded();
    
    // Check for flywheel effect messaging
    await expect(page.locator('text=/Data Flywheel|volant de données/i').first()).toBeVisible();
  });
});

test.describe('Landing - AI Technology Stack Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display AI technology section', async ({ page }) => {
    await page.locator('#ai-technology').scrollIntoViewIfNeeded();
    
    await expect(page.locator('#ai-technology')).toBeVisible();
    await expect(page.locator('text=/Powered by.*AI|Propulsé/i').first()).toBeVisible();
  });

  test('should display AI providers', async ({ page }) => {
    await page.locator('#ai-technology').scrollIntoViewIfNeeded();
    
    // Check for key AI providers
    await expect(page.locator('text=OpenAI').first()).toBeVisible();
    await expect(page.locator('text=Anthropic').first()).toBeVisible();
    await expect(page.locator('text=Mistral').first()).toBeVisible();
  });

  test('should display PlainLedger proprietary AI badge', async ({ page }) => {
    await page.locator('#ai-technology').scrollIntoViewIfNeeded();
    
    // Check for proprietary model
    await expect(page.locator('text=PlainLedger AI').first()).toBeVisible();
    await expect(page.locator('text=/Proprietary|Propriétaire/i').first()).toBeVisible();
  });

  test('should display training stats', async ({ page }) => {
    await page.locator('#ai-technology').scrollIntoViewIfNeeded();
    
    // Check for training data stats
    await expect(page.locator('text=/847K.*decisions|847K.*décisions/i').first()).toBeVisible();
    await expect(page.locator('text=/7.*providers|7.*fournisseurs/i').first()).toBeVisible();
  });

  test('should display open source foundation', async ({ page }) => {
    await page.locator('#ai-technology').scrollIntoViewIfNeeded();
    
    // Check for open source mention
    await expect(page.locator('text=/Mistral 7B|HuggingFace|PyTorch|LoRA/i').first()).toBeVisible();
  });
});

test.describe('Landing - Hero Section Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display compounding intelligence badge in hero', async ({ page }) => {
    // Check for the new compounding intelligence badge
    await expect(page.locator('text=/learns from.*businesses|apprend de.*entreprises/i').first()).toBeVisible();
  });

  test('should display accuracy metric in hero', async ({ page }) => {
    // Check for 92% accuracy badge
    await expect(page.locator('text=/92%.*Accuracy|92%.*Précision/i').first()).toBeVisible();
  });

  test('should display "Gets Smarter Daily" badge', async ({ page }) => {
    await expect(page.locator('text=/Gets Smarter|S\'améliore/i').first()).toBeVisible();
  });
});

test.describe('Landing - Final CTA Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to bottom for final CTA
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
  });

  test('should display "Join the Intelligence Network" heading', async ({ page }) => {
    await expect(page.locator('text=/Join the Intelligence Network|Rejoignez le réseau/i').first()).toBeVisible();
  });

  test('should display businesses contributing messaging', async ({ page }) => {
    await expect(page.locator('text=/75,000.*contributing|75 000.*contribuant/i').first()).toBeVisible();
  });

  test('should display compounding ROI messaging', async ({ page }) => {
    await expect(page.locator('text=/compound.*accuracy|recommandations.*améliorent/i').first()).toBeVisible();
  });
});

test.describe('Landing - Navigation to New Sections', () => {
  test('should be able to navigate to compounding intelligence section', async ({ page }) => {
    await page.goto('/');
    
    // Click on a nav link that might go to compounding section (if exists)
    // Or scroll directly
    await page.locator('#compounding-intelligence').scrollIntoViewIfNeeded();
    
    // Verify we're at the section
    const section = page.locator('#compounding-intelligence');
    await expect(section).toBeInViewport();
  });

  test('should be able to navigate to AI technology section', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('#ai-technology').scrollIntoViewIfNeeded();
    
    const section = page.locator('#ai-technology');
    await expect(section).toBeInViewport();
  });
});
