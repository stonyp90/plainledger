/**
 * Authentication Setup for E2E Tests
 * Sets up authenticated state for subsequent tests
 */

import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate', async ({ page }) => {
  // Navigate to the app
  await page.goto('/');

  // For mock auth mode, set localStorage to simulate authenticated state
  await page.evaluate(() => {
    // Set mock auth state
    localStorage.setItem('pl_onboarding_completed', 'true');
    localStorage.setItem('mock_auth_user', JSON.stringify({
      id: 'test-user-123',
      email: 'test@plainledger.ca',
      name: 'Test User',
      emailVerified: true,
    }));
  });

  // Navigate to app to verify authentication
  await page.goto('/app/dashboard');
  
  // Wait for dashboard to load
  await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

  // Save the storage state
  await page.context().storageState({ path: authFile });
});
