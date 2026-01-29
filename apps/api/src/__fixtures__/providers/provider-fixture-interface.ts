/**
 * Provider-agnostic fixture interface
 * All providers implement this to enable parameterized testing
 */

export type ProviderId = "quickbooks" | "xero" | "sage" | "freshbooks";

export interface ProviderFixture<
  TAccount = unknown,
  TContact = unknown,
  TInvoice = unknown,
  TJournal = unknown,
> {
  providerId: ProviderId;
  providerName: string;

  // Raw provider data (as returned by their APIs)
  rawData: {
    accounts: TAccount[];
    contacts: TContact[];
    invoices: TInvoice[];
    journalEntries: TJournal[];
  };

  // Expected outputs after transformation
  expectedBronze: {
    accountCount: number;
    contactCount: number;
    transactionCount: number;
  };

  expectedSilver: {
    accountsByType: Record<string, number>;
    qualityScoreMin: number;
    validRecordsPct: number;
  };

  expectedGold: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  };

  expectedKPIs?: Record<string, { min: number; max: number }>;
}

export interface ProviderTestConfig {
  providerId: ProviderId;
  testOrganizationId: string;
  testDatasourceId: string;
  testOrganizationKey: string;
}

export function createTestConfig(providerId: ProviderId): ProviderTestConfig {
  return {
    providerId,
    testOrganizationId: `org_${providerId}_test`,
    testDatasourceId: `ds_${providerId}_test`,
    testOrganizationKey: `gold_org_${providerId}`,
  };
}
