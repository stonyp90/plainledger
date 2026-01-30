/**
 * Seed QuickBooks Sandbox with Realistic $35M Real Estate Company Data
 *
 * This script populates a QuickBooks sandbox with:
 * - Complete chart of accounts (60+ accounts)
 * - 15+ customers (tenants)
 * - 10+ vendors
 * - 24 months of invoices (~$35M annual revenue)
 * - 24 months of bills (expenses)
 * - Journal entries (opening balances, depreciation)
 *
 * Run: QUICKBOOKS_REFRESH_TOKEN=xxx npx tsx scripts/seed-quickbooks-sandbox.ts
 */

const fs = require('fs');
const path = require('path');

// Load .env file manually
function loadEnv(): void {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line: string) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

// Configuration
const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REALM_ID = process.env.QUICKBOOKS_REALM_ID || "9341456246487117";
const SANDBOX_API_URL = "https://sandbox-quickbooks.api.intuit.com/v3/company";

// Rate limiting
const RATE_LIMIT_DELAY_MS = 150; // ~400 requests/min to stay under 500 limit

// CLI Arguments parsing
interface CliArgs {
  refreshToken?: string;
  realmId?: string;
  months?: number;
  industry?: string;
  dryRun?: boolean;
}

function parseArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--realm-id' && argv[i + 1]) {
      args.realmId = argv[++i];
    } else if (arg === '--months' && argv[i + 1]) {
      args.months = parseInt(argv[++i], 10);
    } else if (arg === '--industry' && argv[i + 1]) {
      args.industry = argv[++i];
    } else if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg.startsWith('--')) {
      console.log(`⚠️  Unknown flag: ${arg}`);
    } else if (!args.refreshToken) {
      // First positional argument is refresh token
      args.refreshToken = arg;
    }
  }
  
  return args;
}

// Progress indicator
class ProgressIndicator {
  private currentStep = 0;
  private totalSteps = 0;
  private startTime = Date.now();

  start(totalSteps: number, message: string) {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.startTime = Date.now();
    console.log(`\n${message}`);
  }

  update(message: string) {
    this.currentStep++;
    const percent = Math.round((this.currentStep / this.totalSteps) * 100);
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    const estimated = this.currentStep > 0 
      ? Math.round((elapsed / this.currentStep) * (this.totalSteps - this.currentStep))
      : 0;
    
    process.stdout.write(`\r  [${'='.repeat(Math.floor(percent / 2))}${' '.repeat(50 - Math.floor(percent / 2))}] ${percent}% - ${message} (${elapsed}s elapsed, ~${estimated}s remaining)`);
  }

  complete(message: string) {
    const elapsed = Math.round((Date.now() - this.startTime) / 1000);
    process.stdout.write(`\r  [${'='.repeat(50)}] 100% - ${message} (${elapsed}s total)\n`);
  }
}

const progress = new ProgressIndicator();

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
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

// ============================================================================
// API HELPERS
// ============================================================================

async function apiPost<T>(
  accessToken: string,
  endpoint: string,
  data: any,
  realmId: string = REALM_ID
): Promise<T> {
  const url = `${SANDBOX_API_URL}/${realmId}/${endpoint}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API POST ${endpoint} failed: ${response.status} - ${error}`);
  }

  return response.json();
}

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

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// DATA DEFINITIONS - $35M REAL ESTATE COMPANY
// ============================================================================

