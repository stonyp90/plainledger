#!/usr/bin/env npx tsx
/**
 * Store QuickBooks Token in AWS Secrets Manager
 * 
 * This script stores the QuickBooks refresh token in AWS Secrets Manager
 * so the ETL pipeline can automatically fetch and refresh it.
 * 
 * Usage:
 *   npx tsx scripts/store-quickbooks-token.ts --refresh-token "RT1-xxx" --realm-id "9341456072863003"
 * 
 * Or interactively:
 *   npx tsx scripts/store-quickbooks-token.ts
 */

import { 
  SecretsManagerClient, 
  GetSecretValueCommand, 
  PutSecretValueCommand 
} from "@aws-sdk/client-secrets-manager";
import * as readline from 'readline';

const SECRET_NAME = process.env.QUICKBOOKS_SECRET_NAME || "plainledger/prod/quickbooks";
const REGION = process.env.AWS_REGION || "ca-central-1";

const secretsClient = new SecretsManagerClient({ region: REGION });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Store QuickBooks Token in AWS Secrets Manager           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Parse command line args
  const args = process.argv.slice(2);
  let refreshToken = '';
  let realmId = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--refresh-token' && args[i + 1]) {
      refreshToken = args[i + 1];
    }
    if (args[i] === '--realm-id' && args[i + 1]) {
      realmId = args[i + 1];
    }
  }

  // Interactive mode if args not provided
  if (!refreshToken) {
    console.log('Get your refresh token from: https://developer.intuit.com/app/developer/playground\n');
    refreshToken = await question('Enter Refresh Token: ');
  }

  if (!realmId) {
    realmId = await question('Enter Realm ID (default: 9341456072863003): ');
    if (!realmId) {
      realmId = '9341456072863003'; // US Sandbox default
    }
  }

  if (!refreshToken) {
    console.error('❌ Error: Refresh token is required');
    process.exit(1);
  }

  try {
    // Get existing secret
    console.log(`\nFetching existing secret: ${SECRET_NAME}...`);
    const getResponse = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: SECRET_NAME })
    );
    
    const secretData = JSON.parse(getResponse.SecretString || '{}');
    console.log(`✓ Found existing secret with client_id: ${secretData.client_id?.substring(0, 10)}...`);

    // Update with new token
    secretData.refresh_token = refreshToken;
    secretData.realm_id = realmId;
    secretData.last_updated = new Date().toISOString();
    secretData.environment = 'sandbox';

    // Store updated secret
    console.log('Storing updated secret...');
    await secretsClient.send(
      new PutSecretValueCommand({
        SecretId: SECRET_NAME,
        SecretString: JSON.stringify(secretData),
      })
    );

    console.log('\n✅ Successfully stored QuickBooks tokens in Secrets Manager!\n');
    console.log('Secret details:');
    console.log(`  - Secret Name: ${SECRET_NAME}`);
    console.log(`  - Realm ID: ${realmId}`);
    console.log(`  - Refresh Token: ${refreshToken.substring(0, 20)}...`);
    console.log(`  - Last Updated: ${secretData.last_updated}`);

    console.log('\nNext steps:');
    console.log('  1. The ETL pipeline will now automatically fetch tokens from Secrets Manager');
    console.log('  2. Tokens will be refreshed automatically and saved back');
    console.log('  3. Trigger the pipeline: gh workflow run etl-pipeline.yml -f environment=sandbox\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
