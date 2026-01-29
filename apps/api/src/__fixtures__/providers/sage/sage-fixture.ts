/**
 * Sage Test Fixture - Retail Industry
 *
 * Represents a retail store with inventory,
 * cost of goods sold, and typical retail operations.
 */

import { ProviderFixture } from "../provider-fixture-interface";
import {
  SageAccount,
  SageContact,
  SageInvoice,
} from "@domain/datalake/provider-types";

export const SAGE_RETAIL_FIXTURE: ProviderFixture<
  SageAccount,
  SageContact,
  SageInvoice,
  never
> = {
  providerId: "sage",
  providerName: "Sage",

  rawData: {
    accounts: [
      {
        id: "sage-acc-001",
        displayed_as: "Cash in Bank",
        ledger_account_group: { id: "group-1", displayed_as: "Current Assets" },
        nominal_code: 1000,
        ledger_account_type: { id: "type-1", displayed_as: "Bank" },
        ledger_account_classification: {
          id: "class-1",
          displayed_as: "Asset",
        },
        balance: 75000,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
      {
        id: "sage-acc-002",
        displayed_as: "Inventory",
        ledger_account_group: { id: "group-1", displayed_as: "Current Assets" },
        nominal_code: 1200,
        ledger_account_type: { id: "type-2", displayed_as: "Inventory" },
        ledger_account_classification: {
          id: "class-1",
          displayed_as: "Asset",
        },
        balance: 120000,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
      {
        id: "sage-acc-010",
        displayed_as: "Product Sales",
        ledger_account_group: { id: "group-10", displayed_as: "Revenue" },
        nominal_code: 4000,
        ledger_account_type: { id: "type-10", displayed_as: "Revenue" },
        ledger_account_classification: {
          id: "class-4",
          displayed_as: "Revenue",
        },
        balance: 850000,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
      {
        id: "sage-acc-020",
        displayed_as: "Cost of Goods Sold",
        ledger_account_group: { id: "group-20", displayed_as: "Direct Costs" },
        nominal_code: 5000,
        ledger_account_type: { id: "type-20", displayed_as: "Direct Cost" },
        ledger_account_classification: {
          id: "class-5",
          displayed_as: "Expense",
        },
        balance: 510000,
        is_enabled: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
    ],
    contacts: [
      {
        id: "sage-contact-001",
        displayed_as: "ABC Distributors",
        reference: "SUPP-001",
        contact_types: [{ id: "supplier", displayed_as: "Supplier" }],
        name: "ABC Distributors Ltd",
        email: "orders@abcdist.ca",
        telephone: "4161234567",
        main_address: {
          address_line_1: "456 Warehouse Blvd",
          city: "Toronto",
          region: "ON",
          postal_code: "M4B 1B4",
          country: { id: "CA", displayed_as: "Canada" },
        },
        is_customer: false,
        is_supplier: true,
        currency: { id: "CAD", displayed_as: "Canadian Dollar" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2026-01-28T10:00:00Z",
      },
    ],
    invoices: [],
    journalEntries: [],
  },

  expectedBronze: {
    accountCount: 4,
    contactCount: 1,
    transactionCount: 0,
  },

  expectedSilver: {
    accountsByType: {
      ASSET: 2,
      REVENUE: 1,
      EXPENSE: 1,
    },
    qualityScoreMin: 80,
    validRecordsPct: 100,
  },

  expectedGold: {
    totalAssets: 195000,
    totalLiabilities: 0,
    totalEquity: 195000,
    totalRevenue: 850000,
    totalExpenses: 510000,
    netIncome: 340000,
  },

  expectedKPIs: {
    gross_margin_pct: { min: 35, max: 45 },
    inventory_turnover: { min: 4, max: 8 },
  },
};