// Chart of Accounts for a Real Estate Investment Company
const ACCOUNTS_TO_CREATE = [
  // ASSETS - Bank Accounts
  { Name: "Operating Account - RBC", AccountType: "Bank", AccountSubType: "Checking" },
  { Name: "Reserve Fund - TD", AccountType: "Bank", AccountSubType: "Savings" },
  { Name: "Security Deposits Held", AccountType: "Bank", AccountSubType: "TrustAccounts" },

  // ASSETS - Receivables
  { Name: "Tenant Receivables", AccountType: "Accounts Receivable", AccountSubType: "AccountsReceivable" },
  { Name: "Other Receivables", AccountType: "Other Current Asset", AccountSubType: "OtherCurrentAssets" },

  // ASSETS - Fixed Assets (Properties)
  { Name: "Land - 100 King St", AccountType: "Fixed Asset", AccountSubType: "Land" },
  { Name: "Building - 100 King St", AccountType: "Fixed Asset", AccountSubType: "Buildings" },
  { Name: "Land - 250 Bay St", AccountType: "Fixed Asset", AccountSubType: "Land" },
  { Name: "Building - 250 Bay St", AccountType: "Fixed Asset", AccountSubType: "Buildings" },
  { Name: "Land - 500 University Ave", AccountType: "Fixed Asset", AccountSubType: "Land" },
  { Name: "Building - 500 University Ave", AccountType: "Fixed Asset", AccountSubType: "Buildings" },
  { Name: "Land - 75 Front St", AccountType: "Fixed Asset", AccountSubType: "Land" },
  { Name: "Building - 75 Front St", AccountType: "Fixed Asset", AccountSubType: "Buildings" },
  { Name: "Leasehold Improvements", AccountType: "Fixed Asset", AccountSubType: "LeaseholdImprovements" },
  { Name: "Furniture & Fixtures", AccountType: "Fixed Asset", AccountSubType: "FurnitureAndFixtures" },
  { Name: "Accumulated Depreciation - Buildings", AccountType: "Fixed Asset", AccountSubType: "AccumulatedDepreciation" },
  { Name: "Accumulated Depreciation - F&F", AccountType: "Fixed Asset", AccountSubType: "AccumulatedDepreciation" },

  // LIABILITIES - Current
  { Name: "Trade Accounts Payable", AccountType: "Accounts Payable", AccountSubType: "AccountsPayable" },
  { Name: "Accrued Expenses", AccountType: "Other Current Liability", AccountSubType: "OtherCurrentLiabilities" },
  { Name: "Property Taxes Payable", AccountType: "Other Current Liability", AccountSubType: "OtherCurrentLiabilities" },
  { Name: "Security Deposits - Tenants", AccountType: "Other Current Liability", AccountSubType: "OtherCurrentLiabilities" },
  { Name: "Current Portion LTD", AccountType: "Other Current Liability", AccountSubType: "OtherCurrentLiabilities" },
  { Name: "HST/GST Payable", AccountType: "Other Current Liability", AccountSubType: "SalesTaxPayable" },

  // LIABILITIES - Long Term
  { Name: "Mortgage - 100 King St", AccountType: "Long Term Liability", AccountSubType: "NotesPayable" },
  { Name: "Mortgage - 250 Bay St", AccountType: "Long Term Liability", AccountSubType: "NotesPayable" },
  { Name: "Mortgage - 500 University Ave", AccountType: "Long Term Liability", AccountSubType: "NotesPayable" },
  { Name: "Mortgage - 75 Front St", AccountType: "Long Term Liability", AccountSubType: "NotesPayable" },

  // EQUITY
  { Name: "Share Capital", AccountType: "Equity", AccountSubType: "CommonStock" },
  { Name: "Retained Earnings", AccountType: "Equity", AccountSubType: "RetainedEarnings" },
  { Name: "Current Year Earnings", AccountType: "Equity", AccountSubType: "RetainedEarnings" },

  // REVENUE
  { Name: "Rental Income - Commercial", AccountType: "Income", AccountSubType: "ServiceFeeIncome" },
  { Name: "Rental Income - Retail", AccountType: "Income", AccountSubType: "ServiceFeeIncome" },
  { Name: "CAM Recoveries", AccountType: "Income", AccountSubType: "ServiceFeeIncome" },
  { Name: "Parking Revenue", AccountType: "Income", AccountSubType: "ServiceFeeIncome" },
  { Name: "Late Payment Fees", AccountType: "Other Income", AccountSubType: "OtherMiscellaneousIncome" },
  { Name: "Interest Income", AccountType: "Other Income", AccountSubType: "InterestEarned" },

  // EXPENSES - Property Operations
  { Name: "Property Management Fees", AccountType: "Expense", AccountSubType: "ManagementCompensation" },
  { Name: "Building Maintenance", AccountType: "Expense", AccountSubType: "RepairMaintenance" },
  { Name: "Janitorial Services", AccountType: "Expense", AccountSubType: "RepairMaintenance" },
  { Name: "HVAC Maintenance", AccountType: "Expense", AccountSubType: "RepairMaintenance" },
  { Name: "Elevator Maintenance", AccountType: "Expense", AccountSubType: "RepairMaintenance" },
  { Name: "Landscaping", AccountType: "Expense", AccountSubType: "RepairMaintenance" },
  { Name: "Snow Removal", AccountType: "Expense", AccountSubType: "RepairMaintenance" },
  { Name: "Security Services", AccountType: "Expense", AccountSubType: "OtherMiscellaneousServiceCost" },

  // EXPENSES - Utilities
  { Name: "Electricity", AccountType: "Expense", AccountSubType: "Utilities" },
  { Name: "Natural Gas", AccountType: "Expense", AccountSubType: "Utilities" },
  { Name: "Water & Sewer", AccountType: "Expense", AccountSubType: "Utilities" },
  { Name: "Waste Removal", AccountType: "Expense", AccountSubType: "Utilities" },

  // EXPENSES - Insurance & Taxes
  { Name: "Property Insurance", AccountType: "Expense", AccountSubType: "Insurance" },
  { Name: "Liability Insurance", AccountType: "Expense", AccountSubType: "Insurance" },
  { Name: "Property Taxes", AccountType: "Expense", AccountSubType: "TaxesPaid" },

  // EXPENSES - Professional & Admin
  { Name: "Legal Fees", AccountType: "Expense", AccountSubType: "LegalProfessionalFees" },
  { Name: "Accounting Fees", AccountType: "Expense", AccountSubType: "LegalProfessionalFees" },
  { Name: "Appraisal Fees", AccountType: "Expense", AccountSubType: "LegalProfessionalFees" },
  { Name: "Bank Charges", AccountType: "Expense", AccountSubType: "BankCharges" },
  { Name: "Office Supplies", AccountType: "Expense", AccountSubType: "OfficeExpenses" },

  // EXPENSES - Interest
  { Name: "Mortgage Interest - 100 King St", AccountType: "Expense", AccountSubType: "InterestPaid" },
  { Name: "Mortgage Interest - 250 Bay St", AccountType: "Expense", AccountSubType: "InterestPaid" },
  { Name: "Mortgage Interest - 500 University Ave", AccountType: "Expense", AccountSubType: "InterestPaid" },
  { Name: "Mortgage Interest - 75 Front St", AccountType: "Expense", AccountSubType: "InterestPaid" },

  // EXPENSES - Depreciation
  { Name: "Depreciation Expense - Buildings", AccountType: "Expense", AccountSubType: "Depreciation" },
  { Name: "Depreciation Expense - F&F", AccountType: "Expense", AccountSubType: "Depreciation" },
];

