/**
 * Provider-specific data types
 * These represent the raw data format from each accounting provider's API
 */

// =============================================================================
// QuickBooks Online Data Types
// =============================================================================

export interface QuickBooksAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType: string;
  AcctNum?: string;
  Active: boolean;
  CurrentBalance: number;
  Classification: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  FullyQualifiedName: string;
  ParentRef?: { value: string; name: string };
  CurrencyRef: { value: string; name: string };
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
    Country?: string;
  };
  Active: boolean;
  Balance: number;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksVendor {
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
  };
  Active: boolean;
  Balance: number;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef: { value: string; name: string };
  Line: QuickBooksLine[];
  TotalAmt: number;
  Balance: number;
  CurrencyRef: { value: string; name: string };
  ExchangeRate?: number;
  PrivateNote?: string;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksLine {
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
    TaxCodeRef?: { value: string };
  };
}

export interface QuickBooksJournalEntry {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  Line: QuickBooksJournalLine[];
  PrivateNote?: string;
  CurrencyRef: { value: string; name: string };
  ExchangeRate?: number;
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksJournalLine {
  Id: string;
  Amount: number;
  DetailType: "JournalEntryLineDetail";
  JournalEntryLineDetail: {
    PostingType: "Debit" | "Credit";
    AccountRef: { value: string; name: string };
    Entity?: {
      Type: "Customer" | "Vendor";
      EntityRef: { value: string; name: string };
    };
    ClassRef?: { value: string; name: string };
    DepartmentRef?: { value: string; name: string };
  };
  Description?: string;
}

// =============================================================================
// Xero Data Types
// =============================================================================

export interface XeroAccount {
  AccountID: string;
  Code: string;
  Name: string;
  Type:
    | "BANK"
    | "CURRENT"
    | "CURRLIAB"
    | "DEPRECIATN"
    | "DIRECTCOSTS"
    | "EQUITY"
    | "EXPENSE"
    | "FIXED"
    | "INVENTORY"
    | "LIABILITY"
    | "NONCURRENT"
    | "OTHERINCOME"
    | "OVERHEADS"
    | "PREPAYMENT"
    | "REVENUE"
    | "SALES"
    | "TERMLIAB"
    | "PAYGLIABILITY"
    | "SUPERANNUATIONEXPENSE"
    | "SUPERANNUATIONLIABILITY"
    | "WAGESEXPENSE";
  Class: "ASSET" | "EQUITY" | "EXPENSE" | "LIABILITY" | "REVENUE";
  Status: "ACTIVE" | "ARCHIVED";
  Description?: string;
  TaxType?: string;
  EnablePaymentsToAccount?: boolean;
  ShowInExpenseClaims?: boolean;
  BankAccountNumber?: string;
  BankAccountType?: string;
  CurrencyCode?: string;
  ReportingCode?: string;
  ReportingCodeName?: string;
  UpdatedDateUTC: string;
}

export interface XeroContact {
  ContactID: string;
  ContactNumber?: string;
  AccountNumber?: string;
  ContactStatus: "ACTIVE" | "ARCHIVED" | "GDPRREQUEST";
  Name: string;
  FirstName?: string;
  LastName?: string;
  EmailAddress?: string;
  Phones?: XeroPhone[];
  Addresses?: XeroAddress[];
  IsSupplier: boolean;
  IsCustomer: boolean;
  DefaultCurrency?: string;
  UpdatedDateUTC: string;
}

export interface XeroPhone {
  PhoneType: "DEFAULT" | "DDI" | "MOBILE" | "FAX";
  PhoneNumber?: string;
  PhoneAreaCode?: string;
  PhoneCountryCode?: string;
}

export interface XeroAddress {
  AddressType: "POBOX" | "STREET" | "DELIVERY";
  City?: string;
  Region?: string;
  PostalCode?: string;
  Country?: string;
  AddressLine1?: string;
}

export interface XeroInvoice {
  InvoiceID: string;
  InvoiceNumber: string;
  Type: "ACCPAY" | "ACCREC";
  Contact: { ContactID: string; Name: string };
  Date: string;
  DueDate?: string;
  Status: "DRAFT" | "SUBMITTED" | "AUTHORISED" | "PAID" | "VOIDED" | "DELETED";
  LineItems: XeroLineItem[];
  SubTotal: number;
  TotalTax: number;
  Total: number;
  AmountDue: number;
  AmountPaid: number;
  AmountCredited: number;
  CurrencyCode: string;
  CurrencyRate?: number;
  Reference?: string;
  UpdatedDateUTC: string;
}

export interface XeroLineItem {
  LineItemID: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  ItemCode?: string;
  AccountCode?: string;
  TaxType?: string;
  TaxAmount?: number;
  LineAmount: number;
  Tracking?: { TrackingCategoryID: string; Option: string }[];
}

export interface XeroManualJournal {
  ManualJournalID: string;
  Narration: string;
  Date: string;
  Status: "DRAFT" | "POSTED" | "DELETED" | "VOIDED";
  JournalLines: XeroJournalLine[];
  ShowOnCashBasisReports?: boolean;
  UpdatedDateUTC: string;
}

export interface XeroJournalLine {
  LineAmount: number;
  AccountCode: string;
  Description?: string;
  TaxType?: string;
  TaxAmount?: number;
  IsBlank?: boolean;
  Tracking?: { TrackingCategoryID: string; Option: string }[];
}

// =============================================================================
// Sage Data Types
// =============================================================================

export interface SageAccount {
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
}

export interface SageContact {
  id: string;
  displayed_as: string;
  reference?: string;
  contact_types: { id: string; displayed_as: string }[];
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
}

export interface SageInvoice {
  id: string;
  displayed_as: string;
  invoice_number: string;
  contact: { id: string; displayed_as: string };
  date: string;
  due_date?: string;
  status: { id: string; displayed_as: string };
  invoice_lines: SageInvoiceLine[];
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  outstanding_amount: number;
  currency: { id: string; displayed_as: string };
  exchange_rate?: number;
  reference?: string;
  created_at: string;
  updated_at: string;
}

export interface SageInvoiceLine {
  id: string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  ledger_account: { id: string; displayed_as: string };
  tax_rate?: { id: string; displayed_as: string };
  tax_amount?: number;
  total_amount: number;
}

// =============================================================================
// FreshBooks Data Types
// =============================================================================

export interface FreshBooksAccount {
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
}

export interface FreshBooksClient {
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
  outstanding_balance?: { amount: string; code: string }[];
  updated: string;
  vis_state: number; // 0=active, 1=deleted, 2=archived
}

export interface FreshBooksInvoice {
  id: number;
  invoiceid: number;
  invoice_number: string;
  customerid: number;
  create_date: string;
  due_date?: string;
  status: number; // 1=draft, 2=sent, 3=viewed, 4=paid, etc.
  lines: FreshBooksLine[];
  amount: { amount: string; code: string };
  outstanding: { amount: string; code: string };
  currency_code: string;
  notes?: string;
  updated: string;
}

export interface FreshBooksLine {
  lineid: number;
  description?: string;
  qty: string;
  unit_cost: { amount: string; code: string };
  amount: { amount: string; code: string };
  taxName1?: string;
  taxAmount1?: number;
}
