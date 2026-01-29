/**
 * Xero Test Fixture - Professional Services Industry
 *
 * Represents a consulting firm with billable services,
 * professional staff, and typical professional service expenses.
 */

import { ProviderFixture } from "../provider-fixture-interface";
import {
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroManualJournal,
} from "@domain/datalake/provider-types";

export const XERO_PROFESSIONAL_SERVICES_FIXTURE: ProviderFixture<
  XeroAccount,
  XeroContact,
  XeroInvoice,
  XeroManualJournal
> = {
  providerId: "xero",
  providerName: "Xero",

  rawData: {
    accounts: [
      // Bank Account
      {
        AccountID: "acc-001",
        Code: "1000",
        Name: "Business Bank Account",
        Type: "BANK",
        Class: "ASSET",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
      // Accounts Receivable
      {
        AccountID: "acc-002",
        Code: "1100",
        Name: "Accounts Receivable",
        Type: "CURRENT",
        Class: "ASSET",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
      // Revenue
      {
        AccountID: "acc-010",
        Code: "4000",
        Name: "Consulting Revenue",
        Type: "REVENUE",
        Class: "REVENUE",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
      {
        AccountID: "acc-011",
        Code: "4100",
        Name: "Training Revenue",
        Type: "REVENUE",
        Class: "REVENUE",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
      // Expenses
      {
        AccountID: "acc-020",
        Code: "5000",
        Name: "Salaries & Wages",
        Type: "OVERHEADS",
        Class: "EXPENSE",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
      {
        AccountID: "acc-021",
        Code: "5100",
        Name: "Office Rent",
        Type: "OVERHEADS",
        Class: "EXPENSE",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
      {
        AccountID: "acc-022",
        Code: "5200",
        Name: "Professional Development",
        Type: "OVERHEADS",
        Class: "EXPENSE",
        Status: "ACTIVE",
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
    ],
    contacts: [
      {
        ContactID: "contact-001",
        ContactNumber: "CUST-001",
        ContactStatus: "ACTIVE",
        Name: "Enterprise Corp",
        FirstName: "Marie",
        LastName: "Dubois",
        EmailAddress: "marie@enterprisecorp.ca",
        Phones: [{ PhoneType: "DEFAULT", PhoneNumber: "5141234567" }],
        Addresses: [
          {
            AddressType: "STREET",
            City: "Montreal",
            Region: "QC",
            Country: "Canada",
          },
        ],
        IsSupplier: false,
        IsCustomer: true,
        UpdatedDateUTC: "2026-01-28T10:00:00Z",
      },
    ],
    invoices: [
      {
        InvoiceID: "inv-001",
        InvoiceNumber: "INV-0001",
        Type: "ACCREC",
        Contact: { ContactID: "contact-001", Name: "Enterprise Corp" },
        Date: "2026-01-15",
        DueDate: "2026-02-15",
        Status: "AUTHORISED",
        LineItems: [
          {
            LineItemID: "line-001",
            Description: "Strategy Consulting - January 2026",
            Quantity: 40,
            UnitAmount: 250,
            AccountCode: "4000",
            LineAmount: 10000,
          },
        ],
        SubTotal: 10000,
        TotalTax: 1300,
        Total: 11300,
        AmountDue: 11300,
        AmountPaid: 0,
        AmountCredited: 0,
        CurrencyCode: "CAD",
        UpdatedDateUTC: "2026-01-15T10:00:00Z",
      },
    ],
    journalEntries: [],
  },

  expectedBronze: {
    accountCount: 7,
    contactCount: 1,
    transactionCount: 1,
  },

  expectedSilver: {
    accountsByType: {
      ASSET: 2,
      REVENUE: 2,
      EXPENSE: 3,
    },
    qualityScoreMin: 85,
    validRecordsPct: 100,
  },

  expectedGold: {
    totalAssets: 50000,
    totalLiabilities: 0,
    totalEquity: 50000,
    totalRevenue: 250000,
    totalExpenses: 180000,
    netIncome: 70000,
  },

  expectedKPIs: {
    utilization_rate: { min: 65, max: 85 },
    ar_days: { min: 30, max: 60 },
    revenue_per_employee: { min: 80000, max: 150000 },
  },
};