// Customers (Tenants) - Major commercial tenants for $35M company
const CUSTOMERS_TO_CREATE = [
  // 100 King St Tenants (Class A Office)
  { DisplayName: "Tech Innovations Corp", CompanyName: "Tech Innovations Corporation", PrimaryEmailAddr: { Address: "ap@techinnovations.com" }, Notes: "100 King St - Floors 10-15 - 60,000 sqft" },
  { DisplayName: "Global Financial Partners", CompanyName: "Global Financial Partners LLP", PrimaryEmailAddr: { Address: "accounts@gfp.com" }, Notes: "100 King St - Floors 5-9 - 50,000 sqft" },
  { DisplayName: "Metro Law Group", CompanyName: "Metro Law Group LLP", PrimaryEmailAddr: { Address: "billing@metrolaw.ca" }, Notes: "100 King St - Floors 2-4 - 30,000 sqft" },

  // 250 Bay St Tenants (Class A Office)
  { DisplayName: "Maple Consulting Inc", CompanyName: "Maple Consulting Inc.", PrimaryEmailAddr: { Address: "finance@mapleconsulting.ca" }, Notes: "250 Bay St - Floors 20-25 - 45,000 sqft" },
  { DisplayName: "Northern Insurance Co", CompanyName: "Northern Insurance Company", PrimaryEmailAddr: { Address: "ap@northernins.com" }, Notes: "250 Bay St - Floors 15-19 - 37,500 sqft" },
  { DisplayName: "DataStream Analytics", CompanyName: "DataStream Analytics Ltd.", PrimaryEmailAddr: { Address: "accounts@datastream.io" }, Notes: "250 Bay St - Floors 10-14 - 37,500 sqft" },

  // 500 University Ave Tenants (Medical/Professional)
  { DisplayName: "University Health Network", CompanyName: "UHN Foundation", PrimaryEmailAddr: { Address: "finance@uhn.ca" }, Notes: "500 University - Floors 1-5 - 50,000 sqft" },
  { DisplayName: "MedTech Solutions", CompanyName: "MedTech Solutions Inc.", PrimaryEmailAddr: { Address: "ar@medtech.ca" }, Notes: "500 University - Floors 6-8 - 30,000 sqft" },
  { DisplayName: "Ontario Medical Assoc", CompanyName: "Ontario Medical Association", PrimaryEmailAddr: { Address: "accounts@oma.org" }, Notes: "500 University - Floors 9-10 - 20,000 sqft" },

  // 75 Front St Tenants (Retail/Mixed Use)
  { DisplayName: "Retail One Corp", CompanyName: "Retail One Corporation", PrimaryEmailAddr: { Address: "ap@retailone.com" }, Notes: "75 Front St - Ground Floor - 15,000 sqft" },
  { DisplayName: "Urban Cafe Group", CompanyName: "Urban Cafe Group Inc.", PrimaryEmailAddr: { Address: "accounts@urbancafe.ca" }, Notes: "75 Front St - Food Court - 8,000 sqft" },
  { DisplayName: "Fitness Plus Inc", CompanyName: "Fitness Plus Inc.", PrimaryEmailAddr: { Address: "billing@fitnessplus.com" }, Notes: "75 Front St - Lower Level - 12,000 sqft" },
  { DisplayName: "Quick Mart Stores", CompanyName: "Quick Mart Stores Ltd.", PrimaryEmailAddr: { Address: "ar@quickmart.ca" }, Notes: "75 Front St - Retail Unit B - 5,000 sqft" },

  // Additional Commercial Tenants
  { DisplayName: "Creative Agency Ltd", CompanyName: "Creative Agency Limited", PrimaryEmailAddr: { Address: "ap@creativeagency.ca" }, Notes: "100 King St - Floor 1 - 10,000 sqft" },
  { DisplayName: "Venture Capital Partners", CompanyName: "Venture Capital Partners LP", PrimaryEmailAddr: { Address: "finance@vcpartners.com" }, Notes: "250 Bay St - Penthouse - 5,000 sqft" },
];

// Monthly rent amounts per tenant (targeting ~$35M annual revenue)
const MONTHLY_RENTS: Record<string, number> = {
  "Tech Innovations Corp": 180000, // $30/sqft/yr
  "Global Financial Partners": 175000,
  "Metro Law Group": 105000,
  "Maple Consulting Inc": 157500,
  "Northern Insurance Co": 131250,
  "DataStream Analytics": 131250,
  "University Health Network": 208333,
  "MedTech Solutions": 125000,
  "Ontario Medical Assoc": 83333,
  "Retail One Corp": 62500, // Retail premium
  "Urban Cafe Group": 40000,
  "Fitness Plus Inc": 36000,
  "Quick Mart Stores": 20833,
  "Creative Agency Ltd": 35000,
  "Venture Capital Partners": 25000,
};

