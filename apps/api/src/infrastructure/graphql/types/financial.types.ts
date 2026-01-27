/**
 * Financial GraphQL Types
 *
 * Types for financial data: accounts, transactions, reports.
 * Maps to domain entities and Gold layer datalake schema.
 */
import { Field, ObjectType, ID, Float, Int, InputType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";
import { AccountType, TransactionType, Money, TrendDirection, MetricWithTrend } from "./common.types";

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
}
