/**
 * Playwright E2E Test Configuration
 * 
 * Uses testcontainers for isolated test environments.
 * Fixtures are loaded from @fixtures directory.
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60 * 1000, // 60 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
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
    // Enhanced observability
    console: 'on', // Capture console messages
    // Network monitoring via trace
  },
  // Global setup/teardown for testcontainers (if enabled)
  globalSetup: process.env.USE_TESTCONTAINERS === 'true' 
    ? './e2e/global-setup.ts'
    : undefined,
  globalTeardown: process.env.USE_TESTCONTAINERS === 'true'
    ? async () => {
        const { globalTeardown } = await import('./e2e/global-setup');
        await globalTeardown({} as any);
      }
    : undefined,

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

  // Web server configuration - reuse existing server in local dev
  webServer: {
    command: process.env.CI ? 'cd apps/web && npm run dev' : 'true', // Dummy command in local dev
    url: 'http://localhost:5173',
    reuseExistingServer: true, // Always reuse existing server
    timeout: process.env.CI ? 120 * 1000 : 5000,
  },
});
