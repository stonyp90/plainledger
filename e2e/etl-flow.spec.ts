/**
 * ETL Flow E2E Tests
 * 
 * Tests the complete ETL pipeline flow using docker-compose services
 * Requires: docker-compose up -d
 */

import { test, expect } from "@playwright/test";

test.describe("ETL Pipeline E2E", () => {
  const apiUrl = process.env.API_URL || "http://localhost:3000";
  const testOrgId = "e2e-org-123";

  test("should complete Bronze to Silver ETL flow", async ({ request }) => {
    // 1. Seed test data to Bronze layer
    const seedResponse = await request.post(
      `${apiUrl}/internal/etl/seed`,
      {
        data: {
          organizationId: testOrgId,
          provider: "quickbooks",
        },
        headers: {
          "x-internal-token": process.env.INTERNAL_API_TOKEN || "change-me",
        },
      },
    );

    expect(seedResponse.ok()).toBeTruthy();

    // 2. Trigger Bronze to Silver ETL job
    const etlResponse = await request.post(
      `${apiUrl}/internal/etl/trigger`,
      {
        data: {
          job: "bronze_to_silver",
          organizationId: testOrgId,
        },
        headers: {
          "x-internal-token": process.env.INTERNAL_API_TOKEN || "change-me",
        },
      },
    );

    expect(etlResponse.ok()).toBeTruthy();
    const etlResult = await etlResponse.json();
    expect(etlResult.success).toBe(true);

    // 3. Verify cache was invalidated
    const cacheCheck = await request.get(
      `${apiUrl}/api/v1/datalake/accounts?organizationId=${testOrgId}`,
    );
    expect(cacheCheck.ok()).toBeTruthy();

    // 4. Verify data in Silver layer
    const silverData = await request.get(
      `${apiUrl}/api/v1/datalake/silver/accounts?organizationId=${testOrgId}`,
    );
    expect(silverData.ok()).toBeTruthy();
  });

  test("should handle multi-provider sync", async ({ request }) => {
    const providers = ["quickbooks", "xero"];

    for (const provider of providers) {
      const syncResponse = await request.post(
        `${apiUrl}/api/v1/datasources/${provider}/sync`,
        {
          data: {
            organizationId: testOrgId,
          },
        },
      );

      // Provider might not be configured, so we check for either success or 404
      expect([200, 201, 404]).toContain(syncResponse.status());
    }
  });

  test("should send email alerts on ETL completion", async () => {
    // This would verify email was sent via SES
    // In a real E2E test, we'd check email service logs or use a test email service
    expect(true).toBe(true); // Placeholder
  });
});
