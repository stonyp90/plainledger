/**
 * Manual QuickBooks Sync Script
 * 
 * Exchanges OAuth code for tokens, pulls data from QuickBooks, and writes to AWS S3
 * 
 * Usage: 
 *   npx ts-node scripts/manual-quickbooks-sync.ts <code> <realmId>
 */

import 'dotenv/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID!;
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET!;
const SANDBOX_API_URL = 'https://sandbox-quickbooks.api.intuit.com/v3/company';

// AWS Configuration
const s3Client = new S3Client({
  region: 'ca-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const BRONZE_BUCKET = 'plainledger-prod-bronze-436136277668';
const GOLD_BUCKET = 'plainledger-prod-gold-436136277668';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}

async function exchangeCodeForTokens(code: string, realmId: string): Promise<TokenResponse> {
  const auth = Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64');
  
  // Note: For local testing, the redirect URI must match what was used in the OAuth request
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/api/v1/datasources/oauth/quickbooks/callback';
  
  console.log('Exchanging code for tokens...');
  console.log('  Redirect URI:', redirectUri);
  
  const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function queryQuickBooks(accessToken: string, realmId: string, query: string): Promise<any> {
  const url = `${SANDBOX_API_URL}/${realmId}/query?query=${encodeURIComponent(query)}`;
  
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

async function getCompanyInfo(accessToken: string, realmId: string): Promise<any> {
  const url = `${SANDBOX_API_URL}/${realmId}/companyinfo/${realmId}`;
  
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

async function writeToS3(bucket: string, key: string, data: any): Promise<void> {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: 'application/json',
  }));
  console.log(`  ✅ Written to s3://${bucket}/${key}`);
}

async function main() {
  const code = process.argv[2];
  const realmId = process.argv[3];

  if (!code || !realmId) {
    console.log('Usage: npx ts-node scripts/manual-quickbooks-sync.ts <code> <realmId>');
    console.log('');
    console.log('Example:');
    console.log('  npx ts-node scripts/manual-quickbooks-sync.ts XAB11769... 9341456072863003');
    process.exit(1);
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Manual QuickBooks Sync to AWS S3                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Exchange code for tokens
    console.log('📝 Step 1: Exchanging authorization code for tokens...');
    const tokens = await exchangeCodeForTokens(code, realmId);
    console.log('  ✅ Access token obtained!\n');

    // Step 2: Fetch company info
    console.log('🏢 Step 2: Fetching company info...');
    const companyInfo = await getCompanyInfo(tokens.access_token, realmId);
    console.log(`  Company: ${companyInfo.CompanyInfo.CompanyName}`);
    console.log(`  Country: ${companyInfo.CompanyInfo.Country}\n`);

    // Step 3: Fetch data from QuickBooks
    console.log('📊 Step 3: Fetching data from QuickBooks...');
    
    const [accounts, customers, vendors, invoices] = await Promise.all([
      queryQuickBooks(tokens.access_token, realmId, 'SELECT * FROM Account MAXRESULTS 1000'),
      queryQuickBooks(tokens.access_token, realmId, 'SELECT * FROM Customer MAXRESULTS 1000'),
      queryQuickBooks(tokens.access_token, realmId, 'SELECT * FROM Vendor MAXRESULTS 1000'),
      queryQuickBooks(tokens.access_token, realmId, "SELECT * FROM Invoice WHERE TxnDate >= '2020-01-01' MAXRESULTS 1000"),
    ]);

    const accountList = accounts.QueryResponse?.Account || [];
    const customerList = customers.QueryResponse?.Customer || [];
    const vendorList = vendors.QueryResponse?.Vendor || [];
    const invoiceList = invoices.QueryResponse?.Invoice || [];

    console.log(`  Accounts: ${accountList.length}`);
    console.log(`  Customers: ${customerList.length}`);
    console.log(`  Vendors: ${vendorList.length}`);
    console.log(`  Invoices: ${invoiceList.length}\n`);

    // Step 4: Write to Bronze layer (raw data)
    console.log('📦 Step 4: Writing to S3 Bronze layer (raw data)...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orgId = `qb-sandbox-${realmId}`;

    await writeToS3(BRONZE_BUCKET, `quickbooks/${orgId}/accounts/${timestamp}.json`, accountList);
    await writeToS3(BRONZE_BUCKET, `quickbooks/${orgId}/customers/${timestamp}.json`, customerList);
    await writeToS3(BRONZE_BUCKET, `quickbooks/${orgId}/vendors/${timestamp}.json`, vendorList);
    await writeToS3(BRONZE_BUCKET, `quickbooks/${orgId}/invoices/${timestamp}.json`, invoiceList);
    console.log('');

    // Step 5: Transform and write to Gold layer
    console.log('🏆 Step 5: Transforming and writing to S3 Gold layer...');
    
    // Transform accounts to dim_account format
    const dimAccounts = accountList.map((acc: any) => ({
      account_key: `gold_qb_acc_${acc.Id}`,
      account_id: acc.Id,
      source_account_id: acc.Id,
      organization_key: orgId,
      account_code: acc.AcctNum || acc.Id,
      account_name: acc.Name,
      account_type: acc.Classification,
      account_subtype: acc.AccountSubType,
      is_active: acc.Active,
      hierarchy_level: acc.FullyQualifiedName?.split(':').length || 1,
      hierarchy_path: acc.FullyQualifiedName?.replace(/:/g, '/') || acc.Name,
      is_debit_normal: ['Asset', 'Expense'].includes(acc.Classification),
      balance_sheet_section: ['Asset', 'Liability', 'Equity'].includes(acc.Classification) ? acc.Classification : null,
      income_statement_section: ['Revenue', 'Expense'].includes(acc.Classification) ? acc.Classification : null,
    }));

    // Transform customers/vendors to dim_contact format
    const dimContacts = [
      ...customerList.map((cust: any) => ({
        contact_key: `gold_qb_cust_${cust.Id}`,
        contact_id: cust.Id,
        source_contact_id: cust.Id,
        organization_key: orgId,
        contact_type: 'CUSTOMER',
        display_name: cust.DisplayName,
        company_name: cust.CompanyName || cust.DisplayName,
        email: cust.PrimaryEmailAddr?.Address || '',
        is_customer: true,
        is_vendor: false,
        is_active: cust.Active,
      })),
      ...vendorList.map((vend: any) => ({
        contact_key: `gold_qb_vend_${vend.Id}`,
        contact_id: vend.Id,
        source_contact_id: vend.Id,
        organization_key: orgId,
        contact_type: 'VENDOR',
        display_name: vend.DisplayName,
        company_name: vend.CompanyName || vend.DisplayName,
        email: vend.PrimaryEmailAddr?.Address || '',
        is_customer: false,
        is_vendor: true,
        is_active: vend.Active,
      })),
    ];

    // Transform invoices to fact_transaction format
    const factTransactions = invoiceList.flatMap((inv: any) => {
      const txns: any[] = [];
      const txnDate = inv.TxnDate;
      
      // A/R entry (debit)
      txns.push({
        transaction_key: `gold_qb_inv_${inv.Id}_ar`,
        transaction_id: inv.Id,
        organization_key: orgId,
        account_key: 'accounts_receivable',
        date_key: parseInt(txnDate.replace(/-/g, '')),
        contact_key: inv.CustomerRef?.value ? `gold_qb_cust_${inv.CustomerRef.value}` : null,
        transaction_type_key: 'invoice',
        transaction_date: txnDate,
        posting_date: txnDate,
        debit_amount: inv.TotalAmt || 0,
        credit_amount: 0,
        amount: inv.TotalAmt || 0,
        currency_code: inv.CurrencyRef?.value || 'USD',
        exchange_rate: inv.ExchangeRate || 1,
        amount_cad: (inv.TotalAmt || 0) * (inv.ExchangeRate || 1),
        reference_number: inv.DocNumber || '',
        memo: inv.PrivateNote || '',
        source_system: 'QUICKBOOKS',
        source_transaction_id: inv.Id,
      });

      return txns;
    });

    await writeToS3(GOLD_BUCKET, `dim_account/${orgId}/${timestamp}.json`, dimAccounts);
    await writeToS3(GOLD_BUCKET, `dim_contact/${orgId}/${timestamp}.json`, dimContacts);
    await writeToS3(GOLD_BUCKET, `fact_transaction/${orgId}/${timestamp}.json`, factTransactions);
    console.log('');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ Sync Complete!                                         ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Company: ${companyInfo.CompanyInfo.CompanyName.padEnd(42)}║`);
    console.log(`║  Realm ID: ${realmId.padEnd(41)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Bronze Layer:                                             ║`);
    console.log(`║    - Accounts: ${String(accountList.length).padEnd(37)}║`);
    console.log(`║    - Customers: ${String(customerList.length).padEnd(36)}║`);
    console.log(`║    - Vendors: ${String(vendorList.length).padEnd(38)}║`);
    console.log(`║    - Invoices: ${String(invoiceList.length).padEnd(37)}║`);
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Gold Layer:                                               ║`);
    console.log(`║    - dim_account: ${String(dimAccounts.length).padEnd(34)}║`);
    console.log(`║    - dim_contact: ${String(dimContacts.length).padEnd(34)}║`);
    console.log(`║    - fact_transaction: ${String(factTransactions.length).padEnd(29)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Save refresh token for future use
    console.log('\n📝 Refresh token (save for future syncs):');
    console.log(tokens.refresh_token);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
