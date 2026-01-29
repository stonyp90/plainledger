/**
 * FreshBooks Test Fixture - Freelancer/Small Business
 *
 * Represents a freelance web developer or small agency
 * with service revenue and typical operating expenses.
 */

import { ProviderFixture } from "../provider-fixture-interface";
import {
  FreshBooksAccount,
  FreshBooksClient,
  FreshBooksInvoice,
} from "@domain/datalake/provider-types";

export const FRESHBOOKS_FREELANCER_FIXTURE: ProviderFixture<
  FreshBooksAccount,
  FreshBooksClient,
  FreshBooksInvoice,
  never
> = {
  providerId: "freshbooks",
  providerName: "FreshBooks",

  rawData: {
    accounts: [
      {
        accountid: 1001,
        account_number: "1000",
        account_type: {
          value: "asset",
          account_type: "Bank",
          account_subtype: "Checking",
        },
        name: "Business Chequing",
        balance: { amount: "45000.00", code: "CAD" },
        system_account: false,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
      {
        accountid: 1002,
        account_number: "4000",
        account_type: {
          value: "income",
          account_type: "Income",
          account_subtype: "Service",
        },
        name: "Service Revenue",
        balance: { amount: "120000.00", code: "CAD" },
        system_account: false,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
      {
        accountid: 1003,
        account_number: "5000",
        account_type: {
          value: "expense",
          account_type: "Expense",
          account_subtype: "Software",
        },
        name: "Software Subscriptions",
        balance: { amount: "3600.00", code: "CAD" },
        system_account: false,
        active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
    ],
    contacts: [
      {
        id: 101,
        userid: 1001,
        email: "client@startup.io",
        organization: "Startup.io",
        fname: "Alex",
        lname: "Chen",
        p_street: "789 Innovation Way",
        p_city: "Vancouver",
        p_province: "BC",
        p_country: "Canada",
        p_code: "V6B 1A1",
        currency_code: "CAD",
        updated: "2026-01-28T10:00:00Z",
        vis_state: 0,
      },
    ],
    invoices: [
      {
        id: 5001,
        invoiceid: 5001,
        invoice_number: "FB-2026-001",
        customerid: 101,
        create_date: "2026-01-10",
        due_date: "2026-02-10",
        status: 2, // sent
        lines: [
          {
            lineid: 1,
            description: "Web Development - January 2026",
            qty: "80",
            unit_cost: { amount: "125.00", code: "CAD" },
            amount: { amount: "10000.00", code: "CAD" },
          },
        ],
        amount: { amount: "10000.00", code: "CAD" },
        outstanding: { amount: "10000.00", code: "CAD" },
        currency_code: "CAD",
        updated: "2026-01-10T10:00:00Z",
      },
    ],
    journalEntries: [],
  },

  expectedBronze: {
    accountCount: 3,
    contactCount: 1,
    transactionCount: 1,
  },

  expectedSilver: {
    accountsByType: {
      ASSET: 1,
      REVENUE: 1,
      EXPENSE: 1,
    },
    qualityScoreMin: 85,
    validRecordsPct: 100,
  },

  expectedGold: {
    totalAssets: 45000,
    totalLiabilities: 0,
    totalEquity: 45000,
    totalRevenue: 120000,
    totalExpenses: 3600,
    netIncome: 116400,
  },
};
