/**
 * Multi-Provider ETL Pipeline Tests
 *
 * Parameterized tests that run across all supported providers:
 * - QuickBooks
 * - Xero
 * - Sage
 * - FreshBooks
 *
 * Tests cover the full pipeline: Bronze → Silver → Gold
 */

import { ETLPipelineService } from "../etl-pipeline.service";
import {
  ALL_PROVIDER_FIXTURES,
  ProviderFixture,
  createTestConfig,
} from "@__fixtures__/providers";
import { SilverAccountType } from "@domain/datalake/silver-schema";
import { AccountType } from "@domain/datalake/schemas";

describe("ETL Pipeline - Multi-Provider", () => {
  let etl: ETLPipelineService;

  beforeEach(() => {
    etl = new ETLPipelineService();
  });

  // ===========================================================================
  // PARAMETERIZED TESTS FOR ALL PROVIDERS
  // ===========================================================================

  describe.each(ALL_PROVIDER_FIXTURES)("$name Provider", ({ fixture }) => {
    const testConfig = createTestConfig(fixture.providerId);

    describe("Bronze Layer", () => {
      it("should ingest all accounts to Bronze layer", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        expect(bronzeAccounts).toHaveLength(
          fixture.expectedBronze.accountCount,
        );

        for (const bronze of bronzeAccounts) {
          expect(bronze.metadata.source_system).toBe(
            fixture.providerId.toUpperCase(),
          );
          expect(bronze.metadata.organization_id).toBe(
            testConfig.testOrganizationId,
          );
          expect(bronze.metadata.ingestion_status).toBe("success");
          expect(bronze.raw_data).toBeDefined();
        }
      });

      it("should preserve raw data exactly", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        for (let i = 0; i < fixture.rawData.accounts.length; i++) {
          expect(bronzeAccounts[i].raw_data).toEqual(
            fixture.rawData.accounts[i],
          );
        }
      });

      it("should generate unique ingestion IDs", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        const ids = bronzeAccounts.map((b) => b.metadata.ingestion_id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it("should generate payload hashes", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        for (const bronze of bronzeAccounts) {
          expect(bronze.metadata.payload_hash).toBeDefined();
          expect(bronze.metadata.payload_hash.length).toBeGreaterThan(0);
        }
      });
    });

    describe("Silver Layer", () => {
      it("should transform all accounts to Silver layer", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        expect(silverAccounts).toHaveLength(bronzeAccounts.length);

        for (const silver of silverAccounts) {
          expect(silver.silver_account_id).toBeDefined();
          expect(silver.account_type).toBeDefined();
          expect(silver.normal_balance).toMatch(/^(DEBIT|CREDIT)$/);
          expect(silver.metadata.is_valid).toBe(true);
        }
      });

      it("should distribute accounts by type correctly", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        const typeDistribution: Record<string, number> = {};
        for (const silver of silverAccounts) {
          typeDistribution[silver.account_type] =
            (typeDistribution[silver.account_type] || 0) + 1;
        }

        for (const [type, expectedCount] of Object.entries(
          fixture.expectedSilver.accountsByType,
        )) {
          expect(typeDistribution[type] || 0).toBe(expectedCount);
        }
      });

      it("should meet minimum quality score", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        const avgQualityScore =
          silverAccounts.reduce((sum, s) => sum + s.metadata.quality_score, 0) /
          silverAccounts.length;

        expect(avgQualityScore).toBeGreaterThanOrEqual(
          fixture.expectedSilver.qualityScoreMin,
        );
      });

      it("should maintain Bronze lineage", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        for (let i = 0; i < bronzeAccounts.length; i++) {
          expect(silverAccounts[i].metadata.bronze_ingestion_id).toBe(
            bronzeAccounts[i].metadata.ingestion_id,
          );
        }
      });

      it("should set correct normal balance based on account type", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        for (const silver of silverAccounts) {
          if (
            silver.account_type === SilverAccountType.ASSET ||
            silver.account_type === SilverAccountType.EXPENSE
          ) {
            expect(silver.normal_balance).toBe("DEBIT");
          } else {
            expect(silver.normal_balance).toBe("CREDIT");
          }
        }
      });
    });

    describe("Gold Layer", () => {
      it("should transform all accounts to Gold star schema", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );
        const goldAccounts = silverAccounts.map((s) =>
          etl.transformSilverAccountToGold(s, testConfig.testOrganizationKey),
        );

        expect(goldAccounts).toHaveLength(silverAccounts.length);

        for (const gold of goldAccounts) {
          expect(gold.account_key).toBeDefined();
          expect(gold.organization_key).toBe(testConfig.testOrganizationKey);
          expect(gold.account_type).toBeDefined();
        }
      });

      it("should correctly set debit/credit normal balance", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );
        const goldAccounts = silverAccounts.map((s) =>
          etl.transformSilverAccountToGold(s, testConfig.testOrganizationKey),
        );

        for (const gold of goldAccounts) {
          if (
            gold.account_type === AccountType.ASSET ||
            gold.account_type === AccountType.EXPENSE
          ) {
            expect(gold.is_debit_normal).toBe(true);
          } else {
            expect(gold.is_debit_normal).toBe(false);
          }
        }
      });

      it("should correctly classify balance sheet vs income statement", () => {
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );
        const goldAccounts = silverAccounts.map((s) =>
          etl.transformSilverAccountToGold(s, testConfig.testOrganizationKey),
        );

        for (const gold of goldAccounts) {
          if (
            [
              AccountType.ASSET,
              AccountType.LIABILITY,
              AccountType.EQUITY,
            ].includes(gold.account_type)
          ) {
            expect(gold.balance_sheet_section).not.toBeNull();
            expect(gold.income_statement_section).toBeNull();
          } else {
            expect(gold.balance_sheet_section).toBeNull();
            expect(gold.income_statement_section).not.toBeNull();
          }
        }
      });
    });

    describe("Full Pipeline Integration", () => {
      it("should process data from Raw to Gold with complete lineage", () => {
        // Raw → Bronze
        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        // Bronze → Silver
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        // Silver → Gold
        const goldAccounts = silverAccounts.map((s) =>
          etl.transformSilverAccountToGold(s, testConfig.testOrganizationKey),
        );

        // Verify lineage chain
        for (let i = 0; i < fixture.rawData.accounts.length; i++) {
          const raw = fixture.rawData.accounts[i];
          const bronze = bronzeAccounts[i];
          const silver = silverAccounts[i];
          const gold = goldAccounts[i];

          // Bronze preserves raw
          expect(bronze.raw_data).toEqual(raw);

          // Silver references Bronze
          expect(silver.metadata.bronze_ingestion_id).toBe(
            bronze.metadata.ingestion_id,
          );

          // Gold contains Silver ID in key
          expect(gold.account_key).toContain(
            silver.silver_account_id.replace("silver_", ""),
          );
        }
      });
    });
  });

  // ===========================================================================
  // CROSS-PROVIDER CONSISTENCY TESTS
  // ===========================================================================

  describe("Cross-Provider Consistency", () => {
    it("should produce consistent Silver schema across all providers", () => {
      const silverAccountsByProvider: Record<string, unknown[]> = {};

      for (const { name, fixture } of ALL_PROVIDER_FIXTURES) {
        const testConfig = createTestConfig(fixture.providerId);

        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );

        silverAccountsByProvider[name] = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );
      }

      // All Silver accounts should have the same schema shape
      for (const [_provider, accounts] of Object.entries(
        silverAccountsByProvider,
      )) {
        for (const account of accounts as Record<string, unknown>[]) {
          expect(account).toHaveProperty("silver_account_id");
          expect(account).toHaveProperty("account_type");
          expect(account).toHaveProperty("normal_balance");
          expect(account).toHaveProperty("metadata.source_system");
          expect(account).toHaveProperty("metadata.quality_score");
        }
      }
    });

    it("should produce consistent Gold schema across all providers", () => {
      const goldAccountsByProvider: Record<string, unknown[]> = {};

      for (const { name, fixture } of ALL_PROVIDER_FIXTURES) {
        const testConfig = createTestConfig(fixture.providerId);

        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );
        goldAccountsByProvider[name] = silverAccounts.map((s) =>
          etl.transformSilverAccountToGold(s, testConfig.testOrganizationKey),
        );
      }

      // All Gold accounts should have the same schema shape
      for (const [_provider, accounts] of Object.entries(
        goldAccountsByProvider,
      )) {
        for (const account of accounts as Record<string, unknown>[]) {
          expect(account).toHaveProperty("account_key");
          expect(account).toHaveProperty("organization_key");
          expect(account).toHaveProperty("account_type");
          expect(account).toHaveProperty("is_debit_normal");
          expect(account).toHaveProperty("balance_sheet_section");
          expect(account).toHaveProperty("income_statement_section");
        }
      }
    });

    it("should track correct source system through all layers", () => {
      for (const { fixture } of ALL_PROVIDER_FIXTURES) {
        const testConfig = createTestConfig(fixture.providerId);

        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        // Bronze should have uppercase provider ID
        for (const bronze of bronzeAccounts) {
          expect(bronze.metadata.source_system).toBe(
            fixture.providerId.toUpperCase(),
          );
        }

        // Silver should have the same source system
        for (const silver of silverAccounts) {
          expect(silver.metadata.source_system).toBe(
            fixture.providerId.toUpperCase(),
          );
        }
      }
    });
  });

  // ===========================================================================
  // DATA QUALITY TESTS
  // ===========================================================================

  describe("Data Quality Validation", () => {
    it("should validate all records pass minimum quality threshold", () => {
      for (const { fixture } of ALL_PROVIDER_FIXTURES) {
        const testConfig = createTestConfig(fixture.providerId);

        const bronzeAccounts = ingestAccountsToBronze(
          etl,
          fixture,
          testConfig.testOrganizationId,
          testConfig.testDatasourceId,
        );
        const silverAccounts = transformAccountsToSilver(
          etl,
          fixture.providerId,
          bronzeAccounts,
        );

        const validRecords = silverAccounts.filter((s) => s.metadata.is_valid);
        const validPct = (validRecords.length / silverAccounts.length) * 100;

        expect(validPct).toBeGreaterThanOrEqual(
          fixture.expectedSilver.validRecordsPct,
        );
      }
    });
  });
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