// Vendors
const VENDORS_TO_CREATE = [
  { DisplayName: "GTA Property Management", CompanyName: "GTA Property Management Inc.", PrimaryEmailAddr: { Address: "invoices@gtapm.ca" } },
  { DisplayName: "Elite Building Services", CompanyName: "Elite Building Services Ltd.", PrimaryEmailAddr: { Address: "ar@elitebuilding.ca" } },
  { DisplayName: "Metro Janitorial", CompanyName: "Metro Janitorial Services Inc.", PrimaryEmailAddr: { Address: "billing@metrojanitorial.com" } },
  { DisplayName: "Superior HVAC Corp", CompanyName: "Superior HVAC Corporation", PrimaryEmailAddr: { Address: "accounts@superiorhvac.ca" } },
  { DisplayName: "Elevate Services", CompanyName: "Elevate Elevator Services Inc.", PrimaryEmailAddr: { Address: "invoices@elevateservices.com" } },
  { DisplayName: "Green Landscapes", CompanyName: "Green Landscapes Ontario Ltd.", PrimaryEmailAddr: { Address: "ar@greenlandscapes.ca" } },
  { DisplayName: "SecureGuard Inc", CompanyName: "SecureGuard Security Inc.", PrimaryEmailAddr: { Address: "billing@secureguard.ca" } },
  { DisplayName: "Toronto Hydro", CompanyName: "Toronto Hydro Electric System", PrimaryEmailAddr: { Address: "commercial@torontohydro.com" } },
  { DisplayName: "Enbridge Gas", CompanyName: "Enbridge Gas Inc.", PrimaryEmailAddr: { Address: "accounts@enbridge.com" } },
  { DisplayName: "Intact Insurance", CompanyName: "Intact Insurance Company", PrimaryEmailAddr: { Address: "premiums@intact.ca" } },
  { DisplayName: "Baker Tilly LLP", CompanyName: "Baker Tilly LLP", PrimaryEmailAddr: { Address: "invoices@bakertilly.ca" } },
  { DisplayName: "Torys LLP", CompanyName: "Torys LLP", PrimaryEmailAddr: { Address: "billing@torys.com" } },
  { DisplayName: "City of Toronto", CompanyName: "City of Toronto - Property Tax", PrimaryEmailAddr: { Address: "propertytax@toronto.ca" } },
];

// Monthly expense amounts (targeting NOI ratio ~65%)
const MONTHLY_EXPENSES: Record<string, { vendor: string; account: string; amount: number }[]> = {
  common: [
    { vendor: "GTA Property Management", account: "Property Management Fees", amount: 87500 }, // 3% of revenue
    { vendor: "Elite Building Services", account: "Building Maintenance", amount: 45000 },
    { vendor: "Metro Janitorial", account: "Janitorial Services", amount: 35000 },
    { vendor: "Superior HVAC Corp", account: "HVAC Maintenance", amount: 25000 },
    { vendor: "Elevate Services", account: "Elevator Maintenance", amount: 18000 },
    { vendor: "Green Landscapes", account: "Landscaping", amount: 8000 },
    { vendor: "SecureGuard Inc", account: "Security Services", amount: 32000 },
    { vendor: "Toronto Hydro", account: "Electricity", amount: 85000 },
    { vendor: "Enbridge Gas", account: "Natural Gas", amount: 35000 },
    { vendor: "Intact Insurance", account: "Property Insurance", amount: 45000 },
    { vendor: "Intact Insurance", account: "Liability Insurance", amount: 15000 },
    { vendor: "Baker Tilly LLP", account: "Accounting Fees", amount: 12000 },
    { vendor: "Torys LLP", account: "Legal Fees", amount: 8000 },
  ],
  quarterly: [
    { vendor: "City of Toronto", account: "Property Taxes", amount: 312500 }, // ~$3.75M/year
  ],
};

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function createAccounts(accessToken: string, realmId: string = REALM_ID): Promise<Map<string, string>> {
  const accountMap = new Map<string, string>();

  // First, get existing accounts
  const existing = await apiQuery<{ QueryResponse: { Account?: any[] } }>(
    accessToken,
    "SELECT * FROM Account MAXRESULTS 1000"
  );

  const existingNames = new Set(
    (existing.QueryResponse.Account || []).map((a: any) => a.Name)
  );

  // Map existing accounts
  (existing.QueryResponse.Account || []).forEach((a: any) => {
    accountMap.set(a.Name, a.Id);
  });

  let created = 0;
  let skipped = 0;

  for (const account of ACCOUNTS_TO_CREATE) {
    if (existingNames.has(account.Name)) {
      skipped++;
      continue;
    }

    try {
      const result = await apiPost<{ Account: { Id: string; Name: string } }>(
        accessToken,
        "account",
        account,
        realmId
      );
      accountMap.set(result.Account.Name, result.Account.Id);
      created++;
      progress.update(`Created: ${account.Name}`);
      await delay(RATE_LIMIT_DELAY_MS);
    } catch (error: any) {
      console.log(`   ⚠️  Skipped ${account.Name}: ${error.message.substring(0, 50)}`);
    }
  }

  return accountMap;
}

