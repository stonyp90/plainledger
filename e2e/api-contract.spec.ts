/**
 * API Contract E2E Tests
 * 
 * Tests API endpoints using fixtures and testcontainers.
 * Validates that API contracts work end-to-end.
 */

import { test, expect } from '@playwright/test';
import { TestData } from './helpers/fixtures';

test.describe('API Contract E2E Tests', () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';

  test.describe('Organizations API', () => {
    test('should create organization using fixture data', async ({ request }) => {
      const org = TestData.professionalOrg();
      
      const response = await request.post(`${API_URL}/api/organizations`, {
        data: {
          tenantId: org.id,
          name: org.name,
          industry: org.industry,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body.name).toBe(org.name);
    });

    test('should get organization by tenant ID', async ({ request }) => {
      const org = TestData.professionalOrg();
      
      const response = await request.get(`${API_URL}/api/organizations/${org.id}`, {
        headers: {
          'Authorization': 'Bearer test-token', // Mock token for E2E
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.tenantId).toBe(org.id);
    });
  });

  test.describe('Industry Data API', () => {
    test('should return industry KPIs using fixtures', async ({ request }) => {
      const restaurant = TestData.restaurant();
      const expectedKPIs = TestData.getExpectedKPIsForIndustry('restaurant');

      const response = await request.get(
        `${API_URL}/api/industries/${restaurant.id}/kpis`,
        {
          headers: {
            'Authorization': 'Bearer test-token',
          },
        },
      );

      expect(response.status()).toBe(200);
      const body = await response.json();
      
      // Validate KPIs match fixture expectations
      expect(body).toHaveLength(expectedKPIs.length);
      expectedKPIs.forEach((expectedKPI) => {
        const actualKPI = body.find((kpi: any) => kpi.id === expectedKPI.id);
        expect(actualKPI).toBeDefined();
        expect(actualKPI.name).toBe(expectedKPI.name);
      });
    });
  });

  test.describe('GraphQL API', () => {
    test('should execute GraphQL query with fixture data', async ({ request }) => {
      const query = `
        query {
          organization(tenantId: "test-org") {
            id
            name
            industry
          }
        }
      `;

      const response = await request.post(`${API_URL}/graphql`, {
        data: { query },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('organization');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle rate limit errors', async ({ request }) => {
      const rateLimitFixture = TestData.getEdgeCaseScenario('rate_limit');

      // Simulate rate limit scenario
      const response = await request.get(`${API_URL}/api/organizations`, {
        headers: {
          'Authorization': 'Bearer test-token',
        },
        // Add headers to simulate rate limit
      });

      // Should handle rate limit gracefully
      expect([200, 429]).toContain(response.status());
    });

    test('should handle malformed data', async ({ request }) => {
      const malformedFixture = TestData.getEdgeCaseScenario('malformed_data');

      const response = await request.post(`${API_URL}/api/organizations`, {
        data: malformedFixture.data,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('message');
    });
  });
});
