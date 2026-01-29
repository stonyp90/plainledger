/**
 * Bronze Layer Schema Types
 *
 * The Bronze layer contains raw data as received from source systems.
 * Data is stored with minimal transformation - just adding metadata.
 * Format: JSON/Parquet with source structure preserved.
 */

export interface BronzeMetadata {
  /** Unique ingestion ID */
  ingestion_id: string;
  /** Source system identifier */
  source_system: string;
  /** Organization ID in PlainLedger */
  organization_id: string;
  /** Data source connection ID */
  datasource_id: string;
  /** Timestamp when data was ingested */
  ingested_at: Date;
  /** API endpoint or file source */
  source_endpoint: string;
  /** Raw HTTP status or file status */
  ingestion_status: "success" | "partial" | "failed";
  /** Number of records in this batch */
  record_count: number;
  /** Hash of the raw payload for deduplication */
  payload_hash: string;
}

/**
 * Bronze record wrapper - preserves raw data with metadata
 */
export interface BronzeRecord<T = unknown> {
  metadata: BronzeMetadata;
  /** Raw data exactly as received from source */
  raw_data: T;
}

// =============================================================================
// Bronze Layer - QuickBooks Raw Data
// =============================================================================

export interface BronzeQuickBooksAccount {
  metadata: BronzeMetadata;
  raw_data: {
    Id: string;
    Name: string;
    AccountType: string;
    AccountSubType: string;
    AcctNum?: string;
    Active: boolean;
    CurrentBalance: number;
    Classification: string;
    FullyQualifiedName: string;
    ParentRef?: { value: string; name: string };
    CurrencyRef: { value: string; name: string };
    MetaData: { CreateTime: string; LastUpdatedTime: string };
  };
}

export interface BronzeQuickBooksCustomer {
  metadata: BronzeMetadata;
  raw_data: {
    Id: string;
    DisplayName: string;
    CompanyName?: string;
    GivenName?: string;
    FamilyName?: string;
    PrimaryEmailAddr?: { Address: string };
    PrimaryPhone?: { FreeFormNumber: string };
    BillAddr?: {
      City?: string;
      CountrySubDivisionCode?: string;
      Country?: string;
      PostalCode?: string;
      Line1?: string;
    };
    Active: boolean;
    Balance: number;
    MetaData: { CreateTime: string; LastUpdatedTime: string };
  };
}

export interface BronzeQuickBooksInvoice {
  metadata: BronzeMetadata;
  raw_data: {
    Id: string;
    DocNumber: string;
    TxnDate: string;
    DueDate?: string;
    CustomerRef: { value: string; name: string };
    Line: Array<{
      Id: string;
      LineNum: number;
      Amount: number;
      DetailType: string;
      Description?: string;
      SalesItemLineDetail?: {
        ItemRef?: { value: string; name: string };
        Qty?: number;
        UnitPrice?: number;
        TaxCodeRef?: { value: string };
      };
      AccountBasedExpenseLineDetail?: {
        AccountRef: { value: string; name: string };
      };
    }>;
    TotalAmt: number;
    Balance: number;
    CurrencyRef: { value: string; name: string };
    ExchangeRate?: number;
    PrivateNote?: string;
    MetaData: { CreateTime: string; LastUpdatedTime: string };
  };
}

export interface BronzeQuickBooksJournalEntry {
  metadata: BronzeMetadata;
  raw_data: {
    Id: string;
    DocNumber?: string;
    TxnDate: string;
    Line: Array<{
      Id: string;
      Amount: number;
      DetailType: string;
      JournalEntryLineDetail: {
        PostingType: "Debit" | "Credit";
        AccountRef: { value: string; name: string };
        Entity?: {
          Type: string;
          EntityRef: { value: string; name: string };
        };
        ClassRef?: { value: string; name: string };
        DepartmentRef?: { value: string; name: string };
      };
      Description?: string;
    }>;
    PrivateNote?: string;
    CurrencyRef: { value: string; name: string };
    ExchangeRate?: number;
    MetaData: { CreateTime: string; LastUpdatedTime: string };
  };
}