async function createCustomers(accessToken: string, realmId: string = REALM_ID): Promise<Map<string, string>> {
  const customerMap = new Map<string, string>();

  // Get existing customers
  const existing = await apiQuery<{ QueryResponse: { Customer?: any[] } }>(
    accessToken,
    "SELECT * FROM Customer MAXRESULTS 1000",
    realmId
  );

  const existingNames = new Set(
    (existing.QueryResponse.Customer || []).map((c: any) => c.DisplayName)
  );

  // Map existing
  (existing.QueryResponse.Customer || []).forEach((c: any) => {
    customerMap.set(c.DisplayName, c.Id);
  });

  let created = 0;
  let skipped = 0;

  for (const customer of CUSTOMERS_TO_CREATE) {
    if (existingNames.has(customer.DisplayName)) {
      skipped++;
      customerMap.set(customer.DisplayName, customerMap.get(customer.DisplayName)!);
      continue;
    }

    try {
      const result = await apiPost<{ Customer: { Id: string; DisplayName: string } }>(
        accessToken,
        "customer",
        customer,
        realmId
      );
      customerMap.set(result.Customer.DisplayName, result.Customer.Id);
      created++;
      console.log(`   ✅ Created: ${customer.DisplayName}`);
      await delay(RATE_LIMIT_DELAY_MS);
    } catch (error: any) {
      console.log(`   ⚠️  Skipped ${customer.DisplayName}: ${error.message.substring(0, 50)}`);
    }
  }

  return customerMap;
}

async function createVendors(accessToken: string, realmId: string = REALM_ID): Promise<Map<string, string>> {
  console.log("\n🏢 Creating Vendors...");
  const vendorMap = new Map<string, string>();

  // Get existing vendors
  const existing = await apiQuery<{ QueryResponse: { Vendor?: any[] } }>(
    accessToken,
    "SELECT * FROM Vendor MAXRESULTS 1000"
  );

  const existingNames = new Set(
    (existing.QueryResponse.Vendor || []).map((v: any) => v.DisplayName)
  );

  // Map existing
  (existing.QueryResponse.Vendor || []).forEach((v: any) => {
    vendorMap.set(v.DisplayName, v.Id);
  });

  let created = 0;
  let skipped = 0;

  for (const vendor of VENDORS_TO_CREATE) {
    if (existingNames.has(vendor.DisplayName)) {
      skipped++;
      continue;
    }

    try {
      const result = await apiPost<{ Vendor: { Id: string; DisplayName: string } }>(
        accessToken,
        "vendor",
        vendor,
        realmId
      );
      vendorMap.set(result.Vendor.DisplayName, result.Vendor.Id);
      created++;
      progress.update(`Created: ${vendor.DisplayName}`);
      await delay(RATE_LIMIT_DELAY_MS);
    } catch (error: any) {
      console.log(`   ⚠️  Skipped ${vendor.DisplayName}: ${error.message.substring(0, 50)}`);
    }
  }

  console.log(`   📊 Vendors: ${created} created, ${skipped} already existed`);
  return vendorMap;
}

async function getIncomeAccountId(accessToken: string): Promise<string> {
  const result = await apiQuery<{ QueryResponse: { Account?: any[] } }>(
    accessToken,
    "SELECT * FROM Account WHERE AccountType = 'Income' MAXRESULTS 10"
  );

  const accounts = result.QueryResponse.Account || [];
  // Look for rental income or service fee income
  const rentalAccount = accounts.find(
    (a: any) => a.Name.includes("Rental") || a.Name.includes("Service")
  );

  return rentalAccount?.Id || accounts[0]?.Id || "1";
}

async function getExpenseAccountId(
  accessToken: string,
  accountName: string,
  accountMap: Map<string, string>
): Promise<string> {
  // Try to get from map first
  if (accountMap.has(accountName)) {
    return accountMap.get(accountName)!;
  }

  // Query for it
  const result = await apiQuery<{ QueryResponse: { Account?: any[] } }>(
    accessToken,
    `SELECT * FROM Account WHERE Name = '${accountName}' MAXRESULTS 1`
  );

  const accounts = result.QueryResponse.Account || [];
  if (accounts.length > 0) {
    return accounts[0].Id;
  }

  // Fallback to any expense account
  const fallback = await apiQuery<{ QueryResponse: { Account?: any[] } }>(
    accessToken,
    "SELECT * FROM Account WHERE AccountType = 'Expense' MAXRESULTS 1"
  );

  return (fallback.QueryResponse.Account || [])[0]?.Id || "1";
}

