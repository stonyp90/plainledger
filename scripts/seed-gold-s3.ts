/**
 * Seed Gold S3 Bucket with QuickBooks Demo Data
 *
 * This script generates realistic QuickBooks-style demo data
 * and uploads it to the gold S3 bucket in LocalStack for local development.
 */

import {
  S3Client,
  PutObjectCommand,
  ListBucketsCommand,
} from "@aws-sdk/client-s3";

// Configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT || ""; // Empty string = use real AWS
const S3_REGION = process.env.S3_REGION || "ca-central-1";
const GOLD_BUCKET = process.env.S3_BUCKET_GOLD || "plainledger-gold";

// Demo organization ID
const DEMO_ORG_ID = "demo-org";

// S3 Client
const s3Client = new S3Client({
  ...(S3_ENDPOINT ? { endpoint: S3_ENDPOINT, forcePathStyle: true } : {}),
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
  },
});

// ============================================
// DIM_ACCOUNT - Chart of Accounts (Real Estate Industry)
// ============================================
const dimAccounts = [
  // Bank Accounts
  {
    account_key: "acc_001",
    account_id: "1",
    source_account_id: "1",
    organization_key: DEMO_ORG_ID,
    account_code: "1000",
    account_name: "Business Chequing - RBC",
    account_type: "ASSET",
    account_subtype: "Bank",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Assets/Bank",
    is_debit_normal: true,
    balance_sheet_section: "current_assets",
    income_statement_section: null,
  },
  // Accounts Receivable
  {
    account_key: "acc_002",
    account_id: "2",
    source_account_id: "2",
    organization_key: DEMO_ORG_ID,
    account_code: "1100",
    account_name: "Tenant Receivables",
    account_type: "ASSET",
    account_subtype: "AccountsReceivable",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Assets/Receivables",
    is_debit_normal: true,
    balance_sheet_section: "current_assets",
    income_statement_section: null,
  },
  // Inventory
  {
    account_key: "acc_003",
    account_id: "3",
    source_account_id: "3",
    organization_key: DEMO_ORG_ID,
    account_code: "1200",
    account_name: "Inventory",
    account_type: "ASSET",
    account_subtype: "Inventory",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Assets/Inventory",
    is_debit_normal: true,
    balance_sheet_section: "current_assets",
    income_statement_section: null,
  },
  // Fixed Assets - Property
  {
    account_key: "acc_010",
    account_id: "10",
    source_account_id: "10",
    organization_key: DEMO_ORG_ID,
    account_code: "1500",
    account_name: "Commercial Building - 123 Main St",
    account_type: "ASSET",
    account_subtype: "Buildings",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Assets/FixedAssets/Property",
    is_debit_normal: true,
    balance_sheet_section: "fixed_assets",
    income_statement_section: null,
  },
  // Accumulated Depreciation
  {
    account_key: "acc_011",
    account_id: "11",
    source_account_id: "11",
    organization_key: DEMO_ORG_ID,
    account_code: "1550",
    account_name: "Accumulated Depreciation - Building",
    account_type: "ASSET",
    account_subtype: "AccumulatedDepreciation",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Assets/FixedAssets/Depreciation",
    is_debit_normal: false,
    balance_sheet_section: "fixed_assets",
    income_statement_section: null,
  },
  // Liabilities
  {
    account_key: "acc_020",
    account_id: "20",
    source_account_id: "20",
    organization_key: DEMO_ORG_ID,
    account_code: "2000",
    account_name: "Accounts Payable",
    account_type: "LIABILITY",
    account_subtype: "AccountsPayable",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Liabilities/CurrentLiabilities",
    is_debit_normal: false,
    balance_sheet_section: "current_liabilities",
    income_statement_section: null,
  },
  {
    account_key: "acc_025",
    account_id: "25",
    source_account_id: "25",
    organization_key: DEMO_ORG_ID,
    account_code: "2500",
    account_name: "Commercial Mortgage",
    account_type: "LIABILITY",
    account_subtype: "NotesPayable",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Liabilities/LongTermDebt",
    is_debit_normal: false,
    balance_sheet_section: "long_term_liabilities",
    income_statement_section: null,
  },
  // Equity
  {
    account_key: "acc_030",
    account_id: "30",
    source_account_id: "30",
    organization_key: DEMO_ORG_ID,
    account_code: "3000",
    account_name: "Share Capital",
    account_type: "EQUITY",
    account_subtype: "ShareCapital",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Equity/Capital",
    is_debit_normal: false,
    balance_sheet_section: "equity",
    income_statement_section: null,
  },
  {
    account_key: "acc_031",
    account_id: "31",
    source_account_id: "31",
    organization_key: DEMO_ORG_ID,
    account_code: "3100",
    account_name: "Retained Earnings",
    account_type: "EQUITY",
    account_subtype: "RetainedEarnings",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Equity/RetainedEarnings",
    is_debit_normal: false,
    balance_sheet_section: "equity",
    income_statement_section: null,
  },
  // Revenue - Rental Income
  {
    account_key: "acc_040",
    account_id: "40",
    source_account_id: "40",
    organization_key: DEMO_ORG_ID,
    account_code: "4000",
    account_name: "Rental Income - Commercial",
    account_type: "REVENUE",
    account_subtype: "RentalIncome",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Revenue/RentalIncome",
    is_debit_normal: false,
    balance_sheet_section: null,
    income_statement_section: "operating_revenue",
  },
  {
    account_key: "acc_041",
    account_id: "41",
    source_account_id: "41",
    organization_key: DEMO_ORG_ID,
    account_code: "4100",
    account_name: "Service Revenue",
    account_type: "REVENUE",
    account_subtype: "ServiceRevenue",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Revenue/Services",
    is_debit_normal: false,
    balance_sheet_section: null,
    income_statement_section: "operating_revenue",
  },
  // Expenses
  {
    account_key: "acc_050",
    account_id: "50",
    source_account_id: "50",
    organization_key: DEMO_ORG_ID,
    account_code: "5100",
    account_name: "Property Taxes",
    account_type: "EXPENSE",
    account_subtype: "TaxesPaid",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Expenses/PropertyTax",
    is_debit_normal: true,
    balance_sheet_section: null,
    income_statement_section: "operating_expenses",
  },
  {
    account_key: "acc_051",
    account_id: "51",
    source_account_id: "51",
    organization_key: DEMO_ORG_ID,
    account_code: "5200",
    account_name: "Building Maintenance",
    account_type: "EXPENSE",
    account_subtype: "RepairMaintenance",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Expenses/Maintenance",
    is_debit_normal: true,
    balance_sheet_section: null,
    income_statement_section: "operating_expenses",
  },
  {
    account_key: "acc_052",
    account_id: "52",
    source_account_id: "52",
    organization_key: DEMO_ORG_ID,
    account_code: "5300",
    account_name: "Property Insurance",
    account_type: "EXPENSE",
    account_subtype: "Insurance",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Expenses/Insurance",
    is_debit_normal: true,
    balance_sheet_section: null,
    income_statement_section: "operating_expenses",
  },
  {
    account_key: "acc_053",
    account_id: "53",
    source_account_id: "53",
    organization_key: DEMO_ORG_ID,
    account_code: "5400",
    account_name: "Utilities",
    account_type: "EXPENSE",
    account_subtype: "Utilities",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Expenses/Utilities",
    is_debit_normal: true,
    balance_sheet_section: null,
    income_statement_section: "operating_expenses",
  },
  {
    account_key: "acc_054",
    account_id: "54",
    source_account_id: "54",
    organization_key: DEMO_ORG_ID,
    account_code: "5500",
    account_name: "Mortgage Interest",
    account_type: "EXPENSE",
    account_subtype: "InterestPaid",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Expenses/Interest",
    is_debit_normal: true,
    balance_sheet_section: null,
    income_statement_section: "other_expenses",
  },
  {
    account_key: "acc_055",
    account_id: "55",
    source_account_id: "55",
    organization_key: DEMO_ORG_ID,
    account_code: "6000",
    account_name: "Salaries and Wages",
    account_type: "EXPENSE",
    account_subtype: "PayrollExpense",
    is_active: true,
    hierarchy_level: 1,
    hierarchy_path: "/Expenses/Payroll",
    is_debit_normal: true,
    balance_sheet_section: null,
    income_statement_section: "operating_expenses",
  },
];

