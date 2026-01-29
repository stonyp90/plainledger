/**
 * Bronze Layer Schema for QuickBooks Reports
 *
 * QuickBooks reports (P&L, Balance Sheet, Cash Flow, etc.) have a different
 * structure than entity data. Reports return nested JSON with sections and rows.
 * This schema preserves the raw report structure while adding metadata for lineage.
 */

import { BronzeMetadata } from "./bronze-schema";

// =============================================================================
// QuickBooks Report Types
// =============================================================================

export type QuickBooksReportType =
  | "BalanceSheet"
  | "ProfitAndLoss"
  | "CashFlow"
  | "TrialBalance"
  | "GeneralLedger"
  | "AccountList"
  | "ARAgingSummary"
  | "APAgingSummary"
  | "CustomerBalanceSummary"
  | "VendorBalanceSummary";

export type QuickBooksReportBasis = "Accrual" | "Cash";

// =============================================================================
// QuickBooks Report Column Definition
// =============================================================================

export interface BronzeReportColumn {
  /** Column index (0-based) */
  index: number;
  /** Column title from QuickBooks */
  title: string;
  /** Column type */
  colType: "Account" | "Amount" | "Money" | "Text" | "Date";
  /** For comparative reports, the period this column represents */
  period?: string;
}

// =============================================================================
// QuickBooks Report Row Definition
// =============================================================================

export type BronzeReportRowType =
  | "Header"
  | "Section"
  | "Data"
  | "Summary"
  | "SubTotal"
  | "Total";

export interface BronzeReportRow {
  /** Row type indicates how to process this row */
  row_type: BronzeReportRowType;
  /** Account ID if this is an account row */
  account_id?: string;
  /** Account type (e.g., "Bank", "Expense") */
  account_type?: string;
  /** Account detail type (e.g., "Checking", "RepairMaintenance") */
  account_detail_type?: string;
  /** Display label for this row */
  label: string;
  /** Values for each column (indexed to match columns array) */
  values: (number | string | null)[];
  /** Nested rows for sections */
  children?: BronzeReportRow[];
  /** Section name if this is a section row (e.g., "ASSETS", "Current Assets") */
  section_name?: string;
  /** Hierarchy level (0 = root, 1 = first child, etc.) */
  hierarchy_level: number;
  /** Full path from root (e.g., ["ASSETS", "Current Assets", "Bank"]) */
  hierarchy_path: string[];
}

// =============================================================================
// Bronze QuickBooks Report
// =============================================================================

export interface BronzeQuickBooksReport {
  metadata: BronzeMetadata;
  /** Type of report */
  report_type: QuickBooksReportType;
  /** Accrual or Cash basis */
  report_basis: QuickBooksReportBasis;
  /** Report start date (ISO format) */
  start_date: string;
  /** Report end date (ISO format) */
  end_date: string;
  /** Currency for monetary values */
  currency: string;
  /** Column definitions */
  columns: BronzeReportColumn[];
  /** Flattened rows with hierarchy preserved */
  rows: BronzeReportRow[];
  /** Total row count (including nested) */
  total_row_count: number;
  /** Full raw JSON response from QuickBooks for debugging */
  raw_json: QuickBooksRawReportResponse;
}

// =============================================================================
// QuickBooks Raw Report Response (as returned from API)
// =============================================================================

export interface QuickBooksRawReportResponse {
  Header: {
    ReportName: string;
    ReportBasis?: string;
    StartPeriod?: string;
    EndPeriod?: string;
    Currency?: string;
    Time?: string;
    Option?: Array<{ Name: string; Value: string }>;
  };
  Columns: {
    Column: Array<{
      ColTitle: string;
      ColType: string;
      MetaData?: Array<{ Name: string; Value: string }>;
    }>;
  };
  Rows: {
    Row?: QuickBooksRawRow[];
  };
}

export interface QuickBooksRawRow {
  type?: string;
  group?: string;
  Header?: {
    ColData: Array<{ value: string; id?: string }>;
  };
  Summary?: {
    ColData: Array<{ value: string }>;
  };
  ColData?: Array<{ value: string; id?: string }>;
  Rows?: {
    Row?: QuickBooksRawRow[];
  };
}

// =============================================================================
// Change Data Capture (CDC) for Incremental Sync
// =============================================================================

export interface BronzeSyncState {
  /** Organization ID */
  organization_id: string;
  /** Datasource ID */
  datasource_id: string;
  /** Entity type being synced (e.g., "Account", "Invoice", "BalanceSheet") */
  entity_type: string;
  /** Last successful sync timestamp (ISO format) */
  last_sync_timestamp: string;
  /** QuickBooks sync token for CDC (returned by QB for certain queries) */
  sync_token?: string;
  /** Checksum of last synced data for change detection */
  checksum: string;
  /** Number of records in last sync */
  record_count: number;
  /** Sync status */
  status: "success" | "partial" | "failed";
  /** Error message if failed */
  error_message?: string;
  /** Duration of last sync in milliseconds */
  sync_duration_ms?: number;
  /** Next scheduled sync (ISO format) */
  next_scheduled_sync?: string;
}