async function createInvoices(
  accessToken: string,
  customerMap: Map<string, string>,
  monthsBack: number = 24,
  realmId: string = REALM_ID
): Promise<number> {

  const incomeAccountId = await getIncomeAccountId(accessToken);
  let created = 0;

  // Get existing invoice count to avoid duplicates
  const existingInvoices = await apiQuery<{ QueryResponse: { totalCount?: number } }>(
    accessToken,
    "SELECT COUNT(*) FROM Invoice"
  );
  const existingCount = existingInvoices.QueryResponse.totalCount || 0;

  if (existingCount > 100) {
    console.log(`   ⚠️  ${existingCount} invoices already exist - skipping invoice creation`);
    return 0;
  }

  for (let monthsAgo = monthsBack - 1; monthsAgo >= 0; monthsAgo--) {
    const invoiceDate = new Date();
    invoiceDate.setMonth(invoiceDate.getMonth() - monthsAgo);
    invoiceDate.setDate(1);
    const dateStr = invoiceDate.toISOString().split("T")[0];
    const monthYear = invoiceDate.toLocaleDateString("en-CA", { month: "short", year: "numeric" });

    for (const [customerName, customerId] of customerMap) {
      const rentAmount = MONTHLY_RENTS[customerName];
      if (!rentAmount) continue;

      // Add some variance (±5%)
      const variance = 1 + (Math.random() - 0.5) * 0.1;
      const amount = Math.round(rentAmount * variance * 100) / 100;

      // CAM charges (~15% of base rent)
      const camAmount = Math.round(rentAmount * 0.15 * 100) / 100;

      const invoice = {
        CustomerRef: { value: customerId },
        TxnDate: dateStr,
        DueDate: dateStr, // Due on receipt for rent
        PrivateNote: `Monthly rent and CAM for ${monthYear}`,
        Line: [
          {
            Amount: amount,
            Description: `Base Rent - ${monthYear}`,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: { value: "1" }, // Use default item
              Qty: 1,
              UnitPrice: amount,
            },
          },
          {
            Amount: camAmount,
            Description: `CAM Charges - ${monthYear}`,
            DetailType: "SalesItemLineDetail",
            SalesItemLineDetail: {
              ItemRef: { value: "1" },
              Qty: 1,
              UnitPrice: camAmount,
            },
          },
        ],
      };

      try {
        await apiPost(accessToken, "invoice", invoice);
        created++;
        await delay(RATE_LIMIT_DELAY_MS);
      } catch (error: any) {
        // Continue on error - might be duplicate
      }
    }

    progress.update(`${monthYear}: Created invoices for all tenants`);
  }

  return created;
}

