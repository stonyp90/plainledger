/**
 * Industry Fixture Factory
 *
 * Clean Architecture: Infrastructure layer - central factory for generating industry-specific test fixtures.
 * Uses caching for performance in test suites and provides a single entry point for all test data generation.
 */

import {
  INDUSTRY_PROFILES,
  getIndustryProfile,
  getAllIndustryProfiles,
  getPopularIndustryProfiles,
} from "../domain/industry-profiles";
import { QuickBooksDataGenerator } from "./quickbooks-data-generator";
import { ETLPipelineService } from "@application/services/etl-pipeline.service";
import {
  GeneratedFixture,
  QuickBooksDataset,
  FixtureOptions,
  TransformedData,
} from "../domain/industry-financial-profile";

// =============================================================================
// Fixture Factory
// =============================================================================

export class IndustryFixtureFactory {
  private static cache = new Map<string, GeneratedFixture>();

  /**
   * Get or generate fixture for an industry
   * Uses caching for performance in test suites
   */
  static getFixture(
    industryId: string,
    options?: FixtureOptions,
  ): GeneratedFixture {
    const cacheKey = `${industryId}_${JSON.stringify(options || {})}`;

    if (!options?.skipCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const profile = getIndustryProfile(industryId);
    if (!profile) {
      throw new Error(
        `Unknown industry: ${industryId}. Available: ${Object.keys(INDUSTRY_PROFILES).join(", ")}`,
      );
    }

    const generator = new QuickBooksDataGenerator(profile, options?.seed);
    const rawData = generator.generateFullDataset(options);

    // Transform through ETL pipeline to get expected outputs
    const etl = new ETLPipelineService();
    const transformed = this.transformThroughPipeline(rawData, etl, industryId);

    const fixture: GeneratedFixture = {
      industryId,
      profile,
      rawData,
      transformed,
      expectedKPIs: profile.expectedKPIs,
    };

    this.cache.set(cacheKey, fixture);
    return fixture;
  }

  /**
   * Get fixtures for all industries (for parameterized tests)
   */
  static getAllFixtures(options?: FixtureOptions): GeneratedFixture[] {
    return getAllIndustryProfiles().map((profile) =>
      this.getFixture(profile.industryId, options),
    );
  }

  /**
   * Get fixtures for popular industries only (for quick test runs)
   */
  static getPopularFixtures(options?: FixtureOptions): GeneratedFixture[] {
    return getPopularIndustryProfiles().map((profile) =>
      this.getFixture(profile.industryId, options),
    );
  }

  /**
   * Clear the fixture cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Transform raw data through ETL pipeline
   */
  private static transformThroughPipeline(
    rawData: QuickBooksDataset,
    etl: ETLPipelineService,
    industryId: string,
  ): TransformedData {
    const orgId = `org_${industryId}_test`;
    const dsId = `ds_${industryId}_test`;
    const orgKey = `gold_org_${industryId}_test`;

    // Transform accounts through Bronze -> Silver -> Gold
    const bronzeAccounts = rawData.accounts.map((acc) =>
      etl.ingestQuickBooksAccountToBronze(acc, orgId, dsId),
    );
    const silverAccounts = bronzeAccounts.map((b) =>
      etl.transformQuickBooksAccountToSilver(b),
    );
    const goldAccounts = silverAccounts.map((s) =>
      etl.transformSilverAccountToGold(s, orgKey),
    );

    // Transform customers/contacts
    const bronzeCustomers = rawData.customers.map((cust) =>
      etl.ingestQuickBooksCustomerToBronze(cust, orgId, dsId),
    );
    const silverContacts = bronzeCustomers.map((b) =>
      etl.transformQuickBooksCustomerToSilver(b),
    );
    const goldContacts = silverContacts.map((s) =>
      etl.transformSilverContactToGold(s, orgKey),
    );

    // Transform invoices to transactions
    const bronzeInvoices = rawData.invoices.map((inv) =>
      etl.ingestQuickBooksInvoiceToBronze(inv, orgId, dsId),
    );
    const silverTransactions: any[] = [];
    const accountKeyMap = new Map(
      goldAccounts.map((g) => [g.source_account_id, g.account_key]),
    );
    const contactKeyMap = new Map(
      goldContacts.map((g) => [g.source_contact_id, g.contact_key]),
    );

    for (const bronzeInv of bronzeInvoices) {
      const silverTxn = etl.transformQuickBooksInvoiceToSilver(bronzeInv);
      silverTransactions.push(...silverTxn);
    }

    const goldTransactions = etl.transformSilverTransactionsToGold(
      silverTransactions,
      orgKey,
      accountKeyMap,
      contactKeyMap,
    );

    return {
      bronze: {
        accounts: bronzeAccounts,
        customers: bronzeCustomers,
      },
      silver: {
        accounts: silverAccounts,
        contacts: silverContacts,
        transactions: silverTransactions,
      },
      gold: {
        accounts: goldAccounts,
        contacts: goldContacts,
        transactions: goldTransactions,
      },
    };
  }
}

// Export for convenience
export {
  INDUSTRY_PROFILES,
  getIndustryProfile,
  getAllIndustryProfiles,
  getPopularIndustryProfiles,
};
