#!/usr/bin/env npx ts-node
/**
 * QuickBooks Sandbox Integration Test Script
 *
 * This script tests the QuickBooks integration end-to-end:
 * 1. Generates OAuth authorization URL
 * 2. Tests API calls with access token (if provided)
 * 3. Runs ETL pipeline on fetched data
 *
 * Usage:
 *   # Set environment variables first:
 *   export QUICKBOOKS_CLIENT_ID="your_client_id"
 *   export QUICKBOOKS_CLIENT_SECRET="your_client_secret"
 *
 *   # Run the script:
 *   npx ts-node scripts/test-quickbooks-sandbox.ts
 *
 *   # Or with access token for API tests:
 *   export QUICKBOOKS_ACCESS_TOKEN="your_access_token"
 *   export QUICKBOOKS_REALM_ID="your_realm_id"
 *   npx ts-node scripts/test-quickbooks-sandbox.ts --test-api
 */

// Import from source files
import { QuickBooksService } from "../src/infrastructure/integrations/quickbooks/quickbooks.service";
import { ETLPipelineService } from "../src/application/services/etl-pipeline.service";
import {
  SilverAccountType,
  SilverSourceSystem,
} from "../src/domain/datalake/silver-schema";
import { AccountType } from "../src/domain/datalake/schemas";

// Configuration
const config = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID || "",
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || "",
  redirectUri:
    process.env.QUICKBOOKS_REDIRECT_URI ||
    "http://localhost:3000/api/v1/datasources/oauth/quickbooks/callback",
  accessToken: process.env.QUICKBOOKS_ACCESS_TOKEN || "",
  realmId: process.env.QUICKBOOKS_REALM_ID || "",
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(60));
  log(` ${title}`, colors.bright + colors.cyan);
  console.log("=".repeat(60));
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

// Mock ConfigService for testing outside NestJS context
const mockConfigService = {
  get: (key: string): string | undefined => {
    const mapping: Record<string, string> = {
      QUICKBOOKS_CLIENT_ID: config.clientId,
      QUICKBOOKS_CLIENT_SECRET: config.clientSecret,
      QUICKBOOKS_REDIRECT_URI: config.redirectUri,
    };
    return mapping[key];
  },
} as any;

async function testOAuthFlow() {
  logSection("Testing OAuth Flow");

  if (!config.clientId) {
    logError("QUICKBOOKS_CLIENT_ID not set");
    return false;
  }

  const service = new QuickBooksService(mockConfigService);
  const state = `test_${Date.now()}`;

  try {
    const authUrl = service.getAuthorizationUrl(state);

    logSuccess("OAuth URL generated successfully");
    console.log("\n📋 Authorization URL:");
    console.log(colors.cyan + authUrl + colors.reset);
    console.log("\n📝 Instructions:");
    console.log("   1. Open the URL above in your browser");
    console.log("   2. Log in to your QuickBooks sandbox account");
    console.log("   3. Authorize the application");
    console.log("   4. Copy the 'code' parameter from the redirect URL");
    console.log("   5. Copy the 'realmId' parameter (this is your company ID)");

    return true;
  } catch (error) {
    logError(`Failed to generate OAuth URL: ${error}`);
    return false;
  }
}

async function testTokenExchange(code: string, realmId: string) {
  logSection("Testing Token Exchange");

  if (!config.clientId || !config.clientSecret) {
    logError("Client credentials not set");
    return null;
  }

  const service = new QuickBooksService(mockConfigService);

  try {
    log("Exchanging authorization code for tokens...", colors.yellow);
    const tokens = await service.exchangeCodeForTokens(code, realmId);

    logSuccess("Token exchange successful!");
    console.log("\n📋 Tokens received:");
    console.log(`   Access Token: ${tokens.accessToken.substring(0, 20)}...`);
    console.log(
      `   Refresh Token: ${tokens.refreshToken.substring(0, 20)}...`,
    );
    console.log(`   Expires At: ${tokens.accessTokenExpiresAt}`);
    console.log(`   Realm ID: ${tokens.realmId}`);

    return tokens;
  } catch (error) {
    logError(`Token exchange failed: ${error}`);
    return null;
  }
}

