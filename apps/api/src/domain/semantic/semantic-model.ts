/**
 * Semantic Layer Model
 *
 * Clean Architecture: Domain layer - Looker-inspired semantic model for consistent
 * metrics, dimensions, and drill-down capabilities across all visualizations.
 *
 * The semantic layer abstracts away the complexity of the Gold layer star schema,
 * providing a business-friendly interface for analytics queries.
 */

// =============================================================================
// Semantic Dimension
// =============================================================================

export interface SemanticDimension {
  /** Unique identifier */
  id: string;
  /** Display name (bilingual) */
  name: { en: string; fr: string };
  /** Source field in Gold layer */
  sourceField: string;
  /** Data type */
  type: "string" | "number" | "date" | "boolean";
  /** Drill-down path (hierarchical dimensions) */
  drillPath?: string[];
  /** Hierarchy level (0 = root) */
  hierarchyLevel?: number;
  /** Description for tooltips */
  description?: { en: string; fr: string };
  /** Formatting hint */
  format?: "currency" | "percentage" | "number" | "date" | "text";
}

// =============================================================================
// Semantic Measure
// =============================================================================

export interface SemanticMeasure {
  /** Unique identifier */
  id: string;
  /** Display name (bilingual) */
  name: { en: string; fr: string };
  /** SQL expression or formula */
  formula: string;
  /** Display format */
  format: "currency" | "percentage" | "number" | "days" | "ratio";
  /** Aggregation function */
  aggregation: "SUM" | "AVG" | "MIN" | "MAX" | "COUNT" | "DISTINCT_COUNT";
  /** Industry benchmarks (optional) */
  benchmarks?: IndustryBenchmark[];
  /** Description */
  description?: { en: string; fr: string };
  /** Whether this measure can be used in drill-downs */
  drillable?: boolean;
}

export interface IndustryBenchmark {
  industryId: string;
  /** Benchmark value */
  value: number;
  /** Percentile (0-100) */
  percentile?: number;
  /** Status relative to benchmark */
  status: "ABOVE" | "AT" | "BELOW";
}

// =============================================================================
// Semantic Join
// =============================================================================

export interface SemanticJoin {
  /** Join type */
  type: "inner" | "left" | "right" | "full";
  /** Target view/table */
  to: string;
  /** Join condition */
  sqlOn: string;
  /** Relationship name */
  relationship: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
}

// =============================================================================
// Semantic View
// =============================================================================

export interface SemanticView {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Base table in Gold layer */
  baseTable: string;
  /** Primary key field */
  primaryKey: string;
  /** Dimensions available in this view */
  dimensions: SemanticDimension[];
  /** Measures available in this view */
  measures: SemanticMeasure[];
  /** Joins to other views */
  joins?: SemanticJoin[];
  /** Default filters */
  defaultFilters?: SemanticFilter[];
  /** Description */
  description?: { en: string; fr: string };
}

export interface SemanticFilter {
  dimension: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "in"
    | "contains";
  value: string | number | (string | number)[];
}

// =============================================================================
// Industry Semantic Model
// =============================================================================

export interface IndustrySemanticModel {
  /** Industry ID */
  industryId: string;
  /** Views available for this industry */
  views: SemanticView[];
  /** Dashboard definitions */
  dashboards: DashboardDefinition[];
  /** Default metrics to show */
  defaultMetrics: string[];
}

export interface DashboardDefinition {
  id: string;
  name: { en: string; fr: string };
  /** Chart/widget configurations */
  widgets: DashboardWidget[];
  /** Default date range */
  defaultDateRange?: { start: string; end: string };
}

export interface DashboardWidget {
  id: string;
  type: "chart" | "kpi" | "table" | "gauge";
  /** Chart type if type is 'chart' */
  chartType?: "bar" | "line" | "pie" | "area" | "scatter";
  /** Measure to display */
  measure: string;
  /** Dimension to group by */
  dimension?: string;
  /** Filters */
  filters?: SemanticFilter[];
  /** Position/size */
  layout?: { x: number; y: number; w: number; h: number };
}

// =============================================================================
// Predefined Semantic Views
// =============================================================================

/**
 * Financial Transactions View
 * Base view for all transaction-based analytics
 */
