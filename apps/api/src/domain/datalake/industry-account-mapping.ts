/**
 * Industry Account Mapping
 *
 * Defines how QuickBooks/Xero account types map to industry-specific KPI categories.
 * This enables automatic calculation of industry KPIs from standard chart of accounts.
 */

export type IndustryId =
  | "restaurant"
  | "hospitality"
  | "retail"
  | "professional_services"
  | "construction"
  | "real_estate"
  | "manufacturing"
  | "healthcare"
  | "wholesale"
  | "transport"
  | "agriculture"
  | "automotive"
  | "beauty_wellness"
  | "education"
  | "technology";

export interface AccountCategoryMapping {
  /** Unique identifier for this category */
  categoryId: string;
  /** Display name in English */
  name: { en: string; fr: string };
  /** Account types that typically map to this category */
  accountTypes: string[];
  /** QuickBooks account subtypes that map here */
  quickBooksSubtypes: string[];
  /** Xero account types that map here */
  xeroTypes: string[];
  /** Keywords to match in account names */
  nameKeywords: string[];
  /** Whether this is a debit (expense) or credit (revenue) category */
  isDebit: boolean;
}

export interface IndustryMapping {
  industryId: IndustryId;
  name: { en: string; fr: string };
  /** Categories specific to this industry */
  categories: AccountCategoryMapping[];
  /** KPIs that can be calculated for this industry */
  kpis: IndustryKPIDefinition[];
}

export interface IndustryKPIDefinition {
  id: string;
  name: { en: string; fr: string };
  /** Formula using category IDs: e.g., "food_cost / food_sales" */
  formula: string;
  /** Category IDs required to calculate this KPI */
  requiredCategories: string[];
  format: "percentage" | "currency" | "number" | "days";
  benchmark?: { min: number; max: number };
}

// =============================================================================
// Restaurant Industry
// =============================================================================