// ============================================
// DIM_CONTACT - Customers/Vendors
// ============================================
const dimContacts = [
  {
    contact_key: "cust_001",
    contact_id: "101",
    source_contact_id: "101",
    organization_key: DEMO_ORG_ID,
    contact_type: "CUSTOMER",
    display_name: "Tech Solutions Inc.",
    company_name: "Tech Solutions Incorporated",
    email: "jean@techsolutions.ca",
    is_customer: true,
    is_vendor: false,
    is_active: true,
  },
  {
    contact_key: "cust_002",
    contact_id: "102",
    source_contact_id: "102",
    organization_key: DEMO_ORG_ID,
    contact_type: "CUSTOMER",
    display_name: "Montreal Marketing Group",
    company_name: "Montreal Marketing Group Inc.",
    email: "info@mmg.ca",
    is_customer: true,
    is_vendor: false,
    is_active: true,
  },
  {
    contact_key: "cust_003",
    contact_id: "103",
    source_contact_id: "103",
    organization_key: DEMO_ORG_ID,
    contact_type: "CUSTOMER",
    display_name: "Quebec Consulting Partners",
    company_name: "Quebec Consulting Partners Ltd.",
    email: "contact@qcp.ca",
    is_customer: true,
    is_vendor: false,
    is_active: true,
  },
  {
    contact_key: "vend_001",
    contact_id: "201",
    source_contact_id: "201",
    organization_key: DEMO_ORG_ID,
    contact_type: "VENDOR",
    display_name: "City Maintenance Services",
    company_name: "City Maintenance Services Inc.",
    email: "service@citymaintenance.ca",
    is_customer: false,
    is_vendor: true,
    is_active: true,
  },
  {
    contact_key: "vend_002",
    contact_id: "202",
    source_contact_id: "202",
    organization_key: DEMO_ORG_ID,
    contact_type: "VENDOR",
    display_name: "Hydro Quebec",
    company_name: "Hydro-Québec",
    email: "commercial@hydroquebec.com",
    is_customer: false,
    is_vendor: true,
    is_active: true,
  },
];

