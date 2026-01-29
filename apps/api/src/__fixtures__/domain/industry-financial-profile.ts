/**
 * Industry Financial Profile Interfaces
 *
 * Clean Architecture: Domain layer fixture definitions
 * Defines the financial profile for each industry without implementation details.
 * These profiles drive test fixture generation with realistic industry-specific data.
 */

import { QuickBooksAccountType } from "@domain/datalake/quickbooks-detail-types";

// =============================================================================
// Core Profile Interfaces
// =============================================================================

export interface IndustryFinancialProfile {
  /** Industry identifier matching INDUSTRY_TEMPLATES */
  industryId: string;
  /** Human-readable industry name */
  name: { en: string; fr: string };
  /** Company characteristics for this industry */
  companyProfile: CompanyProfile;
  /** Chart of accounts structure */
  accountStructure: AccountStructure;
  /** Expected KPI outputs for validation */
  expectedKPIs: ExpectedKPIs;
  /** Sample customers for this industry */
  customerProfiles?: CustomerProfile[];
  /** Sample vendors for this industry */
  vendorProfiles?: VendorProfile[];
}

// =============================================================================
// Company Profile
// =============================================================================

export interface CompanyProfile {
  /** Company name template (uses {province} placeholder) */
  companyNameTemplate: string;
  /** Annual revenue range (CAD) for mid-market companies */
  typicalRevenue: { min: number; max: number };
  /** Typical employee count */
  typicalEmployeeCount: { min: number; max: number };
  /** Primary province (for tax/address purposes) */
  province: "QC" | "ON" | "BC" | "AB";
  /** Currency (always CAD for Canadian focus) */
  currency: "CAD";
  /** Fiscal year start month (1 = January) */
  fiscalYearStartMonth: number;
}

// =============================================================================
// Account Structure
// =============================================================================

export interface AccountStructure {
  /** Revenue accounts */
  revenueAccounts: AccountTemplate[];
  /** Expense accounts */
  expenseAccounts: AccountTemplate[];
  /** Asset accounts */
  assetAccounts: AccountTemplate[];
  /** Liability accounts */
  liabilityAccounts: AccountTemplate[];
  /** Cost of Goods Sold accounts (if applicable) */
  cogsAccounts?: AccountTemplate[];
  /** Equity accounts */
  equityAccounts?: AccountTemplate[];
}

export interface AccountTemplate {
  /** Account name */
  name: string;
  /** QuickBooks account type */
  quickBooksType: QuickBooksAccountType;
  /** QuickBooks detail type (subtype) */
  quickBooksSubtype: string;
  /** Account number prefix (e.g., "1000", "4000") */
  accountNumberPrefix: string;
  /** Classification for this account */
  classification: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  /** Typical balance range (for balance sheet accounts) */
  typicalBalanceRange?: { min: number; max: number };
  /** Balance as percentage of revenue (for expense/COGS accounts) */
  balanceAsPercentOfRevenue?: number;
  /** Is this a contra account (e.g., accumulated depreciation)? */
  isContra?: boolean;
  /** Priority for this industry (higher = more important) */
  industryPriority?: number;
}

// =============================================================================
// Expected KPIs
// =============================================================================

export interface ExpectedKPIs {
  [kpiId: string]: ExpectedKPIValue;
}

export interface ExpectedKPIValue {
  /** Expected range for this KPI */
  expectedRange: { min: number; max: number };
  /** Display format */
  format: "percentage" | "currency" | "number" | "days" | "ratio";
  /** Industry benchmark (optional) */
  benchmark?: { min: number; max: number };
  /** KPI name for display */
  name?: { en: string; fr: string };
}

// =============================================================================
// Customer Profile
// =============================================================================

export interface CustomerProfile {
  /** Customer type template */
  displayNameTemplate: string;
  /** Is a company (vs individual) */
  isCompany: boolean;
  /** Typical balance range */
  typicalBalanceRange: { min: number; max: number };
  /** Province */
  province: string;
  /** City */
  city: string;
}

// =============================================================================
// Vendor Profile
// =============================================================================

export interface VendorProfile {
  /** Vendor name template */
  displayNameTemplate: string;
  /** Vendor category (e.g., "supplier", "contractor") */
  category: string;
  /** Typical balance range */
  typicalBalanceRange: { min: number; max: number };
}

// =============================================================================
// Generated Fixture Output Types
// =============================================================================

export interface GeneratedFixture {
  /** Industry ID */
  industryId: string;
  /** Source profile used */
  profile: IndustryFinancialProfile;
  /** Raw QuickBooks-like data */
  rawData: QuickBooksDataset;
  /** Transformed data through pipeline */
  transformed: TransformedData;
  /** Expected KPI values for validation */
  expectedKPIs: ExpectedKPIs;
}

export interface QuickBooksDataset {
  companyInfo: QuickBooksCompanyInfo;
  accounts: QuickBooksAccountData[];
  customers: QuickBooksCustomerData[];
  vendors: QuickBooksVendorData[];
  invoices: QuickBooksInvoiceData[];
  journalEntries: QuickBooksJournalEntryData[];
}

export interface TransformedData {
  bronze: {
    accounts: unknown[];
    customers?: unknown[];
  };
  silver: {
    accounts: unknown[];
    contacts?: unknown[];
    transactions?: unknown[];
  };
  gold: {
    accounts: unknown[];
    contacts?: unknown[];
    transactions?: unknown[];
  };
}

// =============================================================================
// QuickBooks Data Types (for fixture generation)
// =============================================================================

export interface QuickBooksCompanyInfo {
  CompanyName: string;
  LegalName: string;
  Country: string;
  FiscalYearStartMonth: string;
  CompanyAddr?: {
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
    Country: string;
  };
}

export interface QuickBooksAccountData {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType: string;
  AcctNum: string;
  Classification: "Asset" | "Liability" | "Equity" | "Revenue" | "Expense";
  CurrentBalance: number;
  Active: boolean;
  FullyQualifiedName: string;
  CurrencyRef: { value: string; name: string };
  MetaData: { CreateTime: string; LastUpdatedTime: string };
}

export interface QuickBooksCustomerData {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
    Country: string;
  };
  Active: boolean;
  Balance: number;
  MetaData: { CreateTime: string; LastUpdatedTime: string };
}

export interface QuickBooksVendorData {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  Active: boolean;
  Balance: number;
  MetaData: { CreateTime: string; LastUpdatedTime: string };
}

export interface QuickBooksInvoiceData {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate: string;
  CustomerRef: { value: string; name: string };
  Line: Array<{
    Id: string;
    LineNum: number;
    Amount: number;
    DetailType: string;
    Description: string;
  }>;
  TotalAmt: number;
  Balance: number;
  CurrencyRef: { value: string; name: string };
  MetaData: { CreateTime: string; LastUpdatedTime: string };
}

export interface QuickBooksJournalEntryData {
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
    };
    Description?: string;
  }>;
  CurrencyRef: { value: string; name: string };
  MetaData: { CreateTime: string; LastUpdatedTime: string };
}

// =============================================================================
// Fixture Options
// =============================================================================

export interface FixtureOptions {
  /** Fixed annual revenue (overrides typical range) */
  revenue?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Number of customers to generate */
  customerCount?: number;
  /** Number of vendors to generate */
  vendorCount?: number;
  /** Number of invoices to generate */
  invoiceCount?: number;
  /** Skip caching (force regeneration) */
  skipCache?: boolean;
}
