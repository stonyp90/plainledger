/**
 * Datalake Integration Tests
 *
 * Tests the full ETL pipeline: Bronze → Silver → Gold
 * Uses LocalStack for S3 simulation
 */

import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { ETLPipelineService } from "@application/services/etl-pipeline.service";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksInvoice,
} from "@domain/datalake/provider-types";
import {
  SilverAccountType,
  SilverContactType,
  SilverTransactionType,
} from "@domain/datalake/silver-schema";
import {
  AccountType,
  ContactType,
  SourceSystem,
} from "@domain/datalake/schemas";

// Test configuration
const LOCALSTACK_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:4566";
const TEST_BUCKET = "plainledger-test";
const AWS_REGION = "us-east-1";

// Skip integration tests if not running with LocalStack
const isLocalStackAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${LOCALSTACK_ENDPOINT}/_localstack/health`);
    return response.ok;
  } catch {
    return false;
  }
};

describe("Datalake Integration Tests", () => {
  let s3Client: S3Client;
  let etlService: ETLPipelineService;
  let localStackAvailable: boolean;

  beforeAll(async () => {
    localStackAvailable = await isLocalStackAvailable();

    if (!localStackAvailable) {
      console.log("⚠️  LocalStack not available - skipping integration tests");
      console.log("   Run: docker-compose up localstack");
      return;
    }

    s3Client = new S3Client({
      endpoint: LOCALSTACK_ENDPOINT,
      region: AWS_REGION,
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
      forcePathStyle: true,
    });

    etlService = new ETLPipelineService();

    // Create test bucket
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: TEST_BUCKET }));
    } catch {
      await s3Client.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
    }
  });

  const skipIfNoLocalStack = () => {
    if (!localStackAvailable) {
      console.log("Skipping - LocalStack not available");
      return true;
    }
    return false;
  };

  // ===========================================================================
  // Sample Data Fixtures
  // ===========================================================================

  const sampleQuickBooksAccount: QuickBooksAccount = {
    Id: "1",
    Name: "Accounts Receivable",
    AcctNum: "1200",
    AccountType: "Accounts Receivable",
    AccountSubType: "AccountsReceivable",
    Classification: "Asset",
    Active: true,
    CurrentBalance: 25000.0,
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
    FullyQualifiedName: "Accounts Receivable",
    MetaData: {
      CreateTime: "2024-01-15T10:30:00-05:00",
      LastUpdatedTime: "2024-01-20T14:45:00-05:00",
    },
  };

  const sampleQuickBooksCustomer: QuickBooksCustomer = {
    Id: "101",
    DisplayName: "Acme Corporation",
    CompanyName: "Acme Corporation Ltd.",
    GivenName: "John",
    FamilyName: "Smith",
    Active: true,
    Balance: 5000.0,
    PrimaryEmailAddr: { Address: "john@acme.example.com" },
    PrimaryPhone: { FreeFormNumber: "(416) 555-1234" },
    BillAddr: {
      Line1: "123 Main Street",
      City: "Toronto",
      CountrySubDivisionCode: "ON",
      PostalCode: "M5V 1A1",
      Country: "Canada",
    },
    MetaData: {
      CreateTime: "2024-01-10T09:00:00-05:00",
      LastUpdatedTime: "2024-01-18T11:30:00-05:00",
    },
  };

  const sampleQuickBooksInvoice: QuickBooksInvoice = {
    Id: "1001",
    DocNumber: "INV-001",
    TxnDate: "2024-01-25",
    DueDate: "2024-02-25",
    TotalAmt: 1500.0,
    Balance: 1500.0,
    CustomerRef: { value: "101", name: "Acme Corporation" },
    CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
    ExchangeRate: 1.0,
    Line: [
      {
        Id: "1",
        LineNum: 1,
        Amount: 1000.0,
        Description: "Consulting Services",
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "services", name: "Services" },
          Qty: 10,
          UnitPrice: 100.0,
        },
      },
      {
        Id: "2",
        LineNum: 2,
        Amount: 500.0,
        Description: "Software License",
        DetailType: "SalesItemLineDetail",
        SalesItemLineDetail: {
          ItemRef: { value: "license", name: "License" },
          Qty: 1,
          UnitPrice: 500.0,
        },
      },
    ],
    PrivateNote: "Thank you for your business",
    MetaData: {
      CreateTime: "2024-01-25T10:00:00-05:00",
      LastUpdatedTime: "2024-01-25T10:00:00-05:00",
    },
  };

  // ===========================================================================
  // Bronze Layer Tests
  // ===========================================================================

  describe("Bronze Layer - Raw Data Ingestion", () => {
    it("should ingest QuickBooks account to Bronze format", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksAccountToBronze(
        sampleQuickBooksAccount,
        "org-123",
        "ds-456",
      );

      expect(bronze.metadata.source_system).toBe("QUICKBOOKS");
      expect(bronze.metadata.organization_id).toBe("org-123");
      expect(bronze.metadata.datasource_id).toBe("ds-456");
      expect(bronze.metadata.ingestion_status).toBe("success");
      expect(bronze.raw_data).toEqual(sampleQuickBooksAccount);
    });

    it("should ingest QuickBooks customer to Bronze format", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksCustomerToBronze(
        sampleQuickBooksCustomer,
        "org-123",
        "ds-456",
      );

      expect(bronze.metadata.source_system).toBe("QUICKBOOKS");
      expect(bronze.raw_data.DisplayName).toBe("Acme Corporation");
      expect(bronze.raw_data.PrimaryEmailAddr?.Address).toBe(
        "john@acme.example.com",
      );
    });

    it("should write Bronze data to S3", async () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksAccountToBronze(
        sampleQuickBooksAccount,
        "org-123",
        "ds-456",
      );

      const s3Path = `bronze/quickbooks/org-123/accounts/${Date.now()}.json`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: TEST_BUCKET,
          Key: s3Path,
          Body: JSON.stringify(bronze, null, 2),
          ContentType: "application/json",
        }),
      );

      // Verify we can read it back
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: TEST_BUCKET,
          Key: s3Path,
        }),
      );

      const body = await response.Body?.transformToString();
      const retrieved = JSON.parse(body!);

      expect(retrieved.metadata.source_system).toBe("QUICKBOOKS");
      expect(retrieved.raw_data.Id).toBe("1");
    });
  });

  // ===========================================================================
  // Silver Layer Tests
  // ===========================================================================

  describe("Silver Layer - Data Cleansing & Standardization", () => {
    it("should transform QuickBooks account to Silver format", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksAccountToBronze(
        sampleQuickBooksAccount,
        "org-123",
        "ds-456",
      );

      const silver = etlService.transformQuickBooksAccountToSilver(bronze);

      expect(silver.account_code).toBe("1200");
      expect(silver.account_name).toBe("Accounts Receivable");
      expect(silver.account_type).toBe(SilverAccountType.ASSET);
      expect(silver.is_active).toBe(true);
      expect(silver.currency_code).toBe("CAD");
      expect(silver.metadata.quality_score).toBeGreaterThanOrEqual(70);
      expect(silver.metadata.is_valid).toBe(true);
    });

    it("should transform QuickBooks customer to Silver contact", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksCustomerToBronze(
        sampleQuickBooksCustomer,
        "org-123",
        "ds-456",
      );

      const silver = etlService.transformQuickBooksCustomerToSilver(bronze);

      expect(silver.display_name).toBe("Acme Corporation");
      expect(silver.contact_type).toBe(SilverContactType.CUSTOMER);
      expect(silver.email).toBe("john@acme.example.com");
      expect(silver.email_is_valid).toBe(true);
      expect(silver.address_city).toBe("Toronto");
      expect(silver.address_province_state).toBe("ON");
      expect(silver.metadata.quality_score).toBeGreaterThanOrEqual(70);
    });

    it("should transform QuickBooks invoice to Silver transactions", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksInvoiceToBronze(
        sampleQuickBooksInvoice,
        "org-123",
        "ds-456",
      );

      const silverTxns = etlService.transformQuickBooksInvoiceToSilver(bronze);

      // Should create multiple transactions (A/R entry + line items)
      expect(silverTxns.length).toBe(3); // 1 A/R + 2 line items

      // Verify A/R entry
      const arEntry = silverTxns[0];
      expect(arEntry.transaction_type).toBe(SilverTransactionType.INVOICE);
      expect(arEntry.debit_amount).toBe(1500.0);
      expect(arEntry.credit_amount).toBe(0);
      expect(arEntry.reference_number).toBe("INV-001");

      // Verify line items (credits)
      const lineItems = silverTxns.slice(1);
      const totalCredits = lineItems.reduce(
        (sum, t) => sum + t.credit_amount,
        0,
      );
      expect(totalCredits).toBe(1500.0);
    });

    it("should flag quality issues for invalid data", () => {
      if (skipIfNoLocalStack()) return;

      const invalidCustomer: QuickBooksCustomer = {
        ...sampleQuickBooksCustomer,
        DisplayName: "", // Invalid - missing required field
        PrimaryEmailAddr: { Address: "invalid-email" }, // Invalid format
      };

      const bronze = etlService.ingestQuickBooksCustomerToBronze(
        invalidCustomer,
        "org-123",
        "ds-456",
      );

      const silver = etlService.transformQuickBooksCustomerToSilver(bronze);

      expect(silver.metadata.quality_issues.length).toBeGreaterThan(0);
      expect(silver.metadata.quality_score).toBeLessThan(100);
      expect(silver.email_is_valid).toBe(false);
    });

    it("should write Silver data to S3", async () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksAccountToBronze(
        sampleQuickBooksAccount,
        "org-123",
        "ds-456",
      );
      const silver = etlService.transformQuickBooksAccountToSilver(bronze);

      const s3Path = `silver/accounts/org-123/${Date.now()}.json`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: TEST_BUCKET,
          Key: s3Path,
          Body: JSON.stringify(silver, null, 2),
          ContentType: "application/json",
        }),
      );

      // Verify
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: TEST_BUCKET,
          Key: s3Path,
        }),
      );

      const body = await response.Body?.transformToString();
      const retrieved = JSON.parse(body!);

      expect(retrieved.account_type).toBe(SilverAccountType.ASSET);
    });
  });

  // ===========================================================================
  // Gold Layer Tests
  // ===========================================================================

  describe("Gold Layer - Star Schema Analytics", () => {
    it("should transform Silver account to Gold DimAccount", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksAccountToBronze(
        sampleQuickBooksAccount,
        "org-123",
        "ds-456",
      );
      const silver = etlService.transformQuickBooksAccountToSilver(bronze);
      const gold = etlService.transformSilverAccountToGold(silver, "org-key-1");

      expect(gold.organization_key).toBe("org-key-1");
      expect(gold.account_code).toBe("1200");
      expect(gold.account_name).toBe("Accounts Receivable");
      expect(gold.account_type).toBe(AccountType.ASSET);
      expect(gold.is_debit_normal).toBe(true);
      expect(gold.balance_sheet_section).toBe(AccountType.ASSET);
      expect(gold.income_statement_section).toBeNull();
    });

    it("should transform Silver contact to Gold DimContact", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksCustomerToBronze(
        sampleQuickBooksCustomer,
        "org-123",
        "ds-456",
      );
      const silver = etlService.transformQuickBooksCustomerToSilver(bronze);
      const gold = etlService.transformSilverContactToGold(silver, "org-key-1");

      expect(gold.organization_key).toBe("org-key-1");
      expect(gold.display_name).toBe("Acme Corporation");
      expect(gold.contact_type).toBe(ContactType.CUSTOMER);
      expect(gold.is_customer).toBe(true);
      expect(gold.is_vendor).toBe(false);
      expect(gold.email).toBe("john@acme.example.com");
    });

    it("should transform Silver transactions to Gold FactTransactions", () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksInvoiceToBronze(
        sampleQuickBooksInvoice,
        "org-123",
        "ds-456",
      );
      const silverTxns = etlService.transformQuickBooksInvoiceToSilver(bronze);

      const accountKeyMap = new Map([["accounts_receivable", "gold_acc_ar"]]);
      const contactKeyMap = new Map([["101", "gold_contact_acme"]]);

      const goldTxns = etlService.transformSilverTransactionsToGold(
        silverTxns,
        "org-key-1",
        accountKeyMap,
        contactKeyMap,
      );

      expect(goldTxns.length).toBe(3);

      // Verify A/R transaction
      const arTxn = goldTxns[0];
      expect(arTxn.organization_key).toBe("org-key-1");
      expect(arTxn.debit_amount).toBe(1500.0);
      expect(arTxn.source_system).toBe(SourceSystem.QUICKBOOKS);
      expect(arTxn.date_key).toBe(20240125); // YYYYMMDD format

      // Verify contact key mapping
      expect(arTxn.contact_key).toBe("gold_contact_acme");
    });

    it("should write Gold data to S3 in partitioned format", async () => {
      if (skipIfNoLocalStack()) return;

      const bronze = etlService.ingestQuickBooksInvoiceToBronze(
        sampleQuickBooksInvoice,
        "org-123",
        "ds-456",
      );
      const silverTxns = etlService.transformQuickBooksInvoiceToSilver(bronze);
      const goldTxns = etlService.transformSilverTransactionsToGold(
        silverTxns,
        "org-key-1",
        new Map(),
        new Map(),
      );

      // Write partitioned by org/year/month
      const s3Path = `gold/fact_transaction/organization_id=org-123/year=2024/month=01/${Date.now()}.json`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: TEST_BUCKET,
          Key: s3Path,
          Body: JSON.stringify(goldTxns, null, 2),
          ContentType: "application/json",
        }),
      );

      // Verify partition structure
      const listResponse = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: TEST_BUCKET,
          Prefix: "gold/fact_transaction/organization_id=org-123/",
        }),
      );

      expect(listResponse.Contents?.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // End-to-End Pipeline Tests
  // ===========================================================================

  describe("End-to-End ETL Pipeline", () => {
    it("should process complete pipeline: Bronze → Silver → Gold", async () => {
      if (skipIfNoLocalStack()) return;

      const orgId = "e2e-org-123";
      const orgKey = "e2e-org-key-1";
      const dsId = "e2e-ds-456";

      // 1. Ingest raw data to Bronze
      const bronzeAccount = etlService.ingestQuickBooksAccountToBronze(
        sampleQuickBooksAccount,
        orgId,
        dsId,
      );
      const bronzeCustomer = etlService.ingestQuickBooksCustomerToBronze(
        sampleQuickBooksCustomer,
        orgId,
        dsId,
      );
      const bronzeInvoice = etlService.ingestQuickBooksInvoiceToBronze(
        sampleQuickBooksInvoice,
        orgId,
        dsId,
      );

      // Write to Bronze S3
      const timestamp = Date.now();
      await Promise.all([
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `bronze/quickbooks/${orgId}/accounts/${timestamp}.json`,
            Body: JSON.stringify([bronzeAccount], null, 2),
            ContentType: "application/json",
          }),
        ),
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `bronze/quickbooks/${orgId}/customers/${timestamp}.json`,
            Body: JSON.stringify([bronzeCustomer], null, 2),
            ContentType: "application/json",
          }),
        ),
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `bronze/quickbooks/${orgId}/invoices/${timestamp}.json`,
            Body: JSON.stringify([bronzeInvoice], null, 2),
            ContentType: "application/json",
          }),
        ),
      ]);

      // 2. Transform to Silver
      const silverAccount =
        etlService.transformQuickBooksAccountToSilver(bronzeAccount);
      const silverContact =
        etlService.transformQuickBooksCustomerToSilver(bronzeCustomer);
      const silverTransactions =
        etlService.transformQuickBooksInvoiceToSilver(bronzeInvoice);

      // Write to Silver S3
      await Promise.all([
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `silver/accounts/${orgId}/${timestamp}.json`,
            Body: JSON.stringify([silverAccount], null, 2),
            ContentType: "application/json",
          }),
        ),
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `silver/contacts/${orgId}/${timestamp}.json`,
            Body: JSON.stringify([silverContact], null, 2),
            ContentType: "application/json",
          }),
        ),
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `silver/transactions/${orgId}/${timestamp}.json`,
            Body: JSON.stringify(silverTransactions, null, 2),
            ContentType: "application/json",
          }),
        ),
      ]);

      // 3. Transform to Gold
      const goldAccount = etlService.transformSilverAccountToGold(
        silverAccount,
        orgKey,
      );
      const goldContact = etlService.transformSilverContactToGold(
        silverContact,
        orgKey,
      );

      const accountKeyMap = new Map([
        [silverAccount.source_account_id, goldAccount.account_key],
      ]);
      const contactKeyMap = new Map([
        [silverContact.source_contact_id, goldContact.contact_key],
      ]);

      const goldTransactions = etlService.transformSilverTransactionsToGold(
        silverTransactions,
        orgKey,
        accountKeyMap,
        contactKeyMap,
      );

      // Write to Gold S3
      await Promise.all([
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `gold/dim_account/${orgId}/${timestamp}.json`,
            Body: JSON.stringify([goldAccount], null, 2),
            ContentType: "application/json",
          }),
        ),
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `gold/dim_contact/${orgId}/${timestamp}.json`,
            Body: JSON.stringify([goldContact], null, 2),
            ContentType: "application/json",
          }),
        ),
        s3Client.send(
          new PutObjectCommand({
            Bucket: TEST_BUCKET,
            Key: `gold/fact_transaction/${orgId}/${timestamp}.json`,
            Body: JSON.stringify(goldTransactions, null, 2),
            ContentType: "application/json",
          }),
        ),
      ]);

      // 4. Verify all layers have data
      const bronzeList = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: TEST_BUCKET,
          Prefix: `bronze/quickbooks/${orgId}/`,
        }),
      );
      const silverList = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: TEST_BUCKET,
          Prefix: `silver/`,
        }),
      );
      const goldList = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: TEST_BUCKET,
          Prefix: `gold/`,
        }),
      );

      expect(bronzeList.Contents?.length).toBeGreaterThanOrEqual(3);
      expect(silverList.Contents?.length).toBeGreaterThanOrEqual(3);
      expect(goldList.Contents?.length).toBeGreaterThanOrEqual(3);

      // 5. Verify data integrity
      const goldTxnResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: TEST_BUCKET,
          Key: `gold/fact_transaction/${orgId}/${timestamp}.json`,
        }),
      );

      const goldTxnBody = await goldTxnResponse.Body?.transformToString();
      const retrievedGoldTxns = JSON.parse(goldTxnBody!);

      expect(retrievedGoldTxns.length).toBe(3);
      expect(retrievedGoldTxns[0].organization_key).toBe(orgKey);

      console.log("✅ E2E Pipeline Test Complete:");
      console.log(`   Bronze: ${bronzeList.Contents?.length} files`);
      console.log(`   Silver: ${silverList.Contents?.length} files`);
      console.log(`   Gold: ${goldList.Contents?.length} files`);
    });

    it("should handle data quality validation across pipeline", () => {
      if (skipIfNoLocalStack()) return;

      // Test with various data quality issues
      const accountWithMissingCode: QuickBooksAccount = {
        ...sampleQuickBooksAccount,
        AcctNum: "", // Missing account code
      };

      const bronze = etlService.ingestQuickBooksAccountToBronze(
        accountWithMissingCode,
        "org-123",
        "ds-456",
      );
      const silver = etlService.transformQuickBooksAccountToSilver(bronze);

      // Should still process but flag quality issue
      expect(silver.metadata.quality_issues).toContain(
        "ACC_001: Account code is missing",
      );
      expect(silver.metadata.quality_score).toBeLessThan(100);

      // Should use ID as fallback for account code
      expect(silver.account_code).toBe("1");
    });
  });

  // ===========================================================================
  // Performance Tests
  // ===========================================================================

  describe("Performance - Batch Processing", () => {
    it("should handle batch of 100 accounts efficiently", () => {
      if (skipIfNoLocalStack()) return;

      const accounts: QuickBooksAccount[] = Array.from(
        { length: 100 },
        (_, i) => ({
          ...sampleQuickBooksAccount,
          Id: `${i + 1}`,
          AcctNum: `${1000 + i}`,
          Name: `Account ${i + 1}`,
        }),
      );

      const startTime = Date.now();

      const bronzeAccounts = accounts.map((acc) =>
        etlService.ingestQuickBooksAccountToBronze(acc, "org-perf", "ds-perf"),
      );
      const silverAccounts = bronzeAccounts.map((bronze) =>
        etlService.transformQuickBooksAccountToSilver(bronze),
      );
      const goldAccounts = silverAccounts.map((silver) =>
        etlService.transformSilverAccountToGold(silver, "org-perf-key"),
      );

      const duration = Date.now() - startTime;

      expect(goldAccounts.length).toBe(100);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second

      console.log(`✅ Processed 100 accounts in ${duration}ms`);
    });
  });
});
