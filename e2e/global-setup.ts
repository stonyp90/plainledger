/**
 * Playwright Global Setup
 * 
 * Sets up testcontainers if USE_TESTCONTAINERS=true
 * Seeds test data using fixtures
 */

import { FullConfig } from '@playwright/test';
import {
  setupTestContainers,
  seedTestData,
  getContainerConfig,
  type TestContainers,
} from './testcontainers-setup';

let containers: TestContainers | null = null;

async function globalSetup(config: FullConfig) {
  // Only setup testcontainers if explicitly requested
  if (process.env.USE_TESTCONTAINERS !== 'true') {
    console.log('ℹ️  Testcontainers disabled. Using docker-compose services.');
    return;
  }

  console.log('🚀 Setting up testcontainers for E2E tests...');

  try {
    // Start containers
    containers = await setupTestContainers();

    // Seed test data using fixtures
    await seedTestData(containers, {
      industry: 'restaurant',
      organization: 'professional',
      users: true,
      bronzeData: true,
    });

    // Export container config as environment variables for tests
    const containerConfig = getContainerConfig(containers);
    
    // Set environment variables for tests
    process.env.TEST_DB_HOST = containerConfig.database.host;
    process.env.TEST_DB_PORT = String(containerConfig.database.port);
    process.env.TEST_DB_NAME = containerConfig.database.database;
    process.env.TEST_DB_USER = containerConfig.database.username;
    process.env.TEST_DB_PASSWORD = containerConfig.database.password;
    process.env.TEST_DB_URL = containerConfig.database.connectionString;
    
    process.env.TEST_REDIS_HOST = containerConfig.redis.host;
    process.env.TEST_REDIS_PORT = String(containerConfig.redis.port);
    process.env.TEST_REDIS_URL = containerConfig.redis.url;
    
    process.env.TEST_S3_ENDPOINT = containerConfig.s3.endpoint;
    process.env.TEST_S3_REGION = containerConfig.s3.region;
    process.env.TEST_S3_ACCESS_KEY = containerConfig.s3.accessKeyId;
    process.env.TEST_S3_SECRET_KEY = containerConfig.s3.secretAccessKey;
    process.env.TEST_S3_BUCKET_BRONZE = containerConfig.s3.buckets.bronze;
    process.env.TEST_S3_BUCKET_SILVER = containerConfig.s3.buckets.silver;
    process.env.TEST_S3_BUCKET_GOLD = containerConfig.s3.buckets.gold;

    console.log('✅ Testcontainers setup complete');
    console.log(`   Database: ${containerConfig.database.connectionString}`);
    console.log(`   Redis: ${containerConfig.redis.url}`);
    console.log(`   S3: ${containerConfig.s3.endpoint}`);

    // Store containers for teardown
    (global as any).__TESTCONTAINERS__ = containers;
  } catch (error) {
    console.error('❌ Failed to setup testcontainers:', error);
    throw error;
  }
}

async function globalTeardown(config: FullConfig) {
  if (process.env.USE_TESTCONTAINERS !== 'true') {
    return;
  }

  const containers = (global as any).__TESTCONTAINERS__;
  if (containers) {
    console.log('🧹 Cleaning up testcontainers...');
    const { cleanupTestContainers } = await import('./testcontainers-setup');
    await cleanupTestContainers(containers);
    console.log('✅ Testcontainers cleaned up');
  }
}

// Playwright expects default export for globalSetup
export default globalSetup;

// Export teardown function for Playwright
export { globalTeardown };
