/**
 * Playwright E2E Test Configuration
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    process.env.CI ? ['github'] : ['line'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Public/unauthenticated tests
    {
      name: 'unauthenticated',
      testMatch: /.*\.unauth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Authenticated tests
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      testIgnore: /.*\.unauth\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    
    // Mobile tests
    {
      name: 'mobile',
      testMatch: /.*\.mobile\.spec\.ts/,
      use: { 
        ...devices['iPhone 13'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
  ],

  // Web server configuration - only start in CI, locally assume dev server is running
  webServer: process.env.CI
    ? {
        command: 'cd apps/web && npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: false,
        timeout: 120 * 1000,
      }
    : undefined,
});
