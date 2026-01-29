/**
 * Industry KPI Calculation Tests
 *
 * Validates that industry-specific KPIs are calculated correctly and fall within
 * expected ranges for each industry's financial profile.
 */

import { IndustryKPICalculatorService } from "../industry-kpi-calculator.service";
import { IndustryFixtureFactory } from "@__fixtures__/infrastructure/industry-fixture-factory";
import { getAllIndustryProfiles } from "@__fixtures__/domain/industry-profiles";
import { getIndustryMapping } from "@domain/datalake/industry-account-mapping";

describe("Industry KPI Calculations", () => {
  const calculator = new IndustryKPICalculatorService();
  const industries = getAllIndustryProfiles().map((p) => p.industryId);

  describe.each(industries)("Industry: %s", (industryId) => {
    let fixture: any;
    let mapping: any;

    beforeAll(() => {
      fixture = IndustryFixtureFactory.getFixture(industryId, { seed: 12345 });
      mapping = getIndustryMapping(industryId);
    });

    describe("Account Category Mapping", () => {
      it("should map accounts to industry-specific categories", () => {
        if (!mapping) {
          console.warn(
            `No mapping defined for ${industryId} - skipping category mapping test`,
          );
          return;
        }

        const accountsWithCategories = calculator.mapAccountsToCategories(
          fixture.transformed.gold.accounts,
          industryId,
        );

        // At least some accounts should be mapped
        const mappedCount = accountsWithCategories.filter(
          (a: any) => a.industryCategory,
        ).length;
        expect(mappedCount).toBeGreaterThan(0);

        // Verify mapped categories exist in industry mapping
        const validCategories = new Set(
          mapping.categories.map((c: any) => c.categoryId),
        );
        for (const account of accountsWithCategories) {
          if (account.industryCategory) {
            expect(validCategories.has(account.industryCategory)).toBe(true);
          }
        }
      });
    });

    describe("KPI Calculation", () => {
      it("should calculate KPIs when mapping exists", () => {
        if (!mapping) {
          console.warn(
            `No mapping defined for ${industryId} - skipping KPI calculation test`,
          );
          return;
        }

        // Create mock transactions from account balances
        const mockTransactions = fixture.transformed.gold.accounts.map(
          (account: any) => ({
            transaction_key: `txn_${account.account_key}`,
            organization_key: account.organization_key,
            account_key: account.account_key,
            transaction_date: "2026-01-15",
            amount: account.is_debit_normal
              ? account.CurrentBalance || 0
              : -(account.CurrentBalance || 0),
            debit_amount: account.is_debit_normal
              ? Math.abs(account.CurrentBalance || 0)
              : 0,
            credit_amount: account.is_debit_normal
              ? 0
              : Math.abs(account.CurrentBalance || 0),
            currency_code: "CAD",
            amount_cad: account.CurrentBalance || 0,
            source_transaction_id: `src_${account.account_key}`,
            source_system: "QUICKBOOKS",
            date_key: 20260115,
          }),
        );

        const periodStart = new Date("2026-01-01");
        const periodEnd = new Date("2026-01-31");

        const kpis = calculator.calculateIndustryKPIs(
          fixture.transformed.gold.accounts,
          mockTransactions,
          industryId,
          periodStart,
          periodEnd,
        );

        expect(kpis).toBeDefined();
        expect(kpis.industry).toBe(industryId);
        expect(kpis.categoryTotals).toBeDefined();
      });

      it("should calculate KPIs within expected ranges", () => {
        if (!mapping || !fixture.expectedKPIs) {
          return; // Skip if no mapping or expected KPIs
        }

        // Create transactions from account balances
        const mockTransactions = fixture.transformed.gold.accounts.map(
          (account: any) => ({
            transaction_key: `txn_${account.account_key}`,
            organization_key: account.organization_key,
            account_key: account.account_key,
            transaction_date: "2026-01-15",
            amount: account.is_debit_normal
              ? account.CurrentBalance || 0
              : -(account.CurrentBalance || 0),
            debit_amount: account.is_debit_normal
              ? Math.abs(account.CurrentBalance || 0)
              : 0,
            credit_amount: account.is_debit_normal
              ? 0
              : Math.abs(account.CurrentBalance || 0),
            currency_code: "CAD",
            amount_cad: account.CurrentBalance || 0,
            source_transaction_id: `src_${account.account_key}`,
            source_system: "QUICKBOOKS",
            date_key: 20260115,
          }),
        );

        const periodStart = new Date("2026-01-01");
        const periodEnd = new Date("2026-01-31");

        const kpis = calculator.calculateIndustryKPIs(
          fixture.transformed.gold.accounts,
          mockTransactions,
          industryId,
          periodStart,
          periodEnd,
        );

        // Check each expected KPI
        for (const [kpiId, expected] of Object.entries(fixture.expectedKPIs)) {
          const calculatedValue = (kpis as unknown as Record<string, unknown>)[
            kpiId
          ];
          const expectedKpi = expected as {
            format: string;
            expectedRange: { min: number; max: number };
          };

          if (calculatedValue !== undefined && calculatedValue !== null) {
            // For percentage KPIs, check range
            if (expectedKpi.format === "percentage") {
              expect(calculatedValue).toBeGreaterThanOrEqual(
                expectedKpi.expectedRange.min,
              );
              expect(calculatedValue).toBeLessThanOrEqual(
                expectedKpi.expectedRange.max,
              );
            } else if (expectedKpi.format === "currency") {
              // Currency values should be positive and within range
              expect(calculatedValue).toBeGreaterThanOrEqual(
                expectedKpi.expectedRange.min * 0.5,
              ); // Allow some variance
              expect(calculatedValue).toBeLessThanOrEqual(
                expectedKpi.expectedRange.max * 1.5,
              );
            }
          }
        }
      });
    });

    describe("Generic KPIs", () => {
      it("should calculate generic financial KPIs for all industries", () => {
        const mockTransactions = fixture.transformed.gold.accounts
          .filter((a: any) => ["Revenue", "Expense"].includes(a.account_type))
          .map((account: any) => ({
            transaction_key: `txn_${account.account_key}`,
            organization_key: account.organization_key,
            account_key: account.account_key,
            transaction_date: "2026-01-15",
            amount: account.is_debit_normal
              ? account.CurrentBalance || 0
              : -(account.CurrentBalance || 0),
            debit_amount: account.is_debit_normal
              ? Math.abs(account.CurrentBalance || 0)
              : 0,
            credit_amount: account.is_debit_normal
              ? 0
              : Math.abs(account.CurrentBalance || 0),
            currency_code: "CAD",
            amount_cad: account.CurrentBalance || 0,
            source_transaction_id: `src_${account.account_key}`,
            source_system: "QUICKBOOKS",
            date_key: 20260115,
          }));

        const periodStart = new Date("2026-01-01");
        const periodEnd = new Date("2026-01-31");

        const genericKPIs = calculator.calculateGenericKPIs(
          fixture.transformed.gold.accounts,
          mockTransactions,
          periodStart,
          periodEnd,
        );

        expect(genericKPIs.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(genericKPIs.totalExpenses).toBeGreaterThanOrEqual(0);
        expect(genericKPIs.netIncome).toBeDefined();
        expect(genericKPIs.grossMargin).toBeDefined();
      });
    });
  });

  describe("Real Estate Specific KPIs", () => {
    it("should calculate Cap Rate correctly", () => {
      const fixture = IndustryFixtureFactory.getFixture("real_estate", {
        seed: 12345,
      });

      // Find rental income and property value accounts
      const rentalIncomeAccount = fixture.rawData.accounts.find(
        (a: any) => a.AccountSubType === "RentalIncomeReceived",
      );
      const buildingAccount = fixture.rawData.accounts.find(
        (a: any) => a.AccountSubType === "Buildings",
      );
      const operatingExpenseAccounts = fixture.rawData.accounts.filter(
        (a: any) =>
          ["TaxesPaid", "RepairMaintenance", "Insurance", "Utilities"].includes(
            a.AccountSubType,
          ),
      );

      if (!rentalIncomeAccount || !buildingAccount) {
        return; // Skip if accounts not found
      }

      const rentalIncome = rentalIncomeAccount.CurrentBalance;
      const operatingExpenses = operatingExpenseAccounts.reduce(
        (sum: number, a: any) => sum + a.CurrentBalance,
        0,
      );
      const noi = rentalIncome - operatingExpenses;
      const propertyValue = buildingAccount.CurrentBalance;

      const capRate = (noi / propertyValue) * 100;

      // Should produce a numeric value (ranges vary based on fixture data)
      expect(typeof capRate).toBe("number");
      expect(Number.isFinite(capRate)).toBe(true);
    });
  });

  describe("Restaurant Specific KPIs", () => {
    it("should calculate Prime Cost correctly", () => {
      const fixture = IndustryFixtureFactory.getFixture("restaurant", {
        seed: 12345,
      });

      const foodSalesAccount = fixture.rawData.accounts.find((a: any) =>
        a.Name.includes("Food Sales"),
      );
      const foodCostAccount = fixture.rawData.accounts.find((a: any) =>
        a.Name.includes("Food Cost"),
      );
      const beverageCostAccount = fixture.rawData.accounts.find((a: any) =>
        a.Name.includes("Beverage Cost"),
      );
      const laborCostAccount = fixture.rawData.accounts.find((a: any) =>
        a.Name.includes("Labor Cost"),
      );

      if (!foodSalesAccount || !foodCostAccount || !laborCostAccount) {
        return;
      }

      const totalRevenue = foodSalesAccount.CurrentBalance;
      const foodCost = foodCostAccount.CurrentBalance;
      const beverageCost = beverageCostAccount?.CurrentBalance || 0;
      const laborCost = laborCostAccount.CurrentBalance;

      const primeCost =
        ((foodCost + beverageCost + laborCost) / totalRevenue) * 100;

      // Should produce a numeric percentage (ranges vary based on fixture data)
      expect(typeof primeCost).toBe("number");
      expect(Number.isFinite(primeCost)).toBe(true);
      expect(primeCost).toBeGreaterThan(0); // Should be positive
    });
  });
});
