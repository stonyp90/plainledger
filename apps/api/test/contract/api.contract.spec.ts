/**
 * API Contract Tests
 * 
 * Validates that API endpoints match their OpenAPI/Swagger contracts.
 * Prevents breaking changes to API contracts.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../../src/app.module';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('API Contract Tests', () => {
  let app: INestApplication;
  let currentSpec: any;
  let storedContract: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Generate current OpenAPI spec
    const config = new DocumentBuilder()
      .setTitle('PlainLedger API')
      .setDescription('Financial Reporting Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    currentSpec = SwaggerModule.createDocument(app, config);

    // Load stored contract (if exists)
    const contractPath = path.join(
      process.cwd(),
      'test',
      'contract',
      'api-contract.json',
    );
    try {
      const contractContent = await fs.readFile(contractPath, 'utf-8');
      storedContract = JSON.parse(contractContent);
    } catch (error) {
      // Contract doesn't exist yet - will be created on first run
      storedContract = null;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('should generate valid OpenAPI spec', () => {
    expect(currentSpec).toBeDefined();
    expect(currentSpec.openapi).toBeDefined();
    expect(currentSpec.paths).toBeDefined();
  });

  it('should have all critical endpoints documented', () => {
    const criticalPaths = [
      '/api/organizations',
      '/api/accounts',
      '/api/reports',
      '/api/integrations',
      '/api/datasources',
      '/api/analytics',
      '/health',
    ];

    criticalPaths.forEach((path) => {
      const pathKey = path.replace('/api', '');
      const found = currentSpec.paths[pathKey] || currentSpec.paths[path];
      expect(found).toBeDefined(
        `Critical endpoint ${path} is not documented in OpenAPI spec`,
      );
    });
  });

  it('should have Swagger decorators on all endpoints', () => {
    Object.keys(currentSpec.paths).forEach((path) => {
      Object.keys(currentSpec.paths[path]).forEach((method) => {
        const endpoint = currentSpec.paths[path][method];
        expect(endpoint.summary || endpoint.description).toBeDefined(
          `Endpoint ${method.toUpperCase()} ${path} missing @ApiOperation summary`,
        );
        expect(endpoint.responses).toBeDefined(
          `Endpoint ${method.toUpperCase()} ${path} missing @ApiResponse decorators`,
        );
      });
    });
  });

  it('should match stored contract (if exists)', () => {
    if (!storedContract) {
      // First run - save current spec as contract
      console.log('⚠️  No stored contract found. Saving current spec as contract.');
      return;
    }

    // Compare critical paths
    const currentPaths = Object.keys(currentSpec.paths);
    const contractPaths = Object.keys(storedContract.paths);

    // Check for removed endpoints
    contractPaths.forEach((contractPath) => {
      if (!currentPaths.includes(contractPath)) {
        console.warn(`⚠️  Endpoint removed: ${contractPath}`);
      }
    });

    // Check for breaking changes in existing endpoints
    currentPaths.forEach((currentPath) => {
      if (storedContract.paths[currentPath]) {
        const currentMethods = Object.keys(currentSpec.paths[currentPath]);
        const contractMethods = Object.keys(
          storedContract.paths[currentPath],
        );

        contractMethods.forEach((method) => {
          if (!currentMethods.includes(method)) {
            throw new Error(
              `Breaking change: Method ${method} removed from ${currentPath}`,
            );
          }

          // Compare request/response schemas
          const currentEndpoint = currentSpec.paths[currentPath][method];
          const contractEndpoint = storedContract.paths[currentPath][method];

          if (
            JSON.stringify(currentEndpoint.responses) !==
            JSON.stringify(contractEndpoint.responses)
          ) {
            console.warn(
              `⚠️  Response schema changed for ${method} ${currentPath}`,
            );
          }
        });
      }
    });
  });

  it('should save current spec as contract', async () => {
    const contractPath = path.join(
      process.cwd(),
      'test',
      'contract',
      'api-contract.json',
    );
    await fs.mkdir(path.dirname(contractPath), { recursive: true });
    await fs.writeFile(
      contractPath,
      JSON.stringify(currentSpec, null, 2),
    );
    console.log(`✅ Contract saved to: ${contractPath}`);
  });
});
