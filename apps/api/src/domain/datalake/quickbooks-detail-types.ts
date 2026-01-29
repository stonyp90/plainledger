/**
 * QuickBooks Detail Types Mapping
 *
 * QuickBooks uses a two-level account classification system:
 * - 15 Account Types (parent categories)
 * - 154 Detail Types (subtypes within each account type)
 *
 * This file provides comprehensive mapping for all QuickBooks detail types,
 * enabling accurate ETL transformations and industry-specific KPI calculations.
 *
 * Reference: QuickBooks Online API - Account Detail Types
 * https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account
 */

// =============================================================================
// QuickBooks Account Types (15 total)
// =============================================================================

export type QuickBooksAccountType =
  | "Bank"
  | "Accounts Receivable"
  | "Other Current Assets"
  | "Fixed Assets"
  | "Other Assets"
  | "Credit Card"
  | "Accounts Payable"
  | "Other Current Liabilities"
  | "Long Term Liabilities"
  | "Equity"
  | "Income"
  | "Cost of Goods Sold"
  | "Expenses"
  | "Other Income"
  | "Other Expense";

// =============================================================================
// QuickBooks Detail Types by Account Type (154 total)
// =============================================================================

export const QUICKBOOKS_DETAIL_TYPES: Record<QuickBooksAccountType, string[]> =
  {
    // =========================================================================
    // ASSETS
    // =========================================================================

    /** Bank (5 detail types) - Cash and bank accounts */
    Bank: ["CashOnHand", "Checking", "MoneyMarket", "Savings", "TrustAccounts"],

    /** Accounts Receivable (1 detail type) */
    "Accounts Receivable": ["AccountsReceivable"],

    /** Other Current Assets (15 detail types) - Short-term assets */
    "Other Current Assets": [
      "AllowanceForBadDebts",
      "DevelopmentCosts",
      "EmployeeCashAdvances",
      "Inventory",
      "Investment_MortgageRealEstateLoans",
      "Investment_Other",
      "Investment_TaxExemptSecurities",
      "Investment_USGovernmentObligations",
      "LoansToOfficers",
      "LoansToOthers",
      "LoansToStockholders",
      "OtherCurrentAssets",
      "PrepaidExpenses",
      "Retainage",
      "UndepositedFunds",
    ],

    /** Fixed Assets (15 detail types) - Long-term tangible assets */
    "Fixed Assets": [
      "AccumulatedAmortization",
      "AccumulatedDepletion",
      "AccumulatedDepreciation",
      "Buildings",
      "DepletableAssets",
      "FixedAssetComputers",
      "FixedAssetCopiers",
      "FixedAssetFurniture",
      "FixedAssetOtherToolsEquipment",
      "FixedAssetPhone",
      "FixedAssetPhotographyEquipment",
      "FixedAssetSoftware",
      "FurnitureAndFixtures",
      "Land",
      "LeaseholdImprovements",
      "MachineryAndEquipment",
      "OtherFixedAssets",
      "Vehicles",
    ],

    /** Other Assets (6 detail types) - Non-current assets */
    "Other Assets": [
      "AccumulatedAmortizationOfOtherAssets",
      "Goodwill",
      "IntangibleAssets",
      "LeaseBuyout",
      "Licenses",
      "OrganizationalCosts",
      "OtherLongTermAssets",
      "SecurityDeposits",
    ],

    // =========================================================================
    // LIABILITIES
    // =========================================================================

    /** Credit Card (1 detail type) */
    "Credit Card": ["CreditCard"],

    /** Accounts Payable (1 detail type) */
    "Accounts Payable": ["AccountsPayable"],

    /** Other Current Liabilities (17 detail types) - Short-term liabilities */
    "Other Current Liabilities": [
      "DirectDepositPayable",
      "FederalIncomeTaxPayable",
      "InsurancePayable",
      "LineOfCredit",
      "LoanPayable",
      "OtherCurrentLiabilities",
      "PayrollClearing",
      "PayrollTaxPayable",
      "PrepaidExpensesPayable",
      "RentsInTrustLiability",
      "SalesTaxPayable",
      "ShareholderNotesPayable",
      "StateLocalIncomeTaxPayable",
      "TrustAccountsLiabilities",
      "GlobalTaxPayable",
      "GlobalTaxSuspense",
      "UndepositedFundsLiability",
    ],

    /** Long Term Liabilities (5 detail types) - Non-current liabilities */
    "Long Term Liabilities": [
      "NotesPayable",
      "OtherLongTermLiabilities",
      "ShareholderNotesPayableLongTerm",
      "AccruedLongTermLiabilities",
      "AccruedVacationPayable",
    ],

    // =========================================================================
    // EQUITY
    // =========================================================================

    /** Equity (14 detail types) - Owner's equity accounts */
    Equity: [
      "AccumulatedAdjustment",
      "AccumulatedOtherComprehensiveIncome",
      "CalledUpShareCapital",
      "CapitalReserves",
      "CommonStock",
      "Dividend",
      "EquityInEarningsOfSubsidiaries",
      "EstimatedTaxes",
      "HealthInsurance",
      "HealthSavingsAccount",
      "OpeningBalanceEquity",
      "OwnersEquity",
      "PaidInCapitalOrSurplus",
      "PartnerContributions",
      "PartnerDistributions",
      "PartnerEquity",
      "PersonalExpense",
      "PersonalIncome",
      "PreferredStock",
      "RetainedEarnings",
      "ShareCapital",
      "TreasuryStock",
    ],

    // =========================================================================
    // REVENUE
    // =========================================================================

    /** Income (9 detail types) - Primary revenue */
    Income: [
      "DiscountsRefundsGiven",
      "NonProfitIncome",
      "OtherPrimaryIncome",
      "RevenueGeneral",
      "SalesOfProductIncome",
      "SalesRetail",
      "SalesWholesale",
      "ServiceFeeIncome",
      "UnappliedCashPaymentIncome",
    ],

    /** Other Income (7 detail types) - Non-operating revenue */
    "Other Income": [
      "DividendIncome",
      "InterestEarned",
      "OtherInvestmentIncome",
      "OtherMiscellaneousIncome",
      "RentalIncomeReceived",
      "TaxExemptInterest",
      "UnrealizedGainLossOnSecuritiesNetOfTax",
    ],

    // =========================================================================
    // EXPENSES
    // =========================================================================

    /** Cost of Goods Sold (9 detail types) - Direct costs */
    "Cost of Goods Sold": [
      "CostOfLaborCos",
      "EquipmentRentalCos",
      "FreightAndDeliveryCost",
      "OtherCostsOfServiceCos",
      "ShippingFreightDeliveryCos",
      "SuppliesMaterialsCogs",
      "CostOfSales",
      "DirectLaborCosts",
      "SubcontractorCosts",
    ],

    /** Expenses (52 detail types) - Operating expenses */
    Expenses: [
      "AdvertisingPromotional",
      "Amortization",
      "Auto",
      "BadDebts",
      "BankCharges",
      "BoardMeetingExpenses",
      "BusinessLicensesPermits",
      "CarAndTruck",
      "CharitableContributions",
      "CommissionsAndFees",
      "Communication",
      "CostOfLabor",
      "Depreciation",
      "DuesSubscriptions",
      "Entertainment",
      "EntertainmentMeals",
      "EquipmentRental",
      "ExchangeGainOrLoss",
      "FinanceCosts",
      "GlobalTaxExpense",
      "Insurance",
      "InsuranceGeneralLiability",
      "InsuranceWorkersComp",
      "InterestPaid",
      "LegalProfessionalFees",
      "ManagementCompensation",
      "MealsAndEntertainment",
      "MortgageInterest",
      "OfficeExpenses",
      "OfficeGeneralAdministrativeExpenses",
      "OtherBusinessExpenses",
      "OtherMiscellaneousServiceCost",
      "ParkingAndTolls",
      "PayrollExpenses",
      "PayrollTaxes",
      "PenaltiesSettlements",
      "Postage",
      "ProfessionalFees",
      "PromotionalMeals",
      "PropertyTax",
      "Rent",
      "RentOrLeaseOfBuildings",
      "RepairMaintenance",
      "ShippingFreightDelivery",
      "Stationery",
      "Supplies",
      "Taxes",
      "TaxesPaid",
      "Telephone",
      "Travel",
      "TravelMeals",
      "UnappliedCashBillPaymentExpense",
      "Utilities",
    ],

    /** Other Expense (6 detail types) - Non-operating expenses */
    "Other Expense": [
      "Amortization",
      "Depreciation",
      "ExchangeGainOrLoss",
      "GasAndFuel",
      "HomeOffice",
      "HomeOwnerRentalInsurance",
      "MortgageInterest",
      "OtherHomeOfficeExpenses",
      "OtherMiscellaneousExpense",
      "OtherVehicleExpenses",
      "ParkingAndTolls",
      "RepairsAndMaintenance",
      "Taxes",
      "Utilities",
      "Vehicle",
      "VehicleInsurance",
      "VehicleLease",
      "VehicleLoan",
      "VehicleLoanInterest",
      "VehicleRegistration",
      "VehicleRepairs",
      "Wash",
    ],
  };

