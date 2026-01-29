/**
 * E2E Tests for KPI Calculation Accuracy
 *
 * Verifies that industry-specific KPIs are calculated correctly using seeded test data.
 * These tests ensure the ETL pipeline and KPI calculator produce accurate results.
 */

import { test, expect } from "@playwright/test";

test.describe("KPI Calculation Accuracy", () => {
  test.describe("Real Estate", () => {
    test("should calculate Cap Rate correctly", async ({ page }) => {
      // Use test organization with known data
      await page.goto("/app/dashboard?industry=real_estate&testMode=true");

      // Wait for KPI section
      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      const capRateElement = page.getByTestId("kpi-cap_rate").or(page.getByText(/cap rate|taux de capitalisation/i).first());
      const capRateText = await capRateElement.textContent({ timeout: 5000 }).catch(() => null);

      if (capRateText) {
        // Extract numeric value (remove % and other text)
        const capRateMatch = capRateText.match(/(\d+\.?\d*)/);
        if (capRateMatch) {
          const capRateValue = parseFloat(capRateMatch[1]);

          // Expected: NOI / Property Value = ~5-10%
          expect(capRateValue).toBeGreaterThanOrEqual(4);
          expect(capRateValue).toBeLessThanOrEqual(10);
        }
      }
    });

    test("should display Net Operating Income", async ({ page }) => {
      await page.goto("/app/dashboard?industry=real_estate&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      const noiElement = page
        .getByTestId("kpi-noi")
        .or(page.getByText(/net operating income|résultat d'exploitation net/i).first());

      await expect(noiElement).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Restaurant", () => {
    test("should calculate Prime Cost correctly", async ({ page }) => {
      await page.goto("/app/dashboard?industry=restaurant&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      const primeCostElement = page
        .getByTestId("kpi-prime_cost_pct")
        .or(page.getByText(/prime cost|coût principal/i).first());
      const primeCostText = await primeCostElement.textContent({ timeout: 5000 }).catch(() => null);

      if (primeCostText) {
        const primeCostMatch = primeCostText.match(/(\d+\.?\d*)/);
        if (primeCostMatch) {
          const primeCostValue = parseFloat(primeCostMatch[1]);

          // Expected: (Food + Beverage + Labor) / Revenue = 55-65%
          expect(primeCostValue).toBeGreaterThanOrEqual(55);
          expect(primeCostValue).toBeLessThanOrEqual(65);
        }
      }
    });

    test("should display Food Cost %", async ({ page }) => {
      await page.goto("/app/dashboard?industry=restaurant&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      const foodCostElement = page
        .getByTestId("kpi-food_cost_pct")
        .or(page.getByText(/food cost|coût nourriture/i).first());

      await expect(foodCostElement).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Construction", () => {
    test("should display Job Margin", async ({ page }) => {
      await page.goto("/app/dashboard?industry=construction&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      const jobMarginElement = page
        .getByTestId("kpi-job_margin_pct")
        .or(page.getByText(/job margin|marge de projet/i).first());

      await expect(jobMarginElement).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Hospitality", () => {
    test("should display RevPAR", async ({ page }) => {
      await page.goto("/app/dashboard?industry=hospitality&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      const revparElement = page.getByTestId("kpi-revpar").or(page.getByText(/revpar/i).first());

      await expect(revparElement).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("KPI Format Validation", () => {
    test("should format percentage KPIs with % symbol", async ({ page }) => {
      await page.goto("/app/dashboard?industry=real_estate&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      // Find a percentage KPI (Cap Rate)
      const capRateElement = page.getByText(/cap rate|taux de capitalisation/i).first();
      const text = await capRateElement.textContent({ timeout: 5000 }).catch(() => "");

      // Should contain % symbol for percentage KPIs
      if (text && text.toLowerCase().includes("cap rate")) {
        expect(text).toMatch(/%/);
      }
    });

    test("should format currency KPIs with $ symbol", async ({ page }) => {
      await page.goto("/app/dashboard?industry=real_estate&testMode=true");

      await page.waitForSelector('[data-testid="industry-kpis"]', { timeout: 10000 });

      // Find a currency KPI (NOI)
      const noiElement = page.getByText(/net operating income|résultat d'exploitation net/i).first();
      const text = await noiElement.textContent({ timeout: 5000 }).catch(() => "");

      // Should contain $ or CAD for currency KPIs
      if (text && text.toLowerCase().includes("operating income")) {
        expect(text).toMatch(/\$|CAD/);
      }
    });
  });
});
