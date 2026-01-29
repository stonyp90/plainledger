/**
 * GraphQL Queries
 *
 * All GraphQL queries used by the application.
 * Organized by domain for easy maintenance.
 */
import { gql } from "@apollo/client";

// =====================================================
// FRAGMENTS
// =====================================================

export const MONEY_FRAGMENT = gql`
  fragment MoneyFields on Money {
    amount
    currency
    formatted
  }
`;

export const ACCOUNT_FRAGMENT = gql`
  fragment AccountFields on Account {
    id
    code
    name
    type
    balance
    currency
    isActive
    lastActivityAt
  }
`;

export const TRANSACTION_FRAGMENT = gql`
  fragment TransactionFields on Transaction {
    id
    type
    date
    reference
    description
    amount
    currency
    contactName
    createdAt
  }
`;

// =====================================================
// DASHBOARD QUERIES
// =====================================================

export const GET_DASHBOARD_SUMMARY = gql`
  ${MONEY_FRAGMENT}
  query GetDashboardSummary($filter: DashboardFilterInput) {
    dashboardSummary(filter: $filter) {
      totalRevenue {
        ...MoneyFields
      }
      totalExpenses {
        ...MoneyFields
      }
      netIncome {
        ...MoneyFields
      }
      cashOnHand {
        ...MoneyFields
      }
      accountsReceivable {
        ...MoneyFields
      }
      accountsPayable {
        ...MoneyFields
      }
      cashFlow {
        inflows {
          ...MoneyFields
        }
        outflows {
          ...MoneyFields
        }
        netCashFlow {
          ...MoneyFields
        }
        changePercent
        trend
      }
      keyMetrics {
        name
        currentValue
        previousValue
        direction
        changePercent
      }
      asOfDate
      periodLabel
    }
  }
`;

export const GET_FINANCIAL_TRENDS = gql`
  query GetFinancialTrends($metrics: [String!]!, $dateRange: DateRangeInput) {
    financialTrends(metrics: $metrics, dateRange: $dateRange) {
      metricName
      data {
        date
        value
        label
      }
      periodChangePercent
      trend
    }
  }
`;

// =====================================================
// ACCOUNT QUERIES
// =====================================================

export const GET_ACCOUNTS = gql`
  ${ACCOUNT_FRAGMENT}
  query GetAccounts($filter: AccountFilterInput, $pagination: PaginationInput) {
    accounts(filter: $filter, pagination: $pagination) {
      nodes {
        ...AccountFields
      }
      pageInfo {
        totalCount
        pageSize
        currentPage
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export const GET_ACCOUNT = gql`
  ${ACCOUNT_FRAGMENT}
  query GetAccount($id: ID!) {
    account(id: $id) {
      ...AccountFields
    }
  }
