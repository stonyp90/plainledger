/**
 * Silver Layer Schema Types
 *
 * The Silver layer contains cleansed, standardized, and validated data.
 * Data quality rules are applied, duplicates removed, and schemas normalized.
 * Format: Parquet with consistent schema across all sources.
 */

export interface SilverMetadata {
  /** Reference to bronze ingestion */
  bronze_ingestion_id: string;
  /** Processing job ID */
  processing_job_id: string;
  /** When the silver record was created */
  processed_at: Date;
  /** Source system (normalized) */
  source_system: SilverSourceSystem;
  /** Organization ID */
  organization_id: string;
  /** Data quality score (0-100) */
  quality_score: number;
  /** Data quality issues found */
  quality_issues: string[];
  /** Whether this record passed validation */
  is_valid: boolean;
}

export enum SilverSourceSystem {
  QUICKBOOKS = "QUICKBOOKS",
  XERO = "XERO",
  SAGE = "SAGE",
  FRESHBOOKS = "FRESHBOOKS",
  WAVE = "WAVE",
  CSV = "CSV",
}

// =============================================================================
// Silver Layer - Standardized Account
// =============================================================================

export interface SilverAccount {
  metadata: SilverMetadata;

  // Keys
  silver_account_id: string;
  source_account_id: string;
  organization_id: string;

  // Standardized fields
  account_code: string;
  account_name: string;
  account_type: SilverAccountType;
  account_subtype: string;
  parent_account_id: string | null;

  // Source mapping
  source_account_type: string;
  source_account_subtype: string;

  // Status
  is_active: boolean;
  is_system_account: boolean;

  // Hierarchy
  hierarchy_level: number;
  hierarchy_path: string;

  // Accounting attributes
  normal_balance: "DEBIT" | "CREDIT";
  currency_code: string;

  // Timestamps
  source_created_at: Date;
  source_updated_at: Date;
}

export enum SilverAccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

// =============================================================================
// Silver Layer - Standardized Contact
// =============================================================================

export interface SilverContact {
  metadata: SilverMetadata;

  // Keys
  silver_contact_id: string;
  source_contact_id: string;
  organization_id: string;

  // Standardized fields
  contact_type: SilverContactType;
  display_name: string;
  legal_name: string | null;
  first_name: string | null;
  last_name: string | null;

  // Contact info (validated)
  email: string | null;
  email_is_valid: boolean;
  phone: string | null;
  phone_normalized: string | null;

  // Address (standardized)
  address_line1: string | null;
  address_city: string | null;
  address_province_state: string | null;
  address_province_code: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  address_country_code: string | null;

  // Status
  is_active: boolean;

  // Timestamps
  source_created_at: Date;
  source_updated_at: Date;
}

export enum SilverContactType {
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  CUSTOMER_AND_VENDOR = "CUSTOMER_AND_VENDOR",
}

// =============================================================================
// Silver Layer - Standardized Transaction
// =============================================================================

export interface SilverTransaction {
  metadata: SilverMetadata;

  // Keys
  silver_transaction_id: string;
  source_transaction_id: string;
  source_line_id: string | null;
  organization_id: string;

  // Transaction header
  transaction_type: SilverTransactionType;
  transaction_date: Date;
  posting_date: Date;
  reference_number: string | null;
  memo: string | null;

  // Account reference
  source_account_id: string;
  account_code: string | null;

  // Contact reference
  source_contact_id: string | null;

  // Amounts (normalized)
  debit_amount: number;
  credit_amount: number;
  net_amount: number;

  // Currency
  currency_code: string;
  exchange_rate: number;
  amount_in_base_currency: number;

  // Item/Class references
  source_item_id: string | null;
  source_class_id: string | null;
  source_location_id: string | null;

  // Timestamps
  source_created_at: Date;
  source_updated_at: Date;
}

export enum SilverTransactionType {
  INVOICE = "INVOICE",
  BILL = "BILL",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  PAYMENT_MADE = "PAYMENT_MADE",
  JOURNAL_ENTRY = "JOURNAL_ENTRY",
  CREDIT_NOTE = "CREDIT_NOTE",
  BILL_CREDIT = "BILL_CREDIT",
  TRANSFER = "TRANSFER",
  EXPENSE = "EXPENSE",
  DEPOSIT = "DEPOSIT",
}

// =============================================================================
// Data Quality Rules
// =============================================================================

export interface DataQualityRule {
  rule_id: string;
  rule_name: string;
  severity: "ERROR" | "WARNING" | "INFO";
  field: string;
  condition: string;
}

export const SILVER_QUALITY_RULES: DataQualityRule[] = [
  {
    rule_id: "ACC_001",
    rule_name: "Account code required",
    severity: "ERROR",
    field: "account_code",
    condition: "NOT_NULL",
  },
  {
    rule_id: "ACC_002",
    rule_name: "Account name required",
    severity: "ERROR",
    field: "account_name",
    condition: "NOT_NULL",
  },
  {
    rule_id: "ACC_003",
    rule_name: "Valid account type",
    severity: "ERROR",
    field: "account_type",
    condition: "IN_SET",
  },
  {
    rule_id: "TXN_001",
    rule_name: "Transaction must balance",
    severity: "ERROR",
    field: "net_amount",
    condition: "DEBIT_EQUALS_CREDIT",
  },
  {
    rule_id: "TXN_002",
    rule_name: "Valid transaction date",
    severity: "ERROR",
    field: "transaction_date",
    condition: "VALID_DATE",
  },
  {
    rule_id: "TXN_003",
    rule_name: "Amount must be positive",
    severity: "WARNING",
    field: "debit_amount",
    condition: "GREATER_THAN_ZERO",
  },
  {
    rule_id: "CON_001",
    rule_name: "Valid email format",
    severity: "WARNING",
    field: "email",
    condition: "EMAIL_FORMAT",
  },
  {
    rule_id: "CON_002",
    rule_name: "Display name required",
    severity: "ERROR",
    field: "display_name",
    condition: "NOT_NULL",
  },
];