export const FINANCIAL_TRANSACTIONS_VIEW: SemanticView = {
  id: "financial_transactions",
  name: "Financial Transactions",
  baseTable: "fact_transaction",
  primaryKey: "transaction_key",
  dimensions: [
    {
      id: "account",
      name: { en: "Account", fr: "Compte" },
      sourceField: "account_key",
      type: "string",
      drillPath: ["account_type", "account_subtype"],
      hierarchyLevel: 0,
    },
    {
      id: "account_type",
      name: { en: "Account Type", fr: "Type de compte" },
      sourceField: "account_type",
      type: "string",
      hierarchyLevel: 1,
    },
    {
      id: "date",
      name: { en: "Date", fr: "Date" },
      sourceField: "transaction_date",
      type: "date",
      drillPath: ["month", "quarter", "year"],
      format: "date",
    },
    {
      id: "month",
      name: { en: "Month", fr: "Mois" },
      sourceField: "date_key",
      type: "date",
      hierarchyLevel: 1,
      format: "date",
    },
    {
      id: "contact",
      name: { en: "Contact", fr: "Contact" },
      sourceField: "contact_key",
      type: "string",
    },
  ],
  measures: [
    {
      id: "revenue",
      name: { en: "Revenue", fr: "Revenus" },
      formula:
        "SUM(CASE WHEN account_type = 'REVENUE' THEN ABS(amount) ELSE 0 END)",
      format: "currency",
      aggregation: "SUM",
      drillable: true,
    },
    {
      id: "expenses",
      name: { en: "Expenses", fr: "Dépenses" },
      formula:
        "SUM(CASE WHEN account_type = 'EXPENSE' THEN ABS(amount) ELSE 0 END)",
      format: "currency",
      aggregation: "SUM",
      drillable: true,
    },
    {
      id: "net_income",
      name: { en: "Net Income", fr: "Revenu net" },
      formula: "revenue - expenses",
      format: "currency",
      aggregation: "SUM",
    },
    {
      id: "transaction_count",
      name: { en: "Transaction Count", fr: "Nombre de transactions" },
      formula: "COUNT(*)",
      format: "number",
      aggregation: "COUNT",
    },
  ],
};

/**
 * Account Balances View
 * For balance sheet analytics
 */
export const ACCOUNT_BALANCES_VIEW: SemanticView = {
  id: "account_balances",
  name: "Account Balances",
  baseTable: "dim_account",
  primaryKey: "account_key",
  dimensions: [
    {
      id: "account",
      name: { en: "Account", fr: "Compte" },
      sourceField: "account_key",
      type: "string",
      drillPath: ["account_type"],
    },
    {
      id: "account_type",
      name: { en: "Account Type", fr: "Type de compte" },
      sourceField: "account_type",
      type: "string",
    },
  ],
  measures: [
    {
      id: "total_assets",
      name: { en: "Total Assets", fr: "Total actif" },
      formula: "SUM(CASE WHEN account_type = 'ASSET' THEN balance ELSE 0 END)",
      format: "currency",
      aggregation: "SUM",
    },
    {
      id: "total_liabilities",
      name: { en: "Total Liabilities", fr: "Total passif" },
      formula:
        "SUM(CASE WHEN account_type = 'LIABILITY' THEN balance ELSE 0 END)",
      format: "currency",
      aggregation: "SUM",
    },
  ],
};

// =============================================================================
// Industry Semantic Models
// =============================================================================

/**
 * Real Estate Semantic Model
 */
export const REAL_ESTATE_SEMANTIC_MODEL: IndustrySemanticModel = {
  industryId: "real_estate",
  views: [
    {
      ...FINANCIAL_TRANSACTIONS_VIEW,
      id: "real_estate_transactions",
      measures: [
        ...FINANCIAL_TRANSACTIONS_VIEW.measures,
        {
          id: "rental_income",
          name: { en: "Rental Income", fr: "Revenus locatifs" },
          formula:
            "SUM(CASE WHEN account_subtype = 'RentalIncomeReceived' THEN ABS(amount) ELSE 0 END)",
          format: "currency",
          aggregation: "SUM",
          drillable: true,
        },
        {
          id: "operating_expenses",
          name: { en: "Operating Expenses", fr: "Frais d'exploitation" },
          formula:
            "SUM(CASE WHEN account_subtype IN ('RepairMaintenance', 'Insurance', 'TaxesPaid', 'Utilities') THEN ABS(amount) ELSE 0 END)",
          format: "currency",
          aggregation: "SUM",
          drillable: true,
        },
        {
          id: "noi",
          name: {
            en: "Net Operating Income",
            fr: "Résultat d'exploitation net",
          },
          formula: "rental_income - operating_expenses",
          format: "currency",
          aggregation: "SUM",
        },
        {
          id: "cap_rate",
          name: { en: "Cap Rate", fr: "Taux de capitalisation" },
          formula: "(noi / property_value) * 100",
          format: "percentage",
          aggregation: "AVG",
          benchmarks: [
            {
              industryId: "real_estate",
              value: 6,
              percentile: 50,
              status: "AT",
            },
          ],
        },
      ],
    },
  ],
  dashboards: [
    {
      id: "real_estate_overview",
      name: { en: "Real Estate Overview", fr: "Vue d'ensemble immobilier" },
      widgets: [
        {
          id: "rental_income_chart",
          type: "chart",
          chartType: "bar",
          measure: "rental_income",
          dimension: "month",
        },
        {
          id: "cap_rate_kpi",
          type: "kpi",
          measure: "cap_rate",
        },
        {
          id: "noi_kpi",
          type: "kpi",
          measure: "noi",
        },
      ],
    },
  ],
  defaultMetrics: ["rental_income", "noi", "cap_rate", "operating_expenses"],
};

