/**
 * Gold Layer Pre-Calculated Metrics
 *
 * Pre-aggregated metrics for instant queries and improved performance.
 * These metrics are calculated during ETL and stored in fact_monthly_metrics table.
 */

// =============================================================================
// Fact Monthly Metrics
// =============================================================================

export interface FactMonthlyMetrics {
  /** Unique metric key */
  metric_key: string;
  /** Organization key */
  organization_key: string;
  /** Date key (YYYYMM format) */
  date_key: number;
  /** Industry ID */
  industry_id: string;

  // =========================================================================
  // Pre-aggregated P&L Values
  // =========================================================================
  /** Total revenue for the month */
  total_revenue: number;
  /** Total expenses for the month */
  total_expenses: number;
  /** Gross profit */
  gross_profit: number;
  /** Net income */
  net_income: number;

  // =========================================================================
  // Balance Sheet Snapshots (end of month)
  // =========================================================================
  /** Total assets */
  total_assets: number;
  /** Total liabilities */
  total_liabilities: number;
  /** Total equity */
  total_equity: number;
  /** Cash on hand */
  cash_on_hand: number;
  /** Accounts receivable balance */
  accounts_receivable: number;
  /** Accounts payable balance */
  accounts_payable: number;

  // =========================================================================
  // Industry-Specific Metrics (populated based on industry)
  // =========================================================================
  /** Industry-specific KPIs as JSON */
  industry_metrics: Record<string, number>;

  // =========================================================================
  // Comparison Values
  // =========================================================================
  /** Prior month revenue */
  prior_month_revenue: number;
  /** Prior year revenue (same month, previous year) */
  prior_year_revenue: number;
  /** Budget revenue (if available) */
  budget_revenue?: number;
  /** Month-over-month revenue change % */
  mom_revenue_change_pct: number;
  /** Year-over-year revenue change % */
  yoy_revenue_change_pct: number;

  // =========================================================================
  // Calculated Ratios
  // =========================================================================
  /** Gross margin percentage */
  gross_margin_pct: number;
  /** Net margin percentage */
  net_margin_pct: number;
  /** Current ratio (current assets / current liabilities) */
  current_ratio: number;
  /** Quick ratio (quick assets / current liabilities) */
  quick_ratio: number;
  /** Debt-to-equity ratio */
  debt_to_equity_ratio: number;

  // =========================================================================
  // Data Quality Metrics
  // =========================================================================
  /** Timestamp when metrics were calculated */
  calculation_timestamp: Date;
  /** Data completeness score (0-100) */
  data_completeness: number;
  /** Number of accounts used in calculation */
  account_count: number;
  /** Number of transactions used in calculation */
  transaction_count: number;
}

// =============================================================================
// Industry-Specific Metric Keys
// =============================================================================

export const INDUSTRY_METRIC_KEYS: Record<string, string[]> = {
  real_estate: [
    "rental_income",
    "operating_expenses",
    "noi",
    "cap_rate",
    "expense_ratio",
    "debt_to_property_ratio",
  ],
  restaurant: [
    "food_sales",
    "beverage_sales",
    "food_cost",
    "labor_cost",
    "food_cost_pct",
    "labor_cost_pct",
    "prime_cost_pct",
  ],
  construction: [
    "project_revenue",
    "direct_costs",
    "gross_margin_pct",
    "wip_balance",
    "retention_balance",
    "backlog_months",
  ],
  hospitality: [
    "room_revenue",
    "fb_revenue",
    "revpar",
    "adr",
    "occupancy_rate",
  ],
  retail: [
    "sales_revenue",
    "cogs",
    "gross_margin_pct",
    "inventory_turnover",
    "sales_per_sqft",
  ],
  professional_services: [
    "billable_revenue",
    "utilization_rate",
    "revenue_per_employee",
    "ar_days",
  ],
  manufacturing: [
    "product_sales",
    "raw_materials",
    "direct_labor",
    "gross_margin_pct",
    "labor_efficiency",
  ],
  healthcare: ["patient_services_revenue", "revenue_per_patient", "ar_days"],
  agriculture: ["crop_sales", "yield_per_hectare", "revenue_per_hectare"],
  transport: ["freight_revenue", "fuel_cost", "margin_per_km", "fuel_cost_pct"],
  education: [
    "tuition_revenue",
    "revenue_per_student",
    "student_retention_rate",
  ],
  wholesale: [
    "wholesale_sales",
    "cogs",
    "gross_margin_pct",
    "inventory_turnover",
  ],
  automotive: ["vehicle_sales", "service_revenue", "service_revenue_pct"],
  beauty_wellness: ["service_revenue", "product_sales", "revenue_per_client"],
  technology: [
    "subscription_revenue",
    "gross_margin_pct",
    "cac_payback_months",
  ],
};