// =============================================================================
// Industry-Specific Detail Type Priorities
// =============================================================================

export interface IndustryDetailTypePriority {
  revenue: string[];
  expenses: string[];
  assets: string[];
  liabilities: string[];
  cogs?: string[];
}

export const INDUSTRY_PRIORITY_DETAIL_TYPES: Record<
  string,
  IndustryDetailTypePriority
> = {
  real_estate: {
    revenue: [
      "RentalIncomeReceived",
      "ServiceFeeIncome",
      "OtherMiscellaneousIncome",
    ],
    expenses: [
      "RepairMaintenance",
      "Insurance",
      "TaxesPaid",
      "PropertyTax",
      "Utilities",
      "InterestPaid",
      "MortgageInterest",
      "LegalProfessionalFees",
    ],
    assets: [
      "Buildings",
      "Land",
      "LeaseholdImprovements",
      "AccumulatedDepreciation",
      "SecurityDeposits",
    ],
    liabilities: [
      "NotesPayable",
      "OtherLongTermLiabilities",
      "RentsInTrustLiability",
    ],
  },

  restaurant: {
    revenue: ["SalesOfProductIncome", "SalesRetail", "ServiceFeeIncome"],
    expenses: [
      "CostOfLabor",
      "PayrollExpenses",
      "Supplies",
      "Utilities",
      "RentOrLeaseOfBuildings",
      "Insurance",
      "RepairMaintenance",
    ],
    assets: [
      "Inventory",
      "MachineryAndEquipment",
      "FurnitureAndFixtures",
      "LeaseholdImprovements",
    ],
    liabilities: ["LineOfCredit", "NotesPayable", "SalesTaxPayable"],
    cogs: ["SuppliesMaterialsCogs", "CostOfLaborCos", "FreightAndDeliveryCost"],
  },

  construction: {
    revenue: ["SalesOfProductIncome", "ServiceFeeIncome", "OtherPrimaryIncome"],
    expenses: [
      "CostOfLabor",
      "EquipmentRental",
      "Supplies",
      "Insurance",
      "InsuranceWorkersComp",
      "LegalProfessionalFees",
      "Permits",
    ],
    assets: [
      "MachineryAndEquipment",
      "Vehicles",
      "OtherCurrentAssets", // WIP
      "Retainage",
    ],
    liabilities: ["LineOfCredit", "NotesPayable", "AccountsPayable"],
    cogs: [
      "SuppliesMaterialsCogs",
      "SubcontractorCosts",
      "DirectLaborCosts",
      "EquipmentRentalCos",
    ],
  },

  hospitality: {
    revenue: [
      "SalesOfProductIncome",
      "ServiceFeeIncome",
      "RentalIncomeReceived",
    ],
    expenses: [
      "PayrollExpenses",
      "CostOfLabor",
      "Supplies",
      "Utilities",
      "RepairMaintenance",
      "Insurance",
      "AdvertisingPromotional",
    ],
    assets: [
      "Buildings",
      "FurnitureAndFixtures",
      "MachineryAndEquipment",
      "Inventory",
      "LeaseholdImprovements",
    ],
    liabilities: [
      "NotesPayable",
      "LineOfCredit",
      "PrepaidExpensesPayable", // Guest deposits
    ],
  },

  retail: {
    revenue: [
      "SalesOfProductIncome",
      "SalesRetail",
      "SalesWholesale",
      "DiscountsRefundsGiven",
    ],
    expenses: [
      "RentOrLeaseOfBuildings",
      "PayrollExpenses",
      "AdvertisingPromotional",
      "Utilities",
      "Insurance",
      "ShippingFreightDelivery",
    ],
    assets: [
      "Inventory",
      "FurnitureAndFixtures",
      "LeaseholdImprovements",
      "FixedAssetSoftware", // POS systems
    ],
    liabilities: ["AccountsPayable", "LineOfCredit", "SalesTaxPayable"],
    cogs: [
      "SuppliesMaterialsCogs",
      "FreightAndDeliveryCost",
      "ShippingFreightDeliveryCos",
    ],
  },

  professional_services: {
    revenue: ["ServiceFeeIncome", "OtherPrimaryIncome", "RevenueGeneral"],
    expenses: [
      "PayrollExpenses",
      "RentOrLeaseOfBuildings",
      "Insurance",
      "LegalProfessionalFees",
      "ProfessionalFees",
      "DuesSubscriptions",
      "Travel",
    ],
    assets: [
      "AccountsReceivable",
      "FixedAssetComputers",
      "FixedAssetSoftware",
      "FurnitureAndFixtures",
    ],
    liabilities: ["AccountsPayable", "LineOfCredit", "PayrollTaxPayable"],
  },

  manufacturing: {
    revenue: ["SalesOfProductIncome", "SalesWholesale", "OtherPrimaryIncome"],
    expenses: [
      "CostOfLabor",
      "PayrollExpenses",
      "EquipmentRental",
      "Utilities",
      "RepairMaintenance",
      "Insurance",
      "ShippingFreightDelivery",
    ],
    assets: [
      "Inventory",
      "MachineryAndEquipment",
      "Buildings",
      "Land",
      "Vehicles",
    ],
    liabilities: ["NotesPayable", "LineOfCredit", "AccountsPayable"],
    cogs: [
      "SuppliesMaterialsCogs",
      "DirectLaborCosts",
      "FreightAndDeliveryCost",
      "EquipmentRentalCos",
    ],
  },

  healthcare: {
    revenue: ["ServiceFeeIncome", "RevenueGeneral", "OtherPrimaryIncome"],
    expenses: [
      "PayrollExpenses",
      "RentOrLeaseOfBuildings",
      "Insurance",
      "InsuranceGeneralLiability",
      "Supplies",
      "LegalProfessionalFees",
      "DuesSubscriptions",
    ],
    assets: [
      "AccountsReceivable",
      "MachineryAndEquipment", // Medical equipment
      "FixedAssetSoftware",
      "LeaseholdImprovements",
    ],
    liabilities: ["AccountsPayable", "LineOfCredit", "NotesPayable"],
  },

  transport: {
    revenue: ["ServiceFeeIncome", "OtherPrimaryIncome", "RevenueGeneral"],
    expenses: [
      "Auto",
      "GasAndFuel",
      "VehicleRepairs",
      "VehicleInsurance",
      "PayrollExpenses",
      "Insurance",
      "ParkingAndTolls",
    ],
    assets: ["Vehicles", "MachineryAndEquipment", "AccumulatedDepreciation"],
    liabilities: ["VehicleLoan", "NotesPayable", "LineOfCredit"],
  },

  agriculture: {
    revenue: ["SalesOfProductIncome", "OtherPrimaryIncome", "RevenueGeneral"],
    expenses: [
      "Supplies",
      "CostOfLabor",
      "EquipmentRental",
      "RepairMaintenance",
      "Utilities",
      "Insurance",
      "TaxesPaid",
    ],
    assets: [
      "Land",
      "MachineryAndEquipment",
      "Vehicles",
      "Inventory",
      "Buildings",
    ],
    liabilities: ["NotesPayable", "LineOfCredit", "AccountsPayable"],
    cogs: ["SuppliesMaterialsCogs", "CostOfLaborCos", "FreightAndDeliveryCost"],
  },

  education: {
    revenue: ["ServiceFeeIncome", "NonProfitIncome", "OtherPrimaryIncome"],
    expenses: [
      "PayrollExpenses",
      "RentOrLeaseOfBuildings",
      "Supplies",
      "Insurance",
      "Utilities",
      "AdvertisingPromotional",
    ],
    assets: [
      "AccountsReceivable",
      "FurnitureAndFixtures",
      "FixedAssetComputers",
      "LeaseholdImprovements",
    ],
    liabilities: [
      "PrepaidExpensesPayable", // Tuition deposits
      "AccountsPayable",
      "LineOfCredit",
    ],
  },

  wholesale: {
    revenue: [
      "SalesWholesale",
      "SalesOfProductIncome",
      "DiscountsRefundsGiven",
    ],
    expenses: [
      "ShippingFreightDelivery",
      "RentOrLeaseOfBuildings",
      "PayrollExpenses",
      "Insurance",
      "Utilities",
    ],
    assets: [
      "Inventory",
      "AccountsReceivable",
      "MachineryAndEquipment",
      "Vehicles",
    ],
    liabilities: ["AccountsPayable", "LineOfCredit", "SalesTaxPayable"],
    cogs: [
      "SuppliesMaterialsCogs",
      "FreightAndDeliveryCost",
      "ShippingFreightDeliveryCos",
    ],
  },

  automotive: {
    revenue: ["SalesOfProductIncome", "SalesRetail", "ServiceFeeIncome"],
    expenses: [
      "PayrollExpenses",
      "RentOrLeaseOfBuildings",
      "Insurance",
      "AdvertisingPromotional",
      "Utilities",
      "RepairMaintenance",
    ],
    assets: [
      "Inventory",
      "MachineryAndEquipment",
      "FurnitureAndFixtures",
      "LeaseholdImprovements",
    ],
    liabilities: ["AccountsPayable", "LineOfCredit", "NotesPayable"],
    cogs: ["SuppliesMaterialsCogs", "DirectLaborCosts"],
  },

  beauty_wellness: {
    revenue: ["ServiceFeeIncome", "SalesOfProductIncome", "SalesRetail"],
    expenses: [
      "PayrollExpenses",
      "RentOrLeaseOfBuildings",
      "Supplies",
      "AdvertisingPromotional",
      "Insurance",
      "Utilities",
    ],
    assets: [
      "Inventory",
      "MachineryAndEquipment",
      "FurnitureAndFixtures",
      "LeaseholdImprovements",
    ],
    liabilities: [
      "AccountsPayable",
      "LineOfCredit",
      "PrepaidExpensesPayable", // Gift cards
    ],
  },

  technology: {
    revenue: [
      "ServiceFeeIncome", // SaaS subscriptions
      "SalesOfProductIncome",
      "OtherPrimaryIncome",
    ],
    expenses: [
      "PayrollExpenses",
      "RentOrLeaseOfBuildings",
      "AdvertisingPromotional",
      "FixedAssetSoftware", // Cloud hosting (often miscategorized)
      "DuesSubscriptions",
      "Travel",
      "LegalProfessionalFees",
    ],
    assets: [
      "AccountsReceivable",
      "FixedAssetComputers",
      "FixedAssetSoftware",
      "IntangibleAssets",
    ],
    liabilities: [
      "AccountsPayable",
      "PrepaidExpensesPayable", // Deferred revenue
      "LineOfCredit",
    ],
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all detail types for a given account type
 */
export function getDetailTypesForAccountType(
  accountType: QuickBooksAccountType,
): string[] {
  return QUICKBOOKS_DETAIL_TYPES[accountType] || [];
}

/**
 * Find which account type a detail type belongs to
 */
export function getAccountTypeForDetailType(
  detailType: string,
): QuickBooksAccountType | null {
  for (const [accountType, detailTypes] of Object.entries(
    QUICKBOOKS_DETAIL_TYPES,
  )) {
    if (detailTypes.includes(detailType)) {
      return accountType as QuickBooksAccountType;
    }
  }
  return null;
}

/**
 * Check if a detail type is revenue-related
 */
export function isRevenueDetailType(detailType: string): boolean {
  return (
    QUICKBOOKS_DETAIL_TYPES.Income.includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Other Income"].includes(detailType)
  );
}

/**
 * Check if a detail type is expense-related
 */
export function isExpenseDetailType(detailType: string): boolean {
  return (
    QUICKBOOKS_DETAIL_TYPES.Expenses.includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Other Expense"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Cost of Goods Sold"].includes(detailType)
  );
}

/**
 * Check if a detail type is asset-related
 */
export function isAssetDetailType(detailType: string): boolean {
  return (
    QUICKBOOKS_DETAIL_TYPES.Bank.includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Accounts Receivable"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Other Current Assets"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Fixed Assets"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Other Assets"].includes(detailType)
  );
}

/**
 * Check if a detail type is liability-related
 */
export function isLiabilityDetailType(detailType: string): boolean {
  return (
    QUICKBOOKS_DETAIL_TYPES["Credit Card"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Accounts Payable"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Other Current Liabilities"].includes(detailType) ||
    QUICKBOOKS_DETAIL_TYPES["Long Term Liabilities"].includes(detailType)
  );
}

/**
 * Get industry-specific priority detail types
 */
export function getIndustryPriorityDetailTypes(
  industryId: string,
): IndustryDetailTypePriority | null {
  return INDUSTRY_PRIORITY_DETAIL_TYPES[industryId] || null;
}

/**
 * Count total detail types
 */
export function getTotalDetailTypeCount(): number {
  return Object.values(QUICKBOOKS_DETAIL_TYPES).reduce(
    (total, types) => total + types.length,
    0,
  );
}

// Total: 154+ detail types across 15 account types