/**
 * Restaurant Semantic Model
 */
export const RESTAURANT_SEMANTIC_MODEL: IndustrySemanticModel = {
  industryId: "restaurant",
  views: [
    {
      ...FINANCIAL_TRANSACTIONS_VIEW,
      id: "restaurant_transactions",
      measures: [
        ...FINANCIAL_TRANSACTIONS_VIEW.measures,
        {
          id: "food_sales",
          name: { en: "Food Sales", fr: "Ventes nourriture" },
          formula:
            "SUM(CASE WHEN account_name LIKE '%Food Sales%' THEN ABS(amount) ELSE 0 END)",
          format: "currency",
          aggregation: "SUM",
        },
        {
          id: "beverage_sales",
          name: { en: "Beverage Sales", fr: "Ventes boissons" },
          formula:
            "SUM(CASE WHEN account_name LIKE '%Beverage Sales%' THEN ABS(amount) ELSE 0 END)",
          format: "currency",
          aggregation: "SUM",
        },
        {
          id: "food_cost",
          name: { en: "Food Cost", fr: "Coût nourriture" },
          formula:
            "SUM(CASE WHEN account_name LIKE '%Food Cost%' THEN ABS(amount) ELSE 0 END)",
          format: "currency",
          aggregation: "SUM",
        },
        {
          id: "labor_cost",
          name: { en: "Labor Cost", fr: "Coût main-d'œuvre" },
          formula:
            "SUM(CASE WHEN account_name LIKE '%Labor Cost%' THEN ABS(amount) ELSE 0 END)",
          format: "currency",
          aggregation: "SUM",
        },
        {
          id: "food_cost_pct",
          name: { en: "Food Cost %", fr: "Coût nourriture %" },
          formula: "(food_cost / food_sales) * 100",
          format: "percentage",
          aggregation: "AVG",
          benchmarks: [
            {
              industryId: "restaurant",
              value: 30,
              percentile: 50,
              status: "AT",
            },
          ],
        },
        {
          id: "prime_cost_pct",
          name: { en: "Prime Cost %", fr: "Coût principal %" },
          formula:
            "((food_cost + labor_cost) / (food_sales + beverage_sales)) * 100",
          format: "percentage",
          aggregation: "AVG",
        },
      ],
    },
  ],
  dashboards: [
    {
      id: "restaurant_overview",
      name: { en: "Restaurant Overview", fr: "Vue d'ensemble restaurant" },
      widgets: [
        {
          id: "sales_chart",
          type: "chart",
          chartType: "bar",
          measure: "food_sales",
          dimension: "month",
        },
        {
          id: "prime_cost_kpi",
          type: "kpi",
          measure: "prime_cost_pct",
        },
      ],
    },
  ],
  defaultMetrics: [
    "food_sales",
    "food_cost_pct",
    "labor_cost",
    "prime_cost_pct",
  ],
};

// =============================================================================
// Semantic Model Registry
// =============================================================================

export const SEMANTIC_MODELS: Record<string, IndustrySemanticModel> = {
  real_estate: REAL_ESTATE_SEMANTIC_MODEL,
  restaurant: RESTAURANT_SEMANTIC_MODEL,
  // Additional models can be added for other industries
};

/**
 * Get semantic model for an industry
 */
export function getSemanticModel(
  industryId: string,
): IndustrySemanticModel | undefined {
  return SEMANTIC_MODELS[industryId];
}

/**
 * Get all available semantic views for an industry
 */
export function getSemanticViews(industryId: string): SemanticView[] {
  const model = getSemanticModel(industryId);
  return model?.views || [FINANCIAL_TRANSACTIONS_VIEW];
}

/**
 * Get semantic measure by ID
 */
export function getSemanticMeasure(
  industryId: string,
  measureId: string,
): SemanticMeasure | undefined {
  const views = getSemanticViews(industryId);
  for (const view of views) {
    const measure = view.measures.find((m) => m.id === measureId);
    if (measure) return measure;
  }
  return undefined;
}
