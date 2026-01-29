/**
 * QuickBooks Test Fixture - Real Estate Industry
 *
 * Represents a typical real estate property management company
 * with rental income, property expenses, and mortgage financing.
 */

import { ProviderFixture } from "../provider-fixture-interface";
import {
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksInvoice,
  QuickBooksJournalEntry,
} from "@domain/datalake/provider-types";

export const QUICKBOOKS_REAL_ESTATE_FIXTURE: ProviderFixture<
  QuickBooksAccount,
  QuickBooksCustomer,
  QuickBooksInvoice,
  QuickBooksJournalEntry
> = {
  providerId: "quickbooks",
  providerName: "QuickBooks Online",

  rawData: {
    accounts: [
      // Bank Accounts
      {
        Id: "1",
        Name: "Business Chequing - RBC",
        AccountType: "Bank",
        AccountSubType: "Checking",
        AcctNum: "1000",
        Classification: "Asset",
        CurrentBalance: 125000,
        Active: true,
        FullyQualifiedName: "Business Chequing - RBC",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      // Accounts Receivable
      {
        Id: "2",
        Name: "Tenant Receivables",
        AccountType: "Accounts Receivable",
        AccountSubType: "AccountsReceivable",
        AcctNum: "1100",
        Classification: "Asset",
        CurrentBalance: 45000,
        Active: true,
        FullyQualifiedName: "Tenant Receivables",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      // Fixed Assets - Property
      {
        Id: "10",
        Name: "Commercial Building - 123 Main St",
        AccountType: "Fixed Assets",
        AccountSubType: "Buildings",
        AcctNum: "1500",
        Classification: "Asset",
        CurrentBalance: 2500000,
        Active: true,
        FullyQualifiedName: "Property:Commercial Building - 123 Main St",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      {
        Id: "11",
        Name: "Accumulated Depreciation - Building",
        AccountType: "Fixed Assets",
        AccountSubType: "AccumulatedDepreciation",
        AcctNum: "1550",
        Classification: "Asset",
        CurrentBalance: -350000,
        Active: true,
        FullyQualifiedName: "Accumulated Depreciation - Building",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      // Liabilities - Mortgage
      {
        Id: "20",
        Name: "Commercial Mortgage",
        AccountType: "Long Term Liabilities",
        AccountSubType: "NotesPayable",
        AcctNum: "2500",
        Classification: "Liability",
        CurrentBalance: 1800000,
        Active: true,
        FullyQualifiedName: "Commercial Mortgage",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      // Revenue - Rental Income
      {
        Id: "30",
        Name: "Rental Income - Commercial",
        AccountType: "Other Income",
        AccountSubType: "RentalIncomeReceived",
        AcctNum: "4000",
        Classification: "Revenue",
        CurrentBalance: 480000,
        Active: true,
        FullyQualifiedName: "Rental Income - Commercial",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      // Expenses
      {
        Id: "40",
        Name: "Property Taxes",
        AccountType: "Expenses",
        AccountSubType: "TaxesPaid",
        AcctNum: "5100",
        Classification: "Expense",
        CurrentBalance: 48000,
        Active: true,
        FullyQualifiedName: "Property Taxes",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      {
        Id: "41",
        Name: "Building Maintenance",
        AccountType: "Expenses",
        AccountSubType: "RepairMaintenance",
        AcctNum: "5200",
        Classification: "Expense",
        CurrentBalance: 35000,
        Active: true,
        FullyQualifiedName: "Building Maintenance",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      {
        Id: "42",
        Name: "Property Insurance",
        AccountType: "Expenses",
        AccountSubType: "Insurance",
        AcctNum: "5300",
        Classification: "Expense",
        CurrentBalance: 18000,
        Active: true,
        FullyQualifiedName: "Property Insurance",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      {
        Id: "43",
        Name: "Utilities",
        AccountType: "Expenses",
        AccountSubType: "Utilities",
        AcctNum: "5400",
        Classification: "Expense",
        CurrentBalance: 24000,
        Active: true,
        FullyQualifiedName: "Utilities",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
      {
        Id: "44",
        Name: "Mortgage Interest",
        AccountType: "Expenses",
        AccountSubType: "InterestPaid",
        AcctNum: "5500",
        Classification: "Expense",
        CurrentBalance: 72000,
        Active: true,
        FullyQualifiedName: "Mortgage Interest",
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
    ],
    contacts: [
      {
        Id: "101",
        DisplayName: "Tech Solutions Inc.",
        CompanyName: "Tech Solutions Incorporated",
        GivenName: "Jean",
        FamilyName: "Tremblay",
        PrimaryEmailAddr: { Address: "jean@techsolutions.ca" },
        PrimaryPhone: { FreeFormNumber: "(514) 555-0101" },
        BillAddr: {
          Line1: "123 Main St, Suite 200",
          City: "Montreal",
          CountrySubDivisionCode: "QC",
          PostalCode: "H3A 1A1",
          Country: "Canada",
        },
        Active: true,
        Balance: 8500,
        MetaData: {
          CreateTime: "2024-01-01T00:00:00Z",
          LastUpdatedTime: "2026-01-28T10:00:00Z",
        },
      },
    ],
    invoices: [
      {
        Id: "1001",
        DocNumber: "INV-2026-001",
        TxnDate: "2026-01-01",
        DueDate: "2026-01-31",
        CustomerRef: { value: "101", name: "Tech Solutions Inc." },
        Line: [
          {
            Id: "1",
            LineNum: 1,
            Amount: 8500,
            DetailType: "SalesItemLineDetail",
            Description: "January 2026 - Office Rent Suite 200",
          },
        ],
        TotalAmt: 8500,
        Balance: 8500,
        CurrencyRef: { value: "CAD", name: "Canadian Dollar" },
        MetaData: {
          CreateTime: "2026-01-01T10:00:00Z",
          LastUpdatedTime: "2026-01-01T10:00:00Z",
        },
      },
    ],
    journalEntries: [],
  },

  expectedBronze: {
    accountCount: 11,
    contactCount: 1,
    transactionCount: 1,
  },

  expectedSilver: {
    accountsByType: {
      ASSET: 4,
      LIABILITY: 1,
      REVENUE: 1,
      EXPENSE: 5,
    },
    qualityScoreMin: 90,
    validRecordsPct: 100,
  },

  expectedGold: {
    totalAssets: 2320000, // 125k + 45k + 2500k - 350k
    totalLiabilities: 1800000,
    totalEquity: 520000,
    totalRevenue: 480000,
    totalExpenses: 197000, // 48k + 35k + 18k + 24k + 72k
    netIncome: 283000,
  },

  expectedKPIs: {
    cap_rate: { min: 10, max: 12 },
    noi: { min: 270000, max: 300000 },
    expense_ratio: { min: 35, max: 45 },
  },
};
