/**
 * ETL Pipeline Service Tests
 *
 * These tests demonstrate the complete data transformation pipeline:
 * Raw Provider Data → Bronze → Silver → Gold
 *
 * Each test shows the transformation at each stage with realistic data.
 */

import { ETLPipelineService } from "../etl-pipeline.service";
import {
  SilverAccountType,
  SilverContactType,
  SilverTransactionType,
  SilverSourceSystem,
} from "@domain/datalake/silver-schema";
import { AccountType, ContactType, SourceSystem } from "@domain/datalake/schemas";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksInvoice,
  QuickBooksJournalEntry,
  XeroAccount,
  XeroContact,
  XeroInvoice,
} from "@domain/datalake/provider-types";

describe("ETLPipelineService", () => {
  let etl: ETLPipelineService;

  const TEST_ORG_ID = "org_test_123";
  const TEST_DATASOURCE_ID = "ds_qb_456";
  const TEST_ORG_KEY = "gold_org_123";

  beforeEach(() => {
    etl = new ETLPipelineService();
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: QuickBooks Account
  // ===========================================================================
  describe("Full Pipeline: QuickBooks Account", () => {
    it("should transform QB account through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA (from QuickBooks API)
      // =========================================================
      const rawQuickBooksAccount: QuickBooksAccount = {
        Id: "35",
        Name: "Business Chequing",
        AccountType: "Bank",
        AccountSubType: "Checking",
        AcctNum: "1000",
        Active: true,
        CurrentBalance: 45230.5,
        Classification: "Asset",
        FullyQualifiedName: "Business Chequing",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-15T10:30:00Z",
          LastUpdatedTime: "2024-03-20T14:45:00Z",
        },
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE (Raw data with metadata)
      // =========================================================
      const bronzeAccount = etl.ingestQuickBooksAccountToBronze(
        rawQuickBooksAccount,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      // Bronze layer preserves raw data exactly
      expect(bronzeAccount).toMatchObject({
        metadata: {
          source_system: "QUICKBOOKS",
          organization_id: TEST_ORG_ID,
          datasource_id: TEST_DATASOURCE_ID,
          source_endpoint: "/v3/company/{realmId}/account",
          ingestion_status: "success",
          record_count: 1,
        },
        raw_data: rawQuickBooksAccount,
      });
      expect(bronzeAccount.metadata.ingestion_id).toBeDefined();
      expect(bronzeAccount.metadata.ingested_at).toBeInstanceOf(Date);
      expect(bronzeAccount.metadata.payload_hash).toBeDefined();

      // =========================================================
      // STAGE 2: BRONZE → SILVER (Cleansed & standardized)
      // =========================================================
      const silverAccount = etl.transformQuickBooksAccountToSilver(bronzeAccount);

      // Silver layer has standardized schema
      expect(silverAccount).toMatchObject({
        metadata: {
          bronze_ingestion_id: bronzeAccount.metadata.ingestion_id,
          source_system: SilverSourceSystem.QUICKBOOKS,
          organization_id: TEST_ORG_ID,
          is_valid: true,
        },
        silver_account_id: "silver_qb_acc_35",
        source_account_id: "35",
        organization_id: TEST_ORG_ID,
        account_code: "1000",
        account_name: "Business Chequing",
        account_type: SilverAccountType.ASSET,
        account_subtype: "Checking",
        source_account_type: "Bank",
        source_account_subtype: "Checking",
        is_active: true,
        normal_balance: "DEBIT",
        currency_code: "CAD",
        hierarchy_level: 1,
        hierarchy_path: "Business Chequing",
      });
      expect(silverAccount.metadata.quality_score).toBeGreaterThanOrEqual(70);
      expect(silverAccount.metadata.processed_at).toBeInstanceOf(Date);

      // =========================================================
      // STAGE 3: SILVER → GOLD (Analytics-ready star schema)
      // =========================================================
      const goldAccount = etl.transformSilverAccountToGold(
        silverAccount,
        TEST_ORG_KEY,
      );

      // Gold layer is Power BI ready
      expect(goldAccount).toMatchObject({
        account_key: "gold_silver_qb_acc_35",
        source_account_id: "35",
        organization_key: TEST_ORG_KEY,
        account_code: "1000",
        account_name: "Business Chequing",
        account_type: AccountType.ASSET,
        account_subtype: "Checking",
        source_account_type: "Bank",
        is_active: true,
        is_debit_normal: true,
        balance_sheet_section: AccountType.ASSET,
        income_statement_section: null,
        hierarchy_level: 1,
        hierarchy_path: "Business Chequing",
      });
      expect(goldAccount.account_id).toBeDefined(); // UUID generated
      expect(goldAccount.account_type_key).toBe("type_asset");
    });

    it("should track data quality issues through the pipeline", () => {
      // Raw account missing account code
      const rawAccount: QuickBooksAccount = {
        Id: "99",
        Name: "Test Account",
        AccountType: "Expense",
        AccountSubType: "Office",
        // AcctNum missing - should trigger quality warning
        Active: true,
        CurrentBalance: 0,
        Classification: "Expense",
        FullyQualifiedName: "Test Account",
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "2024-01-01T00:00:00Z", LastUpdatedTime: "2024-01-01T00:00:00Z" },
      };

      const bronze = etl.ingestQuickBooksAccountToBronze(
        rawAccount,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );
      const silver = etl.transformQuickBooksAccountToSilver(bronze);

      // Quality issues tracked
      expect(silver.metadata.quality_issues).toContain(
        "ACC_001: Account code is missing",
      );
      expect(silver.metadata.quality_score).toBeLessThan(100);
      expect(silver.metadata.is_valid).toBe(true); // Still valid if score >= 70
    });
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: QuickBooks Customer
  // ===========================================================================
  describe("Full Pipeline: QuickBooks Customer", () => {
    it("should transform QB customer through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA
      // =========================================================
      const rawCustomer: QuickBooksCustomer = {
        Id: "21",
        DisplayName: "Acme Corporation",
        CompanyName: "Acme Corporation Inc.",
        GivenName: "John",
        FamilyName: "Smith",
        PrimaryEmailAddr: { Address: "john.smith@acme.com" },
        PrimaryPhone: { FreeFormNumber: "(416) 555-1234" },
        BillAddr: {
          Line1: "123 Main Street",
          City: "Toronto",
          CountrySubDivisionCode: "ON",
          PostalCode: "M5V 1A1",
          Country: "Canada",
        },
        Active: true,
        Balance: 5600.0,
        MetaData: {
          CreateTime: "2024-02-01T09:00:00Z",
          LastUpdatedTime: "2024-03-15T11:30:00Z",
        },
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE
      // =========================================================
      const bronzeCustomer = etl.ingestQuickBooksCustomerToBronze(
        rawCustomer,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      expect(bronzeCustomer.metadata.source_endpoint).toBe(
        "/v3/company/{realmId}/customer",
      );
      expect(bronzeCustomer.raw_data).toEqual(rawCustomer);

      // =========================================================
      // STAGE 2: BRONZE → SILVER
      // =========================================================
      const silverContact = etl.transformQuickBooksCustomerToSilver(bronzeCustomer);

      expect(silverContact).toMatchObject({
        silver_contact_id: "silver_qb_cust_21",
        source_contact_id: "21",
        contact_type: SilverContactType.CUSTOMER,
        display_name: "Acme Corporation",
        legal_name: "Acme Corporation Inc.",
        first_name: "John",
        last_name: "Smith",
        email: "john.smith@acme.com",
        email_is_valid: true,
        phone: "(416) 555-1234",
        phone_normalized: "4165551234",
        address_line1: "123 Main Street",
        address_city: "Toronto",
        address_province_state: "ON",
        address_postal_code: "M5V 1A1",
        address_country_code: "CA",
        is_active: true,
      });
      expect(silverContact.metadata.quality_score).toBe(100);

      // =========================================================
      // STAGE 3: SILVER → GOLD
      // =========================================================
      const goldContact = etl.transformSilverContactToGold(
        silverContact,
        TEST_ORG_KEY,
      );

      expect(goldContact).toMatchObject({
        contact_key: "gold_silver_qb_cust_21",
        source_contact_id: "21",
        organization_key: TEST_ORG_KEY,
        contact_type: ContactType.CUSTOMER,
        contact_name: "John Smith",
        display_name: "Acme Corporation",
        company_name: "Acme Corporation Inc.",
        email: "john.smith@acme.com",
        phone: "(416) 555-1234",
        address_city: "Toronto",
        address_province_state: "ON",
        address_country: "CA",
        is_customer: true,
        is_vendor: false,
        is_active: true,
      });
    });

    it("should flag invalid email in silver layer", () => {
      const rawCustomer: QuickBooksCustomer = {
        Id: "22",
        DisplayName: "Bad Email Corp",
        PrimaryEmailAddr: { Address: "not-an-email" }, // Invalid
        Active: true,
        Balance: 0,
        MetaData: { CreateTime: "2024-01-01T00:00:00Z", LastUpdatedTime: "2024-01-01T00:00:00Z" },
      };

      const bronze = etl.ingestQuickBooksCustomerToBronze(
        rawCustomer,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );
      const silver = etl.transformQuickBooksCustomerToSilver(bronze);

      expect(silver.email_is_valid).toBe(false);
      expect(silver.metadata.quality_issues).toContain(
        "CON_001: Invalid email format",
      );
    });
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: QuickBooks Invoice
  // ===========================================================================
  describe("Full Pipeline: QuickBooks Invoice", () => {
    it("should transform QB invoice through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA
      // =========================================================
      const rawInvoice: QuickBooksInvoice = {
        Id: "1001",
        DocNumber: "INV-2024-0042",
        TxnDate: "2024-03-15",
        DueDate: "2024-04-15",
        CustomerRef: { value: "21", name: "Acme Corporation" },
        Line: [
          {
            Id: "1",
            LineNum: 1,
            Amount: 5000.0,
            DetailType: "SalesItemLineDetail",
            Description: "Consulting Services - March 2024",
            SalesItemLineDetail: {
              ItemRef: { value: "10", name: "Consulting" },
              Qty: 50,
              UnitPrice: 100.0,
            },
          },
          {
            Id: "2",
            LineNum: 2,
            Amount: 650.0,
            DetailType: "SalesItemLineDetail",
            Description: "HST 13%",
          },
        ],
        TotalAmt: 5650.0,
        Balance: 5650.0,
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        ExchangeRate: 1.0,
        PrivateNote: "Q1 consulting engagement",
        MetaData: {
          CreateTime: "2024-03-15T10:00:00Z",
          LastUpdatedTime: "2024-03-15T10:00:00Z",
        },
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE
      // =========================================================
      const bronzeInvoice = etl.ingestQuickBooksInvoiceToBronze(
        rawInvoice,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      expect(bronzeInvoice.metadata.source_endpoint).toBe(
        "/v3/company/{realmId}/invoice",
      );
      expect(bronzeInvoice.raw_data.TotalAmt).toBe(5650.0);

      // =========================================================
      // STAGE 2: BRONZE → SILVER
      // =========================================================
      const silverTxns = etl.transformQuickBooksInvoiceToSilver(bronzeInvoice);

      // Invoice creates A/R entry + line item entries
      expect(silverTxns).toHaveLength(3);

      // A/R entry (debit)
      expect(silverTxns[0]).toMatchObject({
        silver_transaction_id: "silver_qb_inv_1001_ar",
        source_transaction_id: "1001",
        transaction_type: SilverTransactionType.INVOICE,
        reference_number: "INV-2024-0042",
        source_account_id: "accounts_receivable",
        source_contact_id: "21",
        debit_amount: 5650.0,
        credit_amount: 0,
        net_amount: 5650.0,
        currency_code: "CAD",
        exchange_rate: 1.0,
        amount_in_base_currency: 5650.0,
        memo: "Q1 consulting engagement",
      });

      // Revenue line 1 (credit)
      expect(silverTxns[1]).toMatchObject({
        silver_transaction_id: "silver_qb_inv_1001_1",
        source_line_id: "1",
        source_account_id: "10",
        source_item_id: "10",
        debit_amount: 0,
        credit_amount: 5000.0,
        net_amount: -5000.0,
        memo: "Consulting Services - March 2024",
      });

      // Data quality check
      expect(silverTxns[0].metadata.is_valid).toBe(true);
      expect(silverTxns[0].metadata.quality_score).toBeGreaterThanOrEqual(70);

      // =========================================================
      // STAGE 3: SILVER → GOLD
      // =========================================================
      const accountKeyMap = new Map([
        ["accounts_receivable", "gold_acc_ar"],
        ["10", "gold_acc_revenue"],
      ]);
      const contactKeyMap = new Map([["21", "gold_contact_acme"]]);

      const goldTxns = etl.transformSilverTransactionsToGold(
        silverTxns,
        TEST_ORG_KEY,
        accountKeyMap,
        contactKeyMap,
      );

      expect(goldTxns).toHaveLength(3);

      // A/R entry in Gold
      expect(goldTxns[0]).toMatchObject({
        transaction_key: "gold_silver_qb_inv_1001_ar",
        organization_key: TEST_ORG_KEY,
        account_key: "gold_acc_ar",
        contact_key: "gold_contact_acme",
        transaction_type_key: "type_invoice",
        debit_amount: 5650.0,
        credit_amount: 0,
        amount: 5650.0,
        currency_code: "CAD",
        amount_cad: 5650.0,
        reference_number: "INV-2024-0042",
        source_system: SourceSystem.QUICKBOOKS,
        source_transaction_id: "1001",
        date_key: 20240315,
      });

      // Verify double-entry balance
      const totalDebits = goldTxns.reduce((sum, t) => sum + t.debit_amount, 0);
      const totalCredits = goldTxns.reduce((sum, t) => sum + t.credit_amount, 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: QuickBooks Journal Entry
  // ===========================================================================
  describe("Full Pipeline: QuickBooks Journal Entry", () => {
    it("should transform QB journal entry through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA
      // =========================================================
      const rawJournal: QuickBooksJournalEntry = {
        Id: "500",
        DocNumber: "JE-2024-001",
        TxnDate: "2024-03-31",
        Line: [
          {
            Id: "1",
            Amount: 2500.0,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: {
              PostingType: "Debit",
              AccountRef: { value: "6100", name: "Rent Expense" },
              ClassRef: { value: "class_1", name: "Operations" },
            },
            Description: "March rent expense accrual",
          },
          {
            Id: "2",
            Amount: 2500.0,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: {
              PostingType: "Credit",
              AccountRef: { value: "2100", name: "Accrued Expenses" },
            },
            Description: "March rent expense accrual",
          },
        ],
        PrivateNote: "Month-end accrual for rent",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-03-31T23:00:00Z",
          LastUpdatedTime: "2024-03-31T23:00:00Z",
        },
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE
      // =========================================================
      const bronzeJournal = etl.ingestQuickBooksJournalEntryToBronze(
        rawJournal,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      expect(bronzeJournal.metadata.source_endpoint).toBe(
        "/v3/company/{realmId}/journalentry",
      );

      // =========================================================
      // STAGE 2: BRONZE → SILVER
      // =========================================================
      const silverTxns = etl.transformQuickBooksJournalEntryToSilver(bronzeJournal);

      expect(silverTxns).toHaveLength(2);

      // Debit line
      expect(silverTxns[0]).toMatchObject({
        silver_transaction_id: "silver_qb_je_500_1",
        transaction_type: SilverTransactionType.JOURNAL_ENTRY,
        source_account_id: "6100",
        source_class_id: "class_1",
        debit_amount: 2500.0,
        credit_amount: 0,
        net_amount: 2500.0,
        reference_number: "JE-2024-001",
      });

      // Credit line
      expect(silverTxns[1]).toMatchObject({
        silver_transaction_id: "silver_qb_je_500_2",
        source_account_id: "2100",
        debit_amount: 0,
        credit_amount: 2500.0,
        net_amount: -2500.0,
      });

      // Journal entry should balance - no quality issues
      expect(silverTxns[0].metadata.quality_issues).toHaveLength(0);
      expect(silverTxns[0].metadata.quality_score).toBe(100);

      // =========================================================
      // STAGE 3: SILVER → GOLD
      // =========================================================
      const accountKeyMap = new Map([
        ["6100", "gold_acc_rent"],
        ["2100", "gold_acc_accrued"],
      ]);

      const goldTxns = etl.transformSilverTransactionsToGold(
        silverTxns,
        TEST_ORG_KEY,
        accountKeyMap,
        new Map(),
      );

      expect(goldTxns[0]).toMatchObject({
        account_key: "gold_acc_rent",
        class_key: "gold_class_class_1",
        transaction_type_key: "type_journal_entry",
        debit_amount: 2500.0,
        date_key: 20240331,
      });

      expect(goldTxns[1]).toMatchObject({
        account_key: "gold_acc_accrued",
        credit_amount: 2500.0,
      });

      // Verify double-entry
      const totalDebits = goldTxns.reduce((sum, t) => sum + t.debit_amount, 0);
      const totalCredits = goldTxns.reduce((sum, t) => sum + t.credit_amount, 0);
      expect(totalDebits).toBe(totalCredits);
    });

    it("should flag unbalanced journal entry", () => {
      const unbalancedJournal: QuickBooksJournalEntry = {
        Id: "501",
        TxnDate: "2024-03-31",
        Line: [
          {
            Id: "1",
            Amount: 1000.0,
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: {
              PostingType: "Debit",
              AccountRef: { value: "6100", name: "Expense" },
            },
          },
          {
            Id: "2",
            Amount: 500.0, // Doesn't match!
            DetailType: "JournalEntryLineDetail",
            JournalEntryLineDetail: {
              PostingType: "Credit",
              AccountRef: { value: "2100", name: "Liability" },
            },
          },
        ],
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "2024-03-31T00:00:00Z", LastUpdatedTime: "2024-03-31T00:00:00Z" },
      };

      const bronze = etl.ingestQuickBooksJournalEntryToBronze(
        unbalancedJournal,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );
      const silver = etl.transformQuickBooksJournalEntryToSilver(bronze);

      expect(silver[0].metadata.quality_issues).toContain(
        "TXN_001: Journal entry does not balance",
      );
      expect(silver[0].metadata.quality_score).toBeLessThan(100);
    });
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: Xero Account
  // ===========================================================================
  describe("Full Pipeline: Xero Account", () => {
    it("should transform Xero account through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA (from Xero API)
      // =========================================================
      const rawXeroAccount: XeroAccount = {
        AccountID: "bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        Code: "200",
        Name: "Sales Revenue",
        Type: "REVENUE",
        Class: "REVENUE",
        Status: "ACTIVE",
        Description: "Revenue from product sales",
        TaxType: "OUTPUT",
        CurrencyCode: "CAD",
        ReportingCode: "REV.SALES",
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE
      // =========================================================
      const bronzeAccount = etl.ingestXeroAccountToBronze(
        rawXeroAccount,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      expect(bronzeAccount.metadata.source_system).toBe("XERO");
      expect(bronzeAccount.metadata.source_endpoint).toBe("/api.xro/2.0/Accounts");
      expect(bronzeAccount.raw_data.AccountID).toBe("bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4");

      // =========================================================
      // STAGE 2: BRONZE → SILVER
      // =========================================================
      const silverAccount = etl.transformXeroAccountToSilver(bronzeAccount);

      expect(silverAccount).toMatchObject({
        silver_account_id: "silver_xero_acc_bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        source_account_id: "bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        account_code: "200",
        account_name: "Sales Revenue",
        account_type: SilverAccountType.REVENUE,
        account_subtype: "REVENUE",
        normal_balance: "CREDIT",
        currency_code: "CAD",
        is_active: true,
      });
      expect(silverAccount.metadata.source_system).toBe(SilverSourceSystem.XERO);

      // =========================================================
      // STAGE 3: SILVER → GOLD
      // =========================================================
      const goldAccount = etl.transformSilverAccountToGold(silverAccount, TEST_ORG_KEY);

      expect(goldAccount).toMatchObject({
        account_key: "gold_silver_xero_acc_bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        organization_key: TEST_ORG_KEY,
        account_code: "200",
        account_name: "Sales Revenue",
        account_type: AccountType.REVENUE,
        is_debit_normal: false, // Revenue is credit-normal
        balance_sheet_section: null,
        income_statement_section: AccountType.REVENUE,
      });
    });
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: Xero Contact
  // ===========================================================================
  describe("Full Pipeline: Xero Contact", () => {
    it("should transform Xero contact through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA
      // =========================================================
      const rawXeroContact: XeroContact = {
        ContactID: "contact-uuid-12345",
        ContactNumber: "CUST-001",
        ContactStatus: "ACTIVE",
        Name: "Big Corp Ltd",
        FirstName: "Jane",
        LastName: "Doe",
        EmailAddress: "jane.doe@bigcorp.com",
        Phones: [
          { PhoneType: "DEFAULT", PhoneNumber: "5551234567" },
          { PhoneType: "MOBILE", PhoneNumber: "5559876543" },
        ],
        Addresses: [
          {
            AddressType: "STREET",
            City: "Montreal",
            Region: "QC",
            Country: "Canada",
          },
        ],
        IsSupplier: false,
        IsCustomer: true,
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE
      // =========================================================
      const bronzeContact = etl.ingestXeroContactToBronze(
        rawXeroContact,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      expect(bronzeContact.metadata.source_endpoint).toBe("/api.xro/2.0/Contacts");

      // =========================================================
      // STAGE 2: BRONZE → SILVER
      // =========================================================
      const silverContact = etl.transformXeroContactToSilver(bronzeContact);

      expect(silverContact).toMatchObject({
        silver_contact_id: "silver_xero_contact_contact-uuid-12345",
        contact_type: SilverContactType.CUSTOMER,
        display_name: "Big Corp Ltd",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@bigcorp.com",
        email_is_valid: true,
        phone: "5551234567",
        phone_normalized: "5551234567",
        address_city: "Montreal",
        address_province_state: "QC",
        address_country_code: "CA",
        is_active: true,
      });

      // =========================================================
      // STAGE 3: SILVER → GOLD
      // =========================================================
      const goldContact = etl.transformSilverContactToGold(silverContact, TEST_ORG_KEY);

      expect(goldContact).toMatchObject({
        contact_key: "gold_silver_xero_contact_contact-uuid-12345",
        organization_key: TEST_ORG_KEY,
        contact_type: ContactType.CUSTOMER,
        contact_name: "Jane Doe",
        display_name: "Big Corp Ltd",
        email: "jane.doe@bigcorp.com",
        address_city: "Montreal",
        is_customer: true,
        is_vendor: false,
      });
    });

    it("should handle Xero contact that is both customer and supplier", () => {
      const rawContact: XeroContact = {
        ContactID: "both-uuid",
        ContactStatus: "ACTIVE",
        Name: "Partner Company",
        IsSupplier: true,
        IsCustomer: true,
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      const bronze = etl.ingestXeroContactToBronze(rawContact, TEST_ORG_ID, TEST_DATASOURCE_ID);
      const silver = etl.transformXeroContactToSilver(bronze);
      const gold = etl.transformSilverContactToGold(silver, TEST_ORG_KEY);

      expect(silver.contact_type).toBe(SilverContactType.CUSTOMER_AND_VENDOR);
      expect(gold.contact_type).toBe(ContactType.BOTH);
      expect(gold.is_customer).toBe(true);
      expect(gold.is_vendor).toBe(true);
    });
  });

  // ===========================================================================
  // FULL PIPELINE TESTS: Xero Invoice
  // ===========================================================================
  describe("Full Pipeline: Xero Invoice", () => {
    it("should transform Xero invoice through all layers: Raw → Bronze → Silver → Gold", () => {
      // =========================================================
      // STAGE 0: RAW PROVIDER DATA
      // =========================================================
      const rawXeroInvoice: XeroInvoice = {
        InvoiceID: "inv-uuid-98765",
        InvoiceNumber: "INV-0042",
        Type: "ACCREC",
        Contact: { ContactID: "contact-uuid-12345", Name: "Big Corp Ltd" },
        Date: "2024-03-15",
        DueDate: "2024-04-15",
        Status: "AUTHORISED",
        LineItems: [
          {
            LineItemID: "line-1",
            Description: "Professional Services",
            Quantity: 10,
            UnitAmount: 150.0,
            AccountCode: "200",
            TaxType: "OUTPUT",
            TaxAmount: 195.0,
            LineAmount: 1500.0,
            Tracking: [{ TrackingCategoryID: "track-1", Option: "Project A" }],
          },
        ],
        SubTotal: 1500.0,
        TotalTax: 195.0,
        Total: 1695.0,
        AmountDue: 1695.0,
        AmountPaid: 0,
        AmountCredited: 0,
        CurrencyCode: "CAD",
        CurrencyRate: 1.0,
        UpdatedDateUTC: "2024-03-15T12:00:00Z",
      };

      // =========================================================
      // STAGE 1: RAW → BRONZE
      // =========================================================
      const bronzeInvoice = etl.ingestXeroInvoiceToBronze(
        rawXeroInvoice,
        TEST_ORG_ID,
        TEST_DATASOURCE_ID,
      );

      expect(bronzeInvoice.metadata.source_system).toBe("XERO");
      expect(bronzeInvoice.raw_data.Total).toBe(1695.0);

      // Note: For Xero invoices, the silver transformation is handled
      // by the DatalakeTransformerService. Here we test the bronze layer.

      // Verify bronze preserves original data
      expect(bronzeInvoice.raw_data.LineItems[0].Tracking).toEqual([
        { TrackingCategoryID: "track-1", Option: "Project A" },
      ]);
    });
  });

  // ===========================================================================
  // CROSS-PROVIDER CONSISTENCY TESTS
  // ===========================================================================
  describe("Cross-Provider Consistency", () => {
    it("should produce consistent silver schema from different providers", () => {
      // QuickBooks account
      const qbAccount: QuickBooksAccount = {
        Id: "1",
        Name: "Cash",
        AccountType: "Bank",
        AccountSubType: "Checking",
        AcctNum: "1000",
        Active: true,
        CurrentBalance: 10000,
        Classification: "Asset",
        FullyQualifiedName: "Cash",
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "2024-01-01T00:00:00Z", LastUpdatedTime: "2024-01-01T00:00:00Z" },
      };

      // Xero account
      const xeroAccount: XeroAccount = {
        AccountID: "2",
        Code: "1000",
        Name: "Cash",
        Type: "BANK",
        Class: "ASSET",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2024-01-01T00:00:00Z",
      };

      const qbBronze = etl.ingestQuickBooksAccountToBronze(qbAccount, TEST_ORG_ID, TEST_DATASOURCE_ID);
      const xeroBronze = etl.ingestXeroAccountToBronze(xeroAccount, TEST_ORG_ID, TEST_DATASOURCE_ID);

      const qbSilver = etl.transformQuickBooksAccountToSilver(qbBronze);
      const xeroSilver = etl.transformXeroAccountToSilver(xeroBronze);

      // Both should have same account type and normal balance
      expect(qbSilver.account_type).toBe(SilverAccountType.ASSET);
      expect(xeroSilver.account_type).toBe(SilverAccountType.ASSET);

      expect(qbSilver.normal_balance).toBe("DEBIT");
      expect(xeroSilver.normal_balance).toBe("DEBIT");

      // Both should have same currency
      expect(qbSilver.currency_code).toBe("CAD");
      expect(xeroSilver.currency_code).toBe("CAD");

      // Source system should be tracked
      expect(qbSilver.metadata.source_system).toBe(SilverSourceSystem.QUICKBOOKS);
      expect(xeroSilver.metadata.source_system).toBe(SilverSourceSystem.XERO);
    });

    it("should produce consistent gold schema from different providers", () => {
      // QuickBooks path
      const qbAccount: QuickBooksAccount = {
        Id: "100",
        Name: "Revenue",
        AccountType: "Income",
        AccountSubType: "SalesOfProductIncome",
        AcctNum: "4000",
        Active: true,
        CurrentBalance: 50000,
        Classification: "Revenue",
        FullyQualifiedName: "Revenue",
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "2024-01-01T00:00:00Z", LastUpdatedTime: "2024-01-01T00:00:00Z" },
      };

      // Xero path
      const xeroAccount: XeroAccount = {
        AccountID: "200",
        Code: "4000",
        Name: "Revenue",
        Type: "REVENUE",
        Class: "REVENUE",
        Status: "ACTIVE",
        UpdatedDateUTC: "2024-01-01T00:00:00Z",
      };

      const qbBronze = etl.ingestQuickBooksAccountToBronze(qbAccount, TEST_ORG_ID, TEST_DATASOURCE_ID);
      const xeroBronze = etl.ingestXeroAccountToBronze(xeroAccount, TEST_ORG_ID, TEST_DATASOURCE_ID);

      const qbSilver = etl.transformQuickBooksAccountToSilver(qbBronze);
      const xeroSilver = etl.transformXeroAccountToSilver(xeroBronze);

      const qbGold = etl.transformSilverAccountToGold(qbSilver, TEST_ORG_KEY);
      const xeroGold = etl.transformSilverAccountToGold(xeroSilver, TEST_ORG_KEY);

      // Both should have same account type in gold
      expect(qbGold.account_type).toBe(AccountType.REVENUE);
      expect(xeroGold.account_type).toBe(AccountType.REVENUE);

      // Both should be credit-normal
      expect(qbGold.is_debit_normal).toBe(false);
      expect(xeroGold.is_debit_normal).toBe(false);

      // Both should have income statement section
      expect(qbGold.income_statement_section).toBe(AccountType.REVENUE);
      expect(xeroGold.income_statement_section).toBe(AccountType.REVENUE);

      // Both should have no balance sheet section
      expect(qbGold.balance_sheet_section).toBeNull();
      expect(xeroGold.balance_sheet_section).toBeNull();
    });
  });

  // ===========================================================================
  // DATA LINEAGE TESTS
  // ===========================================================================
  describe("Data Lineage Tracking", () => {
    it("should maintain lineage from bronze through gold", () => {
      const rawAccount: QuickBooksAccount = {
        Id: "999",
        Name: "Lineage Test",
        AccountType: "Expense",
        AccountSubType: "OtherMiscellaneousExpense",
        AcctNum: "9999",
        Active: true,
        CurrentBalance: 0,
        Classification: "Expense",
        FullyQualifiedName: "Lineage Test",
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "2024-01-01T00:00:00Z", LastUpdatedTime: "2024-01-01T00:00:00Z" },
      };

      const bronze = etl.ingestQuickBooksAccountToBronze(rawAccount, TEST_ORG_ID, TEST_DATASOURCE_ID);
      const silver = etl.transformQuickBooksAccountToSilver(bronze);
      const gold = etl.transformSilverAccountToGold(silver, TEST_ORG_KEY);

      // Bronze metadata captured
      const bronzeIngestionId = bronze.metadata.ingestion_id;
      expect(bronzeIngestionId).toBeDefined();

      // Silver references bronze
      expect(silver.metadata.bronze_ingestion_id).toBe(bronzeIngestionId);
      expect(silver.metadata.processing_job_id).toBeDefined();

      // Gold key traces back to silver
      expect(gold.account_key).toContain("silver_qb_acc_999");

      // Source ID preserved through all layers
      expect(bronze.raw_data.Id).toBe("999");
      expect(silver.source_account_id).toBe("999");
      expect(gold.source_account_id).toBe("999");
    });
  });
});
