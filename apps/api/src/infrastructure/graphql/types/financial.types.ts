/**
 * Financial GraphQL Types
 *
 * Types for financial data: accounts, transactions, reports.
 * Maps to domain entities and Gold layer datalake schema.
 */
import { Field, ObjectType, ID, Float, Int, InputType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";
import {
  AccountType,
  TransactionType,
  Money,
  TrendDirection,
  MetricWithTrend,
} from "./common.types";

// =====================================================
// ACCOUNT TYPES
// =====================================================

@ObjectType({ description: "Chart of accounts entry" })
export class Account {
  @Field(() => ID)
  id: string;

  @Field()
  code: string;

  @Field()
  name: string;

  @Field(() => AccountType)
  type: AccountType;

  @Field({ nullable: true })
  parentAccountId?: string;

  @Field(() => Float)
  balance: number;

  @Field({ defaultValue: "CAD" })
  currency: string;

  @Field()
  isActive: boolean;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastActivityAt?: Date;
}

@ObjectType({ description: "Account with balance and trend" })
export class AccountBalance {
  @Field(() => Account)
  account: Account;

  @Field(() => Money)
  currentBalance: Money;

  @Field(() => Money, { nullable: true })
  previousBalance?: Money;

  @Field(() => Float)
  changePercent: number;

  @Field(() => TrendDirection)
  trend: TrendDirection;
}

// =====================================================
// TRANSACTION TYPES
// =====================================================

@ObjectType({ description: "Transaction line item" })
export class TransactionLine {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  accountId: string;

  @Field({ nullable: true })
  accountName?: string;

  @Field(() => Float)
  debitAmount: number;

  @Field(() => Float)
  creditAmount: number;

  @Field({ nullable: true })
  description?: string;
}

@ObjectType({ description: "Financial transaction" })
export class Transaction {
  @Field(() => ID)
  id: string;

  @Field(() => TransactionType)
  type: TransactionType;

  @Field(() => GraphQLISODateTime)
  date: Date;

  @Field({ nullable: true })
  reference?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Float)
  amount: number;

  @Field({ defaultValue: "CAD" })
  currency: string;

  @Field(() => [TransactionLine])
  lines: TransactionLine[];

  @Field({ nullable: true })
  contactId?: string;

  @Field({ nullable: true })
  contactName?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;
}

// =====================================================
// DASHBOARD & ANALYTICS TYPES
// =====================================================

@ObjectType({ description: "Cash flow summary" })
export class CashFlowSummary {
  @Field(() => Money)
  inflows: Money;

  @Field(() => Money)
  outflows: Money;

  @Field(() => Money)
  netCashFlow: Money;

  @Field(() => Float)
  changePercent: number;

  @Field(() => TrendDirection)
  trend: TrendDirection;
}

@ObjectType({ description: "Revenue breakdown by category" })
export class RevenueBreakdown {
  @Field()
  category: string;

  @Field(() => Money)
  amount: Money;

  @Field(() => Float)
  percentage: number;

  @Field(() => Float, { nullable: true })
  changePercent?: number;
}

@ObjectType({ description: "Expense breakdown by category" })
export class ExpenseBreakdown {
  @Field()
  category: string;

  @Field(() => Money)
  amount: Money;

  @Field(() => Float)
  percentage: number;

  @Field(() => Float, { nullable: true })
  changePercent?: number;
}

@ObjectType({ description: "Financial dashboard summary" })
export class DashboardSummary {
  @Field(() => Money)
  totalRevenue: Money;

  @Field(() => Money)
  totalExpenses: Money;

  @Field(() => Money)
  netIncome: Money;

  @Field(() => Money)
  cashOnHand: Money;

  @Field(() => Money)
  accountsReceivable: Money;

  @Field(() => Money)
  accountsPayable: Money;

  @Field(() => CashFlowSummary)
  cashFlow: CashFlowSummary;

  @Field(() => [MetricWithTrend])
  keyMetrics: MetricWithTrend[];

  @Field(() => GraphQLISODateTime)
  asOfDate: Date;

  @Field()
  periodLabel: string;
}

@ObjectType({ description: "Time series data point" })
export class TimeSeriesPoint {
  @Field()
  date: string;

  @Field(() => Float)
  value: number;

  @Field({ nullable: true })
  label?: string;
}

@ObjectType({ description: "Financial trend data" })
export class FinancialTrend {
  @Field()
  metricName: string;

  @Field(() => [TimeSeriesPoint])
  data: TimeSeriesPoint[];

  @Field(() => Float)
  periodChangePercent: number;