export const RESTAURANT_MAPPING: IndustryMapping = {
  industryId: "restaurant",
  name: { en: "Restaurant", fr: "Restaurant" },
  categories: [
    {
      categoryId: "food_cost",
      name: { en: "Food Cost", fr: "Coût nourriture" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: [
        "SuppliesMaterials",
        "CostOfGoodsSold",
        "CostOfLaborCos",
      ],
      xeroTypes: ["DIRECTCOSTS", "EXPENSE"],
      nameKeywords: [
        "food",
        "groceries",
        "ingredients",
        "produce",
        "meat",
        "dairy",
        "nourriture",
        "épicerie",
      ],
      isDebit: true,
    },
    {
      categoryId: "beverage_cost",
      name: { en: "Beverage Cost", fr: "Coût boissons" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["SuppliesMaterials", "CostOfGoodsSold"],
      xeroTypes: ["DIRECTCOSTS", "EXPENSE"],
      nameKeywords: [
        "beverage",
        "drinks",
        "alcohol",
        "wine",
        "beer",
        "liquor",
        "boisson",
        "alcool",
      ],
      isDebit: true,
    },
    {
      categoryId: "labor_cost",
      name: { en: "Labor Cost", fr: "Coût main-d'œuvre" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: [
        "PayrollExpenses",
        "CostOfLaborCos",
        "Taxes",
        "Insurance",
      ],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "wages",
        "salaries",
        "payroll",
        "benefits",
        "employee",
        "staff",
        "salaire",
        "paie",
      ],
      isDebit: true,
    },
    {
      categoryId: "food_sales",
      name: { en: "Food Sales", fr: "Ventes nourriture" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "ServiceFeeIncome"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: [
        "food sales",
        "restaurant sales",
        "dining",
        "menu",
        "ventes",
        "restaurant",
      ],
      isDebit: false,
    },
    {
      categoryId: "beverage_sales",
      name: { en: "Beverage Sales", fr: "Ventes boissons" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: [
        "beverage sales",
        "bar sales",
        "drinks",
        "alcohol sales",
        "boissons",
      ],
      isDebit: false,
    },
    {
      categoryId: "total_revenue",
      name: { en: "Total Revenue", fr: "Revenus totaux" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: [
        "SalesOfProductIncome",
        "ServiceFeeIncome",
        "OtherPrimaryIncome",
      ],
      xeroTypes: ["REVENUE", "SALES", "OTHERINCOME"],
      nameKeywords: ["sales", "revenue", "income", "ventes", "revenus"],
      isDebit: false,
    },
  ],
  kpis: [
    {
      id: "food_cost_pct",
      name: { en: "Food Cost %", fr: "Coût nourriture %" },
      formula: "(food_cost / food_sales) * 100",
      requiredCategories: ["food_cost", "food_sales"],
      format: "percentage",
      benchmark: { min: 28, max: 35 },
    },
    {
      id: "beverage_cost_pct",
      name: { en: "Beverage Cost %", fr: "Coût boissons %" },
      formula: "(beverage_cost / beverage_sales) * 100",
      requiredCategories: ["beverage_cost", "beverage_sales"],
      format: "percentage",
      benchmark: { min: 18, max: 24 },
    },
    {
      id: "labor_cost_pct",
      name: { en: "Labor Cost %", fr: "Coût main-d'œuvre %" },
      formula: "(labor_cost / total_revenue) * 100",
      requiredCategories: ["labor_cost", "total_revenue"],
      format: "percentage",
      benchmark: { min: 25, max: 35 },
    },
    {
      id: "prime_cost_pct",
      name: { en: "Prime Cost %", fr: "Coût principal %" },
      formula:
        "((food_cost + beverage_cost + labor_cost) / total_revenue) * 100",
      requiredCategories: [
        "food_cost",
        "beverage_cost",
        "labor_cost",
        "total_revenue",
      ],
      format: "percentage",
      benchmark: { min: 55, max: 65 },
    },
  ],
};

// =============================================================================
// Retail Industry
// =============================================================================

export const RETAIL_MAPPING: IndustryMapping = {
  industryId: "retail",
  name: { en: "Retail", fr: "Commerce de détail" },
  categories: [
    {
      categoryId: "cogs",
      name: { en: "Cost of Goods Sold", fr: "Coût des marchandises vendues" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["CostOfGoodsSold", "SuppliesMaterials"],
      xeroTypes: ["DIRECTCOSTS"],
      nameKeywords: [
        "cost of goods",
        "cogs",
        "merchandise",
        "inventory cost",
        "cmv",
      ],
      isDebit: true,
    },
    {
      categoryId: "sales",
      name: { en: "Sales Revenue", fr: "Revenus de ventes" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: ["sales", "retail sales", "merchandise sales", "ventes"],
      isDebit: false,
    },
    {
      categoryId: "inventory",
      name: { en: "Inventory", fr: "Inventaire" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Inventory", "OtherCurrentAssets"],
      xeroTypes: ["INVENTORY", "CURRENT"],
      nameKeywords: ["inventory", "stock", "merchandise", "inventaire"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "gross_margin_pct",
      name: { en: "Gross Margin %", fr: "Marge brute %" },
      formula: "((sales - cogs) / sales) * 100",
      requiredCategories: ["sales", "cogs"],
      format: "percentage",
      benchmark: { min: 30, max: 50 },
    },
    {
      id: "inventory_turnover",
      name: { en: "Inventory Turnover", fr: "Rotation des stocks" },
      formula: "cogs / inventory",
      requiredCategories: ["cogs", "inventory"],
      format: "number",
      benchmark: { min: 4, max: 12 },
    },
  ],
};

// =============================================================================
// Professional Services Industry
// =============================================================================

export const PROFESSIONAL_SERVICES_MAPPING: IndustryMapping = {
  industryId: "professional_services",
  name: { en: "Professional Services", fr: "Services professionnels" },
  categories: [
    {
      categoryId: "billable_revenue",
      name: { en: "Billable Revenue", fr: "Revenus facturables" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome", "ConsultingIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "consulting",
        "professional fees",
        "billable",
        "services",
        "honoraires",
      ],
      isDebit: false,
    },
    {
      categoryId: "salaries",
      name: { en: "Salaries & Wages", fr: "Salaires" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "salaries",
        "wages",
        "payroll",
        "compensation",
        "salaires",
      ],
      isDebit: true,
    },
    {
      categoryId: "accounts_receivable",
      name: { en: "Accounts Receivable", fr: "Comptes clients" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["AccountsReceivable"],
      xeroTypes: ["CURRENT"],
      nameKeywords: ["receivable", "A/R", "clients", "débiteurs"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "revenue_per_employee",
      name: { en: "Revenue per Employee", fr: "Revenu par employé" },
      formula: "billable_revenue / employee_count",
      requiredCategories: ["billable_revenue"],
      format: "currency",
      benchmark: { min: 150000, max: 300000 },
    },
    {
      id: "ar_days",
      name: { en: "A/R Days", fr: "Jours comptes clients" },
      formula: "(accounts_receivable / billable_revenue) * 365",
      requiredCategories: ["accounts_receivable", "billable_revenue"],
      format: "days",
      benchmark: { min: 30, max: 60 },
    },
  ],
};

// =============================================================================
// Real Estate Industry
// =============================================================================

export const REAL_ESTATE_MAPPING: IndustryMapping = {
  industryId: "real_estate",
  name: { en: "Real Estate", fr: "Immobilier" },
  categories: [
    {
      categoryId: "rental_income",
      name: { en: "Rental Income", fr: "Revenus locatifs" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["RentalIncome", "OtherPrimaryIncome"],
      xeroTypes: ["REVENUE", "OTHERINCOME"],
      nameKeywords: ["rent", "rental", "lease", "loyer", "location"],
      isDebit: false,
    },
    {
      categoryId: "operating_expenses",
      name: { en: "Operating Expenses", fr: "Frais d'exploitation" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: [
        "RepairMaintenance",
        "Utilities",
        "Insurance",
        "Taxes",
      ],
      xeroTypes: ["EXPENSE", "OVERHEADS"],
      nameKeywords: [
        "maintenance",
        "repairs",
        "utilities",
        "insurance",
        "property tax",
        "entretien",
      ],
      isDebit: true,
    },
    {
      categoryId: "property_value",
      name: { en: "Property Value", fr: "Valeur immobilière" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["FixedAsset", "Buildings"],
      xeroTypes: ["FIXED", "NONCURRENT"],
      nameKeywords: ["building", "property", "land", "real estate", "immeuble"],
      isDebit: true,
    },
    {
      categoryId: "mortgage_interest",
      name: { en: "Mortgage Interest", fr: "Intérêts hypothécaires" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["InterestPaid", "OtherMiscellaneousExpense"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: ["mortgage", "interest", "loan", "hypothèque", "intérêts"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "re_noi",
      name: { en: "Net Operating Income", fr: "Résultat d'exploitation net" },
      formula: "rental_income - operating_expenses",
      requiredCategories: ["rental_income", "operating_expenses"],
      format: "currency",
    },
    {
      id: "re_cap_rate",
      name: { en: "Cap Rate", fr: "Taux de capitalisation" },
      formula: "((rental_income - operating_expenses) / property_value) * 100",
      requiredCategories: [
        "rental_income",
        "operating_expenses",
        "property_value",
      ],
      format: "percentage",
      benchmark: { min: 4, max: 10 },
    },
    {
      id: "re_expense_ratio",
      name: {
        en: "Operating Expense Ratio",
        fr: "Ratio des frais d'exploitation",
      },
      formula: "(operating_expenses / rental_income) * 100",
      requiredCategories: ["operating_expenses", "rental_income"],
      format: "percentage",
      benchmark: { min: 30, max: 50 },
    },
  ],
};

// =============================================================================
// Construction Industry
// =============================================================================

export const CONSTRUCTION_MAPPING: IndustryMapping = {
  industryId: "construction",
  name: { en: "Construction", fr: "Construction" },
  categories: [
    {
      categoryId: "project_revenue",
      name: { en: "Project Revenue", fr: "Revenus de projets" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "ServiceFeeIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "contract",
        "project",
        "job",
        "construction",
        "contrat",
        "projet",
      ],
      isDebit: false,
    },
    {
      categoryId: "direct_costs",
      name: { en: "Direct Job Costs", fr: "Coûts directs de projet" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: [
        "CostOfGoodsSold",
        "CostOfLaborCos",
        "SuppliesMaterials",
      ],
      xeroTypes: ["DIRECTCOSTS"],
      nameKeywords: [
        "materials",
        "labor",
        "subcontractor",
        "equipment",
        "matériaux",
        "sous-traitant",
      ],
      isDebit: true,
    },
    {
      categoryId: "wip",
      name: { en: "Work in Progress", fr: "Travaux en cours" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["OtherCurrentAssets"],
      xeroTypes: ["CURRENT"],
      nameKeywords: ["WIP", "work in progress", "travaux en cours", "unbilled"],
      isDebit: true,
    },
    {
      categoryId: "retention",
      name: { en: "Retention Receivable", fr: "Retenues à recevoir" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["AccountsReceivable", "OtherCurrentAssets"],
      xeroTypes: ["CURRENT"],
      nameKeywords: ["retention", "holdback", "retenue"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "job_margin_pct",
      name: { en: "Job Margin %", fr: "Marge de projet %" },
      formula: "((project_revenue - direct_costs) / project_revenue) * 100",
      requiredCategories: ["project_revenue", "direct_costs"],
      format: "percentage",
      benchmark: { min: 15, max: 30 },
    },
    {
      id: "wip_balance",
      name: { en: "WIP Balance", fr: "Solde travaux en cours" },
      formula: "wip",
      requiredCategories: ["wip"],
      format: "currency",
    },
    {
      id: "retention_balance",
      name: { en: "Retention Balance", fr: "Solde retenues" },
      formula: "retention",
      requiredCategories: ["retention"],
      format: "currency",
    },
  ],
};

// =============================================================================
// Hospitality Industry
// =============================================================================

export const HOSPITALITY_MAPPING: IndustryMapping = {
  industryId: "hospitality",
  name: { en: "Hospitality / Hotel", fr: "Hôtellerie" },
  categories: [
    {
      categoryId: "room_revenue",
      name: { en: "Room Revenue", fr: "Revenus chambres" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "ServiceFeeIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "room",
        "accommodation",
        "lodging",
        "hébergement",
        "chambre",
      ],
      isDebit: false,
    },
    {
      categoryId: "fb_revenue",
      name: { en: "Food & Beverage Revenue", fr: "Revenus F&B" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: ["food", "beverage", "restaurant", "bar", "dining"],
      isDebit: false,
    },
    {
      categoryId: "operating_costs",
      name: { en: "Operating Costs", fr: "Coûts d'exploitation" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses", "SuppliesMaterials", "Utilities"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: ["housekeeping", "maintenance", "utilities", "supplies"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "revpar",
      name: { en: "RevPAR", fr: "RevPAR" },
      formula: "room_revenue / available_rooms",
      requiredCategories: ["room_revenue"],
      format: "currency",
      benchmark: { min: 80, max: 150 },
    },
    {
      id: "adr",
      name: { en: "Average Daily Rate", fr: "Tarif journalier moyen" },
      formula: "room_revenue / rooms_sold",
      requiredCategories: ["room_revenue"],
      format: "currency",
    },
  ],
};

// =============================================================================
// Technology Industry
// =============================================================================

export const TECHNOLOGY_MAPPING: IndustryMapping = {
  industryId: "technology",
  name: { en: "Technology", fr: "Technologie" },
  categories: [
    {
      categoryId: "recurring_revenue",
      name: { en: "Recurring Revenue", fr: "Revenus récurrents" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome", "SalesOfProductIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "subscription",
        "saas",
        "mrr",
        "arr",
        "recurring",
        "abonnement",
      ],
      isDebit: false,
    },
    {
      categoryId: "development_costs",
      name: { en: "Development Costs", fr: "Coûts de développement" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: ["engineering", "development", "developer", "software"],
      isDebit: true,
    },
    {
      categoryId: "sales_marketing",
      name: { en: "Sales & Marketing", fr: "Ventes et marketing" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["AdvertisingPromotional", "PayrollExpenses"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: ["sales", "marketing", "advertising", "promotion"],
      isDebit: true,
    },
    {
      categoryId: "hosting_infrastructure",
      name: {
        en: "Hosting & Infrastructure",
        fr: "Hébergement et infrastructure",
      },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["SuppliesMaterials", "Utilities"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: ["aws", "cloud", "hosting", "server", "infrastructure"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "gross_margin_pct",
      name: { en: "Gross Margin %", fr: "Marge brute %" },
      formula:
        "(recurring_revenue - hosting_infrastructure) / recurring_revenue * 100",
      requiredCategories: ["recurring_revenue", "hosting_infrastructure"],
      format: "percentage",
      benchmark: { min: 60, max: 80 },
    },
    {
      id: "cac_payback_months",
      name: { en: "CAC Payback (Months)", fr: "Retour CAC (mois)" },
      formula: "sales_marketing / (recurring_revenue / 12)",
      requiredCategories: ["sales_marketing", "recurring_revenue"],
      format: "number",
      benchmark: { min: 6, max: 18 },
    },
  ],
};

// =============================================================================
// Manufacturing Industry
// =============================================================================

export const MANUFACTURING_MAPPING: IndustryMapping = {
  industryId: "manufacturing",
  name: { en: "Manufacturing", fr: "Manufacturier" },
  categories: [
    {
      categoryId: "raw_materials",
      name: { en: "Raw Materials", fr: "Matières premières" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["SuppliesMaterialsCogs", "CostOfGoodsSold"],
      xeroTypes: ["DIRECTCOSTS"],
      nameKeywords: [
        "raw",
        "materials",
        "components",
        "parts",
        "matières premières",
      ],
      isDebit: true,
    },
    {
      categoryId: "direct_labor",
      name: { en: "Direct Labor", fr: "Main-d'œuvre directe" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["CostOfLaborCos", "PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "direct labor",
        "production labor",
        "factory labor",
        "main-d'œuvre directe",
      ],
      isDebit: true,
    },
    {
      categoryId: "manufacturing_overhead",
      name: {
        en: "Manufacturing Overhead",
        fr: "Frais généraux de fabrication",
      },
      accountTypes: ["Expense"],
      quickBooksSubtypes: [
        "OfficeGeneralAdministrativeExpenses",
        "Utilities",
        "RepairMaintenance",
      ],
      xeroTypes: ["EXPENSE", "OVERHEADS"],
      nameKeywords: [
        "overhead",
        "factory overhead",
        "manufacturing overhead",
        "frais généraux",
      ],
      isDebit: true,
    },
    {
      categoryId: "finished_goods_sales",
      name: { en: "Finished Goods Sales", fr: "Ventes produits finis" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "SalesWholesale"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: [
        "product sales",
        "finished goods",
        "manufacturing sales",
        "ventes produits",
      ],
      isDebit: false,
    },
    {
      categoryId: "inventory",
      name: { en: "Inventory", fr: "Inventaire" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Inventory", "OtherCurrentAssets"],
      xeroTypes: ["INVENTORY", "CURRENT"],
      nameKeywords: [
        "inventory",
        "stock",
        "raw materials inventory",
        "finished goods",
        "inventaire",
      ],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "gross_margin_pct",
      name: { en: "Gross Margin %", fr: "Marge brute %" },
      formula:
        "((finished_goods_sales - raw_materials - direct_labor) / finished_goods_sales) * 100",
      requiredCategories: [
        "finished_goods_sales",
        "raw_materials",
        "direct_labor",
      ],
      format: "percentage",
      benchmark: { min: 20, max: 40 },
    },
    {
      id: "labor_efficiency",
      name: { en: "Labor Efficiency", fr: "Efficacité main-d'œuvre" },
      formula: "finished_goods_sales / direct_labor",
      requiredCategories: ["finished_goods_sales", "direct_labor"],
      format: "number",
    },
  ],
};

// =============================================================================
// Agriculture Industry
// =============================================================================

export const AGRICULTURE_MAPPING: IndustryMapping = {
  industryId: "agriculture",
  name: { en: "Agriculture", fr: "Agroalimentaire" },
  categories: [
    {
      categoryId: "crop_sales",
      name: { en: "Crop Sales", fr: "Ventes de récoltes" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "OtherPrimaryIncome"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: ["crop", "harvest", "yield", "sales", "récolte", "ventes"],
      isDebit: false,
    },
    {
      categoryId: "seed_supplies",
      name: { en: "Seed & Supplies", fr: "Semences et fournitures" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["SuppliesMaterialsCogs", "Supplies"],
      xeroTypes: ["DIRECTCOSTS", "EXPENSE"],
      nameKeywords: ["seed", "fertilizer", "supplies", "semences", "engrais"],
      isDebit: true,
    },
    {
      categoryId: "farm_labor",
      name: { en: "Farm Labor", fr: "Main-d'œuvre agricole" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["CostOfLaborCos", "PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "farm labor",
        "field labor",
        "harvest labor",
        "main-d'œuvre",
      ],
      isDebit: true,
    },
    {
      categoryId: "equipment_cost",
      name: { en: "Equipment Cost", fr: "Coût équipement" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: [
        "EquipmentRental",
        "RepairMaintenance",
        "Depreciation",
      ],
      xeroTypes: ["EXPENSE"],
      nameKeywords: [
        "equipment",
        "machinery",
        "tractor",
        "harvester",
        "équipement",
      ],
      isDebit: true,
    },
    {
      categoryId: "land",
      name: { en: "Land", fr: "Terres" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Land"],
      xeroTypes: ["FIXED", "NONCURRENT"],
      nameKeywords: ["land", "farmland", "acreage", "terres", "terrain"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "yield_per_hectare",
      name: { en: "Yield per Hectare", fr: "Rendement par hectare" },
      formula: "crop_sales / land",
      requiredCategories: ["crop_sales", "land"],
      format: "number",
    },
    {
      id: "revenue_per_hectare",
      name: { en: "Revenue per Hectare", fr: "Revenu par hectare" },
      formula: "crop_sales / land",
      requiredCategories: ["crop_sales", "land"],
      format: "currency",
    },
  ],
};

// =============================================================================
// Transport & Logistics Industry
// =============================================================================

export const TRANSPORT_MAPPING: IndustryMapping = {
  industryId: "transport",
  name: { en: "Transport & Logistics", fr: "Transport et logistique" },
  categories: [
    {
      categoryId: "freight_revenue",
      name: { en: "Freight Revenue", fr: "Revenus transport" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome", "OtherPrimaryIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "freight",
        "shipping",
        "delivery",
        "transport",
        "transport",
      ],
      isDebit: false,
    },
    {
      categoryId: "fuel_cost",
      name: { en: "Fuel Cost", fr: "Coût carburant" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["Auto", "GasAndFuel"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: [
        "fuel",
        "gas",
        "diesel",
        "gasoline",
        "carburant",
        "essence",
      ],
      isDebit: true,
    },
    {
      categoryId: "vehicle_maintenance",
      name: { en: "Vehicle Maintenance", fr: "Entretien véhicules" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["RepairMaintenance", "VehicleRepairs"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: [
        "vehicle",
        "truck",
        "maintenance",
        "repair",
        "véhicule",
        "entretien",
      ],
      isDebit: true,
    },
    {
      categoryId: "driver_wages",
      name: { en: "Driver Wages", fr: "Salaires chauffeurs" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: ["driver", "wages", "payroll", "chauffeur", "salaire"],
      isDebit: true,
    },
    {
      categoryId: "vehicles",
      name: { en: "Vehicles", fr: "Véhicules" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Vehicles"],
      xeroTypes: ["FIXED", "NONCURRENT"],
      nameKeywords: ["vehicle", "truck", "fleet", "véhicule", "camion"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "margin_per_km",
      name: { en: "Margin per Kilometer", fr: "Marge par kilomètre" },
      formula:
        "((freight_revenue - fuel_cost - vehicle_maintenance - driver_wages) / freight_revenue) * freight_revenue",
      requiredCategories: [
        "freight_revenue",
        "fuel_cost",
        "vehicle_maintenance",
        "driver_wages",
      ],
      format: "currency",
    },
    {
      id: "fuel_cost_pct",
      name: { en: "Fuel Cost %", fr: "Coût carburant %" },
      formula: "(fuel_cost / freight_revenue) * 100",
      requiredCategories: ["fuel_cost", "freight_revenue"],
      format: "percentage",
      benchmark: { min: 20, max: 35 },
    },
  ],
};

// =============================================================================
// Healthcare Industry
// =============================================================================

export const HEALTHCARE_MAPPING: IndustryMapping = {
  industryId: "healthcare",
  name: { en: "Healthcare", fr: "Santé" },
  categories: [
    {
      categoryId: "patient_services_revenue",
      name: { en: "Patient Services Revenue", fr: "Revenus services patients" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome", "RevenueGeneral"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "patient",
        "services",
        "medical",
        "clinic",
        "patient",
        "services",
      ],
      isDebit: false,
    },
    {
      categoryId: "medical_supplies",
      name: { en: "Medical Supplies", fr: "Fournitures médicales" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["Supplies", "SuppliesMaterials"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: [
        "medical",
        "supplies",
        "equipment",
        "médical",
        "fournitures",
      ],
      isDebit: true,
    },
    {
      categoryId: "medical_staff_salaries",
      name: { en: "Medical Staff Salaries", fr: "Salaires personnel médical" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "doctor",
        "nurse",
        "medical staff",
        "salaries",
        "médecin",
        "infirmier",
      ],
      isDebit: true,
    },
    {
      categoryId: "medical_equipment",
      name: { en: "Medical Equipment", fr: "Équipement médical" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["MachineryAndEquipment"],
      xeroTypes: ["FIXED"],
      nameKeywords: [
        "medical equipment",
        "equipment",
        "machinery",
        "équipement médical",
      ],
      isDebit: true,
    },
    {
      categoryId: "accounts_receivable",
      name: { en: "Accounts Receivable", fr: "Comptes clients" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["AccountsReceivable"],
      xeroTypes: ["CURRENT"],
      nameKeywords: ["receivable", "A/R", "patients receivable", "débiteurs"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "revenue_per_patient",
      name: { en: "Revenue per Patient", fr: "Revenu par patient" },
      formula: "patient_services_revenue / patient_count",
      requiredCategories: ["patient_services_revenue"],
      format: "currency",
      benchmark: { min: 150, max: 400 },
    },
    {
      id: "ar_days",
      name: { en: "A/R Days", fr: "Jours comptes clients" },
      formula: "(accounts_receivable / patient_services_revenue) * 365",
      requiredCategories: ["accounts_receivable", "patient_services_revenue"],
      format: "days",
      benchmark: { min: 30, max: 60 },
    },
  ],
};

// =============================================================================
// Education Industry
// =============================================================================

export const EDUCATION_MAPPING: IndustryMapping = {
  industryId: "education",
  name: { en: "Education", fr: "Éducation" },
  categories: [
    {
      categoryId: "tuition_revenue",
      name: { en: "Tuition Revenue", fr: "Revenus scolarité" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome", "NonProfitIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: ["tuition", "fees", "education", "scolarité", "frais"],
      isDebit: false,
    },
    {
      categoryId: "instructor_salaries",
      name: { en: "Instructor Salaries", fr: "Salaires instructeurs" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "instructor",
        "teacher",
        "faculty",
        "salaries",
        "instructeur",
        "professeur",
      ],
      isDebit: true,
    },
    {
      categoryId: "educational_supplies",
      name: { en: "Educational Supplies", fr: "Fournitures éducatives" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["Supplies"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: [
        "supplies",
        "materials",
        "books",
        "fournitures",
        "matériel",
      ],
      isDebit: true,
    },
    {
      categoryId: "accounts_receivable",
      name: { en: "Accounts Receivable", fr: "Comptes clients" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["AccountsReceivable"],
      xeroTypes: ["CURRENT"],
      nameKeywords: ["receivable", "tuition receivable", "débiteurs"],
      isDebit: true,
    },
    {
      categoryId: "deferred_revenue",
      name: { en: "Deferred Revenue", fr: "Revenus différés" },
      accountTypes: ["Liability"],
      quickBooksSubtypes: ["OtherCurrentLiabilities"],
      xeroTypes: ["CURRLIAB"],
      nameKeywords: ["deferred", "prepaid", "tuition deposits", "différé"],
      isDebit: false,
    },
  ],
  kpis: [
    {
      id: "revenue_per_student",
      name: { en: "Revenue per Student", fr: "Revenu par étudiant" },
      formula: "tuition_revenue / student_count",
      requiredCategories: ["tuition_revenue"],
      format: "currency",
      benchmark: { min: 5000, max: 15000 },
    },
    {
      id: "student_retention_rate",
      name: { en: "Student Retention Rate", fr: "Taux de rétention étudiants" },
      formula: "(returning_students / total_students) * 100",
      requiredCategories: ["returning_students", "total_students"],
      format: "percentage",
      benchmark: { min: 75, max: 95 },
    },
  ],
};

// =============================================================================
// Wholesale & Distribution Industry
// =============================================================================

export const WHOLESALE_MAPPING: IndustryMapping = {
  industryId: "wholesale",
  name: {
    en: "Wholesale & Distribution",
    fr: "Commerce de gros et distribution",
  },
  categories: [
    {
      categoryId: "wholesale_sales",
      name: { en: "Wholesale Sales", fr: "Ventes en gros" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesWholesale", "SalesOfProductIncome"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: ["wholesale", "sales", "distribution", "gros", "ventes"],
      isDebit: false,
    },
    {
      categoryId: "cogs",
      name: { en: "Cost of Goods Sold", fr: "Coût des marchandises vendues" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["CostOfGoodsSold", "SuppliesMaterialsCogs"],
      xeroTypes: ["DIRECTCOSTS"],
      nameKeywords: ["cogs", "cost of goods", "product cost", "cmv"],
      isDebit: true,
    },
    {
      categoryId: "shipping",
      name: { en: "Shipping & Freight", fr: "Expédition et fret" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["ShippingFreightDelivery"],
      xeroTypes: ["EXPENSE"],
      nameKeywords: ["shipping", "freight", "delivery", "expédition", "fret"],
      isDebit: true,
    },
    {
      categoryId: "inventory",
      name: { en: "Inventory", fr: "Inventaire" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Inventory"],
      xeroTypes: ["INVENTORY"],
      nameKeywords: ["inventory", "stock", "merchandise", "inventaire"],
      isDebit: true,
    },
    {
      categoryId: "accounts_receivable",
      name: { en: "Accounts Receivable", fr: "Comptes clients" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["AccountsReceivable"],
      xeroTypes: ["CURRENT"],
      nameKeywords: ["receivable", "A/R", "débiteurs"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "gross_margin_pct",
      name: { en: "Gross Margin %", fr: "Marge brute %" },
      formula: "((wholesale_sales - cogs) / wholesale_sales) * 100",
      requiredCategories: ["wholesale_sales", "cogs"],
      format: "percentage",
      benchmark: { min: 15, max: 30 },
    },
    {
      id: "inventory_turnover",
      name: { en: "Inventory Turnover", fr: "Rotation des stocks" },
      formula: "cogs / inventory",
      requiredCategories: ["cogs", "inventory"],
      format: "number",
      benchmark: { min: 4, max: 10 },
    },
  ],
};

// =============================================================================
// Automotive Industry
// =============================================================================

export const AUTOMOTIVE_MAPPING: IndustryMapping = {
  industryId: "automotive",
  name: { en: "Automotive", fr: "Automobile" },
  categories: [
    {
      categoryId: "vehicle_sales",
      name: { en: "Vehicle Sales", fr: "Ventes véhicules" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "SalesRetail"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: [
        "vehicle sales",
        "car sales",
        "truck sales",
        "ventes véhicules",
      ],
      isDebit: false,
    },
    {
      categoryId: "service_revenue",
      name: { en: "Service Revenue", fr: "Revenus services" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "service",
        "repair",
        "maintenance",
        "services",
        "réparation",
      ],
      isDebit: false,
    },
    {
      categoryId: "parts_cost",
      name: { en: "Parts Cost", fr: "Coût pièces" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["CostOfGoodsSold", "SuppliesMaterialsCogs"],
      xeroTypes: ["DIRECTCOSTS"],
      nameKeywords: ["parts", "components", "inventory cost", "pièces"],
      isDebit: true,
    },
    {
      categoryId: "vehicle_inventory",
      name: { en: "Vehicle Inventory", fr: "Inventaire véhicules" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Inventory"],
      xeroTypes: ["INVENTORY"],
      nameKeywords: [
        "vehicle inventory",
        "car inventory",
        "inventory",
        "inventaire véhicules",
      ],
      isDebit: true,
    },
    {
      categoryId: "parts_inventory",
      name: { en: "Parts Inventory", fr: "Inventaire pièces" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Inventory"],
      xeroTypes: ["INVENTORY"],
      nameKeywords: ["parts inventory", "inventory", "inventaire pièces"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "service_revenue_pct",
      name: { en: "Service Revenue %", fr: "Revenus services %" },
      formula: "(service_revenue / (vehicle_sales + service_revenue)) * 100",
      requiredCategories: ["service_revenue", "vehicle_sales"],
      format: "percentage",
      benchmark: { min: 20, max: 40 },
    },
    {
      id: "gross_margin_pct",
      name: { en: "Gross Margin %", fr: "Marge brute %" },
      formula: "((vehicle_sales - parts_cost) / vehicle_sales) * 100",
      requiredCategories: ["vehicle_sales", "parts_cost"],
      format: "percentage",
    },
  ],
};

// =============================================================================
// Beauty & Wellness Industry
// =============================================================================

export const BEAUTY_WELLNESS_MAPPING: IndustryMapping = {
  industryId: "beauty_wellness",
  name: { en: "Beauty & Wellness", fr: "Beauté et bien-être" },
  categories: [
    {
      categoryId: "service_revenue",
      name: { en: "Service Revenue", fr: "Revenus services" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["ServiceFeeIncome"],
      xeroTypes: ["REVENUE"],
      nameKeywords: [
        "service",
        "treatment",
        "spa",
        "salon",
        "services",
        "traitement",
      ],
      isDebit: false,
    },
    {
      categoryId: "product_sales",
      name: { en: "Product Sales", fr: "Ventes produits" },
      accountTypes: ["Revenue"],
      quickBooksSubtypes: ["SalesOfProductIncome", "SalesRetail"],
      xeroTypes: ["REVENUE", "SALES"],
      nameKeywords: ["product", "retail", "sales", "produits", "ventes"],
      isDebit: false,
    },
    {
      categoryId: "therapist_wages",
      name: { en: "Therapist Wages", fr: "Salaires thérapeutes" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["PayrollExpenses"],
      xeroTypes: ["EXPENSE", "WAGESPAYABLEEXPENSE"],
      nameKeywords: [
        "therapist",
        "stylist",
        "wages",
        "payroll",
        "thérapeute",
        "styliste",
      ],
      isDebit: true,
    },
    {
      categoryId: "product_cost",
      name: { en: "Product Cost", fr: "Coût produits" },
      accountTypes: ["Expense"],
      quickBooksSubtypes: ["CostOfGoodsSold", "SuppliesMaterialsCogs"],
      xeroTypes: ["DIRECTCOSTS"],
      nameKeywords: ["product cost", "inventory cost", "cogs", "coût produits"],
      isDebit: true,
    },
    {
      categoryId: "product_inventory",
      name: { en: "Product Inventory", fr: "Inventaire produits" },
      accountTypes: ["Asset"],
      quickBooksSubtypes: ["Inventory"],
      xeroTypes: ["INVENTORY"],
      nameKeywords: ["inventory", "products", "stock", "inventaire produits"],
      isDebit: true,
    },
  ],
  kpis: [
    {
      id: "revenue_per_client",
      name: { en: "Revenue per Client", fr: "Revenu par client" },
      formula: "(service_revenue + product_sales) / client_count",
      requiredCategories: ["service_revenue", "product_sales"],
      format: "currency",
      benchmark: { min: 80, max: 200 },
    },
    {
      id: "product_margin_pct",
      name: { en: "Product Margin %", fr: "Marge produits %" },
      formula: "((product_sales - product_cost) / product_sales) * 100",
      requiredCategories: ["product_sales", "product_cost"],
      format: "percentage",
    },
  ],
};

// =============================================================================
// All Industry Mappings
// =============================================================================

export const ALL_INDUSTRY_MAPPINGS: IndustryMapping[] = [
  RESTAURANT_MAPPING,
  RETAIL_MAPPING,
  PROFESSIONAL_SERVICES_MAPPING,
  REAL_ESTATE_MAPPING,
  CONSTRUCTION_MAPPING,
  HOSPITALITY_MAPPING,
  TECHNOLOGY_MAPPING,
  MANUFACTURING_MAPPING,
  AGRICULTURE_MAPPING,
  TRANSPORT_MAPPING,
  HEALTHCARE_MAPPING,
  EDUCATION_MAPPING,
  WHOLESALE_MAPPING,
  AUTOMOTIVE_MAPPING,
  BEAUTY_WELLNESS_MAPPING,
];

/**
 * Get industry mapping by ID
 */
export function getIndustryMapping(
  industryId: string,
): IndustryMapping | undefined {
  return ALL_INDUSTRY_MAPPINGS.find((m) => m.industryId === industryId);
}

/**
 * Match an account to a category based on its attributes
 */
export function matchAccountToCategory(
  account: {
    accountName: string;
    accountType: string;
    accountSubtype?: string;
    sourceAccountType?: string;
    sourceAccountSubtype?: string;
  },
  industryId: string,
): string | null {
  const mapping = getIndustryMapping(industryId);
  if (!mapping) return null;

  const nameLower = account.accountName.toLowerCase();

  for (const category of mapping.categories) {
    // Check name keywords first (most specific)
    for (const keyword of category.nameKeywords) {
      if (nameLower.includes(keyword.toLowerCase())) {
        return category.categoryId;
      }
    }

    // Check QuickBooks subtype
    if (
      account.sourceAccountSubtype &&
      category.quickBooksSubtypes.includes(account.sourceAccountSubtype)
    ) {
      // Additional keyword check to avoid false positives
      const hasKeywordMatch = category.nameKeywords.some((kw) =>
        nameLower.includes(kw.toLowerCase()),
      );
      if (hasKeywordMatch) {
        return category.categoryId;
      }
    }

    // Check Xero type
    if (
      account.sourceAccountType &&
      category.xeroTypes.includes(account.sourceAccountType)
    ) {
      const hasKeywordMatch = category.nameKeywords.some((kw) =>
        nameLower.includes(kw.toLowerCase()),
      );
      if (hasKeywordMatch) {
        return category.categoryId;
      }
    }
  }

  return null;
}

// =============================================================================
// INDUSTRY-TO-TAX-CREDIT RELEVANCE MAPPING
// =============================================================================

/**
 * Tax credit IDs relevant to each industry
 * Used to filter and prioritize tax credits during eligibility calculation
 */
export const INDUSTRY_TAX_CREDIT_RELEVANCE: Record<IndustryId, string[]> = {
  technology: [
    "sred",
    "cric",
    "cdae",
    "oidmtc",
    "clean_tech",
    "training_credit",
  ],
  manufacturing: [
    "sred",
    "ommitc",
    "cric",
    "apprenticeship",
    "clean_tech",
    "training_credit",
  ],
  professional_services: ["sred", "cric", "training_credit"],
  construction: ["apprenticeship", "cric", "training_credit"],
  agriculture: ["clean_tech", "sred", "training_credit"],
  transport: ["clean_tech", "apprenticeship", "training_credit"],
  restaurant: ["training_credit"],
  hospitality: ["training_credit"],
  retail: ["training_credit"],
  real_estate: ["training_credit"],
  healthcare: ["sred", "cric", "training_credit"],
  wholesale: ["training_credit"],
  automotive: ["apprenticeship", "clean_tech", "training_credit"],
  beauty_wellness: ["training_credit"],
  education: ["training_credit"],
};

/**
 * Get relevant tax credit IDs for an industry
 */
export function getRelevantTaxCreditIds(industryId: IndustryId): string[] {
  return INDUSTRY_TAX_CREDIT_RELEVANCE[industryId] || [];
}
