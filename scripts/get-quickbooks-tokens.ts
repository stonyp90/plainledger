/**
 * QuickBooks OAuth Token Helper
 * 
 * This script helps you get QuickBooks refresh token and realm ID
 * by opening the OAuth Playground and guiding you through the flow.
 * 
 * Usage:
 *   npx tsx scripts/get-quickbooks-tokens.ts
 */

import * as readline from 'readline';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const CLIENT_ID = 'ABfRcpxnLneahacnWuQr29sTeIIZuBdMlXqaUYWT1UkyNFT6to';
const CLIENT_SECRET = 'DWyhuILmup8OWkeMRUoOhfZ44QYQdGKiNlmPS45z';
const OAUTH_PLAYGROUND_URL = 'https://developer.intuit.com/app/developer/playground';

interface QuickBooksTokens {
  refreshToken: string;
  realmId: string;
  accessToken?: string;
  expiresIn?: number;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   QuickBooks OAuth Token Helper                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('This script will help you get QuickBooks tokens for sandbox testing.\n');

  // Step 1: Open OAuth Playground
  console.log('Step 1: Opening OAuth Playground...');
  console.log(`URL: ${OAUTH_PLAYGROUND_URL}\n`);
  
  try {
    execSync(`open "${OAUTH_PLAYGROUND_URL}"`, { stdio: 'ignore' });
    console.log('✓ Browser opened. Please complete the OAuth flow:\n');
  } catch (error) {
    console.log('⚠ Could not open browser automatically.');
    console.log(`Please manually open: ${OAUTH_PLAYGROUND_URL}\n`);
  }

  console.log('Instructions:');
  console.log('1. Select your workspace (first dropdown)');
  console.log('2. Select your app (second dropdown)');
  console.log('3. Select scopes: com.intuit.quickbooks.accounting');
  console.log('4. Click "Get authorization code"');
  console.log('5. Authorize with your sandbox company');
  console.log('6. Click "Get tokens"');
  console.log('7. Copy the values shown below\n');

  // Step 2: Get tokens from user
  const realmId = await question('Enter Realm ID (Company ID): ');
  const refreshToken = await question('Enter Refresh Token: ');

  if (!realmId || !refreshToken) {
    console.error('\n❌ Error: Both Realm ID and Refresh Token are required.');
    process.exit(1);
  }

  // Step 3: Exchange refresh token for access token
  console.log('\nStep 2: Exchanging refresh token for access token...');
  
  try {
    const tokenResponse = await fetch('https://sandbox-quickbooks.api.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    
    const tokens: QuickBooksTokens = {
      refreshToken,
      realmId,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    };

    console.log('✓ Access token obtained successfully!\n');

    // Step 4: Save to .env.local
    console.log('Step 3: Saving tokens to .env.local...');
    
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Remove existing QuickBooks vars
    envContent = envContent
      .split('\n')
      .filter(line => !line.startsWith('QUICKBOOKS_REFRESH_TOKEN=') && 
                      !line.startsWith('QUICKBOOKS_REALM_ID=') &&
                      !line.startsWith('QUICKBOOKS_ACCESS_TOKEN='))
      .join('\n');

    // Add new tokens
    envContent += `\n# QuickBooks Sandbox Credentials\n`;
    envContent += `QUICKBOOKS_REFRESH_TOKEN=${refreshToken}\n`;
    envContent += `QUICKBOOKS_REALM_ID=${realmId}\n`;
    envContent += `QUICKBOOKS_ACCESS_TOKEN=${tokenData.access_token}\n`;
    envContent += `QUICKBOOKS_CLIENT_ID=${CLIENT_ID}\n`;
    envContent += `QUICKBOOKS_CLIENT_SECRET=${CLIENT_SECRET}\n`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✓ Tokens saved to ${envPath}\n`);

    // Step 5: Test connection
    console.log('Step 4: Testing QuickBooks connection...');
    
    const testResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM CompanyInfo MAXRESULTS 1`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (testResponse.ok) {
      const companyData = await testResponse.json();
      console.log('✓ Connection successful!');
      console.log(`  Company: ${companyData.QueryResponse?.CompanyInfo?.[0]?.CompanyName || 'Unknown'}\n`);
    } else {
      console.log('⚠ Connection test failed, but tokens are saved.');
      console.log('  You may need to refresh the access token.\n');
    }

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   ✓ Setup Complete!                                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log('Next steps:');
    console.log('1. Run: npx tsx scripts/sync-quickbooks-to-gold.ts');
    console.log('2. Start your local dev environment');
    console.log('3. Test the full flow with real QuickBooks data\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    console.log('\nTokens were saved, but you may need to refresh manually.');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
