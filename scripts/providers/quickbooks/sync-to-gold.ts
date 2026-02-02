/**
 * Sync QuickBooks Sandbox to S3 Gold Layer
 *
 * Enterprise-grade script that:
 * 1. Authenticates with QuickBooks sandbox
 * 2. Fetches all financial data (accounts, customers, invoices, etc.)
 * 3. Transforms to Gold layer format
 * 4. Uploads to LocalStack S3 (or real AWS)
 *
 * Run: QUICKBOOKS_REFRESH_TOKEN=xxx npx tsx scripts/providers/quickbooks/sync-to-gold.ts
 */

import {
  S3Client,
  PutObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

// Load .env file
function loadEnv(): void {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line: string) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

// =============================================================================
// Configuration
// =============================================================================

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REALM_ID = process.env.QUICKBOOKS_REALM_ID || "9341456246487117";
const SANDBOX_API_URL = process.env.QUICKBOOKS_SANDBOX_URL || "https://sandbox-quickbooks.api.intuit.com/v3/company";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:4566";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const GOLD_BUCKET = process.env.S3_BUCKET_GOLD || "plainledger-gold";
const DEMO_ORG_ID = process.env.DEMO_ORG_ID || "demo-org";

// S3 Client
const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
});

// =============================================================================
// Types
// =============================================================================

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface QBAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  CurrentBalance?: number;
  Active?: boolean;
  FullyQualifiedName?: string;
  Classification?: string;
}

interface QBCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  Balance?: number;
  Active?: boolean;
}

interface QBInvoice {
  Id: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef?: { value: string; name: string };
  TotalAmt: number;
  Balance?: number;
  Line?: Array<{
    Amount: number;
    Description?: string;
    DetailType?: string;
  }>;
}

interface QBBill {
  Id: string;
  TxnDate: string;
  DueDate?: string;
  VendorRef?: { value: string; name: string };
  TotalAmt: number;
  Balance?: number;
}