async function testApiCalls() {
  logSection("Testing QuickBooks API Calls");

  if (!config.accessToken || !config.realmId) {
    logWarning(
      "Access token or realm ID not set. Set QUICKBOOKS_ACCESS_TOKEN and QUICKBOOKS_REALM_ID to test API calls.",
    );
    return false;
  }

  const service = new QuickBooksService(mockConfigService);
  const results: Record<string, any> = {};

  // Test Company Info
  try {
    log("Fetching company info...", colors.yellow);
    const companyInfo = await service.getCompanyInfo(
      config.accessToken,
      config.realmId,
      true,
    );
    results.companyInfo = companyInfo;
    logSuccess(`Company: ${companyInfo.companyName}`);
  } catch (error) {
    logError(`Failed to fetch company info: ${error}`);
    return false;
  }

  // Test Accounts
  try {
    log("Fetching accounts...", colors.yellow);
    const accounts = await service.getAccounts(
      config.accessToken,
      config.realmId,
      true,
    );
    results.accounts = accounts;
    logSuccess(`Fetched ${accounts.length} accounts`);

    if (accounts.length > 0) {
      console.log("\n   Sample accounts:");
      accounts.slice(0, 5).forEach((acc) => {
        console.log(
          `   - ${acc.AcctNum || "N/A"}: ${acc.Name} (${acc.AccountType})`,
        );
      });
    }
  } catch (error) {
    logError(`Failed to fetch accounts: ${error}`);
  }

  // Test Customers
  try {
    log("Fetching customers...", colors.yellow);
    const customers = await service.getCustomers(
      config.accessToken,
      config.realmId,
      true,
    );
    results.customers = customers;
    logSuccess(`Fetched ${customers.length} customers`);

    if (customers.length > 0) {
      console.log("\n   Sample customers:");
      customers.slice(0, 3).forEach((cust) => {
        console.log(`   - ${cust.DisplayName}`);
      });
    }
  } catch (error) {
    logError(`Failed to fetch customers: ${error}`);
  }

  // Test Vendors
  try {
    log("Fetching vendors...", colors.yellow);
    const vendors = await service.getVendors(
      config.accessToken,
      config.realmId,
      true,
    );
    results.vendors = vendors;
    logSuccess(`Fetched ${vendors.length} vendors`);
  } catch (error) {
    logError(`Failed to fetch vendors: ${error}`);
  }

  // Test Invoices
  try {
    log("Fetching invoices...", colors.yellow);
    const invoices = await service.getInvoices(
      config.accessToken,
      config.realmId,
      "2020-01-01", // Wide date range for sandbox
      "2030-12-31",
      true,
    );
    results.invoices = invoices;
    logSuccess(`Fetched ${invoices.length} invoices`);
  } catch (error) {
    logError(`Failed to fetch invoices: ${error}`);
  }

  // Test Journal Entries
  try {
    log("Fetching journal entries...", colors.yellow);
    const journalEntries = await service.getJournalEntries(
      config.accessToken,
      config.realmId,
      "2020-01-01",
      "2030-12-31",
      true,
    );
    results.journalEntries = journalEntries;
    logSuccess(`Fetched ${journalEntries.length} journal entries`);
  } catch (error) {
    logError(`Failed to fetch journal entries: ${error}`);
  }

  return results;
}

