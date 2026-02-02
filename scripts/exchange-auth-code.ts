/**
 * Exchange QuickBooks Authorization Code for Refresh Token
 */

const clientId = process.env.QUICKBOOKS_CLIENT_ID || "ABfRcpxnLneahacnWuQr29sTeIIZuBdMlXqaUYWT1UkyNFT6to";
const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "DWyhuILmup8OWkeMRUoOhfZ44QYQdGKiNlmPS45z";
const authCode = process.env.QUICKBOOKS_AUTH_CODE || "XAB117699907562dmAHKzfQnuqkdCMySARHbtDwzfLicYlbS32";
const realmId = process.env.QUICKBOOKS_REALM_ID || "9341456072863003";

async function exchangeToken() {
  const response = await fetch('https://sandbox-quickbooks.api.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl'
    })
  });

  const data = await response.json();
  if (data.refresh_token) {
    console.log('✓ Tokens obtained successfully!\n');
    console.log('Refresh Token:', data.refresh_token);
    console.log('Access Token:', data.access_token?.substring(0, 30) + '...');
    console.log('Realm ID:', realmId);
    console.log('\nSaving to .env.local...');
    
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    envContent = envContent
      .split('\n')
      .filter(line => !line.startsWith('QUICKBOOKS_REFRESH_TOKEN=') && 
                      !line.startsWith('QUICKBOOKS_REALM_ID=') &&
                      !line.startsWith('QUICKBOOKS_ACCESS_TOKEN='))
      .join('\n');

    envContent += `\n# QuickBooks Sandbox Credentials\n`;
    envContent += `QUICKBOOKS_REFRESH_TOKEN=${data.refresh_token}\n`;
    envContent += `QUICKBOOKS_REALM_ID=${realmId}\n`;
    envContent += `QUICKBOOKS_ACCESS_TOKEN=${data.access_token}\n`;
    envContent += `QUICKBOOKS_CLIENT_ID=${clientId}\n`;
    envContent += `QUICKBOOKS_CLIENT_SECRET=${clientSecret}\n`;

    fs.writeFileSync(envPath, envContent);
    console.log(`✓ Saved to ${envPath}\n`);
    
    return { refreshToken: data.refresh_token, realmId, accessToken: data.access_token };
  } else {
    console.error('❌ Error:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
}

exchangeToken().catch(console.error);
