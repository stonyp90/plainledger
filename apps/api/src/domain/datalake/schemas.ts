/**
 * Datalake Gold Layer Schema Types
 * These types represent the standardized star schema format for Power BI analytics
 */

// =============================================================================
// Dimension Types
// =============================================================================

export interface DimOrganization {
  organization_key: string;
  organization_id: string;
  organization_name: string;
  legal_name: string;
  tax_number: string;
  currency_code: string;
  fiscal_year_end_month: number;
  industry: string;
  industry_category: string;
  accounting_standard: string;
  country_code: string;
  province_state: string;
  is_current: boolean;
  valid_from: Date;
  valid_to: Date | null;
}

export interface DimAccount {
  account_key: string;
  account_id: string;
  source_account_id: string;
  organization_key: string;
  account_code: string;
  account_name: string;
  account_name_fr: string;
  account_type_key: string;
  account_type: AccountType;
  account_subtype: string;
  source_account_type: string;
  source_account_subtype: string;
  parent_account_key: string | null;
  hierarchy_level: number;
  hierarchy_path: string;
  is_active: boolean;
  is_system: boolean;
  display_order: number;
  is_debit_normal: boolean;
  balance_sheet_section: string | null;
  income_statement_section: string | null;
  cash_flow_section: string | null;
  is_gst_hst_collected: boolean;
  is_gst_hst_paid: boolean;
  is_pst_qst_collected: boolean;
  gifi_code: string | null;
  is_sred_eligible: boolean;
  is_apprentice_wage: boolean;
  is_digital_media_labour: boolean;
  is_clean_tech_asset: boolean;
}

export interface DimContact {
  contact_key: string;
  contact_id: string;
  source_contact_id: string;
  organization_key: string;
  contact_type: ContactType;
  contact_name: string;
  display_name: string;
  company_name: string;
  email: string;
  phone: string;
  address_city: string;
  address_province_state: string;
  address_country: string;
  is_customer: boolean;
  is_vendor: boolean;
  is_active: boolean;
  payment_terms: string;
  tax_number: string;
}

export interface DimItem {
  item_key: string;
  item_id: string;
  source_item_id: string;
  organization_key: string;
  item_code: string;
  item_name: string;
  item_description: string;
  item_type: ItemType;
  category: string;
  income_account_key: string | null;
  expense_account_key: string | null;
  unit_price: number;
  unit_cost: number;
  is_active: boolean;
  is_taxable: boolean;
}

export interface DimTransactionType {
  transaction_type_key: string;
  transaction_type_code: TransactionTypeCode;
  transaction_type_name: string;
  transaction_type_name_fr: string;
  source_system: SourceSystem;
  source_type: string;
  affects_ar: boolean;
  affects_ap: boolean;
  affects_cash: boolean;
}

// =============================================================================
// Fact Types
// =============================================================================

export interface FactTransaction {
  transaction_key: string;
  transaction_id: string;
  organization_key: string;
  business_unit_key: string | null;
  account_key: string;
  date_key: number;
  contact_key: string | null;
  item_key: string | null;
  class_key: string | null;
  location_key: string | null;
  transaction_type_key: string;
  transaction_date: Date;
  posting_date: Date;
  debit_amount: number;
  credit_amount: number;
  amount: number;
  currency_code: string;
  exchange_rate: number;
  amount_cad: number;
  reference_number: string;
  memo: string;
  source_system: SourceSystem;
  source_transaction_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface FactAccountBalance {
  balance_key: string;
  organization_key: string;
  business_unit_key: string | null;
  account_key: string;
  date_key: number;
  as_of_date: Date;
  fiscal_year: number;
  fiscal_period: number;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  net_change: number;
  closing_balance: number;
  balance_type: BalanceType;
  currency_code: string;
}

// =============================================================================
// Enums
// =============================================================================

export enum AccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

export enum ContactType {
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  BOTH = "BOTH",
}

export enum ItemType {
  INVENTORY = "INVENTORY",
  SERVICE = "SERVICE",
  NON_INVENTORY = "NON_INVENTORY",
}

export enum TransactionTypeCode {
  INVOICE = "INVOICE",
  BILL = "BILL",
  PAYMENT = "PAYMENT",
  BILL_PAYMENT = "BILL_PAYMENT",
  JOURNAL = "JOURNAL",
  TRANSFER = "TRANSFER",
  EXPENSE = "EXPENSE",
  DEPOSIT = "DEPOSIT",
  CREDIT_NOTE = "CREDIT_NOTE",
  REFUND = "REFUND",
}

export enum SourceSystem {
  QUICKBOOKS = "QUICKBOOKS",
  XERO = "XERO",
  SAGE = "SAGE",
  FRESHBOOKS = "FRESHBOOKS",
  WAVE = "WAVE",
  CSV = "CSV",
}

export enum BalanceType {
  MTD = "MTD",
  QTD = "QTD",
  YTD = "YTD",
  CUMULATIVE = "CUMULATIVE",
}
