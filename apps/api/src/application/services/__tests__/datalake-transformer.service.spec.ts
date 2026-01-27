/**
 * Datalake Transformer Service Tests
 *
 * These tests demonstrate the transformation of third-party provider data
 * into our standardized datalake schema format. Each test shows:
 * 1. The raw provider input (exactly as received from their API)
 * 2. The expected output in our standardized schema
 */

import { DatalakeTransformerService } from "../datalake-transformer.service";
import {
  AccountType,
  ContactType,
  SourceSystem,
} from "@domain/datalake/schemas";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksVendor,
  QuickBooksInvoice,
  QuickBooksJournalEntry,
  XeroAccount,
  XeroContact,
  XeroInvoice,
  SageAccount,
  FreshBooksAccount,
} from "@domain/datalake/provider-types";

describe("DatalakeTransformerService", () => {
  let transformer: DatalakeTransformerService;
  const TEST_ORG_KEY = "org_test_123";

  beforeEach(() => {
    transformer = new DatalakeTransformerService();
  });

  // ===========================================================================
  // QuickBooks Account Transformations
  // ===========================================================================
  describe("QuickBooks Account Transformations", () => {
    it("should transform a QuickBooks bank account to DimAccount", () => {
      // PROVIDER INPUT: QuickBooks Bank Account (exactly as returned from API)
      const quickBooksInput: QuickBooksAccount = {
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

      // TRANSFORM
      const result = transformer.transformQuickBooksAccount(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT: Standardized DimAccount
      expect(result).toMatchObject({
        account_key: "qb_35",
        source_account_id: "35",
        organization_key: TEST_ORG_KEY,
        account_code: "1000",
        account_name: "Business Chequing",
        account_type: AccountType.ASSET,
        account_subtype: "Checking",
        source_account_type: "Bank",
        source_account_subtype: "Checking",
        is_active: true,
        is_debit_normal: true,
        balance_sheet_section: AccountType.ASSET,
        income_statement_section: null,
        hierarchy_level: 1,
        hierarchy_path: "Business Chequing",
      });
    });

    it("should transform a QuickBooks expense account with parent", () => {
      // PROVIDER INPUT: QuickBooks Expense Account with hierarchy
      const quickBooksInput: QuickBooksAccount = {
        Id: "78",
        Name: "Office Supplies",
        AccountType: "Expense",
        AccountSubType: "SuppliesMaterials",
        AcctNum: "6200",
        Active: true,
        CurrentBalance: 3456.78,
        Classification: "Expense",
        FullyQualifiedName: "Operating Expenses:Office Supplies",
        ParentRef: { value: "45", name: "Operating Expenses" },
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-15T10:30:00Z",
          LastUpdatedTime: "2024-03-20T14:45:00Z",
        },
      };

      // TRANSFORM
      const result = transformer.transformQuickBooksAccount(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "qb_78",
        account_code: "6200",
        account_name: "Office Supplies",
        account_type: AccountType.EXPENSE,
        account_subtype: "Supplies Materials",
        parent_account_key: "qb_45",
        hierarchy_level: 2,
        hierarchy_path: "Operating Expenses/Office Supplies",
        is_debit_normal: true,
        balance_sheet_section: null,
        income_statement_section: AccountType.EXPENSE,
      });
    });

    it("should transform a QuickBooks revenue account", () => {
      // PROVIDER INPUT: QuickBooks Revenue Account
      const quickBooksInput: QuickBooksAccount = {
        Id: "1",
        Name: "Sales Revenue",
        AccountType: "Income",
        AccountSubType: "SalesOfProductIncome",
        AcctNum: "4000",
        Active: true,
        CurrentBalance: 150000.0,
        Classification: "Revenue",
        FullyQualifiedName: "Sales Revenue",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2024-03-25T12:00:00Z",
        },
      };

      // TRANSFORM
      const result = transformer.transformQuickBooksAccount(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "qb_1",
        account_code: "4000",
        account_name: "Sales Revenue",
        account_type: AccountType.REVENUE,
        is_debit_normal: false, // Revenue accounts are credit-normal
        balance_sheet_section: null,
        income_statement_section: AccountType.REVENUE,
      });
    });

    it("should transform a QuickBooks liability account", () => {
      // PROVIDER INPUT: QuickBooks Accounts Payable
      const quickBooksInput: QuickBooksAccount = {
        Id: "33",
        Name: "Accounts Payable",
        AccountType: "Accounts Payable",
        AccountSubType: "AccountsPayable",
        AcctNum: "2000",
        Active: true,
        CurrentBalance: 25000.0,
        Classification: "Liability",
        FullyQualifiedName: "Accounts Payable",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2024-03-25T12:00:00Z",
        },
      };

      // TRANSFORM
      const result = transformer.transformQuickBooksAccount(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "qb_33",
        account_code: "2000",
        account_name: "Accounts Payable",
        account_type: AccountType.LIABILITY,
        is_debit_normal: false, // Liability accounts are credit-normal
        balance_sheet_section: AccountType.LIABILITY,
        income_statement_section: null,
      });
    });
  });

  // ===========================================================================
  // QuickBooks Contact Transformations
  // ===========================================================================
  describe("QuickBooks Contact Transformations", () => {
    it("should transform a QuickBooks customer to DimContact", () => {
      // PROVIDER INPUT: QuickBooks Customer
      const quickBooksInput: QuickBooksCustomer = {
        Id: "21",
        DisplayName: "Acme Corporation",
        CompanyName: "Acme Corporation Inc.",
        GivenName: "John",
        FamilyName: "Smith",
        PrimaryEmailAddr: { Address: "john.smith@acme.com" },
        PrimaryPhone: { FreeFormNumber: "(416) 555-1234" },
        BillAddr: {
          City: "Toronto",
          CountrySubDivisionCode: "ON",
          Country: "CA",
        },
        Active: true,
        Balance: 5600.0,
        MetaData: {
          CreateTime: "2024-02-01T09:00:00Z",
          LastUpdatedTime: "2024-03-15T11:30:00Z",
        },
      };

      // TRANSFORM
      const result = transformer.transformQuickBooksCustomer(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT: Standardized DimContact
      expect(result).toMatchObject({
        contact_key: "qb_cust_21",
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

    it("should transform a QuickBooks vendor to DimContact", () => {
      // PROVIDER INPUT: QuickBooks Vendor
      const quickBooksInput: QuickBooksVendor = {
        Id: "45",
        DisplayName: "Office Depot",
        CompanyName: "Office Depot Canada",
        PrimaryEmailAddr: { Address: "orders@officedepot.ca" },
        PrimaryPhone: { FreeFormNumber: "1-800-555-6789" },
        BillAddr: {
          City: "Vancouver",
          CountrySubDivisionCode: "BC",
          Country: "CA",
        },
        Active: true,
        Balance: 1200.5,
        MetaData: {
          CreateTime: "2024-01-10T14:00:00Z",
          LastUpdatedTime: "2024-03-20T16:00:00Z",
        },
      };

      // TRANSFORM
      const result = transformer.transformQuickBooksVendor(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        contact_key: "qb_vend_45",
        source_contact_id: "45",
        contact_type: ContactType.VENDOR,
        display_name: "Office Depot",
        company_name: "Office Depot Canada",
        email: "orders@officedepot.ca",
        phone: "1-800-555-6789",
        address_city: "Vancouver",
        address_province_state: "BC",
        is_customer: false,
        is_vendor: true,
        is_active: true,
      });
    });
  });

  // ===========================================================================
  // QuickBooks Transaction Transformations
  // ===========================================================================
  describe("QuickBooks Transaction Transformations", () => {
    it("should transform a QuickBooks invoice to FactTransactions", () => {
      // PROVIDER INPUT: QuickBooks Invoice
      const quickBooksInput: QuickBooksInvoice = {
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
              TaxCodeRef: { value: "TAX" },
            },
          },
          {
            Id: "2",
            LineNum: 2,
            Amount: 650.0,
            DetailType: "SalesItemLineDetail",
            Description: "HST 13%",
            SalesItemLineDetail: {
              TaxCodeRef: { value: "TAX" },
            },
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

      const accountKeyMap = new Map([
        ["accounts_receivable", "ar_account_key"],
        ["10", "qb_10"],
      ]);

      // TRANSFORM
      const result = transformer.transformQuickBooksInvoice(
        quickBooksInput,
        TEST_ORG_KEY,
        accountKeyMap,
      );

      // EXPECTED OUTPUT: Array of FactTransactions (double-entry)
      expect(result).toHaveLength(3); // 1 A/R debit + 2 line credits

      // A/R Debit Entry
      expect(result[0]).toMatchObject({
        transaction_key: "qb_inv_1001_ar",
        organization_key: TEST_ORG_KEY,
        account_key: "ar_account_key",
        contact_key: "qb_cust_21",
        transaction_type_key: "type_invoice",
        debit_amount: 5650.0,
        credit_amount: 0,
        amount: 5650.0,
        currency_code: "CAD",
        exchange_rate: 1.0,
        amount_cad: 5650.0,
        reference_number: "INV-2024-0042",
        source_system: SourceSystem.QUICKBOOKS,
        source_transaction_id: "1001",
        date_key: 20240315,
      });

      // Revenue Credit Entry (Line 1)
      expect(result[1]).toMatchObject({
        transaction_key: "qb_inv_1001_line_1",
        account_key: "qb_10",
        item_key: "qb_item_10",
        debit_amount: 0,
        credit_amount: 5000.0,
        amount: -5000.0, // Credit is negative in signed amount
        memo: "Consulting Services - March 2024",
      });
    });

    it("should transform a QuickBooks journal entry to FactTransactions", () => {
      // PROVIDER INPUT: QuickBooks Journal Entry
      const quickBooksInput: QuickBooksJournalEntry = {
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

      // TRANSFORM
      const result = transformer.transformQuickBooksJournalEntry(
        quickBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT: Balanced debit/credit entries
      expect(result).toHaveLength(2);

      // Debit Entry
      expect(result[0]).toMatchObject({
        transaction_key: "qb_je_500_1",
        account_key: "qb_6100",
        transaction_type_key: "type_journal",
        debit_amount: 2500.0,
        credit_amount: 0,
        amount: 2500.0,
        reference_number: "JE-2024-001",
        memo: "March rent expense accrual",
        date_key: 20240331,
      });

      // Credit Entry
      expect(result[1]).toMatchObject({
        transaction_key: "qb_je_500_2",
        account_key: "qb_2100",
        debit_amount: 0,
        credit_amount: 2500.0,
        amount: -2500.0,
      });

      // Verify double-entry balances
      const totalDebits = result.reduce((sum, t) => sum + t.debit_amount, 0);
      const totalCredits = result.reduce((sum, t) => sum + t.credit_amount, 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  // ===========================================================================
  // Xero Account Transformations
  // ===========================================================================
  describe("Xero Account Transformations", () => {
    it("should transform a Xero bank account to DimAccount", () => {
      // PROVIDER INPUT: Xero Bank Account
      const xeroInput: XeroAccount = {
        AccountID: "bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        Code: "090",
        Name: "Business Bank Account",
        Type: "BANK",
        Class: "ASSET",
        Status: "ACTIVE",
        Description: "Main operating account",
        TaxType: "NONE",
        EnablePaymentsToAccount: true,
        CurrencyCode: "CAD",
        BankAccountNumber: "12345-67890",
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroAccount(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "xero_bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        source_account_id: "bd9e85e0-0478-433d-ae9f-0b3c4f04bfe4",
        organization_key: TEST_ORG_KEY,
        account_code: "090",
        account_name: "Business Bank Account",
        account_type: AccountType.ASSET,
        account_subtype: "Bank",
        source_account_type: "BANK",
        is_active: true,
        is_debit_normal: true,
        is_gst_hst_collected: false,
        is_gst_hst_paid: false,
      });
    });

    it("should transform a Xero revenue account with GST", () => {
      // PROVIDER INPUT: Xero Sales Account
      const xeroInput: XeroAccount = {
        AccountID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        Code: "200",
        Name: "Sales",
        Type: "REVENUE",
        Class: "REVENUE",
        Status: "ACTIVE",
        Description: "Revenue from sales",
        TaxType: "OUTPUT", // GST collected
        CurrencyCode: "CAD",
        ReportingCode: "REV",
        ReportingCodeName: "Revenue",
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroAccount(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_code: "200",
        account_name: "Sales",
        account_type: AccountType.REVENUE,
        is_debit_normal: false,
        is_gst_hst_collected: true,
        is_gst_hst_paid: false,
        gifi_code: "REV",
      });
    });

    it("should transform a Xero expense account with GST input credits", () => {
      // PROVIDER INPUT: Xero Expense Account
      const xeroInput: XeroAccount = {
        AccountID: "expense-uuid-12345",
        Code: "400",
        Name: "Office Expenses",
        Type: "OVERHEADS",
        Class: "EXPENSE",
        Status: "ACTIVE",
        TaxType: "INPUT", // GST paid (ITC eligible)
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroAccount(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_code: "400",
        account_name: "Office Expenses",
        account_type: AccountType.EXPENSE,
        account_subtype: "Overheads",
        is_debit_normal: true,
        is_gst_hst_collected: false,
        is_gst_hst_paid: true, // ITC eligible
      });
    });
  });

  // ===========================================================================
  // Xero Contact Transformations
  // ===========================================================================
  describe("Xero Contact Transformations", () => {
    it("should transform a Xero customer contact", () => {
      // PROVIDER INPUT: Xero Contact (Customer)
      const xeroInput: XeroContact = {
        ContactID: "contact-uuid-customer",
        ContactNumber: "CUST001",
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
            PostalCode: "H2Y 1A1",
            Country: "Canada",
          },
        ],
        IsSupplier: false,
        IsCustomer: true,
        DefaultCurrency: "CAD",
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroContact(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        contact_key: "xero_contact-uuid-customer",
        source_contact_id: "contact-uuid-customer",
        contact_type: ContactType.CUSTOMER,
        contact_name: "Jane Doe",
        display_name: "Big Corp Ltd",
        company_name: "Big Corp Ltd",
        email: "jane.doe@bigcorp.com",
        phone: "5551234567",
        address_city: "Montreal",
        address_province_state: "QC",
        address_country: "Canada",
        is_customer: true,
        is_vendor: false,
        is_active: true,
      });
    });

    it("should transform a Xero contact that is both customer and supplier", () => {
      // PROVIDER INPUT: Xero Contact (Both)
      const xeroInput: XeroContact = {
        ContactID: "contact-uuid-both",
        ContactStatus: "ACTIVE",
        Name: "Partner Company Inc",
        EmailAddress: "partner@company.com",
        IsSupplier: true,
        IsCustomer: true,
        UpdatedDateUTC: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroContact(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        contact_type: ContactType.BOTH,
        is_customer: true,
        is_vendor: true,
      });
    });
  });

  // ===========================================================================
  // Xero Transaction Transformations
  // ===========================================================================
  describe("Xero Transaction Transformations", () => {
    it("should transform a Xero sales invoice to FactTransactions", () => {
      // PROVIDER INPUT: Xero Sales Invoice (ACCREC)
      const xeroInput: XeroInvoice = {
        InvoiceID: "inv-uuid-12345",
        InvoiceNumber: "INV-0042",
        Type: "ACCREC",
        Contact: { ContactID: "contact-uuid-customer", Name: "Big Corp Ltd" },
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
        Reference: "PO-123",
        UpdatedDateUTC: "2024-03-15T12:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroInvoice(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toHaveLength(2); // Control + 1 line item

      // A/R Control Entry (Debit)
      expect(result[0]).toMatchObject({
        transaction_key: "xero_inv_inv-uuid-12345_control",
        account_key: "ar_default",
        contact_key: "xero_contact-uuid-customer",
        transaction_type_key: "type_invoice",
        debit_amount: 1695.0,
        credit_amount: 0,
        amount: 1695.0,
        reference_number: "INV-0042",
        source_system: SourceSystem.XERO,
        date_key: 20240315,
      });

      // Revenue Line (Credit)
      expect(result[1]).toMatchObject({
        transaction_key: "xero_inv_inv-uuid-12345_line-1",
        account_key: "xero_200",
        class_key: "xero_track_track-1",
        debit_amount: 0,
        credit_amount: 1500.0,
        amount: -1500.0,
        memo: "Professional Services",
      });
    });

    it("should transform a Xero purchase invoice (bill) to FactTransactions", () => {
      // PROVIDER INPUT: Xero Purchase Invoice (ACCPAY)
      const xeroInput: XeroInvoice = {
        InvoiceID: "bill-uuid-67890",
        InvoiceNumber: "BILL-0015",
        Type: "ACCPAY",
        Contact: { ContactID: "vendor-uuid", Name: "Office Supplies Co" },
        Date: "2024-03-20",
        DueDate: "2024-04-20",
        Status: "AUTHORISED",
        LineItems: [
          {
            LineItemID: "bill-line-1",
            Description: "Printer paper and toner",
            Quantity: 1,
            UnitAmount: 450.0,
            AccountCode: "429",
            TaxType: "INPUT",
            TaxAmount: 58.5,
            LineAmount: 450.0,
          },
        ],
        SubTotal: 450.0,
        TotalTax: 58.5,
        Total: 508.5,
        AmountDue: 508.5,
        AmountPaid: 0,
        AmountCredited: 0,
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2024-03-20T14:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformXeroInvoice(xeroInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT (Bill = opposite of Invoice)
      expect(result).toHaveLength(2);

      // A/P Control Entry (Credit for bill)
      expect(result[0]).toMatchObject({
        account_key: "ap_default",
        transaction_type_key: "type_bill",
        debit_amount: 0,
        credit_amount: 508.5,
        amount: -508.5,
      });

      // Expense Line (Debit for bill)
      expect(result[1]).toMatchObject({
        account_key: "xero_429",
        debit_amount: 450.0,
        credit_amount: 0,
        amount: 450.0,
        memo: "Printer paper and toner",
      });
    });
  });

  // ===========================================================================
  // Sage Account Transformations
  // ===========================================================================
  describe("Sage Account Transformations", () => {
    it("should transform a Sage ledger account to DimAccount", () => {
      // PROVIDER INPUT: Sage Account
      const sageInput: SageAccount = {
        id: "sage-acc-123",
        displayed_as: "Trade Debtors",
        ledger_account_group: {
          id: "group-1",
          displayed_as: "Current Assets",
        },
        nominal_code: 1100,
        ledger_account_type: {
          id: "type-1",
          displayed_as: "Trade Debtors Control",
        },
        ledger_account_classification: {
          id: "class-1",
          displayed_as: "Asset",
        },
        balance: 45000.0,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformSageAccount(sageInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "sage_sage-acc-123",
        source_account_id: "sage-acc-123",
        account_code: "1100",
        account_name: "Trade Debtors",
        account_type: AccountType.ASSET,
        account_subtype: "Trade Debtors Control",
        source_account_subtype: "Current Assets",
        is_active: true,
        is_debit_normal: true,
        display_order: 1100,
      });
    });

    it("should transform a Sage liability account", () => {
      // PROVIDER INPUT: Sage Liability Account
      const sageInput: SageAccount = {
        id: "sage-acc-456",
        displayed_as: "Trade Creditors",
        ledger_account_group: {
          id: "group-2",
          displayed_as: "Current Liabilities",
        },
        nominal_code: 2100,
        ledger_account_type: {
          id: "type-2",
          displayed_as: "Trade Creditors Control",
        },
        ledger_account_classification: {
          id: "class-2",
          displayed_as: "Liability",
        },
        balance: 32000.0,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-03-20T10:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformSageAccount(sageInput, TEST_ORG_KEY);

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_code: "2100",
        account_name: "Trade Creditors",
        account_type: AccountType.LIABILITY,
        is_debit_normal: false, // Liabilities are credit-normal
        balance_sheet_section: AccountType.LIABILITY,
      });
    });
  });

  // ===========================================================================
  // FreshBooks Account Transformations
  // ===========================================================================
  describe("FreshBooks Account Transformations", () => {
    it("should transform a FreshBooks account to DimAccount", () => {
      // PROVIDER INPUT: FreshBooks Account
      const freshBooksInput: FreshBooksAccount = {
        accountid: 12345,
        account_number: "1000",
        account_type: {
          value: "cash",
          account_type: "asset",
          account_subtype: "cash_and_bank",
        },
        name: "Business Checking",
        balance: {
          amount: "25430.50",
          code: "CAD",
        },
        system_account: true,
        active: true,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-03-20T14:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformFreshBooksAccount(
        freshBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "fb_12345",
        source_account_id: "12345",
        account_code: "1000",
        account_name: "Business Checking",
        account_type: AccountType.ASSET,
        account_subtype: "cash_and_bank",
        source_account_type: "asset",
        is_system: true,
        is_active: true,
        is_debit_normal: true,
      });
    });

    it("should transform a FreshBooks expense account with parent", () => {
      // PROVIDER INPUT: FreshBooks Expense with Parent
      const freshBooksInput: FreshBooksAccount = {
        accountid: 67890,
        account_number: "5200",
        account_type: {
          value: "advertising",
          account_type: "expense",
          account_subtype: "marketing",
        },
        name: "Online Advertising",
        balance: {
          amount: "3500.00",
          code: "CAD",
        },
        parent_accountid: 67800,
        system_account: false,
        active: true,
        created_at: "2024-02-01T09:00:00Z",
        updated_at: "2024-03-25T11:00:00Z",
      };

      // TRANSFORM
      const result = transformer.transformFreshBooksAccount(
        freshBooksInput,
        TEST_ORG_KEY,
      );

      // EXPECTED OUTPUT
      expect(result).toMatchObject({
        account_key: "fb_67890",
        account_code: "5200",
        account_name: "Online Advertising",
        account_type: AccountType.EXPENSE,
        parent_account_key: "fb_67800",
        hierarchy_level: 2,
        is_system: false,
      });
    });
  });

  // ===========================================================================
  // Cross-Provider Consistency Tests
  // ===========================================================================
  describe("Cross-Provider Consistency", () => {
    it("should produce consistent account types across providers", () => {
      // All providers should map to the same AccountType enum
      const qbAsset: QuickBooksAccount = {
        Id: "1",
        Name: "Cash",
        AccountType: "Bank",
        AccountSubType: "Checking",
        Classification: "Asset",
        Active: true,
        CurrentBalance: 1000,
        FullyQualifiedName: "Cash",
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "", LastUpdatedTime: "" },
      };

      const xeroAsset: XeroAccount = {
        AccountID: "2",
        Code: "090",
        Name: "Cash",
        Type: "BANK",
        Class: "ASSET",
        Status: "ACTIVE",
        UpdatedDateUTC: "",
      };

      const sageAsset: SageAccount = {
        id: "3",
        displayed_as: "Cash",
        nominal_code: 1000,
        ledger_account_type: { id: "", displayed_as: "Bank" },
        ledger_account_group: { id: "", displayed_as: "Current Assets" },
        ledger_account_classification: { id: "", displayed_as: "Asset" },
        balance: 1000,
        is_enabled: true,
        created_at: "",
        updated_at: "",
      };

      const qbResult = transformer.transformQuickBooksAccount(
        qbAsset,
        TEST_ORG_KEY,
      );
      const xeroResult = transformer.transformXeroAccount(
        xeroAsset,
        TEST_ORG_KEY,
      );
      const sageResult = transformer.transformSageAccount(
        sageAsset,
        TEST_ORG_KEY,
      );

      // All should produce ASSET type
      expect(qbResult.account_type).toBe(AccountType.ASSET);
      expect(xeroResult.account_type).toBe(AccountType.ASSET);
      expect(sageResult.account_type).toBe(AccountType.ASSET);

      // All should be debit-normal
      expect(qbResult.is_debit_normal).toBe(true);
      expect(xeroResult.is_debit_normal).toBe(true);
      expect(sageResult.is_debit_normal).toBe(true);
    });

    it("should generate unique keys with provider prefixes", () => {
      const qbAccount = transformer.transformQuickBooksAccount(
        {
          Id: "123",
          Name: "Test",
          AccountType: "Bank",
          AccountSubType: "Checking",
          Classification: "Asset",
          Active: true,
          CurrentBalance: 0,
          FullyQualifiedName: "Test",
          CurrencyRef: { value: "CAD", name: "CAD" },
          MetaData: { CreateTime: "", LastUpdatedTime: "" },
        },
        TEST_ORG_KEY,
      );

      const xeroAccount = transformer.transformXeroAccount(
        {
          AccountID: "123",
          Code: "123",
          Name: "Test",
          Type: "BANK",
          Class: "ASSET",
          Status: "ACTIVE",
          UpdatedDateUTC: "",
        },
        TEST_ORG_KEY,
      );

      // Keys should be different due to provider prefix
      expect(qbAccount.account_key).toBe("qb_123");
      expect(xeroAccount.account_key).toBe("xero_123");
      expect(qbAccount.account_key).not.toBe(xeroAccount.account_key);
    });
  });

  // ===========================================================================
  // Date Key Formatting Tests
  // ===========================================================================
  describe("Date Key Formatting", () => {
    it("should format date keys correctly as YYYYMMDD", () => {
      const invoice: QuickBooksInvoice = {
        Id: "1",
        DocNumber: "INV-001",
        TxnDate: "2024-12-25",
        CustomerRef: { value: "1", name: "Test" },
        Line: [],
        TotalAmt: 100,
        Balance: 100,
        CurrencyRef: { value: "CAD", name: "CAD" },
        MetaData: { CreateTime: "", LastUpdatedTime: "" },
      };

      const result = transformer.transformQuickBooksInvoice(
        invoice,
        TEST_ORG_KEY,
        new Map([["accounts_receivable", "ar"]]),
      );

      expect(result[0].date_key).toBe(20241225);
    });
  });

  // ===========================================================================
  // Multi-Currency Transaction Tests
  // ===========================================================================
  describe("Multi-Currency Transactions", () => {
    it("should handle USD transactions with exchange rate", () => {
      const invoice: QuickBooksInvoice = {
        Id: "500",
        DocNumber: "INV-USD-001",
        TxnDate: "2024-03-15",
        CustomerRef: { value: "100", name: "US Customer" },
        Line: [
          {
            Id: "1",
            LineNum: 1,
            Amount: 1000.0,
            DetailType: "SalesItemLineDetail",
          },
        ],
        TotalAmt: 1000.0,
        Balance: 1000.0,
        CurrencyRef: { value: "USD", name: "US Dollar" },
        ExchangeRate: 1.35, // 1 USD = 1.35 CAD
        MetaData: { CreateTime: "", LastUpdatedTime: "" },
      };

      const result = transformer.transformQuickBooksInvoice(
        invoice,
        TEST_ORG_KEY,
        new Map([["accounts_receivable", "ar"]]),
      );

      expect(result[0]).toMatchObject({
        currency_code: "USD",
        exchange_rate: 1.35,
        amount: 1000.0,
        amount_cad: 1350.0, // 1000 * 1.35
      });
    });
  });
});