// =============================================================================
// Authentication
// =============================================================================

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const auth = Buffer.from(
    `${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

// =============================================================================
// QuickBooks API Helpers
// =============================================================================

async function apiQuery<T>(
  accessToken: string,
  query: string,
  realmId: string = REALM_ID
): Promise<T> {
  const url = `${SANDBOX_API_URL}/${realmId}/query?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Query failed: ${response.status} - ${error}`);
  }

  return response.json();
}

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchAccounts(accessToken: string): Promise<QBAccount[]> {
  console.log("  📒 Fetching accounts...");
  const result = await apiQuery<{ QueryResponse: { Account?: QBAccount[] } }>(
    accessToken,
    "SELECT * FROM Account MAXRESULTS 1000"
  );
  const accounts = result.QueryResponse.Account || [];
  console.log(`     Found ${accounts.length} accounts`);
  return accounts;
}

async function fetchCustomers(accessToken: string): Promise<QBCustomer[]> {
  console.log("  👥 Fetching customers...");
  const result = await apiQuery<{ QueryResponse: { Customer?: QBCustomer[] } }>(
    accessToken,
    "SELECT * FROM Customer MAXRESULTS 1000"
  );
  const customers = result.QueryResponse.Customer || [];
  console.log(`     Found ${customers.length} customers`);
  return customers;
}

async function fetchInvoices(accessToken: string): Promise<QBInvoice[]> {
  console.log("  📄 Fetching invoices...");
  const result = await apiQuery<{ QueryResponse: { Invoice?: QBInvoice[] } }>(
    accessToken,
    "SELECT * FROM Invoice MAXRESULTS 1000"
  );
  const invoices = result.QueryResponse.Invoice || [];
  console.log(`     Found ${invoices.length} invoices`);
  return invoices;
}

async function fetchBills(accessToken: string): Promise<QBBill[]> {
  console.log("  📋 Fetching bills...");
  const result = await apiQuery<{ QueryResponse: { Bill?: QBBill[] } }>(
    accessToken,
    "SELECT * FROM Bill MAXRESULTS 1000"
  );
  const bills = result.QueryResponse.Bill || [];
  console.log(`     Found ${bills.length} bills`);
  return bills;
}

// =============================================================================
// Gold Layer Transformation
// =============================================================================

function transformAccounts(accounts: QBAccount[]): any[] {
  return accounts.map((acc, idx) => ({
    account_key: `acc_${String(idx + 1).padStart(3, "0")}`,
    account_id: acc.Id,
    source_account_id: acc.Id,
    organization_key: DEMO_ORG_ID,
    account_code: String(1000 + idx * 10),
    account_name: acc.Name,
    account_type: acc.AccountType?.toUpperCase() || "OTHER",
    account_subtype: acc.AccountSubType || "Other",
    is_active: acc.Active !== false,
    hierarchy_level: 1,
    hierarchy_path: `/${acc.Classification || "Other"}/${acc.AccountType}`,
    is_debit_normal: ["Asset", "Expense"].includes(acc.Classification || ""),
    balance_sheet_section: getBalanceSheetSection(acc.Classification),
    income_statement_section: getIncomeStatementSection(acc.Classification),
    current_balance: acc.CurrentBalance || 0,
  }));
}

function getBalanceSheetSection(classification?: string): string | null {
  if (!classification) return null;
  switch (classification.toLowerCase()) {
    case "asset":
      return "assets";
    case "liability":
      return "liabilities";
    case "equity":
      return "equity";
    default:
      return null;
  }
}

function getIncomeStatementSection(classification?: string): string | null {
  if (!classification) return null;
  switch (classification.toLowerCase()) {
    case "revenue":
    case "income":
      return "revenue";
    case "expense":
      return "expenses";
    default:
      return null;
  }
}

function transformTransactions(
  invoices: QBInvoice[],
  bills: QBBill[]
): { transactions: any[]; monthlyTrends: any[] } {
  const transactions: any[] = [];
  const monthlyTotals: Record<string, { revenue: number; expenses: number }> = {};

  // Process invoices (revenue)
  invoices.forEach((inv, idx) => {
    const month = inv.TxnDate.substring(0, 7);
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { revenue: 0, expenses: 0 };
    }
    monthlyTotals[month].revenue += inv.TotalAmt;

    transactions.push({
      transaction_key: `txn_inv_${String(idx + 1).padStart(4, "0")}`,
      transaction_id: inv.Id,
      organization_key: DEMO_ORG_ID,
      transaction_date: inv.TxnDate,
      transaction_type: "Invoice",
      amount: inv.TotalAmt,
      description: `Invoice to ${inv.CustomerRef?.name || "Customer"}`,
      is_debit: true,
    });
  });

  // Process bills (expenses)
  bills.forEach((bill, idx) => {
    const month = bill.TxnDate.substring(0, 7);
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = { revenue: 0, expenses: 0 };
    }
    monthlyTotals[month].expenses += bill.TotalAmt;

    transactions.push({
      transaction_key: `txn_bill_${String(idx + 1).padStart(4, "0")}`,
      transaction_id: bill.Id,
      organization_key: DEMO_ORG_ID,
      transaction_date: bill.TxnDate,
      transaction_type: "Bill",
      amount: bill.TotalAmt,
      description: `Bill from ${bill.VendorRef?.name || "Vendor"}`,
      is_debit: false,
    });
  });

  // Calculate monthly trends
  const monthlyTrends = Object.entries(monthlyTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({
      period: month,
      revenue: totals.revenue,
      expenses: totals.expenses,
      net_income: totals.revenue - totals.expenses,
      cash_flow: totals.revenue - totals.expenses, // Simplified
    }));

  return { transactions, monthlyTrends };
}

function calculateSummary(
  accounts: QBAccount[],
  monthlyTrends: any[]
): any {
  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    .toISOString()
    .substring(0, 7);

  const currentTrend = monthlyTrends.find((t) => t.period === currentMonth);
  const lastTrend = monthlyTrends.find((t) => t.period === lastMonth);

  // Calculate totals from accounts
  let cashOnHand = 0;
  let accountsReceivable = 0;
  let accountsPayable = 0;

  accounts.forEach((acc) => {
    const balance = acc.CurrentBalance || 0;
    if (acc.AccountType === "Bank") {
      cashOnHand += balance;
    } else if (acc.AccountType === "Accounts Receivable") {
      accountsReceivable += balance;
    } else if (acc.AccountType === "Accounts Payable") {
      accountsPayable += balance;
    }
  });

  return {
    organization_key: DEMO_ORG_ID,
    as_of_date: now.toISOString().split("T")[0],
    total_revenue: currentTrend?.revenue || 0,
    total_expenses: currentTrend?.expenses || 0,
    net_income: currentTrend?.net_income || 0,
    cash_on_hand: cashOnHand,
    accounts_receivable: accountsReceivable,
    accounts_payable: accountsPayable,
    prior_revenue: lastTrend?.revenue || 0,
    prior_expenses: lastTrend?.expenses || 0,
    prior_net_income: lastTrend?.net_income || 0,
    trend_months: monthlyTrends.length,
  };
}

// =============================================================================
// S3 Upload
// =============================================================================

async function ensureBucket(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: GOLD_BUCKET }));
    console.log(`  ✅ Bucket ${GOLD_BUCKET} exists`);
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      console.log(`  📦 Creating bucket ${GOLD_BUCKET}...`);
      await s3Client.send(new CreateBucketCommand({ Bucket: GOLD_BUCKET }));
      console.log(`  ✅ Bucket created`);
    } else {
      throw error;
    }
  }
}

async function uploadToS3(key: string, data: any): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: GOLD_BUCKET,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    })
  );
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  QuickBooks Sandbox → S3 Gold Layer Sync                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Check for refresh token
  const refreshToken =
    process.env.QUICKBOOKS_REFRESH_TOKEN || process.argv[2];

  if (!refreshToken) {
    console.log("\n❌ No refresh token provided!");
    console.log("\nUsage:");
    console.log("  QUICKBOOKS_REFRESH_TOKEN=xxx npx tsx scripts/providers/quickbooks/sync-to-gold.ts");
    console.log("  or: npx tsx scripts/providers/quickbooks/sync-to-gold.ts YOUR_REFRESH_TOKEN");
    process.exit(1);
  }

  if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET) {
    console.log("\n❌ Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET in .env");
    process.exit(1);
  }

  try {
    // Step 1: Get access token
    console.log("\n🔄 Step 1: Refreshing access token...");
    const tokens = await refreshAccessToken(refreshToken);
    console.log("✅ Access token obtained!");

    // Step 2: Fetch data from QuickBooks
    console.log("\n📊 Step 2: Fetching data from QuickBooks...");
    const [accounts, customers, invoices, bills] = await Promise.all([
      fetchAccounts(tokens.access_token),
      fetchCustomers(tokens.access_token),
      fetchInvoices(tokens.access_token),
      fetchBills(tokens.access_token),
    ]);

    // Step 3: Transform to Gold layer format
    console.log("\n🔄 Step 3: Transforming to Gold layer format...");
    const dimAccounts = transformAccounts(accounts);
    const { transactions, monthlyTrends } = transformTransactions(invoices, bills);
    const summary = calculateSummary(accounts, monthlyTrends);

    console.log(`     ${dimAccounts.length} accounts transformed`);
    console.log(`     ${transactions.length} transactions transformed`);
    console.log(`     ${monthlyTrends.length} months of trends`);

    // Step 4: Upload to S3
    console.log("\n📤 Step 4: Uploading to S3 Gold layer...");
    await ensureBucket();

    const uploads = [
      { key: `${DEMO_ORG_ID}/dim_account.json`, data: dimAccounts },
      { key: `${DEMO_ORG_ID}/fact_transaction.json`, data: transactions },
      { key: `${DEMO_ORG_ID}/agg_monthly_financials.json`, data: monthlyTrends },
      { key: `${DEMO_ORG_ID}/agg_dashboard_summary.json`, data: summary },
    ];

    for (const upload of uploads) {
      await uploadToS3(upload.key, upload.data);
      console.log(`  ✅ Uploaded ${upload.key}`);
    }

    // Summary
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  ✅ SYNC COMPLETE                                            ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Accounts:      ${String(dimAccounts.length).padEnd(42)}║`);
    console.log(`║  Transactions:  ${String(transactions.length).padEnd(42)}║`);
    console.log(`║  Trend Months:  ${String(monthlyTrends.length).padEnd(42)}║`);
    console.log(`║  Revenue:       $${(summary.total_revenue / 1000).toFixed(0)}K`.padEnd(58) + "║");
    console.log(`║  Expenses:      $${(summary.total_expenses / 1000).toFixed(0)}K`.padEnd(58) + "║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    // Output new refresh token
    console.log("\n📝 New refresh token (save this for future use):");
    console.log(tokens.refresh_token);

    console.log("\n💡 Next steps:");
    console.log("  1. Start the API: cd apps/api && SKIP_AUTH=true npm run start:dev");
    console.log("  2. Start the web: cd apps/web && npm run dev");
    console.log("  3. Navigate to http://localhost:5173");
    console.log("  4. All 4 checklist items should show complete!");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
