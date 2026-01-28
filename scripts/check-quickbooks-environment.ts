/**
 * Check QuickBooks Environment Configuration
 * 
 * This script verifies what environment (sandbox/production) is configured
 * and shows which environment will be used for all users.
 * 
 * Run: npx ts-node scripts/check-quickbooks-environment.ts
 */

import 'dotenv/config';

function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  QuickBooks Environment Configuration Check                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check environment variable
  const environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox';
  const useSandbox = environment !== 'production';

  console.log('📋 Configuration:');
  console.log(`   QUICKBOOKS_ENVIRONMENT: ${environment || '(not set - defaults to sandbox)'}`);
  console.log(`   useSandbox: ${useSandbox}`);
  console.log(`   API Base URL: ${useSandbox ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com'}`);
  console.log('');

  // Check if credentials are set
  const clientId = process.env.QUICKBOOKS_CLIENT_ID;
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  
  console.log('🔑 Credentials:');
  console.log(`   QUICKBOOKS_CLIENT_ID: ${clientId ? '✅ Set' : '❌ Not set'}`);
  console.log(`   QUICKBOOKS_CLIENT_SECRET: ${clientSecret ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  // Important note
  console.log('⚠️  IMPORTANT:');
  console.log('   Currently, ALL users (existing and new) use the SAME environment.');
  console.log('   There is NO per-user or per-connection environment setting.');
  console.log('');
  
  if (useSandbox) {
    console.log('   ⚠️  ALL users will use SANDBOX data');
    console.log('   To use production data for all users, set:');
    console.log('   QUICKBOOKS_ENVIRONMENT=production');
  } else {
    console.log('   ✅ ALL users will use PRODUCTION data');
    console.log('   ⚠️  This affects ALL connections, including existing ones!');
  }
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Current Behavior Summary                                  ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Environment: ${environment.padEnd(45)}║`);
  console.log(`║  All Users Use: ${(useSandbox ? 'SANDBOX' : 'PRODUCTION').padEnd(42)}║`);
  console.log(`║  Existing Users: ${(useSandbox ? 'SANDBOX' : 'PRODUCTION').padEnd(41)}║`);
  console.log(`║  New Users: ${(useSandbox ? 'SANDBOX' : 'PRODUCTION').padEnd(45)}║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Show code locations
  console.log('📝 Code Locations:');
  console.log('   - DataSourceController: apps/api/src/infrastructure/http/controllers/datasource.controller.ts:117');
  console.log('   - OAuthCallbackController: apps/api/src/infrastructure/http/controllers/oauth-callback.controller.ts:47');
  console.log('   - QuickBooksService: apps/api/src/infrastructure/integrations/quickbooks/quickbooks.service.ts');
  console.log('');
}

main();
