/**
 * QuickBooks Integration Tests
 *
 * Tests the full QuickBooks integration including:
 * - OAuth flow
 * - API calls to sandbox
 * - ETL pipeline transformation
 *
 * To run these tests:
 * 1. Set environment variables for QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET
 * 2. For API tests, you need a valid access token (from OAuth flow)
 * 3. Run: npm test -- --testPathPattern=quickbooks-integration
 */

import { QuickBooksService } from "../quickbooks.service";
import { ETLPipelineService } from "@application/services/etl-pipeline.service";
import {
  SilverAccountType,
  SilverContactType,
  SilverTransactionType,
  SilverSourceSystem,
} from "@domain/datalake/silver-schema";
import { AccountType } from "@domain/datalake/schemas";
import { ConfigService } from "@nestjs/config";

// Test configuration - these would come from environment variables
const TEST_CONFIG = {
  // QuickBooks Sandbox credentials
  // NOTE: In a real scenario, these should come from environment variables
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  redirectUri:
    process.env.QUICKBOOKS_REDIRECT_URI ||
    "http://localhost:3000/api/v1/datasources/oauth/quickbooks/callback",

  // For API tests, we need a valid access token
  // This can be obtained by completing the OAuth flow
  accessToken: process.env.QUICKBOOKS_ACCESS_TOKEN || "",
  realmId: process.env.QUICKBOOKS_REALM_ID || "", // Company ID from sandbox
};

// Mock ConfigService for testing
const createMockConfigService = (
  config: Record<string, string>,
): ConfigService => {
  return {
    get: (key: string) => config[key],
  } as unknown as ConfigService;
};