  @Field(() => TrendDirection)
  trend: TrendDirection;
}

// =====================================================
// REPORT TYPES
// =====================================================

@ObjectType({ description: "Balance sheet line item" })
export class BalanceSheetLine {
  @Field()
  accountCode: string;

  @Field()
  accountName: string;

  @Field(() => AccountType)
  accountType: AccountType;

  @Field(() => Float)
  balance: number;

  @Field(() => Int)
  level: number;

  @Field(() => Boolean)
  isSubtotal: boolean;
}

@ObjectType({ description: "Balance sheet report" })
export class BalanceSheet {
  @Field(() => GraphQLISODateTime)
  asOfDate: Date;

  @Field()
  organizationName: string;

  @Field(() => [BalanceSheetLine])
  assets: BalanceSheetLine[];

  @Field(() => [BalanceSheetLine])
  liabilities: BalanceSheetLine[];

  @Field(() => [BalanceSheetLine])
  equity: BalanceSheetLine[];

  @Field(() => Float)
  totalAssets: number;

  @Field(() => Float)
  totalLiabilities: number;

  @Field(() => Float)
  totalEquity: number;

  @Field({ defaultValue: "CAD" })
  currency: string;
}

@ObjectType({ description: "Income statement line item" })
export class IncomeStatementLine {
  @Field()
  accountCode: string;

  @Field()
  accountName: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Float, { nullable: true })
  budget?: number;

  @Field(() => Float, { nullable: true })
  variance?: number;

  @Field(() => Int)
  level: number;
}

@ObjectType({ description: "Income statement report" })
export class IncomeStatement {
  @Field(() => GraphQLISODateTime)
  startDate: Date;

  @Field(() => GraphQLISODateTime)
  endDate: Date;

  @Field()
  organizationName: string;

  @Field(() => [IncomeStatementLine])
  revenue: IncomeStatementLine[];

  @Field(() => [IncomeStatementLine])
  expenses: IncomeStatementLine[];

  @Field(() => Float)
  grossRevenue: number;

  @Field(() => Float)
  totalExpenses: number;

  @Field(() => Float)
  netIncome: number;

  @Field({ defaultValue: "CAD" })
  currency: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

@InputType({ description: "Date range filter input" })
export class DateRangeInput {
  @Field(() => GraphQLISODateTime)
  startDate: Date;

  @Field(() => GraphQLISODateTime)
  endDate: Date;
}

@InputType({ description: "Pagination input" })
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  page: number;

  @Field(() => Int, { defaultValue: 20 })
  pageSize: number;
}

@InputType({ description: "Account filter input" })
export class AccountFilterInput {
  @Field(() => [AccountType], { nullable: true })
  types?: AccountType[];

  @Field({ nullable: true })
  search?: string;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  parentAccountId?: string;
}

@InputType({ description: "Transaction filter input" })
export class TransactionFilterInput {
  @Field(() => DateRangeInput, { nullable: true })
  dateRange?: DateRangeInput;

  @Field(() => [TransactionType], { nullable: true })
  types?: TransactionType[];

  @Field({ nullable: true })
  accountId?: string;

  @Field({ nullable: true })
  contactId?: string;

  @Field(() => Float, { nullable: true })
  minAmount?: number;

  @Field(() => Float, { nullable: true })
  maxAmount?: number;

  @Field({ nullable: true })
  search?: string;
}

@InputType({ description: "Dashboard filter input" })
export class DashboardFilterInput {
  @Field(() => DateRangeInput, { nullable: true })
  dateRange?: DateRangeInput;

  @Field({ nullable: true, defaultValue: "month" })
  period?: string;

  @Field({ nullable: true })
  compareWithPrevious?: boolean;

  @Field({ nullable: true })
  industryId?: string;
}

// =====================================================
// INDUSTRY KPI TYPES
// =====================================================

@ObjectType({ description: "Industry-specific KPI with benchmark" })
export class IndustryKPI {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  value?: number;

  @Field()
  format: string;

  @Field(() => Float, { nullable: true })
  benchmarkMin?: number;

  @Field(() => Float, { nullable: true })
  benchmarkMax?: number;

  @Field({ nullable: true })
  status?: string;
}

@ObjectType({ description: "Restaurant-specific KPIs" })
export class RestaurantKPIs {
  @Field(() => Float, { nullable: true })
  foodCostPct?: number;

  @Field(() => Float, { nullable: true })
  beverageCostPct?: number;

  @Field(() => Float, { nullable: true })
  laborCostPct?: number;

