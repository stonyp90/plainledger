import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['list'],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [
    { name: 'public', testMatch: /\.public\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
    { name: 'keycloak', testMatch: /keycloak-auth\.spec\.ts$/, use: { ...devices['Desktop Chrome'] } },
  ],
  // An explicit target is always tested as-is, without starting a local app.
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm --prefix apps/web run dev -- --host 127.0.0.1',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_MOCK_AUTH: 'false',
      VITE_KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
      VITE_KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'plainledger',
    },
  },
});