// =============================================================================
// Report Transformation Helpers
// =============================================================================

/**
 * Parse raw QuickBooks report response into Bronze schema
 */
export function parseQuickBooksReport(
  rawResponse: QuickBooksRawReportResponse,
  metadata: BronzeMetadata,
): BronzeQuickBooksReport {
  const columns = parseColumns(rawResponse.Columns);
  const { rows, totalCount } = parseRows(rawResponse.Rows.Row || [], 0, []);

  return {
    metadata,
    report_type: mapReportName(rawResponse.Header.ReportName),
    report_basis:
      (rawResponse.Header.ReportBasis as QuickBooksReportBasis) || "Accrual",
    start_date: rawResponse.Header.StartPeriod || "",
    end_date: rawResponse.Header.EndPeriod || "",
    currency: rawResponse.Header.Currency || "CAD",
    columns,
    rows,
    total_row_count: totalCount,
    raw_json: rawResponse,
  };
}

function parseColumns(
  columnsData: QuickBooksRawReportResponse["Columns"],
): BronzeReportColumn[] {
  return columnsData.Column.map((col, index) => ({
    index,
    title: col.ColTitle,
    colType: col.ColType as BronzeReportColumn["colType"],
    period: col.MetaData?.find((m) => m.Name === "StartDate")?.Value,
  }));
}

function parseRows(
  rawRows: QuickBooksRawRow[],
  level: number,
  parentPath: string[],
): { rows: BronzeReportRow[]; totalCount: number } {
  const rows: BronzeReportRow[] = [];
  let totalCount = 0;

  for (const rawRow of rawRows) {
    totalCount++;

    // Determine row type
    let rowType: BronzeReportRowType = "Data";
    if (rawRow.type === "Section") rowType = "Section";
    else if (rawRow.Header) rowType = "Header";
    else if (rawRow.Summary) rowType = "Summary";

    // Extract label and values
    let label = "";
    let values: (number | string | null)[] = [];
    let accountId: string | undefined;

    if (rawRow.ColData) {
      // Data row
      label = rawRow.ColData[0]?.value || "";
      accountId = rawRow.ColData[0]?.id;
      values = rawRow.ColData.slice(1).map((col) => parseValue(col.value));
    } else if (rawRow.Header?.ColData) {
      // Header row
      label = rawRow.Header.ColData[0]?.value || "";
      values = rawRow.Header.ColData.slice(1).map((col) =>
        parseValue(col.value),
      );
    } else if (rawRow.Summary?.ColData) {
      // Summary row
      label = rawRow.Summary.ColData[0]?.value || "Total";
      values = rawRow.Summary.ColData.slice(1).map((col) =>
        parseValue(col.value),
      );
      rowType = "Summary";
    }

    const currentPath = [...parentPath, label];

    // Process children if this is a section
    let children: BronzeReportRow[] | undefined;
    if (rawRow.Rows?.Row) {
      const childResult = parseRows(rawRow.Rows.Row, level + 1, currentPath);
      children = childResult.rows;
      totalCount += childResult.totalCount;
    }

    rows.push({
      row_type: rowType,
      account_id: accountId,
      label,
      values,
      children,
      section_name:
        rowType === "Section" || rowType === "Header" ? label : undefined,
      hierarchy_level: level,
      hierarchy_path: currentPath,
    });
  }

  return { rows, totalCount };
}

function parseValue(value: string): number | string | null {
  if (!value || value === "") return null;
  const numValue = parseFloat(value.replace(/[,$]/g, ""));
  return isNaN(numValue) ? value : numValue;
}

function mapReportName(name: string): QuickBooksReportType {
  const mapping: Record<string, QuickBooksReportType> = {
    BalanceSheet: "BalanceSheet",
    "Balance Sheet": "BalanceSheet",
    ProfitAndLoss: "ProfitAndLoss",
    "Profit and Loss": "ProfitAndLoss",
    CashFlow: "CashFlow",
    "Cash Flow": "CashFlow",
    "Statement of Cash Flows": "CashFlow",
    TrialBalance: "TrialBalance",
    "Trial Balance": "TrialBalance",
    GeneralLedger: "GeneralLedger",
    "General Ledger": "GeneralLedger",
    AccountList: "AccountList",
    "Account List": "AccountList",
    "A/R Aging Summary": "ARAgingSummary",
    ARAgingSummary: "ARAgingSummary",
    "A/P Aging Summary": "APAgingSummary",
    APAgingSummary: "APAgingSummary",
    CustomerBalanceSummary: "CustomerBalanceSummary",
    VendorBalanceSummary: "VendorBalanceSummary",
  };
  return mapping[name] || "ProfitAndLoss";
}

// =============================================================================
// Export Types for External Use
// =============================================================================

export type { BronzeMetadata };