  @Field(() => Float, { nullable: true })
  primeCostPct?: number;

  @Field(() => Float, { nullable: true })
  averageCheck?: number;

  @Field(() => Int, { nullable: true })
  coversPerDay?: number;
}

@ObjectType({ description: "Retail-specific KPIs" })
export class RetailKPIs {
  @Field(() => Float, { nullable: true })
  grossMarginPct?: number;

  @Field(() => Float, { nullable: true })
  inventoryTurnover?: number;

  @Field(() => Float, { nullable: true })
  salesPerSqft?: number;

  @Field(() => Float, { nullable: true })
  shrinkagePct?: number;
}

@ObjectType({ description: "Real Estate-specific KPIs" })
export class RealEstateKPIs {
  @Field(() => Float, { nullable: true })
  occupancyRate?: number;

  @Field(() => Float, { nullable: true })
  capRate?: number;

  @Field(() => Float, { nullable: true })
  noi?: number;

  @Field(() => Float, { nullable: true })
  rentPerSqft?: number;

  @Field(() => Float, { nullable: true })
  expenseRatio?: number;

  @Field(() => Float, { nullable: true })
  cashOnCash?: number;
}

@ObjectType({ description: "Construction-specific KPIs" })
export class ConstructionKPIs {
  @Field(() => Float, { nullable: true })
  jobMarginPct?: number;

  @Field(() => Float, { nullable: true })
  wipBalance?: number;

  @Field(() => Float, { nullable: true })
  retentionBalance?: number;

  @Field(() => Float, { nullable: true })
  backlogValue?: number;
}

@ObjectType({ description: "Professional Services-specific KPIs" })
export class ProfessionalServicesKPIs {
  @Field(() => Float, { nullable: true })
  utilizationRate?: number;

  @Field(() => Float, { nullable: true })
  realizationRate?: number;

  @Field(() => Float, { nullable: true })
  effectiveRate?: number;

  @Field(() => Int, { nullable: true })
  arDays?: number;

  @Field(() => Int, { nullable: true })
  wipDays?: number;
}

@ObjectType({ description: "Industry KPIs response with calculated values" })
export class IndustryKPIsResponse {
  @Field()
  industry: string;

  @Field()
  industryName: string;

  @Field(() => [IndustryKPI])
  kpis: IndustryKPI[];

  @Field(() => RestaurantKPIs, { nullable: true })
  restaurant?: RestaurantKPIs;

  @Field(() => RetailKPIs, { nullable: true })
  retail?: RetailKPIs;

  @Field(() => RealEstateKPIs, { nullable: true })
  realEstate?: RealEstateKPIs;

  @Field(() => ConstructionKPIs, { nullable: true })
  construction?: ConstructionKPIs;

  @Field(() => ProfessionalServicesKPIs, { nullable: true })
  professionalServices?: ProfessionalServicesKPIs;

  @Field(() => GraphQLISODateTime)
  asOfDate: Date;
}

// =====================================================
// TRIAL BALANCE TYPES
// =====================================================

@ObjectType({ description: "Trial balance entry for a single account" })
export class TrialBalanceEntry {
  @Field()
  accountCode: string;

  @Field()
  accountName: string;

  @Field()
  accountType: string;

  @Field(() => Float)
  debitBalance: number;

  @Field(() => Float)
  creditBalance: number;
}

@ObjectType({
  description: "Trial balance report - real data from transactions",
})
export class TrialBalance {
  @Field(() => [TrialBalanceEntry])
  entries: TrialBalanceEntry[];

  @Field(() => Float)
  totalDebits: number;

  @Field(() => Float)
  totalCredits: number;

  @Field(() => Float)
  difference: number;

  @Field()
  isBalanced: boolean;

  @Field()
  asOfDate: string;
}

// =====================================================
// CASH FLOW WATERFALL TYPES
// =====================================================

@ObjectType({ description: "Cash flow waterfall item for chart" })
export class WaterfallItem {
  @Field()
  label: string;

  @Field()
  labelEn: string;

  @Field(() => Float)
  value: number;

  @Field({ description: "start | increase | decrease | subtotal | end" })
  type: string;

  @Field({
    description: "opening | operating | investing | financing | closing",
  })
  category: string;
}

// =====================================================
// AGING REPORT TYPES
// =====================================================

@ObjectType({ description: "Aging bucket for AR/AP aging" })
export class AgingBucket {
  @Field()
  label: string;

  @Field()
  labelEn: string;

  @Field(() => Int)
  minDays: number;