async function testEtlPipeline(apiResults: Record<string, any>) {
  logSection("Testing ETL Pipeline");

  if (!apiResults || !apiResults.accounts) {
    logWarning("No API results to process. Skipping ETL test.");
    return false;
  }

  const etlService = new ETLPipelineService();
  const TEST_ORG_ID = "org_sandbox_test";
  const TEST_DATASOURCE_ID = "ds_qb_sandbox";
  const TEST_ORG_KEY = "gold_org_sandbox";

  let bronzeCount = 0;
  let silverCount = 0;
  let goldCount = 0;
  let qualityIssues: string[] = [];

  // Process Accounts
  if (apiResults.accounts && apiResults.accounts.length > 0) {
    log(`Processing ${apiResults.accounts.length} accounts...`, colors.yellow);

    for (const rawAccount of apiResults.accounts) {
      try {
        // Bronze
        const bronze = etlService.ingestQuickBooksAccountToBronze(
          rawAccount,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );
        bronzeCount++;

        // Silver
        const silver = etlService.transformQuickBooksAccountToSilver(bronze);
        silverCount++;

        if (silver.metadata.quality_issues.length > 0) {
          qualityIssues.push(
            ...silver.metadata.quality_issues.map(
              (issue) => `Account ${rawAccount.Name}: ${issue}`,
            ),
          );
        }

        // Gold
        const gold = etlService.transformSilverAccountToGold(silver, TEST_ORG_KEY);
        goldCount++;
      } catch (error) {
        logError(`Failed to process account ${rawAccount.Id}: ${error}`);
      }
    }

    logSuccess(`Accounts: ${bronzeCount} bronze → ${silverCount} silver → ${goldCount} gold`);
  }

  // Process Customers
  if (apiResults.customers && apiResults.customers.length > 0) {
    log(
      `Processing ${apiResults.customers.length} customers...`,
      colors.yellow,
    );

    let customerBronze = 0,
      customerSilver = 0,
      customerGold = 0;

    for (const rawCustomer of apiResults.customers) {
      try {
        const bronze = etlService.ingestQuickBooksCustomerToBronze(
          rawCustomer,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );
        customerBronze++;

        const silver = etlService.transformQuickBooksCustomerToSilver(bronze);
        customerSilver++;

        if (silver.metadata.quality_issues.length > 0) {
          qualityIssues.push(
            ...silver.metadata.quality_issues.map(
              (issue) => `Customer ${rawCustomer.DisplayName}: ${issue}`,
            ),
          );
        }

        const gold = etlService.transformSilverContactToGold(silver, TEST_ORG_KEY);
        customerGold++;
      } catch (error) {
        logError(`Failed to process customer ${rawCustomer.Id}: ${error}`);
      }
    }

    logSuccess(
      `Customers: ${customerBronze} bronze → ${customerSilver} silver → ${customerGold} gold`,
    );
  }

  // Process Invoices
  if (apiResults.invoices && apiResults.invoices.length > 0) {
    log(`Processing ${apiResults.invoices.length} invoices...`, colors.yellow);

    let invoiceTxns = 0;

    for (const rawInvoice of apiResults.invoices) {
      try {
        const bronze = etlService.ingestQuickBooksInvoiceToBronze(
          rawInvoice,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );

        const silverTxns = etlService.transformQuickBooksInvoiceToSilver(bronze);
        invoiceTxns += silverTxns.length;

        silverTxns.forEach((txn) => {
          if (txn.metadata.quality_issues.length > 0) {
            qualityIssues.push(
              ...txn.metadata.quality_issues.map(
                (issue) => `Invoice ${rawInvoice.DocNumber}: ${issue}`,
              ),
            );
          }
        });
      } catch (error) {
        logError(`Failed to process invoice ${rawInvoice.Id}: ${error}`);
      }
    }

    logSuccess(
      `Invoices: ${apiResults.invoices.length} invoices → ${invoiceTxns} transactions`,
    );
  }

  // Process Journal Entries
  if (apiResults.journalEntries && apiResults.journalEntries.length > 0) {
    log(
      `Processing ${apiResults.journalEntries.length} journal entries...`,
      colors.yellow,
    );

    let jeTxns = 0;

    for (const rawJE of apiResults.journalEntries) {
      try {
        const bronze = etlService.ingestQuickBooksJournalEntryToBronze(
          rawJE,
          TEST_ORG_ID,
          TEST_DATASOURCE_ID,
        );

        const silverTxns =
          etlService.transformQuickBooksJournalEntryToSilver(bronze);
        jeTxns += silverTxns.length;

        silverTxns.forEach((txn) => {
          if (txn.metadata.quality_issues.length > 0) {
            qualityIssues.push(
              ...txn.metadata.quality_issues.map(
                (issue) => `JE ${rawJE.DocNumber || rawJE.Id}: ${issue}`,
              ),
            );
          }
        });
      } catch (error) {
        logError(`Failed to process journal entry ${rawJE.Id}: ${error}`);
      }
    }

    logSuccess(
      `Journal Entries: ${apiResults.journalEntries.length} entries → ${jeTxns} transactions`,
    );
  }

  // Report quality issues
  if (qualityIssues.length > 0) {
    logSection("Data Quality Issues Found");
    logWarning(`Found ${qualityIssues.length} quality issues:`);
    qualityIssues.slice(0, 10).forEach((issue) => {
      console.log(`   - ${issue}`);
    });
    if (qualityIssues.length > 10) {
      console.log(`   ... and ${qualityIssues.length - 10} more`);
    }
  } else {
    logSuccess("No data quality issues found!");
  }

  return true;
}