`;

// =====================================================
// TRANSACTION QUERIES
// =====================================================

export const GET_TRANSACTIONS = gql`
  ${TRANSACTION_FRAGMENT}
  query GetTransactions(
    $filter: TransactionFilterInput
    $pagination: PaginationInput
  ) {
    transactions(filter: $filter, pagination: $pagination) {
      nodes {
        ...TransactionFields
      }
      pageInfo {
        totalCount
        pageSize
        currentPage
        totalPages
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

// =====================================================
// REPORT QUERIES
// =====================================================

export const GET_BALANCE_SHEET = gql`
  query GetBalanceSheet($asOfDate: DateTime) {
    balanceSheet(asOfDate: $asOfDate) {
      asOfDate
      organizationName
      assets {
        accountCode
        accountName
        accountType
        balance
        level
        isSubtotal
      }
      liabilities {
        accountCode
        accountName
        accountType
        balance
        level
        isSubtotal
      }
      equity {
        accountCode
        accountName
        accountType
        balance
        level
        isSubtotal
      }
      totalAssets
      totalLiabilities
      totalEquity
      currency
    }
  }
`;

export const GET_INCOME_STATEMENT = gql`
  query GetIncomeStatement($dateRange: DateRangeInput!) {
    incomeStatement(dateRange: $dateRange) {
      startDate
      endDate
      organizationName
      revenue {
        accountCode
        accountName
        amount
        budget
        variance
        level
      }
      expenses {
        accountCode
        accountName
        amount
        budget
        variance
        level
      }
      grossRevenue
      totalExpenses
      netIncome
      currency
    }
  }
`;

// =====================================================
// ORGANIZATION QUERIES
// =====================================================

export const GET_ORGANIZATION = gql`
  query GetOrganization {
    organization {
      id
      name
      slug
      industry
      createdAt
      updatedAt
    }
  }
`;

export const GET_ORGANIZATION_FEATURES = gql`
  query GetOrganizationFeatures {
    organizationFeatures {
      organizationId
      analyticsEnabled
      aiInsightsEnabled
      multiCurrencyEnabled
      customReportsEnabled
      apiAccessEnabled
      maxDataSources
      maxUsers
    }
  }
`;

// =====================================================
// DATA SOURCE QUERIES
// =====================================================

export const GET_DATA_SOURCES = gql`
  query GetDataSources {
    dataSources {
      id
      provider
      name
      companyName
      status
      lastSyncAt
      nextSyncAt
      syncStats {
        accountsSynced
        transactionsSynced
        contactsSynced
        invoicesSynced
        billsSynced
      }
      errorMessage
      createdAt
      updatedAt
    }
  }
`;

export const GET_AVAILABLE_PROVIDERS = gql`
  query GetAvailableProviders {
    availableProviders {
      id
      name
      description
      logoUrl
      isEnabled
      supportedFeatures
    }
  }
`;

// =====================================================
// MARKET ANALYSIS / BENCHMARK QUERIES
// =====================================================

export const GET_INDUSTRY_BENCHMARK = gql`
  query GetIndustryBenchmark($industry: String!, $revenueRange: String) {
    industryBenchmark(industry: $industry, revenueRange: $revenueRange) {
      industryId
      industryName
      revenueRange
      referenceYear
      sampleSize
      dataSource
      profitability {
        grossMargin {
          q1
          median
          q3
        }
        netMargin {
          q1
          median
          q3
        }
      }
      operations {
        operatingExpenseRatio
        wagesToRevenueRatio
        rentToRevenueRatio
      }
      balanceSheet {
        currentRatio {
          q1
          median
          q3
        }
        debtToEquity {
          q1
          median
          q3
        }
      }
      growth {
        revenueYoY
        revenueQoQ
      }
      lastUpdated
    }
  }
`;

export const GET_ALL_INDUSTRY_BENCHMARKS = gql`
  query GetAllIndustryBenchmarks($revenueRange: String) {
    allIndustryBenchmarks(revenueRange: $revenueRange) {
      industryId
      industryName
      revenueRange
      referenceYear
      sampleSize
      profitability {
        grossMargin {
          q1
          median
          q3
        }
        netMargin {
          q1
          median
          q3
        }
      }
      operations {
        operatingExpenseRatio
      }
      balanceSheet {
        currentRatio {
          q1
          median
          q3
        }
      }
      growth {
        revenueYoY
      }
    }
  }
`;

export const GET_ORGANIZATION_COMPARISON = gql`
  query GetOrganizationComparison(
    $organizationId: String!
    $industry: String!
    $revenueRange: String
    $grossMargin: Float
    $netMargin: Float
    $currentRatio: Float
    $debtToEquity: Float
    $operatingExpenseRatio: Float
  ) {
    organizationComparison(
      organizationId: $organizationId
      industry: $industry
      revenueRange: $revenueRange
      grossMargin: $grossMargin
      netMargin: $netMargin
      currentRatio: $currentRatio
      debtToEquity: $debtToEquity
      operatingExpenseRatio: $operatingExpenseRatio
    ) {
      organizationId
      industry
      comparisons {
        metricName
        userValue
        benchmarkQ1
        benchmarkMedian
        benchmarkQ3
        percentileRank
        status
        insight
      }
      overallScore
      benchmarkDataDate
    }
  }
`;

export const GET_BENCHMARK_REFRESH_STATUS = gql`
  query GetBenchmarkRefreshStatus {
    benchmarkRefreshStatus {
      lastRefresh {
        startedAt
        completedAt
        status
        recordsCreated
        recordsUpdated
        errors
      }
      nextScheduledRefresh
      dataFreshness {
        newestData
        oldestData
        averageAgeInDays
      }
    }
  }
`;

// =====================================================
// REAL DATA QUERIES - Trial Balance, Aging, Waterfall
// =====================================================

export const GET_TRIAL_BALANCE = gql`
  query GetTrialBalance {
    trialBalance {
      entries {
        accountCode
        accountName
        accountType
        debitBalance
        creditBalance
      }
      totalDebits
      totalCredits
      difference
      isBalanced
      asOfDate
    }
  }
`;

export const GET_CASH_FLOW_WATERFALL = gql`
  query GetCashFlowWaterfall($startDate: String, $endDate: String) {
    cashFlowWaterfall(startDate: $startDate, endDate: $endDate) {
      label
      labelEn
      value
      type
      category
    }
  }
`;

export const GET_RECEIVABLES_AGING = gql`
  query GetReceivablesAging {
    receivablesAging {
      buckets {
        label
        labelEn
        minDays
        maxDays
        amount
        count
      }
      total
      totalOverdue
      averageDays
      hasData
    }
  }
`;

export const GET_PAYABLES_AGING = gql`
  query GetPayablesAging {
    payablesAging {
      buckets {
        label
        labelEn
        minDays
        maxDays
        amount
        count
      }
      total
      totalOverdue
      averageDays
      hasData
    }
  }
`;

// =====================================================
// BUDGET QUERIES
// =====================================================

export const GET_BUDGET_SETTINGS = gql`
  query GetBudgetSettings {
    budgetSettings {
      year
      categories {
        categoryId
        categoryName
        categoryNameEn
        monthlyAmount
      }
      lastUpdated
      updatedBy
      hasBudget
    }
  }
`;

export const SAVE_BUDGET = gql`
  mutation SaveBudget($input: SaveBudgetInput!) {
    saveBudget(input: $input) {
      year
      categories {
        categoryId
        categoryName
        categoryNameEn
        monthlyAmount
      }
      lastUpdated
      updatedBy
      hasBudget
    }
  }
`;

// =====================================================
// TAX DEADLINES QUERIES
// =====================================================

export const GET_TAX_DEADLINES = gql`
  query GetTaxDeadlines {
    taxDeadlines {
      deadlines {
        id
        title
        titleEn
        description
        dueDate
        daysRemaining
        status
        category
      }
      fiscalYearEnd
      province
    }
  }
`;