  @Field(() => Int, { nullable: true })
  maxDays: number | null;

  @Field(() => Float)
  amount: number;

  @Field(() => Int)
  count: number;
}

@ObjectType({
  description: "AR or AP aging report - real data from transactions",
})
export class AgingReport {
  @Field(() => [AgingBucket])
  buckets: AgingBucket[];

  @Field(() => Float)
  total: number;

  @Field(() => Float)
  totalOverdue: number;

  @Field(() => Int)
  averageDays: number;

  @Field({ description: "Whether real invoice/bill data exists" })
  hasData: boolean;
}

// =====================================================
// BUDGET TYPES
// =====================================================

@ObjectType({ description: "Budget comparison entry" })
export class BudgetComparisonEntry {
  @Field()
  category: string;

  @Field()
  categoryEn: string;

  @Field(() => Float)
  budgetAmount: number;

  @Field(() => Float)
  actualAmount: number;

  @Field(() => Float)
  variance: number;

  @Field(() => Float)
  variancePercent: number;
}

@ObjectType({
  description: "Budget vs Actual comparison - requires budget setup",
})
export class BudgetComparison {
  @Field(() => [BudgetComparisonEntry])
  entries: BudgetComparisonEntry[];

  @Field(() => Float)
  totalBudget: number;

  @Field(() => Float)
  totalActual: number;

  @Field(() => Float)
  totalVariance: number;

  @Field({ description: "Whether budget has been configured" })
  hasBudget: boolean;

  @Field()
  periodLabel: string;
}

// =====================================================
// TAX DEADLINES TYPES
// =====================================================

@ObjectType({ description: "Tax or filing deadline" })
export class TaxDeadline {
  @Field()
  id: string;

  @Field()
  title: string;

  @Field()
  titleEn: string;

  @Field()
  description: string;

  @Field(() => GraphQLISODateTime)
  dueDate: Date;

  @Field(() => Int)
  daysRemaining: number;

  @Field({ description: "overdue | urgent | upcoming | future" })
  status: string;

  @Field({ description: "gst | payroll | corporate | other" })
  category: string;
}

@ObjectType({ description: "Upcoming tax deadlines based on fiscal year" })
export class TaxDeadlinesResponse {
  @Field(() => [TaxDeadline])
  deadlines: TaxDeadline[];

  @Field({ nullable: true })
  fiscalYearEnd?: string;

  @Field({ nullable: true })
  province?: string;
}

// =====================================================
// BUDGET INPUT/OUTPUT TYPES
// =====================================================

@ObjectType({ description: "Budget category with amount" })
export class BudgetCategory {
  @Field()
  categoryId: string;

  @Field()
  categoryName: string;

  @Field()
  categoryNameEn: string;

  @Field(() => Float)
  monthlyAmount: number;
}

@ObjectType({ description: "Organization budget settings" })
export class BudgetSettings {
  @Field(() => Int)
  year: number;

  @Field(() => [BudgetCategory])
  categories: BudgetCategory[];

  @Field({ nullable: true })
  lastUpdated?: string;

  @Field({ nullable: true })
  updatedBy?: string;

  @Field()
  hasBudget: boolean;
}

@InputType({ description: "Budget category input" })
export class BudgetCategoryInput {
  @Field()
  categoryId: string;

  @Field()
  categoryName: string;

  @Field()
  categoryNameEn: string;

  @Field(() => Float)
  monthlyAmount: number;
}

@InputType({ description: "Save budget settings input" })
export class SaveBudgetInput {
  @Field(() => Int)
  year: number;

  @Field(() => [BudgetCategoryInput])
  categories: BudgetCategoryInput[];
}

// Default budget categories for quick setup
export const DEFAULT_BUDGET_CATEGORIES = [
  {
    categoryId: "salaries",
    categoryName: "Salaires",
    categoryNameEn: "Salaries",
  },
  {
    categoryId: "rent",
    categoryName: "Loyer & Services",
    categoryNameEn: "Rent & Utilities",
  },
  {
    categoryId: "marketing",
    categoryName: "Marketing",
    categoryNameEn: "Marketing",
  },
  {
    categoryId: "supplies",
    categoryName: "Fournitures",
    categoryNameEn: "Supplies",
  },
  {
    categoryId: "professional",
    categoryName: "Services professionnels",
    categoryNameEn: "Professional Services",
  },
  {
    categoryId: "insurance",
    categoryName: "Assurances",
    categoryNameEn: "Insurance",
  },
  { categoryId: "other", categoryName: "Autres", categoryNameEn: "Other" },
];