// =============================================================================
// Metric Calculation Helpers
// =============================================================================

/**
 * Generate metric key for a record
 */
export function generateMetricKey(
  organizationKey: string,
  dateKey: number,
  industryId: string,
): string {
  return `metric_${organizationKey}_${dateKey}_${industryId}`;
}

/**
 * Calculate month-over-month change percentage
 */
export function calculateMoMChange(current: number, prior: number): number {
  if (prior === 0) return 0;
  return ((current - prior) / prior) * 100;
}

/**
 * Calculate year-over-year change percentage
 */
export function calculateYoYChange(current: number, priorYear: number): number {
  if (priorYear === 0) return 0;
  return ((current - priorYear) / priorYear) * 100;
}

/**
 * Calculate gross margin percentage
 */
export function calculateGrossMargin(revenue: number, cogs: number): number {
  if (revenue === 0) return 0;
  return ((revenue - cogs) / revenue) * 100;
}

/**
 * Calculate net margin percentage
 */
export function calculateNetMargin(revenue: number, netIncome: number): number {
  if (revenue === 0) return 0;
  return (netIncome / revenue) * 100;
}

/**
 * Calculate current ratio
 */
export function calculateCurrentRatio(
  currentAssets: number,
  currentLiabilities: number,
): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

/**
 * Calculate quick ratio (excluding inventory)
 */
export function calculateQuickRatio(
  quickAssets: number,
  currentLiabilities: number,
): number {
  if (currentLiabilities === 0) return 0;
  return quickAssets / currentLiabilities;
}

/**
 * Calculate debt-to-equity ratio
 */
export function calculateDebtToEquity(
  totalDebt: number,
  totalEquity: number,
): number {
  if (totalEquity === 0) return 0;
  return totalDebt / totalEquity;
}

// =============================================================================
// Tax Credit Eligibility
// =============================================================================

export interface TaxCreditEligibility {
  /** Tax credit ID */
  credit_id: string;
  /** Organization key */
  organization_key: string;
  /** Fiscal year */
  fiscal_year: number;
  /** Eligibility status */
  eligibility_status: "likely" | "possible" | "unlikely" | "needs_review";
  /** Eligibility score (0-100) */
  eligibility_score: number;
  /** Criteria IDs that were met */
  criteria_met: string[];
  /** Criteria IDs that were not met */
  criteria_not_met: string[];
  /** Estimated minimum benefit (CAD) */
  estimated_benefit_min: number;
  /** Estimated maximum benefit (CAD) */
  estimated_benefit_max: number;
  /** Timestamp when eligibility was calculated */
  calculation_timestamp: Date;
}

// =============================================================================
// Fact Invoice (for AR Aging)
// =============================================================================

export interface FactInvoice {
  /** Unique invoice key */
  invoice_key: string;
  /** Organization key */
  organization_key: string;
  /** Source invoice ID from provider */
  source_invoice_id: string;
  /** Invoice number for display */
  invoice_number: string;
  /** Customer key */
  customer_key: string;
  /** Customer name for display */
  customer_name: string;
  /** Invoice date (YYYY-MM-DD) */
  invoice_date: string;
  /** Due date (YYYY-MM-DD) */
  due_date: string | null;
  /** Total amount */
  total_amount: number;
  /** Outstanding balance */
  balance: number;
  /** Currency code */
  currency_code: string;
  /** Invoice status */
  status: "open" | "paid" | "overdue" | "voided";
  /** Days outstanding from due date */
  days_outstanding: number;
  /** Aging bucket */
  aging_bucket: "current" | "31-60" | "61-90" | "90+";
  /** Source system (QUICKBOOKS, XERO, etc.) */
  source_system: string;
  /** Last sync timestamp */
  last_synced_at: string;
}

// =============================================================================
// Fact Bill (for AP Aging)
// =============================================================================

export interface FactBill {
  /** Unique bill key */
  bill_key: string;
  /** Organization key */
  organization_key: string;
  /** Source bill ID from provider */
  source_bill_id: string;
  /** Bill/invoice number for display */
  bill_number: string;
  /** Vendor key */
  vendor_key: string;
  /** Vendor name for display */
  vendor_name: string;
  /** Bill date (YYYY-MM-DD) */
  bill_date: string;
  /** Due date (YYYY-MM-DD) */
  due_date: string | null;
  /** Total amount */
  total_amount: number;
  /** Outstanding balance */
  balance: number;
  /** Currency code */
  currency_code: string;
  /** Bill status */
  status: "open" | "paid" | "overdue" | "voided";
  /** Days outstanding from due date */
  days_outstanding: number;
  /** Aging bucket */
  aging_bucket: "current" | "31-60" | "61-90" | "90+";
  /** Source system (QUICKBOOKS, XERO, etc.) */
  source_system: string;
  /** Last sync timestamp */
  last_synced_at: string;
}
