/**
 * Testcontainers Helper for E2E Tests
 * 
 * Provides Playwright-compatible testcontainers setup.
 * Use this in E2E tests that need isolated infrastructure.
 */

import { test as setup } from '@playwright/test';
import {
  setupTestContainers,
  seedTestData,
  getContainerConfig,
  cleanupTestContainers,
  type TestContainers,
} from '../testcontainers-setup';
import { TestData } from './fixtures';

let containers: TestContainers | null = null;

/**
 * Setup testcontainers before all tests
 * Call this in a global setup file
 */
export async function globalSetup() {
  console.log('🚀 Setting up testcontainers for E2E tests...');
  
  containers = await setupTestContainers();
  
  // Seed test data
  await seedTestData(containers, {
    industry: 'restaurant',
    organization: 'professional',
    users: true,
    bronzeData: true,
  });

  // Export container config for tests
  const config = getContainerConfig(containers);
  process.env.TEST_DB_HOST = config.database.host;
  process.env.TEST_DB_PORT = String(config.database.port);
  process.env.TEST_DB_NAME = config.database.database;
  process.env.TEST_DB_USER = config.database.username;
  process.env.TEST_DB_PASSWORD = config.database.password;
  process.env.TEST_REDIS_URL = config.redis.url;
  process.env.TEST_S3_ENDPOINT = config.s3.endpoint;
  process.env.TEST_S3_REGION = config.s3.region;
  process.env.TEST_S3_ACCESS_KEY = config.s3.accessKeyId;
  process.env.TEST_S3_SECRET_KEY = config.s3.secretAccessKey;

  console.log('✅ Testcontainers setup complete');
}

/**
 * Cleanup testcontainers after all tests
 */
export async function globalTeardown() {
  if (containers) {
    await cleanupTestContainers(containers);
  }
}

/**
 * Get container configuration for current test
 */
export function getTestContainerConfig() {
  if (!containers) {
    throw new Error('Testcontainers not initialized. Call globalSetup() first.');
  }
  return getContainerConfig(containers);
}

/**
 * Playwright global setup/teardown hooks
 * Only runs if USE_TESTCONTAINERS=true
 */
if (process.env.USE_TESTCONTAINERS === 'true') {
  // Global setup is handled by Playwright's globalSetup config
  // This file exports the functions for Playwright to call
}