describe("QuickBooks Integration", () => {
  describe("OAuth Flow", () => {
    let quickbooksService: QuickBooksService;

    beforeEach(() => {
      const configService = createMockConfigService({
        QUICKBOOKS_CLIENT_ID: TEST_CONFIG.clientId,
        QUICKBOOKS_CLIENT_SECRET: TEST_CONFIG.clientSecret,
        QUICKBOOKS_REDIRECT_URI: TEST_CONFIG.redirectUri,
      });
      quickbooksService = new QuickBooksService(configService);
    });

    it("should generate valid authorization URL", () => {
      const state = "test-state-12345";
      const authUrl = quickbooksService.getAuthorizationUrl(state);

      expect(authUrl).toContain("https://appcenter.intuit.com/connect/oauth2");
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain("response_type=code");
      expect(authUrl).toContain("com.intuit.quickbooks.accounting");

      // Log the URL for manual testing
      console.log("\n=== QuickBooks OAuth URL ===");
      console.log("Visit this URL to authorize:");
      console.log(authUrl);
      console.log("============================\n");
    });

    it("should have correct OAuth scopes", () => {
      const state = "test-state";
      const authUrl = quickbooksService.getAuthorizationUrl(state);

      // Check for required scopes
      expect(authUrl).toContain("com.intuit.quickbooks.accounting");
      expect(authUrl).toContain("openid");
      expect(authUrl).toContain("profile");
      expect(authUrl).toContain("email");
    });

    it("should include redirect URI in auth URL", () => {
      const state = "test-state";
      const authUrl = quickbooksService.getAuthorizationUrl(state);

      expect(authUrl).toContain(
        `redirect_uri=${encodeURIComponent(TEST_CONFIG.redirectUri)}`,
      );
    });
  });

  describe("API Integration (Sandbox)", () => {
    let quickbooksService: QuickBooksService;

    beforeEach(() => {
      const configService = createMockConfigService({
        QUICKBOOKS_CLIENT_ID: TEST_CONFIG.clientId,
        QUICKBOOKS_CLIENT_SECRET: TEST_CONFIG.clientSecret,
        QUICKBOOKS_REDIRECT_URI: TEST_CONFIG.redirectUri,
      });
      quickbooksService = new QuickBooksService(configService);
    });

    // Skip API tests if no access token is available
    const skipIfNoToken = () => {
      if (!TEST_CONFIG.accessToken || !TEST_CONFIG.realmId) {
        console.log(
          "Skipping API test - no access token. Complete OAuth flow first.",
        );
        return true;
      }
      return false;
    };

    it("should fetch company info from sandbox", async () => {
      if (skipIfNoToken()) return;

      const companyInfo = await quickbooksService.getCompanyInfo(
        TEST_CONFIG.accessToken,
        TEST_CONFIG.realmId,
        true, // Use sandbox
      );

      expect(companyInfo).toBeDefined();
      expect(companyInfo.companyName).toBeDefined();
      console.log("Company Info:", companyInfo);
    });

    it("should fetch accounts (Chart of Accounts) from sandbox", async () => {
      if (skipIfNoToken()) return;

      const accounts = await quickbooksService.getAccounts(
        TEST_CONFIG.accessToken,
        TEST_CONFIG.realmId,
        true,
      );

      expect(Array.isArray(accounts)).toBe(true);
      console.log(`Fetched ${accounts.length} accounts`);

      if (accounts.length > 0) {
        const sampleAccount = accounts[0];
        expect(sampleAccount.Id).toBeDefined();
        expect(sampleAccount.Name).toBeDefined();
        expect(sampleAccount.AccountType).toBeDefined();
        console.log("Sample account:", {
          id: sampleAccount.Id,
          name: sampleAccount.Name,
          type: sampleAccount.AccountType,
          classification: sampleAccount.Classification,
        });
      }
    });

    it("should fetch customers from sandbox", async () => {
      if (skipIfNoToken()) return;

      const customers = await quickbooksService.getCustomers(
        TEST_CONFIG.accessToken,
        TEST_CONFIG.realmId,
        true,
      );

      expect(Array.isArray(customers)).toBe(true);
      console.log(`Fetched ${customers.length} customers`);
    });

    it("should fetch vendors from sandbox", async () => {
      if (skipIfNoToken()) return;

      const vendors = await quickbooksService.getVendors(
        TEST_CONFIG.accessToken,
        TEST_CONFIG.realmId,
        true,
      );

      expect(Array.isArray(vendors)).toBe(true);
      console.log(`Fetched ${vendors.length} vendors`);
    });

    it("should fetch invoices from sandbox", async () => {
      if (skipIfNoToken()) return;

      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const invoices = await quickbooksService.getInvoices(
        TEST_CONFIG.accessToken,
        TEST_CONFIG.realmId,
        startDate,
        endDate,
        true,
      );

      expect(Array.isArray(invoices)).toBe(true);
      console.log(`Fetched ${invoices.length} invoices`);
    });

    it("should perform full sync from sandbox", async () => {
      if (skipIfNoToken()) return;

      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const syncData = await quickbooksService.getFullSync(
        TEST_CONFIG.accessToken,
        TEST_CONFIG.realmId,
        startDate,
        endDate,
        true,
      );

      expect(syncData).toBeDefined();
      expect(syncData.companyInfo).toBeDefined();
      expect(Array.isArray(syncData.accounts)).toBe(true);
      expect(Array.isArray(syncData.customers)).toBe(true);
      expect(Array.isArray(syncData.vendors)).toBe(true);
      expect(Array.isArray(syncData.invoices)).toBe(true);
      expect(Array.isArray(syncData.journalEntries)).toBe(true);

      console.log("\n=== Full Sync Results ===");
      console.log("Company:", syncData.companyInfo.companyName);
      console.log("Accounts:", syncData.accounts.length);
      console.log("Customers:", syncData.customers.length);
      console.log("Vendors:", syncData.vendors.length);
      console.log("Invoices:", syncData.invoices.length);
      console.log("Journal Entries:", syncData.journalEntries.length);
      console.log("=========================\n");
    });
  });

  describe("ETL Pipeline Integration", () => {
    let etlService: ETLPipelineService;
    const TEST_ORG_ID = "org_test_quickbooks";
    const TEST_DATASOURCE_ID = "ds_qb_sandbox";
    const TEST_ORG_KEY = "gold_org_quickbooks";

    beforeEach(() => {
      etlService = new ETLPipelineService();
    });

    describe("Full ETL Pipeline: QuickBooks → Bronze → Silver → Gold", () => {
      it("should transform QuickBooks account through all layers", () => {
        // Simulated raw data from QuickBooks API
        const rawAccount = {
          Id: "1",
          Name: "Business Checking",
          AccountType: "Bank",
          AccountSubType: "Checking",
          AcctNum: "1000",
          Active: true,
          CurrentBalance: 50000.0,
          Classification: "Asset" as const,
          FullyQualifiedName: "Business Checking",
          CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
          MetaData: {
            CreateTime: "2024-01-01T00:00:00Z",
            LastUpdatedTime: "2024-03-20T10:00:00Z",
          },
        };

        // Stage 1: Raw → Bronze
        const bronze = etlService.ingestQuickBooksAccountToBronze(
          rawAccount,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );

        expect(bronze.metadata.source_system).toBe("QUICKBOOKS");
        expect(bronze.metadata.organization_id).toBe(TEST_ORG_ID);
        expect(bronze.raw_data).toEqual(rawAccount);

        // Stage 2: Bronze → Silver
        const silver = etlService.transformQuickBooksAccountToSilver(bronze);

        expect(silver.metadata.source_system).toBe(
          SilverSourceSystem.QUICKBOOKS,
        );
        expect(silver.account_type).toBe(SilverAccountType.ASSET);
        expect(silver.account_code).toBe("1000");
        expect(silver.account_name).toBe("Business Checking");
        expect(silver.normal_balance).toBe("DEBIT");
        expect(silver.metadata.quality_score).toBeGreaterThanOrEqual(70);

        // Stage 3: Silver → Gold
        const gold = etlService.transformSilverAccountToGold(
          silver,
          TEST_ORG_KEY,
        );

        expect(gold.account_type).toBe(AccountType.ASSET);
        expect(gold.organization_key).toBe(TEST_ORG_KEY);
        expect(gold.is_debit_normal).toBe(true);
        expect(gold.balance_sheet_section).toBe(AccountType.ASSET);
      });

      it("should transform QuickBooks customer through all layers", () => {
        const rawCustomer = {
          Id: "10",
          DisplayName: "Maple Leaf Corp",
          CompanyName: "Maple Leaf Corporation Ltd.",
          GivenName: "Marie",
          FamilyName: "Tremblay",
          PrimaryEmailAddr: { Address: "marie@mapleleaf.ca" },
          PrimaryPhone: { FreeFormNumber: "(514) 555-0100" },
          BillAddr: {
            Line1: "456 Rue Principale",
            City: "Montreal",
            CountrySubDivisionCode: "QC",
            PostalCode: "H2Y 1C6",
            Country: "Canada",
          },
          Active: true,
          Balance: 12500.0,
          MetaData: {
            CreateTime: "2024-01-15T09:00:00Z",
            LastUpdatedTime: "2024-03-01T14:30:00Z",
          },
        };

        // Stage 1: Raw → Bronze
        const bronze = etlService.ingestQuickBooksCustomerToBronze(
          rawCustomer,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );

        expect(bronze.raw_data.DisplayName).toBe("Maple Leaf Corp");

        // Stage 2: Bronze → Silver
        const silver = etlService.transformQuickBooksCustomerToSilver(bronze);

        expect(silver.contact_type).toBe(SilverContactType.CUSTOMER);
        expect(silver.display_name).toBe("Maple Leaf Corp");
        expect(silver.email).toBe("marie@mapleleaf.ca");
        expect(silver.email_is_valid).toBe(true);
        expect(silver.phone_normalized).toBe("5145550100");
        expect(silver.address_city).toBe("Montreal");
        expect(silver.address_country_code).toBe("CA");

        // Stage 3: Silver → Gold
        const gold = etlService.transformSilverContactToGold(
          silver,
          TEST_ORG_KEY,
        );

        expect(gold.is_customer).toBe(true);
        expect(gold.is_vendor).toBe(false);
        expect(gold.address_province_state).toBe("QC");
      });

      it("should transform QuickBooks invoice through all layers", () => {
        const rawInvoice = {
          Id: "100",
          DocNumber: "INV-2024-0001",
          TxnDate: "2024-03-15",
          DueDate: "2024-04-15",
          CustomerRef: { value: "10", name: "Maple Leaf Corp" },
          Line: [
            {
              Id: "1",
              LineNum: 1,
              Amount: 10000.0,
              DetailType: "SalesItemLineDetail",
              Description: "Consulting Services - Q1 2024",
              SalesItemLineDetail: {
                ItemRef: { value: "5", name: "Consulting" },
                Qty: 100,
                UnitPrice: 100.0,
              },
            },
            {
              Id: "2",
              LineNum: 2,
              Amount: 1300.0,
              DetailType: "SalesItemLineDetail",
              Description: "HST",
            },
          ],
          TotalAmt: 11300.0,
          Balance: 11300.0,
          CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
          ExchangeRate: 1.0,
          MetaData: {
            CreateTime: "2024-03-15T10:00:00Z",
            LastUpdatedTime: "2024-03-15T10:00:00Z",
          },
        };

        // Stage 1: Raw → Bronze
        const bronze = etlService.ingestQuickBooksInvoiceToBronze(
          rawInvoice,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );

        expect(bronze.raw_data.TotalAmt).toBe(11300.0);

        // Stage 2: Bronze → Silver
        const silverTxns =
          etlService.transformQuickBooksInvoiceToSilver(bronze);

        // Invoice creates A/R entry + line items
        expect(silverTxns.length).toBeGreaterThanOrEqual(2);

        // Check A/R entry
        const arEntry = silverTxns.find((t) =>
          t.silver_transaction_id.includes("_ar"),
        );
        expect(arEntry).toBeDefined();
        expect(arEntry!.debit_amount).toBe(11300.0);
        expect(arEntry!.transaction_type).toBe(SilverTransactionType.INVOICE);

        // Stage 3: Silver → Gold
        const accountKeyMap = new Map([
          ["accounts_receivable", "gold_acc_ar"],
          ["5", "gold_acc_revenue"],
        ]);
        const contactKeyMap = new Map([["10", "gold_contact_maple"]]);

        const goldTxns = etlService.transformSilverTransactionsToGold(
          silverTxns,
          TEST_ORG_KEY,
          accountKeyMap,
          contactKeyMap,
        );

        expect(goldTxns.length).toBe(silverTxns.length);

        // Verify double-entry balance
        const totalDebits = goldTxns.reduce(
          (sum, t) => sum + t.debit_amount,
          0,
        );
        const totalCredits = goldTxns.reduce(
          (sum, t) => sum + t.credit_amount,
          0,
        );
        expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.01);
      });

      it("should transform QuickBooks journal entry through all layers", () => {
        const rawJournalEntry = {
          Id: "500",
          DocNumber: "JE-2024-001",
          TxnDate: "2024-03-31",
          Line: [
            {
              Id: "1",
              Amount: 5000.0,
              DetailType: "JournalEntryLineDetail" as const,
              Description: "Rent expense accrual",
              JournalEntryLineDetail: {
                PostingType: "Debit" as const,
                AccountRef: { value: "6000", name: "Rent Expense" },
              },
            },
            {
              Id: "2",
              Amount: 5000.0,
              DetailType: "JournalEntryLineDetail" as const,
              Description: "Rent expense accrual",
              JournalEntryLineDetail: {
                PostingType: "Credit" as const,
                AccountRef: { value: "2100", name: "Accrued Expenses" },
              },
            },
          ],
          PrivateNote: "Month-end accrual",
          CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
          MetaData: {
            CreateTime: "2024-03-31T23:00:00Z",
            LastUpdatedTime: "2024-03-31T23:00:00Z",
          },
        };

        // Stage 1: Raw → Bronze
        const bronze = etlService.ingestQuickBooksJournalEntryToBronze(
          rawJournalEntry,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );

        // Stage 2: Bronze → Silver
        const silverTxns =
          etlService.transformQuickBooksJournalEntryToSilver(bronze);

        expect(silverTxns).toHaveLength(2);

        // Verify balanced journal entry has no quality issues
        expect(silverTxns[0].metadata.quality_issues).toHaveLength(0);
        expect(silverTxns[0].metadata.quality_score).toBe(100);

        // Stage 3: Silver → Gold
        const accountKeyMap = new Map([
          ["6000", "gold_acc_rent"],
          ["2100", "gold_acc_accrued"],
        ]);

        const goldTxns = etlService.transformSilverTransactionsToGold(
          silverTxns,
          TEST_ORG_KEY,
          accountKeyMap,
          new Map(),
        );

        // Verify double-entry
        const debitTotal = goldTxns.reduce((sum, t) => sum + t.debit_amount, 0);
        const creditTotal = goldTxns.reduce(
          (sum, t) => sum + t.credit_amount,
          0,
        );
        expect(debitTotal).toBe(creditTotal);
        expect(debitTotal).toBe(5000.0);
      });
    });

    describe("Data Quality Validation", () => {
      it("should flag missing account code", () => {
        const rawAccount = {
          Id: "99",
          Name: "Test Account",
          AccountType: "Expense",
          AccountSubType: "Other",
          // AcctNum is missing
          Active: true,
          CurrentBalance: 0,
          Classification: "Expense" as const,
          FullyQualifiedName: "Test Account",
          CurrencyRef: { value: "CAD", name: "CAD" },
          MetaData: {
            CreateTime: "2024-01-01T00:00:00Z",
            LastUpdatedTime: "2024-01-01T00:00:00Z",
          },
        };

        const bronze = etlService.ingestQuickBooksAccountToBronze(
          rawAccount,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );
        const silver = etlService.transformQuickBooksAccountToSilver(bronze);

        expect(silver.metadata.quality_issues).toContain(
          "ACC_001: Account code is missing",
        );
        expect(silver.metadata.quality_score).toBeLessThan(100);
      });

      it("should flag invalid email format", () => {
        const rawCustomer = {
          Id: "50",
          DisplayName: "Bad Email Test",
          PrimaryEmailAddr: { Address: "not-valid-email" },
          Active: true,
          Balance: 0,
          MetaData: {
            CreateTime: "2024-01-01T00:00:00Z",
            LastUpdatedTime: "2024-01-01T00:00:00Z",
          },
        };

        const bronze = etlService.ingestQuickBooksCustomerToBronze(
          rawCustomer,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );
        const silver = etlService.transformQuickBooksCustomerToSilver(bronze);

        expect(silver.email_is_valid).toBe(false);
        expect(silver.metadata.quality_issues).toContain(
          "CON_001: Invalid email format",
        );
      });

      it("should flag unbalanced journal entry", () => {
        const rawJournalEntry = {
          Id: "999",
          TxnDate: "2024-03-31",
          Line: [
            {
              Id: "1",
              Amount: 1000.0,
              DetailType: "JournalEntryLineDetail" as const,
              JournalEntryLineDetail: {
                PostingType: "Debit" as const,
                AccountRef: { value: "6000", name: "Expense" },
              },
            },
            {
              Id: "2",
              Amount: 500.0, // Doesn't balance!
              DetailType: "JournalEntryLineDetail" as const,
              JournalEntryLineDetail: {
                PostingType: "Credit" as const,
                AccountRef: { value: "2100", name: "Liability" },
              },
            },
          ],
          CurrencyRef: { value: "CAD", name: "CAD" },
          MetaData: {
            CreateTime: "2024-01-01T00:00:00Z",
            LastUpdatedTime: "2024-01-01T00:00:00Z",
          },
        };

        const bronze = etlService.ingestQuickBooksJournalEntryToBronze(
          rawJournalEntry,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );
        const silverTxns =
          etlService.transformQuickBooksJournalEntryToSilver(bronze);

        expect(silverTxns[0].metadata.quality_issues).toContain(
          "TXN_001: Journal entry does not balance",
        );
        expect(silverTxns[0].metadata.quality_score).toBeLessThan(100);
      });
    });

    describe("Data Lineage", () => {
      it("should maintain lineage through all transformation stages", () => {
        const rawAccount = {
          Id: "42",
          Name: "Lineage Test Account",
          AccountType: "Asset",
          AccountSubType: "Bank",
          AcctNum: "1200",
          Active: true,
          CurrentBalance: 10000,
          Classification: "Asset" as const,
          FullyQualifiedName: "Lineage Test Account",
          CurrencyRef: { value: "CAD", name: "CAD" },
          MetaData: {
            CreateTime: "2024-01-01T00:00:00Z",
            LastUpdatedTime: "2024-01-01T00:00:00Z",
          },
        };

        const bronze = etlService.ingestQuickBooksAccountToBronze(
          rawAccount,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );
        const silver = etlService.transformQuickBooksAccountToSilver(bronze);
        const gold = etlService.transformSilverAccountToGold(
          silver,
          TEST_ORG_KEY,
        );

        // Verify lineage chain
        expect(bronze.metadata.ingestion_id).toBeDefined();
        expect(silver.metadata.bronze_ingestion_id).toBe(
          bronze.metadata.ingestion_id,
        );
        expect(gold.source_account_id).toBe(rawAccount.Id);

        // Verify timestamps
        expect(bronze.metadata.ingested_at).toBeInstanceOf(Date);
        expect(silver.metadata.processed_at).toBeInstanceOf(Date);
      });
    });
  });
});

/**
 * Manual Integration Test Helper
 *
 * Use this to manually test the OAuth flow and API calls:
 *
 * 1. Run this test to get the OAuth URL:
 *    npm test -- --testPathPattern=quickbooks-integration --testNamePattern="generate valid authorization URL"
 *
 * 2. Open the URL in a browser and authorize with your QuickBooks sandbox
 *
 * 3. Copy the authorization code from the callback URL
 *
 * 4. Exchange the code for tokens (you'd need to call the exchange endpoint)
 *
 * 5. Set QUICKBOOKS_ACCESS_TOKEN and QUICKBOOKS_REALM_ID environment variables
 *
 * 6. Run the API tests:
 *    npm test -- --testPathPattern=quickbooks-integration --testNamePattern="API Integration"
 */
