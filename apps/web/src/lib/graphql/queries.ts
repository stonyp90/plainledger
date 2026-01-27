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
