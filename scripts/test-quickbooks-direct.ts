/**
 * Direct QuickBooks Sandbox Test
 * 
 * Tests the QuickBooks API connection using OAuth tokens.
 * Run: npx ts-node scripts/test-quickbooks-direct.ts
 */

import 'dotenv/config';

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REALM_ID = '9341456246487117'; // Sandbox company ID

// QuickBooks Sandbox API
const SANDBOX_API_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const auth = Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

async function queryQuickBooks(accessToken: string, query: string): Promise<any> {
  const url = `${SANDBOX_API_URL}/${REALM_ID}/query?query=${encodeURIComponent(query)}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function getCompanyInfo(accessToken: string): Promise<any> {
  const url = `${SANDBOX_API_URL}/${REALM_ID}/companyinfo/${REALM_ID}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  // Check for refresh token from environment or command line
  const refreshToken = process.env.QUICKBOOKS_REFRESH_TOKEN || process.argv[2];
  
  if (!refreshToken) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  QuickBooks Sandbox Data Test                              ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  No refresh token provided!                                ║');
    console.log('║                                                            ║');
    console.log('║  To get a refresh token:                                   ║');
    console.log('║  1. Complete OAuth flow via PlainLedger UI                 ║');
    console.log('║  2. Or use: ./scripts/test-quickbooks-integration.sh oauth ║');
    console.log('║                                                            ║');
    console.log('║  Usage:                                                    ║');
    console.log('║  QUICKBOOKS_REFRESH_TOKEN=xxx npx ts-node this-script.ts   ║');
    console.log('║  or: npx ts-node this-script.ts YOUR_REFRESH_TOKEN         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    process.exit(1);
  }

  console.log('\n🔄 Refreshing access token...');
  
  try {
    const tokens = await refreshAccessToken(refreshToken);
    console.log('✅ Access token obtained!\n');

    // Get Company Info
    console.log('📊 Fetching company info...');
    const companyInfo = await getCompanyInfo(tokens.access_token);
    console.log(`   Company: ${companyInfo.CompanyInfo.CompanyName}`);
    console.log(`   Legal Name: ${companyInfo.CompanyInfo.LegalName}`);
    console.log(`   Country: ${companyInfo.CompanyInfo.Country}`);
    console.log('');

    // Query Accounts
    console.log('📒 Fetching Chart of Accounts...');
    const accounts = await queryQuickBooks(tokens.access_token, 'SELECT * FROM Account MAXRESULTS 100');
    const accountCount = accounts.QueryResponse?.Account?.length || 0;
    console.log(`   Found ${accountCount} accounts`);
    
    if (accountCount > 0) {
      console.log('   Sample accounts:');
      accounts.QueryResponse.Account.slice(0, 5).forEach((acc: any) => {
        console.log(`     - ${acc.Name} (${acc.AccountType})`);
      });
    }
    console.log('');

    // Query Customers
    console.log('👥 Fetching Customers...');
    const customers = await queryQuickBooks(tokens.access_token, 'SELECT * FROM Customer MAXRESULTS 100');
    const customerCount = customers.QueryResponse?.Customer?.length || 0;
    console.log(`   Found ${customerCount} customers`);
    
    if (customerCount > 0) {
      console.log('   Sample customers:');
      customers.QueryResponse.Customer.slice(0, 5).forEach((cust: any) => {
        console.log(`     - ${cust.DisplayName}`);
      });
    }
    console.log('');

    // Query Vendors
    console.log('🏢 Fetching Vendors...');
    const vendors = await queryQuickBooks(tokens.access_token, 'SELECT * FROM Vendor MAXRESULTS 100');
    const vendorCount = vendors.QueryResponse?.Vendor?.length || 0;
    console.log(`   Found ${vendorCount} vendors`);
    console.log('');

    // Query Invoices
    console.log('📄 Fetching Invoices...');
    const invoices = await queryQuickBooks(tokens.access_token, 'SELECT * FROM Invoice MAXRESULTS 100');
    const invoiceCount = invoices.QueryResponse?.Invoice?.length || 0;
    console.log(`   Found ${invoiceCount} invoices`);
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  QuickBooks Sandbox Summary                                ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Company: ${companyInfo.CompanyInfo.CompanyName.padEnd(42)}║`);
    console.log(`║  Accounts: ${String(accountCount).padEnd(41)}║`);
    console.log(`║  Customers: ${String(customerCount).padEnd(40)}║`);
    console.log(`║  Vendors: ${String(vendorCount).padEnd(42)}║`);
    console.log(`║  Invoices: ${String(invoiceCount).padEnd(41)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║  ✅ QuickBooks sandbox has data ready for sync!            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Output new refresh token for future use
    console.log('\n📝 New refresh token (save this for future use):');
    console.log(tokens.refresh_token);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
