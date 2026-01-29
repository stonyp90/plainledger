/**
 * Parameterized ETL Pipeline Tests
 *
 * Clean Architecture: Application layer tests using domain fixtures.
 * These tests run across all 15 industries to ensure ETL pipeline works correctly
 * for every industry's account structure and data patterns.
 */

import { IndustryFixtureFactory } from "@__fixtures__/infrastructure/industry-fixture-factory";
import { getAllIndustryProfiles } from "@__fixtures__/domain/industry-profiles";
import {
  SilverAccountType,
  SilverSourceSystem,
} from "@domain/datalake/silver-schema";
import { AccountType } from "@domain/datalake/schemas";

describe("ETL Pipeline - All Industries (Parameterized)", () => {
  // Generate test cases for each industry
  const industries = getAllIndustryProfiles().map((p) => p.industryId);

  describe.each(industries)("Industry: %s", (industryId) => {
    let fixture: any;

    beforeAll(() => {
      fixture = IndustryFixtureFactory.getFixture(industryId, { seed: 12345 });
    });

    describe("Bronze Layer", () => {
      it("should preserve all raw data without modification", () => {
        const { rawData, transformed } = fixture;

        for (let i = 0; i < rawData.accounts.length; i++) {
          expect(transformed.bronze.accounts[i].raw_data).toEqual(
            rawData.accounts[i],
          );
        }
      });

      it("should generate valid ingestion metadata", () => {
        const { transformed } = fixture;

        for (const bronze of transformed.bronze.accounts) {
          expect(bronze.metadata.ingestion_id).toBeDefined();
          expect(bronze.metadata.source_system).toBe("QUICKBOOKS");
          expect(bronze.metadata.ingestion_status).toBe("success");
          expect(bronze.metadata.organization_id).toContain(industryId);
        }
      });

      it("should include payload hash for deduplication", () => {
        const { transformed } = fixture;

        for (const bronze of transformed.bronze.accounts) {
          expect(bronze.metadata.payload_hash).toBeDefined();
          expect(typeof bronze.metadata.payload_hash).toBe("string");
        }
      });
    });

    describe("Silver Layer", () => {
      it("should standardize all accounts to Silver schema", () => {
        const { transformed } = fixture;

        for (const silver of transformed.silver.accounts) {
          expect(silver.silver_account_id).toBeDefined();
          expect(silver.account_type).toBeDefined();
          expect(silver.normal_balance).toMatch(/^(DEBIT|CREDIT)$/);
          expect(silver.currency_code).toBe("CAD");
        }
      });

      it("should have no critical quality issues", () => {
        const { transformed } = fixture;

        for (const silver of transformed.silver.accounts) {
          expect(silver.metadata.quality_score).toBeGreaterThanOrEqual(70);
          expect(silver.metadata.is_valid).toBe(true);
        }
      });

      it("should maintain source account ID through transformation", () => {
        const { rawData, transformed } = fixture;

        for (let i = 0; i < rawData.accounts.length; i++) {
          expect(transformed.silver.accounts[i].source_account_id).toBe(
            rawData.accounts[i].Id,
          );
        }
      });

      it("should correctly map account classifications", () => {
        const { rawData, transformed } = fixture;

        for (let i = 0; i < rawData.accounts.length; i++) {
          const raw = rawData.accounts[i];
          const silver = transformed.silver.accounts[i];

          // Verify classification mapping
          if (raw.Classification === "Asset") {
            expect(silver.account_type).toBe(SilverAccountType.ASSET);
            expect(silver.normal_balance).toBe("DEBIT");
          } else if (raw.Classification === "Liability") {
            expect(silver.account_type).toBe(SilverAccountType.LIABILITY);
            expect(silver.normal_balance).toBe("CREDIT");
          } else if (raw.Classification === "Revenue") {
            expect(silver.account_type).toBe(SilverAccountType.REVENUE);
            expect(silver.normal_balance).toBe("CREDIT");
          } else if (raw.Classification === "Expense") {
            expect(silver.account_type).toBe(SilverAccountType.EXPENSE);
            expect(silver.normal_balance).toBe("DEBIT");
          }
        }
      });
    });

    describe("Gold Layer", () => {
      it("should map all accounts to Gold star schema", () => {
        const { transformed } = fixture;

        for (const gold of transformed.gold.accounts) {
          expect(gold.account_key).toBeDefined();
          expect(gold.account_id).toBeDefined();
          expect(gold.organization_key).toContain(industryId);
          expect(gold.account_code).toBeDefined();
          expect(gold.account_name).toBeDefined();
        }
      });

      it("should correctly classify balance sheet vs income statement accounts", () => {
        const { transformed, rawData } = fixture;

        for (let i = 0; i < transformed.gold.accounts.length; i++) {
          const gold = transformed.gold.accounts[i];
          const raw = rawData.accounts[i];

          if (["Asset", "Liability", "Equity"].includes(raw.Classification)) {
            expect(gold.balance_sheet_section).not.toBeNull();
            expect(gold.income_statement_section).toBeNull();
          } else {
            expect(gold.balance_sheet_section).toBeNull();
            expect(gold.income_statement_section).not.toBeNull();
          }
        }
      });

      it("should set correct debit/credit normal balance", () => {
        const { transformed, rawData } = fixture;

        for (let i = 0; i < transformed.gold.accounts.length; i++) {
          const gold = transformed.gold.accounts[i];
          const raw = rawData.accounts[i];

          if (["Asset", "Expense"].includes(raw.Classification)) {
            expect(gold.is_debit_normal).toBe(true);
          } else {
            expect(gold.is_debit_normal).toBe(false);
          }
        }
      });

      it("should preserve account codes", () => {
        const { transformed, rawData } = fixture;

        for (let i = 0; i < transformed.gold.accounts.length; i++) {
          expect(transformed.gold.accounts[i].account_code).toBe(
            rawData.accounts[i].AcctNum,
          );
        }
      });
    });

    describe("Data Lineage", () => {
      it("should maintain complete lineage from Bronze to Gold", () => {
        const { transformed } = fixture;

        for (let i = 0; i < transformed.bronze.accounts.length; i++) {
          const bronze = transformed.bronze.accounts[i];
          const silver = transformed.silver.accounts[i];
          const gold = transformed.gold.accounts[i];

          // Silver references Bronze
          expect(silver.metadata.bronze_ingestion_id).toBe(
            bronze.metadata.ingestion_id,
          );

          // Gold key contains Silver ID
          expect(gold.account_key).toContain(silver.silver_account_id);

          // Source ID preserved through all layers
          expect(bronze.raw_data.Id).toBe(silver.source_account_id);
          expect(silver.source_account_id).toBe(gold.source_account_id);
        }
      });

      it("should have valid timestamps at each layer", () => {
        const { transformed } = fixture;

        for (const bronze of transformed.bronze.accounts) {
          expect(bronze.metadata.ingested_at).toBeInstanceOf(Date);
        }

        for (const silver of transformed.silver.accounts) {
          expect(silver.metadata.processed_at).toBeInstanceOf(Date);
        }
      });
    });

    describe("Account Count Validation", () => {
      it("should transform all accounts without loss", () => {
        const { rawData, transformed } = fixture;

        expect(transformed.bronze.accounts.length).toBe(
          rawData.accounts.length,
        );
        expect(transformed.silver.accounts.length).toBe(
          rawData.accounts.length,
        );
        expect(transformed.gold.accounts.length).toBe(rawData.accounts.length);
      });

      it("should have expected account type distribution", () => {
        const { transformed } = fixture;
        const profile = fixture.profile;

        const revenueCount = transformed.gold.accounts.filter(
          (a: any) => a.account_type === AccountType.REVENUE,
        ).length;
        const expenseCount = transformed.gold.accounts.filter(
          (a: any) => a.account_type === AccountType.EXPENSE,
        ).length;
        const assetCount = transformed.gold.accounts.filter(
          (a: any) => a.account_type === AccountType.ASSET,
        ).length;
        const liabilityCount = transformed.gold.accounts.filter(
          (a: any) => a.account_type === AccountType.LIABILITY,
        ).length;

        expect(revenueCount).toBe(
          profile.accountStructure.revenueAccounts.length,
        );
        expect(expenseCount).toBeGreaterThanOrEqual(
          profile.accountStructure.expenseAccounts.length,
        );
        expect(assetCount).toBe(profile.accountStructure.assetAccounts.length);
        expect(liabilityCount).toBe(
          profile.accountStructure.liabilityAccounts.length,
        );
      });
    });
  });

  describe("Cross-Industry Consistency", () => {
    it("should produce consistent Silver schema across all industries", () => {
      const fixtures = IndustryFixtureFactory.getPopularFixtures({
        seed: 12345,
      });

      for (const fixture of fixtures) {
        for (const silver of fixture.transformed.silver.accounts as Array<{
          silver_account_id: string;
          account_type: string;
          normal_balance: string;
          metadata: { source_system: string };
        }>) {
          // All should have required Silver fields
          expect(silver.silver_account_id).toBeDefined();
          expect(silver.account_type).toBeDefined();
          expect(silver.normal_balance).toMatch(/^(DEBIT|CREDIT)$/);
          expect(silver.metadata.source_system).toBe(
            SilverSourceSystem.QUICKBOOKS,
          );
        }
      }
    });

    it("should produce consistent Gold schema across all industries", () => {
      const fixtures = IndustryFixtureFactory.getPopularFixtures({
        seed: 12345,
      });

      for (const fixture of fixtures) {
        for (const gold of fixture.transformed.gold.accounts as Array<{
          account_key: string;
          account_id: string;
          account_type: string;
          is_debit_normal: boolean;
        }>) {
          // All should have required Gold fields
          expect(gold.account_key).toBeDefined();
          expect(gold.account_id).toBeDefined();
          expect(gold.account_type).toBeDefined();
          expect(typeof gold.is_debit_normal).toBe("boolean");
        }
      }
    });
  });
});