async function main() {
  console.log("\n" + "█".repeat(60));
  log(" QuickBooks Sandbox Integration Test", colors.bright + colors.cyan);
  console.log("█".repeat(60));

  const args = process.argv.slice(2);
  const testApi = args.includes("--test-api");
  const exchangeCode = args.find((a) => a.startsWith("--code="));
  const realmIdArg = args.find((a) => a.startsWith("--realm="));

  // Check configuration
  logSection("Configuration Check");

  if (config.clientId) {
    logSuccess(
      `Client ID: ${config.clientId.substring(0, 10)}...${config.clientId.slice(-4)}`,
    );
  } else {
    logError("Client ID not set (QUICKBOOKS_CLIENT_ID)");
  }

  if (config.clientSecret) {
    logSuccess(`Client Secret: ****${config.clientSecret.slice(-4)}`);
  } else {
    logError("Client Secret not set (QUICKBOOKS_CLIENT_SECRET)");
  }

  log(`Redirect URI: ${config.redirectUri}`, colors.reset);

  if (config.accessToken) {
    logSuccess(
      `Access Token: ${config.accessToken.substring(0, 10)}...`,
    );
  }

  if (config.realmId) {
    logSuccess(`Realm ID: ${config.realmId}`);
  }

  // Test OAuth flow
  await testOAuthFlow();

  // If code provided, exchange for tokens
  if (exchangeCode && realmIdArg) {
    const code = exchangeCode.split("=")[1];
    const realmId = realmIdArg.split("=")[1];
    await testTokenExchange(code, realmId);
  }

  // Test API calls if requested and token available
  if (testApi || config.accessToken) {
    const apiResults = await testApiCalls();

    if (apiResults) {
      await testEtlPipeline(apiResults);
    }
  }

  // Summary
  logSection("Summary");
  console.log("\n📋 Next Steps:");

  if (!config.accessToken) {
    console.log("   1. Visit the OAuth URL above to authorize");
    console.log("   2. Copy the code and realmId from the callback URL");
    console.log("   3. Run this script with:");
    console.log(
      "      npx ts-node scripts/test-quickbooks-sandbox.ts --code=YOUR_CODE --realm=YOUR_REALM_ID",
    );
    console.log("   4. Or set QUICKBOOKS_ACCESS_TOKEN and QUICKBOOKS_REALM_ID");
    console.log("      and run with --test-api flag");
  } else {
    logSuccess("Integration test completed successfully!");
  }

  console.log("\n");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
