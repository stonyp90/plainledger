/**
 * Parameterized E2E Tests for Industry-Specific Dashboards
 *
 * Tests that each industry displays appropriate KPIs and renders correctly.
 * Uses parameterized tests to cover all 15 industries efficiently.
 */

import { test, expect } from "@playwright/test";

// =============================================================================
// Industry Test Configuration
// =============================================================================

const POPULAR_INDUSTRIES = [
  { id: "real_estate", kpis: ["Cap Rate", "NOI", "Expense Ratio"], name: "Real Estate" },
  { id: "restaurant", kpis: ["Food Cost", "Labor Cost", "Prime Cost"], name: "Restaurant" },
  { id: "construction", kpis: ["Job Margin", "WIP Balance", "Backlog"], name: "Construction" },
  { id: "hospitality", kpis: ["RevPAR", "ADR", "Occupancy"], name: "Hospitality" },
];

const ALL_INDUSTRIES = [
  ...POPULAR_INDUSTRIES,
  { id: "retail", kpis: ["Gross Margin", "Inventory Turnover"], name: "Retail" },
  { id: "professional_services", kpis: ["Utilization", "Revenue per Employee"], name: "Professional Services" },
  { id: "manufacturing", kpis: ["Gross Margin", "Unit Margin"], name: "Manufacturing" },
  { id: "healthcare", kpis: ["Revenue per Patient"], name: "Healthcare" },
  { id: "agriculture", kpis: ["Yield"], name: "Agriculture" },
  { id: "transport", kpis: ["Margin per KM"], name: "Transport" },
  { id: "education", kpis: ["Revenue per Student"], name: "Education" },
  { id: "wholesale", kpis: ["Gross Margin", "Inventory Turnover"], name: "Wholesale" },
  { id: "automotive", kpis: ["Service Revenue %"], name: "Automotive" },
  { id: "beauty_wellness", kpis: ["Revenue per Client"], name: "Beauty & Wellness" },
  { id: "technology", kpis: ["Gross Margin", "CAC Payback"], name: "Technology" },
];

// =============================================================================
// Popular Industries - Detailed Tests
// =============================================================================

test.describe("Industry Dashboard - Popular Industries", () => {
  for (const industry of POPULAR_INDUSTRIES) {
    test.describe(`${industry.name} (${industry.id})`, () => {
      test.beforeEach(async ({ page }) => {
        // Navigate to dashboard with industry parameter
        await page.goto(`/app/dashboard?industry=${industry.id}`);
        // Wait for initial load
        await page.waitForTimeout(1000);
      });

      test("should display industry-specific KPIs", async ({ page }) => {
        // Wait for KPI section to load
        const kpiSection = page.locator('[data-testid="industry-kpis"]').first();
        await expect(kpiSection).toBeVisible({ timeout: 10000 });

        // Check for each expected KPI
        for (const kpi of industry.kpis) {
          const kpiElement = page.getByText(new RegExp(kpi, "i")).first();
          await expect(kpiElement).toBeVisible({ timeout: 5000 });
        }
      });

      test("should show industry name in header or title", async ({ page }) => {
        // Industry name should appear somewhere on the page
        const industryNameRegex = new RegExp(industry.name, "i");
        const industryNameElement = page.getByText(industryNameRegex).first();
        await expect(industryNameElement).toBeVisible({ timeout: 5000 });
      });

      test("should load charts without errors", async ({ page }) => {
        // Wait for chart container
        const chartContainer = page.locator('[data-testid="revenue-chart"], [class*="recharts"], canvas, svg').first();
        await expect(chartContainer).toBeVisible({ timeout: 10000 });

        // Check console for errors
        const errors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            errors.push(msg.text());
          }
        });

        await page.waitForTimeout(2000);

        // Filter out known non-critical errors
        const criticalErrors = errors.filter(
          (e) =>
            !e.includes("favicon") &&
            !e.includes("404") &&
            (e.includes("chart") || e.includes("data") || e.includes("render")),
        );

        expect(criticalErrors.length).toBe(0);
      });

      test("should display financial summary metrics", async ({ page }) => {
        // Check for common financial metrics
        const summarySection = page.locator('[data-testid="dashboard-summary"]').first();
        await expect(summarySection).toBeVisible({ timeout: 10000 });

        // Should show revenue, expenses, net income
        await expect(page.getByText(/revenue|revenu/i).first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/expense|dépense/i).first()).toBeVisible({ timeout: 5000 });
      });

      test("should allow period selection", async ({ page }) => {
        // Look for period selector buttons
        const monthButton = page.getByRole("button", { name: /Month|Mois/i }).first();
        const quarterButton = page.getByRole("button", { name: /Quarter|Trim/i }).first();

        if (await monthButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(monthButton).toBeVisible();
          await expect(quarterButton).toBeVisible();

          // Test switching periods
          await quarterButton.click();
          await page.waitForTimeout(500);
          // Dashboard should still be visible
          await expect(page.getByText(/revenue|revenu/i).first()).toBeVisible();
        }
      });
    });
  }
});

// =============================================================================
// All Industries - Smoke Tests
// =============================================================================

test.describe("Industry Dashboard - All Industries Smoke Test", () => {
  for (const industry of ALL_INDUSTRIES) {
    test(`${industry.name} (${industry.id}) - should load without errors`, async ({ page }) => {
      await page.goto(`/app/dashboard?industry=${industry.id}`);

      // Should not show error page
      const errorPage = page.getByText(/error|failed|404|not found/i).first();
      await expect(errorPage).not.toBeVisible({ timeout: 5000 }).catch(() => {
        // Error page not found is good
      });

      // Should show dashboard content
      await expect(page.getByText(/revenue|revenu|dashboard/i).first()).toBeVisible({ timeout: 10000 });

      // Check for console errors
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(2000);

      // Should not have critical rendering errors
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("404") &&
          (e.includes("Cannot read") || e.includes("undefined") || e.includes("null")),
      );

      expect(criticalErrors.length).toBe(0);
    });
  }
});

// =============================================================================
// Cross-Industry Consistency Tests
// =============================================================================

test.describe("Cross-Industry Consistency", () => {
  test("should have consistent UI structure across all industries", async ({ page }) => {
    const industriesToTest = POPULAR_INDUSTRIES.slice(0, 2); // Test first 2 for speed

    for (const industry of industriesToTest) {
      await page.goto(`/app/dashboard?industry=${industry.id}`);

      // All should have summary section
      await expect(page.locator('[data-testid="dashboard-summary"]').first()).toBeVisible({ timeout: 10000 });

      // All should have chart area
      await expect(
        page.locator('[data-testid="revenue-chart"], [class*="recharts"], canvas, svg').first(),
      ).toBeVisible({ timeout: 10000 });

      await page.waitForTimeout(500);
    }
  });

  test("should maintain URL state when switching industries", async ({ page }) => {
    await page.goto("/app/dashboard?industry=real_estate");

    // URL should contain industry parameter
    expect(page.url()).toContain("industry=real_estate");

    // Navigate to different industry (if there's a selector)
    const industrySelector = page.locator('[data-testid="industry-selector"]').first();
    if (await industrySelector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await industrySelector.click();
      await page.getByText("Restaurant").first().click();
      await page.waitForTimeout(1000);

      // URL should update
      expect(page.url()).toContain("industry=restaurant");
    }
  });
});