async function createBills(
  accessToken: string,
  vendorMap: Map<string, string>,
  accountMap: Map<string, string>,
  monthsBack: number = 24,
  realmId: string = REALM_ID
): Promise<number> {
  console.log(`\n📋 Creating ${monthsBack} months of Bills (Expenses)...`);

  let created = 0;

  // Get existing bill count
  const existingBills = await apiQuery<{ QueryResponse: { totalCount?: number } }>(
    accessToken,
    "SELECT COUNT(*) FROM Bill"
  );
  const existingCount = existingBills.QueryResponse.totalCount || 0;

  if (existingCount > 100) {
    console.log(`   ⚠️  ${existingCount} bills already exist - skipping bill creation`);
    return 0;
  }

  // Get AP account
  const apResult = await apiQuery<{ QueryResponse: { Account?: any[] } }>(
    accessToken,
    "SELECT * FROM Account WHERE AccountType = 'Accounts Payable' MAXRESULTS 1"
  );
  const apAccountId = (apResult.QueryResponse.Account || [])[0]?.Id || "1";

  for (let monthsAgo = monthsBack - 1; monthsAgo >= 0; monthsAgo--) {
    const billDate = new Date();
    billDate.setMonth(billDate.getMonth() - monthsAgo);
    billDate.setDate(15);
    const dateStr = billDate.toISOString().split("T")[0];
    const monthYear = billDate.toLocaleDateString("en-CA", { month: "short", year: "numeric" });

    // Create monthly expenses
    for (const expense of MONTHLY_EXPENSES.common) {
      const vendorId = vendorMap.get(expense.vendor);
      if (!vendorId) continue;

      // Add variance (±10%)
      const variance = 1 + (Math.random() - 0.5) * 0.2;
      const amount = Math.round(expense.amount * variance * 100) / 100;

      const expenseAccountId = await getExpenseAccountId(accessToken, expense.account, accountMap);

      const bill = {
        VendorRef: { value: vendorId },
        TxnDate: dateStr,
        DueDate: new Date(billDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        Line: [
          {
            Amount: amount,
            Description: `${expense.account} - ${monthYear}`,
            DetailType: "AccountBasedExpenseLineDetail",
            AccountBasedExpenseLineDetail: {
              AccountRef: { value: expenseAccountId },
            },
          },
        ],
      };

      try {
        await apiPost(accessToken, "bill", bill);
        created++;
        await delay(RATE_LIMIT_DELAY_MS);
      } catch (error: any) {
        // Continue on error
      }
    }

    // Quarterly expenses (property taxes, etc.)
    if (monthsAgo % 3 === 0) {
      for (const expense of MONTHLY_EXPENSES.quarterly) {
        const vendorId = vendorMap.get(expense.vendor);
        if (!vendorId) continue;

        const expenseAccountId = await getExpenseAccountId(accessToken, expense.account, accountMap);

        const bill = {
          VendorRef: { value: vendorId },
          TxnDate: dateStr,
          DueDate: dateStr,
          Line: [
            {
              Amount: expense.amount,
              Description: `${expense.account} - Q${Math.ceil((12 - monthsAgo) / 3)} Payment`,
              DetailType: "AccountBasedExpenseLineDetail",
              AccountBasedExpenseLineDetail: {
                AccountRef: { value: expenseAccountId },
              },
            },
          ],
        };

        try {
          await apiPost(accessToken, "bill", bill);
          created++;
          await delay(RATE_LIMIT_DELAY_MS);
        } catch (error: any) {
          // Continue on error
        }
      }
    }

    progress.update(`${monthYear}: Created expense bills`);
  }

  return created;
}

async function createOpeningBalanceJournalEntry(
  accessToken: string,
  accountMap: Map<string, string>,
  realmId: string = REALM_ID
): Promise<void> {

  // Check if journal entries already exist (can't query by PrivateNote)
  try {
    const existing = await apiQuery<{ QueryResponse: { JournalEntry?: any[]; totalCount?: number } }>(
      accessToken,
      "SELECT COUNT(*) FROM JournalEntry"
    );

    if ((existing.QueryResponse.totalCount || 0) > 0) {
      console.log("   ⚠️  Journal entries already exist - skipping opening balance");
      return;
    }
    console.log("   Creating opening balance journal entry...");
  } catch (e) {
    // Continue if query fails
  }

  // Set opening date to 2 years ago
  const openingDate = new Date();
  openingDate.setFullYear(openingDate.getFullYear() - 2);
  openingDate.setMonth(0);
  openingDate.setDate(1);
  const dateStr = openingDate.toISOString().split("T")[0];

  // Get account IDs
  const getAccountId = async (name: string): Promise<string> => {
    if (accountMap.has(name)) return accountMap.get(name)!;

    const result = await apiQuery<{ QueryResponse: { Account?: any[] } }>(
      accessToken,
      `SELECT * FROM Account WHERE Name LIKE '%${name.substring(0, 20)}%' MAXRESULTS 1`
    );
    return (result.QueryResponse.Account || [])[0]?.Id || "1";
  };

  // Opening balances for a $35M real estate company
  // Total Assets should be ~$120M (properties at cost)
  // Total Liabilities ~$72M (60% LTV mortgages)
  // Equity ~$48M

  const journalLines = [
    // ASSETS - Properties (Land + Buildings)
    { account: "Land - 100 King St", debit: 8000000, credit: 0 },
    { account: "Building - 100 King St", debit: 22000000, credit: 0 },
    { account: "Land - 250 Bay St", debit: 10000000, credit: 0 },
    { account: "Building - 250 Bay St", debit: 25000000, credit: 0 },
    { account: "Land - 500 University Ave", debit: 12000000, credit: 0 },
    { account: "Building - 500 University Ave", debit: 28000000, credit: 0 },
    { account: "Land - 75 Front St", debit: 5000000, credit: 0 },
    { account: "Building - 75 Front St", debit: 10000000, credit: 0 },

    // Accumulated Depreciation (assume 5 years at 4% per year on buildings)
    { account: "Accumulated Depreciation - Buildings", debit: 0, credit: 17000000 },

    // Cash
    { account: "Operating Account - RBC", debit: 2500000, credit: 0 },
    { account: "Reserve Fund - TD", debit: 1500000, credit: 0 },

    // LIABILITIES - Mortgages (60% LTV on property value)
    { account: "Mortgage - 100 King St", debit: 0, credit: 18000000 },
    { account: "Mortgage - 250 Bay St", debit: 0, credit: 21000000 },
    { account: "Mortgage - 500 University Ave", debit: 0, credit: 24000000 },
    { account: "Mortgage - 75 Front St", debit: 0, credit: 9000000 },

    // Security Deposits (roughly 2 months rent)
    { account: "Security Deposits - Tenants", debit: 0, credit: 5800000 },
    { account: "Security Deposits Held", debit: 5800000, credit: 0 },

    // EQUITY - Balancing entry
    { account: "Share Capital", debit: 0, credit: 15000000 },
    { account: "Retained Earnings", debit: 0, credit: 5000000 },
  ];

  const lines = [];

  for (const line of journalLines) {
    const accountId = await getAccountId(line.account);

    if (line.debit > 0) {
      lines.push({
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: accountId },
        },
        Amount: line.debit,
        Description: `Opening Balance - ${line.account}`,
        DetailType: "JournalEntryLineDetail",
      });
    }

    if (line.credit > 0) {
      lines.push({
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: accountId },
        },
        Amount: line.credit,
        Description: `Opening Balance - ${line.account}`,
        DetailType: "JournalEntryLineDetail",
      });
    }
  }

  const journalEntry = {
    TxnDate: dateStr,
    PrivateNote: "Opening Balance Entry - Company Formation",
    Line: lines,
  };

  try {
    await apiPost(accessToken, "journalentry", journalEntry, realmId);
    console.log("   ✅ Opening balance journal entry created");
  } catch (error: any) {
    console.log(`   ⚠️  Could not create opening balance: ${error.message.substring(0, 100)}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = parseArgs();
  const effectiveRealmId = args.realmId || REALM_ID;
  const monthsToCreate = args.months || 24;
  const industry = args.industry || 'real_estate';
  const isDryRun = args.dryRun || false;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  QuickBooks Sandbox Seeder                                   ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Target Realm ID: ${effectiveRealmId.padEnd(38)}║`);
  console.log(`║  Industry:       ${industry.padEnd(38)}║`);
  console.log(`║  Months:         ${String(monthsToCreate).padEnd(38)}║`);
  console.log(`║  Mode:           ${(isDryRun ? 'DRY RUN' : 'LIVE').padEnd(38)}║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Check for refresh token
  const refreshToken = process.env.QUICKBOOKS_REFRESH_TOKEN || args.refreshToken;

  if (!refreshToken) {
    console.log("\n❌ No refresh token provided!");
    console.log("\nTo get a refresh token:");
    console.log("1. Go to your PlainLedger app and connect QuickBooks");
    console.log("2. Or use the Intuit Developer Portal OAuth playground");
    console.log("\nUsage:");
    console.log("  QUICKBOOKS_REFRESH_TOKEN=xxx npx tsx scripts/seed-quickbooks-sandbox.ts");
    console.log("  or: npx tsx scripts/seed-quickbooks-sandbox.ts YOUR_REFRESH_TOKEN");
    console.log("\nOptions:");
    console.log("  --realm-id <id>     QuickBooks Realm ID (default: from env or 9341456246487117)");
    console.log("  --months <n>        Number of months of historical data (default: 24)");
    console.log("  --industry <name>  Industry template (default: real_estate)");
    console.log("  --dry-run          Preview what would be created without actually creating");
    process.exit(1);
  }

  if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET) {
    console.log("\n❌ Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET in .env");
    process.exit(1);
  }

  if (isDryRun) {
    console.log("\n🔍 DRY RUN MODE - No data will be created");
    console.log("This will show what would be created:\n");
    console.log(`  - ${ACCOUNTS_TO_CREATE.length} accounts`);
    console.log(`  - ${CUSTOMERS_TO_CREATE.length} customers`);
    console.log(`  - ${VENDORS_TO_CREATE.length} vendors`);
    console.log(`  - ~${monthsToCreate * CUSTOMERS_TO_CREATE.length} invoices`);
    console.log(`  - ~${monthsToCreate * MONTHLY_EXPENSES.common.length} bills`);
    console.log("\nRun without --dry-run to actually create the data.");
    process.exit(0);
  }

  try {
    // Get access token
    console.log("\n🔄 Refreshing access token...");
    const tokens = await refreshAccessToken(refreshToken);
    console.log("✅ Access token obtained!");

    // Update REALM_ID if provided via CLI
    const effectiveRealmIdForApi = args.realmId || REALM_ID;

    // Create accounts
    progress.start(ACCOUNTS_TO_CREATE.length, "📒 Creating Chart of Accounts...");
    const accountMap = await createAccounts(tokens.access_token, effectiveRealmId);
    progress.complete(`Created ${accountMap.size} accounts`);

    // Create customers (tenants)
    progress.start(CUSTOMERS_TO_CREATE.length, "👥 Creating Customers (Tenants)...");
    const customerMap = await createCustomers(tokens.access_token, effectiveRealmId);
    progress.complete(`Created ${customerMap.size} customers`);

    // Create vendors
    progress.start(VENDORS_TO_CREATE.length, "🏢 Creating Vendors...");
    const vendorMap = await createVendors(tokens.access_token, effectiveRealmId);
    progress.complete(`Created ${vendorMap.size} vendors`);

    // Create opening balance journal entry
    console.log("\n📝 Creating Opening Balance Journal Entry...");
    await createOpeningBalanceJournalEntry(tokens.access_token, accountMap, effectiveRealmId);

    // Create invoices
    const totalInvoices = monthsToCreate * customerMap.size;
    progress.start(monthsToCreate, `📄 Creating ${monthsToCreate} months of Invoices...`);
    const invoicesCreated = await createInvoices(
      tokens.access_token,
      customerMap,
      monthsToCreate,
      effectiveRealmId
    );
    progress.complete(`Created ${invoicesCreated} invoices`);

    // Create bills
    const totalBills = monthsToCreate * MONTHLY_EXPENSES.common.length;
    progress.start(monthsToCreate, `📋 Creating ${monthsToCreate} months of Bills...`);
    const billsCreated = await createBills(
      tokens.access_token,
      vendorMap,
      accountMap,
      monthsToCreate,
      effectiveRealmId
    );
    progress.complete(`Created ${billsCreated} bills`);

    // Summary
    const totalRevenue = Object.values(MONTHLY_RENTS).reduce((sum, rent) => sum + rent, 0) * monthsToCreate;
    const annualRevenue = (totalRevenue / monthsToCreate) * 12;
    
    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  🎉 SEEDING COMPLETE                                         ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Accounts:  ${String(accountMap.size).padEnd(44)}║`);
    console.log(`║  Customers: ${String(customerMap.size).padEnd(44)}║`);
    console.log(`║  Vendors:   ${String(vendorMap.size).padEnd(44)}║`);
    console.log(`║  Invoices:  ${String(invoicesCreated).padEnd(44)}║`);
    console.log(`║  Bills:     ${String(billsCreated).padEnd(44)}║`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║  Industry:  ${industry.padEnd(44)}║`);
    console.log(`║  Months:    ${String(monthsToCreate).padEnd(44)}║`);
    console.log(`║  Est. Annual Revenue: ~$${(annualRevenue / 1000000).toFixed(1)}M`.padEnd(58) + "║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    // Output new refresh token
    console.log("\n📝 New refresh token (save this for future use):");
    console.log(tokens.refresh_token);
    console.log("\n💡 Next steps:");
    console.log("  1. Wait a few minutes for QuickBooks to process the data");
    console.log("  2. Sync your data in PlainLedger (Settings > Connections > Sync)");
    console.log("  3. Your dashboard should now show real financial data!");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

main();