// =============================================================================
// Bronze Layer - Xero Raw Data
// =============================================================================

export interface BronzeXeroAccount {
  metadata: BronzeMetadata;
  raw_data: {
    AccountID: string;
    Code: string;
    Name: string;
    Type: string;
    Class: string;
    Status: string;
    Description?: string;
    TaxType?: string;
    CurrencyCode?: string;
    ReportingCode?: string;
    UpdatedDateUTC: string;
  };
}

export interface BronzeXeroContact {
  metadata: BronzeMetadata;
  raw_data: {
    ContactID: string;
    ContactNumber?: string;
    ContactStatus: string;
    Name: string;
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    Phones?: Array<{
      PhoneType: string;
      PhoneNumber?: string;
    }>;
    Addresses?: Array<{
      AddressType: string;
      City?: string;
      Region?: string;
      Country?: string;
    }>;
    IsSupplier: boolean;
    IsCustomer: boolean;
    UpdatedDateUTC: string;
  };
}

export interface BronzeXeroInvoice {
  metadata: BronzeMetadata;
  raw_data: {
    InvoiceID: string;
    InvoiceNumber: string;
    Type: string;
    Contact: { ContactID: string; Name: string };
    Date: string;
    DueDate?: string;
    Status: string;
    LineItems: Array<{
      LineItemID: string;
      Description?: string;
      Quantity?: number;
      UnitAmount?: number;
      AccountCode?: string;
      TaxType?: string;
      TaxAmount?: number;
      LineAmount: number;
      Tracking?: Array<{ TrackingCategoryID: string; Option: string }>;
    }>;
    SubTotal: number;
    TotalTax: number;
    Total: number;
    AmountDue: number;
    CurrencyCode: string;
    CurrencyRate?: number;
    UpdatedDateUTC: string;
  };
}

// =============================================================================
// Bronze Layer - Sage Raw Data
// =============================================================================

export interface BronzeSageAccount {
  metadata: BronzeMetadata;
  raw_data: {
    id: string;
    displayed_as: string;
    ledger_account_group: {
      id: string;
      displayed_as: string;
    };
    nominal_code: number;
    ledger_account_type: {
      id: string;
      displayed_as: string;
    };
    ledger_account_classification: {
      id: string;
      displayed_as: string;
    };
    balance: number;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface BronzeSageContact {
  metadata: BronzeMetadata;
  raw_data: {
    id: string;
    displayed_as: string;
    reference?: string;
    contact_types: Array<{ id: string; displayed_as: string }>;
    name: string;
    email?: string;
    telephone?: string;
    mobile?: string;
    main_address?: {
      address_line_1?: string;
      city?: string;
      region?: string;
      postal_code?: string;
      country: { id: string; displayed_as: string };
    };
    is_customer: boolean;
    is_supplier: boolean;
    currency: { id: string; displayed_as: string };
    created_at: string;
    updated_at: string;
  };
}

// =============================================================================
// Bronze Layer - FreshBooks Raw Data
// =============================================================================

export interface BronzeFreshBooksAccount {
  metadata: BronzeMetadata;
  raw_data: {
    accountid: number;
    account_number: string;
    account_type: {
      value: string;
      account_type: string;
      account_subtype: string;
    };
    name: string;
    balance: {
      amount: string;
      code: string;
    };
    parent_accountid?: number;
    system_account: boolean;
    active: boolean;
    created_at: string;
    updated_at: string;
  };
}

export interface BronzeFreshBooksClient {
  metadata: BronzeMetadata;
  raw_data: {
    id: number;
    userid: number;
    email?: string;
    organization?: string;
    fname?: string;
    lname?: string;
    p_street?: string;
    p_city?: string;
    p_province?: string;
    p_country?: string;
    p_code?: string;
    home_phone?: string;
    currency_code: string;
    outstanding_balance?: Array<{ amount: string; code: string }>;
    updated: string;
    vis_state: number;
  };
}
