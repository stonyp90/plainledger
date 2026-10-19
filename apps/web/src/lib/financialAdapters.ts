import type { AccountBalanceExtended, BalanceSheetData, DashboardSummary, IncomeStatementData } from './financialData';
import type { BalanceSheetResult, IncomeStatementResult } from './graphql/responseTypes';

export function createEmptyDashboardSummary(): DashboardSummary {
  return {
    revenue: { current: 0, prior: 0, budget: 0, ytd: 0, ytdPrior: 0, ytdBudget: 0, varianceTobudget: 0 },
    expenses: { current: 0, prior: 0, budget: 0, ytd: 0, ytdBudget: 0 },
    netIncome: { current: 0, prior: 0, ytd: 0, ytdPrior: 0 },
    cash: { current: 0, prior: 0, runway: 0, burnRate: 0 },
    cashFlow: { operating: 0, investing: 0, financing: 0, net: 0, freeCashFlow: 0 },
    receivables: { current: 0, prior: 0, aging: [], totalOverdue: 0, averageDaysOutstanding: 0, hasData: false },
    payables: { current: 0, prior: 0, aging: [], totalOverdue: 0, averageDaysPayable: 0, hasData: false },
    bankAccounts: [], budgetComparisons: [], upcomingDeadlines: [], hasBudget: false,
    trialBalance: { totalDebits: 0, totalCredits: 0, isBalanced: true, entries: [] },
  };
}

/** Keep unclassified balances distinct; account numbers do not define universal subtypes. */
export function adaptBalanceSheet(report: BalanceSheetResult, organizationId: string): BalanceSheetData {
  const lines = (items: BalanceSheetResult['assets'], type: AccountBalanceExtended['type']) =>
    items.filter(item => !item.isSubtotal).map(item => ({
      code: item.accountCode, name: item.accountName, nameEn: item.accountName,
      current: item.balance, prior: 0, type,
    }));
  return {
    asOfDate: report.asOfDate, comparisonDate: '', hasComparison: false,
    organizationId, organizationName: report.organizationName, currency: report.currency,
    assets: { currentAssets: [], fixedAssets: [], unclassifiedAssets: lines(report.assets, 'asset') },
    liabilities: { currentLiabilities: [], longTermLiabilities: [], unclassifiedLiabilities: lines(report.liabilities, 'liability') },
    equity: lines(report.equity, 'equity'),
  };
}

export function adaptIncomeStatement(report: IncomeStatementResult, organizationId: string): IncomeStatementData {
  const lines = (items: IncomeStatementResult['revenue'], type: AccountBalanceExtended['type']) => items.map(item => ({
    code: item.accountCode, name: item.accountName, nameEn: item.accountName,
    current: item.amount, prior: 0, budget: item.budget, type,
  }));
  return {
    periodStart: report.startDate, periodEnd: report.endDate,
    comparisonPeriodStart: '', comparisonPeriodEnd: '', hasComparison: false,
    organizationId, currency: report.currency,
    revenue: lines(report.revenue, 'revenue'), costOfGoodsSold: [], operatingExpenses: [],
    otherIncome: [], otherExpenses: [], unclassifiedExpenses: lines(report.expenses, 'expense'),
  };
}