// ============================================
// FACT_TRANSACTION - Transaction Data (12 months)
// ============================================
function generateTransactions(): any[] {
  const transactions: any[] = [];
  let txnCounter = 1;

  // Helper to generate a date in the past N months
  const getDateInPastMonths = (monthsAgo: number, day: number = 15): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(day);
    return date.toISOString().split("T")[0];
  };

  // Generate 12 months of data
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const month = 11 - monthsAgo + 1;
    const baseDate = getDateInPastMonths(monthsAgo, 1);
    const midDate = getDateInPastMonths(monthsAgo, 15);
    const endDate = getDateInPastMonths(monthsAgo, 28);

    // Monthly rental income (3 tenants @ ~$8,500/month each)
    const rentalAmounts = [8500, 7200, 6800];
    for (let i = 0; i < 3; i++) {
      const amount = rentalAmounts[i] * (0.95 + Math.random() * 0.1);
      transactions.push({
        transaction_key: `txn_${txnCounter++}`,
        transaction_id: `${txnCounter}`,
        organization_key: DEMO_ORG_ID,
        account_key: "acc_040", // Rental Income
        date_key: parseInt(baseDate.replace(/-/g, "")),
        contact_key: `cust_00${i + 1}`,
        transaction_type_key: "invoice",
        transaction_date: baseDate,
        posting_date: baseDate,
        debit_amount: 0,
        credit_amount: Math.round(amount * 100) / 100,
        amount: Math.round(amount * 100) / 100,
        currency_code: "CAD",
        exchange_rate: 1,
        amount_cad: Math.round(amount * 100) / 100,
        reference_number: `INV-2025-${String(month).padStart(2, "0")}-${i + 1}`,
        memo: `Rent for ${baseDate.substring(0, 7)}`,
        source_system: "QUICKBOOKS",
        source_transaction_id: `qb_inv_${txnCounter}`,
      });

      // Corresponding AR entry
      transactions.push({
        transaction_key: `txn_${txnCounter++}`,
        transaction_id: `${txnCounter}`,
        organization_key: DEMO_ORG_ID,
        account_key: "acc_002", // AR
        date_key: parseInt(baseDate.replace(/-/g, "")),
        contact_key: `cust_00${i + 1}`,
        transaction_type_key: "invoice",
        transaction_date: baseDate,
        posting_date: baseDate,
        debit_amount: Math.round(amount * 100) / 100,
        credit_amount: 0,
        amount: Math.round(amount * 100) / 100,
        currency_code: "CAD",
        exchange_rate: 1,
        amount_cad: Math.round(amount * 100) / 100,
        reference_number: `INV-2025-${String(month).padStart(2, "0")}-${i + 1}`,
        memo: `Rent receivable for ${baseDate.substring(0, 7)}`,
        source_system: "QUICKBOOKS",
        source_transaction_id: `qb_inv_ar_${txnCounter}`,
      });

      // Cash receipt (assume 80% paid in same month)
      if (Math.random() > 0.2) {
        transactions.push({
          transaction_key: `txn_${txnCounter++}`,
          transaction_id: `${txnCounter}`,
          organization_key: DEMO_ORG_ID,
          account_key: "acc_001", // Cash
          date_key: parseInt(midDate.replace(/-/g, "")),
          contact_key: `cust_00${i + 1}`,
          transaction_type_key: "payment",
          transaction_date: midDate,
          posting_date: midDate,
          debit_amount: Math.round(amount * 100) / 100,
          credit_amount: 0,
          amount: Math.round(amount * 100) / 100,
          currency_code: "CAD",
          exchange_rate: 1,
          amount_cad: Math.round(amount * 100) / 100,
          reference_number: `PMT-2025-${String(month).padStart(2, "0")}-${i + 1}`,
          memo: `Payment received for rent`,
          source_system: "QUICKBOOKS",
          source_transaction_id: `qb_pmt_${txnCounter}`,
        });

        // Clear AR
        transactions.push({
          transaction_key: `txn_${txnCounter++}`,
          transaction_id: `${txnCounter}`,
          organization_key: DEMO_ORG_ID,
          account_key: "acc_002", // AR
          date_key: parseInt(midDate.replace(/-/g, "")),
          contact_key: `cust_00${i + 1}`,
          transaction_type_key: "payment",
          transaction_date: midDate,
          posting_date: midDate,
          debit_amount: 0,
          credit_amount: Math.round(amount * 100) / 100,
          amount: -Math.round(amount * 100) / 100,
          currency_code: "CAD",
          exchange_rate: 1,
          amount_cad: -Math.round(amount * 100) / 100,
          reference_number: `PMT-2025-${String(month).padStart(2, "0")}-${i + 1}`,
          memo: `AR cleared for rent payment`,
          source_system: "QUICKBOOKS",
          source_transaction_id: `qb_pmt_ar_${txnCounter}`,
        });
      }
    }

    // Monthly expenses
    const expenses = [
      { account: "acc_050", name: "Property Taxes", amount: 4000 },
      { account: "acc_051", name: "Building Maintenance", amount: 2900 },
      { account: "acc_052", name: "Property Insurance", amount: 1500 },
      { account: "acc_053", name: "Utilities", amount: 2000 },
      { account: "acc_054", name: "Mortgage Interest", amount: 6000 },
      { account: "acc_055", name: "Salaries", amount: 4500 },
    ];

    for (const expense of expenses) {
      const amount = expense.amount * (0.9 + Math.random() * 0.2);

      // Expense entry
      transactions.push({
        transaction_key: `txn_${txnCounter++}`,
        transaction_id: `${txnCounter}`,
        organization_key: DEMO_ORG_ID,
        account_key: expense.account,
        date_key: parseInt(endDate.replace(/-/g, "")),
        contact_key: expense.account === "acc_053" ? "vend_002" : "vend_001",
        transaction_type_key: "bill",
        transaction_date: endDate,
        posting_date: endDate,
        debit_amount: Math.round(amount * 100) / 100,
        credit_amount: 0,
        amount: Math.round(amount * 100) / 100,
        currency_code: "CAD",
        exchange_rate: 1,
        amount_cad: Math.round(amount * 100) / 100,
        reference_number: `BILL-2025-${String(month).padStart(2, "0")}-${expense.account.split("_")[1]}`,
        memo: `${expense.name} for ${endDate.substring(0, 7)}`,
        source_system: "QUICKBOOKS",
        source_transaction_id: `qb_bill_${txnCounter}`,
      });

      // AP entry
      transactions.push({
        transaction_key: `txn_${txnCounter++}`,
        transaction_id: `${txnCounter}`,
        organization_key: DEMO_ORG_ID,
        account_key: "acc_020", // AP
        date_key: parseInt(endDate.replace(/-/g, "")),
        contact_key: expense.account === "acc_053" ? "vend_002" : "vend_001",
        transaction_type_key: "bill",
        transaction_date: endDate,
        posting_date: endDate,
        debit_amount: 0,
        credit_amount: Math.round(amount * 100) / 100,
        amount: Math.round(amount * 100) / 100,
        currency_code: "CAD",
        exchange_rate: 1,
        amount_cad: Math.round(amount * 100) / 100,
        reference_number: `BILL-2025-${String(month).padStart(2, "0")}-${expense.account.split("_")[1]}`,
        memo: `AP for ${expense.name}`,
        source_system: "QUICKBOOKS",
        source_transaction_id: `qb_bill_ap_${txnCounter}`,
      });
    }
  }

  return transactions;
}

