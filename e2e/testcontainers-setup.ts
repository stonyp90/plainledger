/**
 * Testcontainers Setup for E2E Tests
 * 
 * Provides isolated test environments using Docker containers.
 * Better than docker-compose for CI/CD as it manages lifecycle automatically.
 * 
 * Usage:
 *   import { setupTestContainers, seedTestData } from './testcontainers-setup';
 *   const containers = await setupTestContainers();
 *   await seedTestData(containers);
 */

import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  loadIndustry,
  loadTestUser,
  loadTestOrganization,
  loadBronzeSample,
} from '../fixtures/loader';

export interface TestContainers {
  postgres: StartedTestContainer;
  redis: StartedTestContainer;
  localstack: StartedTestContainer;
  keycloak?: StartedTestContainer;
}

/**
 * Sets up all required containers for E2E testing
 */
export async function setupTestContainers(): Promise<TestContainers> {
  console.log('🚀 Starting test containers...');

  // PostgreSQL with pgvector
  const postgres = await new PostgreSqlContainer('pgvector/pgvector:pg16')
    .withDatabase('plainledger_test')
    .withUsername('plainledger')
    .withPassword('plainledger_secret')
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/))
    .start();

  console.log(`✓ PostgreSQL started on port ${postgres.getMappedPort(5432)}`);

  // Redis
  const redis = await new RedisContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();

  console.log(`✓ Redis started on port ${redis.getMappedPort(6379)}`);

  // LocalStack (S3 simulation)
  const localstack = await new GenericContainer('localstack/localstack:3.0')
    .withEnvironment({
      SERVICES: 's3',
      DEBUG: '1',
      DATA_DIR: '/tmp/localstack/data',
    })
    .withExposedPorts(4566)
    .withWaitStrategy(Wait.forHttp('/_localstack/health', 4566))
    .start();

  console.log(`✓ LocalStack started on port ${localstack.getMappedPort(4566)}`);

  // Initialize LocalStack S3 buckets
  await initializeLocalStack(localstack);

  return {
    postgres,
    redis,
    localstack,
  };
}

/**
 * Initialize LocalStack S3 buckets
 */
async function initializeLocalStack(container: StartedTestContainer): Promise<void> {
  const port = container.getMappedPort(4566);
  const host = container.getHost();
  const endpoint = `http://${host}:${port}`;

  const buckets = [
    'plainledger-bronze',
    'plainledger-silver',
    'plainledger-gold',
    'plainledger-quarantine',
  ];

  // Use AWS SDK or awslocal CLI
  const { S3Client, CreateBucketCommand } = await import('@aws-sdk/client-s3');
  
  const s3Client = new S3Client({
    endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    forcePathStyle: true,
  });

  for (const bucket of buckets) {
    try {
      await s3Client.send(
        new CreateBucketCommand({
          Bucket: bucket,
        }),
      );
      console.log(`  ✓ Created bucket: ${bucket}`);
    } catch (error: any) {
      if (error.name !== 'BucketAlreadyOwnedByYou') {
        console.warn(`  ⚠ Failed to create bucket ${bucket}:`, error.message);
      } else {
        console.log(`  ✓ Bucket already exists: ${bucket}`);
      }
    }
  }
}

/**
 * Seed test data using fixtures
 */
export async function seedTestData(
  containers: TestContainers,
  options: {
    industry?: string;
    organization?: string;
    users?: boolean;
    bronzeData?: boolean;
  } = {},
): Promise<void> {
  console.log('📦 Seeding test data from fixtures...');

  const postgresHost = containers.postgres.getHost();
  const postgresPort = containers.postgres.getMappedPort(5432);
  const connectionString = `postgresql://plainledger:plainledger_secret@${postgresHost}:${postgresPort}/plainledger_test`;

  // Initialize database schema
  const initSqlPath = path.join(process.cwd(), 'local-dev', 'init-db.sql');
  if (await fs.access(initSqlPath).then(() => true).catch(() => false)) {
    const initSql = await fs.readFile(initSqlPath, 'utf-8');
    // Execute SQL using pg client
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    await client.query(initSql);
    await client.end();
    console.log('  ✓ Database schema initialized');
  }

  // Seed organization if specified
  if (options.organization) {
    const org = loadTestOrganization(options.organization as any);
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    await client.query(
      `INSERT INTO accounting.organizations (id, tenant_id, name, industry) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (tenant_id) DO NOTHING`,
      [org.id, org.id, org.name, org.industry],
    );
    await client.end();
    console.log(`  ✓ Organization seeded: ${org.name}`);
  }

  // Seed users if requested
  if (options.users) {
    const adminUser = loadTestUser('admin');
    const regularUser = loadTestUser('user');
    // Note: Users are managed by Keycloak, not PostgreSQL
    // This would require Keycloak API calls
    console.log(`  ✓ Test users available: ${adminUser.email}, ${regularUser.email}`);
  }

  // Seed Bronze layer data if requested
  if (options.bronzeData && options.industry) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const containerConfig = getContainerConfig(containers);
      
      const s3Client = new S3Client({
        endpoint: containerConfig.s3.endpoint,
        region: containerConfig.s3.region,
        credentials: {
          accessKeyId: containerConfig.s3.accessKeyId,
          secretAccessKey: containerConfig.s3.secretAccessKey,
        },
        forcePathStyle: true,
      });

      // Try to load bronze sample (may not exist for all providers)
      try {
        const bronzeData = loadBronzeSample('quickbooks', 'accounts');
        await s3Client.send(
          new PutObjectCommand({
            Bucket: containerConfig.s3.buckets.bronze,
            Key: `quickbooks/accounts/sample.json`,
            Body: JSON.stringify(bronzeData),
          }),
        );
        console.log(`  ✓ Bronze data seeded for industry: ${options.industry}`);
      } catch (error) {
        // Fixture may not exist, that's okay
        console.log(`  ℹ️  Bronze fixture not available, skipping`);
      }
    } catch (error) {
      console.warn(`  ⚠ Bronze data seeding skipped: ${error}`);
    }
  }

  console.log('✓ Test data seeding complete');
}

/**
 * Get connection strings for test containers
 */
export function getContainerConfig(containers: TestContainers) {
  return {
    database: {
      host: containers.postgres.getHost(),
      port: containers.postgres.getMappedPort(5432),
      database: 'plainledger_test',
      username: 'plainledger',
      password: 'plainledger_secret',
      connectionString: `postgresql://plainledger:plainledger_secret@${containers.postgres.getHost()}:${containers.postgres.getMappedPort(5432)}/plainledger_test`,
    },
    redis: {
      host: containers.redis.getHost(),
      port: containers.redis.getMappedPort(6379),
      url: `redis://${containers.redis.getHost()}:${containers.redis.getMappedPort(6379)}`,
    },
    s3: {
      endpoint: `http://${containers.localstack.getHost()}:${containers.localstack.getMappedPort(4566)}`,
      region: 'us-east-1',
      accessKeyId: 'test',
      secretAccessKey: 'test',
      buckets: {
        bronze: 'plainledger-bronze',
        silver: 'plainledger-silver',
        gold: 'plainledger-gold',
      },
    },
  };
}

/**
 * Cleanup all containers
 */
export async function cleanupTestContainers(containers: TestContainers): Promise<void> {
  console.log('🧹 Cleaning up test containers...');
  
  await Promise.all([
    containers.postgres.stop(),
    containers.redis.stop(),
    containers.localstack.stop(),
    containers.keycloak?.stop(),
  ].filter(Boolean));

  console.log('✓ All containers stopped');
}