function ingestAccountsToBronze(
  etl: ETLPipelineService,
  fixture: ProviderFixture<unknown, unknown, unknown, unknown>,
  organizationId: string,
  datasourceId: string,
): {
  metadata: {
    ingestion_id: string;
    source_system: string;
    organization_id: string;
    ingestion_status: string;
    payload_hash: string;
  };
  raw_data: unknown;
}[] {
  switch (fixture.providerId) {
    case "quickbooks":
      return (
        fixture.rawData.accounts as Parameters<
          typeof etl.ingestQuickBooksAccountToBronze
        >[0][]
      ).map((acc) =>
        etl.ingestQuickBooksAccountToBronze(acc, organizationId, datasourceId),
      );
    case "xero":
      return (
        fixture.rawData.accounts as Parameters<
          typeof etl.ingestXeroAccountToBronze
        >[0][]
      ).map((acc) =>
        etl.ingestXeroAccountToBronze(acc, organizationId, datasourceId),
      );
    case "sage":
      return (
        fixture.rawData.accounts as Parameters<
          typeof etl.ingestSageAccountToBronze
        >[0][]
      ).map((acc) =>
        etl.ingestSageAccountToBronze(acc, organizationId, datasourceId),
      );
    case "freshbooks":
      return (
        fixture.rawData.accounts as Parameters<
          typeof etl.ingestFreshBooksAccountToBronze
        >[0][]
      ).map((acc) =>
        etl.ingestFreshBooksAccountToBronze(acc, organizationId, datasourceId),
      );
    default:
      throw new Error(`Unknown provider: ${fixture.providerId}`);
  }
}

function transformAccountsToSilver(
  etl: ETLPipelineService,
  providerId: string,
  bronzeAccounts: unknown[],
) {
  switch (providerId) {
    case "quickbooks":
      return bronzeAccounts.map((b) =>
        etl.transformQuickBooksAccountToSilver(
          b as Parameters<typeof etl.transformQuickBooksAccountToSilver>[0],
        ),
      );
    case "xero":
      return bronzeAccounts.map((b) =>
        etl.transformXeroAccountToSilver(
          b as Parameters<typeof etl.transformXeroAccountToSilver>[0],
        ),
      );
    case "sage":
      return bronzeAccounts.map((b) =>
        etl.transformSageAccountToSilver(
          b as Parameters<typeof etl.transformSageAccountToSilver>[0],
        ),
      );
    case "freshbooks":
      return bronzeAccounts.map((b) =>
        etl.transformFreshBooksAccountToSilver(
          b as Parameters<typeof etl.transformFreshBooksAccountToSilver>[0],
        ),
      );
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}