// ============================================
// MAIN - Upload to S3
// ============================================
async function seedGoldBucket() {
  console.log("🌱 Starting Gold S3 bucket seeding...");
  console.log(`   Endpoint: ${S3_ENDPOINT}`);
  console.log(`   Bucket: ${GOLD_BUCKET}`);
  console.log(`   Organization: ${DEMO_ORG_ID}\n`);

  try {
    // Verify bucket access
    await s3Client.send(new ListBucketsCommand({}));
    console.log("✅ Connected to S3\n");

    // Generate transaction data
    const transactions = generateTransactions();
    console.log(`📊 Generated ${transactions.length} transactions`);

    // Upload dim_account
    console.log("\n📤 Uploading dim_account...");
    const accountsKey = `dim_account/${DEMO_ORG_ID}/accounts_${new Date().toISOString().split("T")[0]}.json`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: GOLD_BUCKET,
        Key: accountsKey,
        Body: JSON.stringify(dimAccounts, null, 2),
        ContentType: "application/json",
      })
    );
    console.log(`   ✅ Uploaded ${dimAccounts.length} accounts to ${accountsKey}`);

    // Upload dim_contact
    console.log("\n📤 Uploading dim_contact...");
    const contactsKey = `dim_contact/${DEMO_ORG_ID}/contacts_${new Date().toISOString().split("T")[0]}.json`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: GOLD_BUCKET,
        Key: contactsKey,
        Body: JSON.stringify(dimContacts, null, 2),
        ContentType: "application/json",
      })
    );
    console.log(`   ✅ Uploaded ${dimContacts.length} contacts to ${contactsKey}`);

    // Upload fact_transaction
    console.log("\n📤 Uploading fact_transaction...");
    const transactionsKey = `fact_transaction/${DEMO_ORG_ID}/transactions_${new Date().toISOString().split("T")[0]}.json`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: GOLD_BUCKET,
        Key: transactionsKey,
        Body: JSON.stringify(transactions, null, 2),
        ContentType: "application/json",
      })
    );
    console.log(`   ✅ Uploaded ${transactions.length} transactions to ${transactionsKey}`);

    console.log("\n🎉 Gold S3 bucket seeding complete!\n");
    console.log("Summary:");
    console.log(`   - Accounts: ${dimAccounts.length}`);
    console.log(`   - Contacts: ${dimContacts.length}`);
    console.log(`   - Transactions: ${transactions.length}`);
    console.log(`\nOrganization ID: ${DEMO_ORG_ID}`);
    console.log("\nYou can now start the API and view this data in the dashboard.");
  } catch (error) {
    console.error("❌ Error seeding Gold bucket:", error);
    process.exit(1);
  }
}

// Run
seedGoldBucket();
