/**
 * QuickBooks OAuth Token Helper
 * 
 * This script helps you get a refresh token by:
 * 1. Generating the OAuth authorization URL
 * 2. Starting a temporary server to capture the callback
 * 3. Exchanging the code for tokens
 * 
 * Run: npx tsx scripts/providers/quickbooks/get-token.ts
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

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

const QUICKBOOKS_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QUICKBOOKS_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
// Use a dedicated port for the OAuth callback
const PORT = 9999;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const CALLBACK_PATH = '/callback';

if (!QUICKBOOKS_CLIENT_ID || !QUICKBOOKS_CLIENT_SECRET) {
  console.error('❌ Missing QUICKBOOKS_CLIENT_ID or QUICKBOOKS_CLIENT_SECRET in .env');
  process.exit(1);
}

// Generate authorization URL
function getAuthUrl(): string {
  const scopes = ['com.intuit.quickbooks.accounting', 'openid', 'profile', 'email'];
  const state = Math.random().toString(36).substring(7);
  
  const params = new URLSearchParams({
    client_id: QUICKBOOKS_CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    state,
  });

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

// Exchange code for tokens
async function exchangeCodeForTokens(code: string, realmId: string): Promise<any> {
  const auth = Buffer.from(`${QUICKBOOKS_CLIENT_ID}:${QUICKBOOKS_CLIENT_SECRET}`).toString('base64');

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
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// Start temporary server
function startServer(): Promise<{ code: string; realmId: string }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req: any, res: any) => {
      const url = new URL(req.url!, `http://localhost:${PORT}`);
      
      if (url.pathname === CALLBACK_PATH) {
        const code = url.searchParams.get('code');
        const realmId = url.searchParams.get('realmId');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error: ${error}</h1><p>${url.searchParams.get('error_description')}</p>`);
          server.close();
          reject(new Error(error));
          return;
        }

        if (code && realmId) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1>✅ Authorization Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <p style="color: #666;">Realm ID: ${realmId}</p>
              </body>
            </html>
          `);
          server.close();
          resolve({ code, realmId });
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Missing code or realmId</h1>');
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(PORT, () => {
      console.log(`\n🌐 Callback server listening on port ${PORT}`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout waiting for OAuth callback'));
    }, 5 * 60 * 1000);
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  QuickBooks OAuth Token Helper                               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  const authUrl = getAuthUrl();

  console.log('\n📋 Step 1: Open this URL in your browser:\n');
  console.log('─'.repeat(70));
  console.log(authUrl);
  console.log('─'.repeat(70));
  
  console.log('\n📋 Step 2: Log in to Intuit and authorize the app');
  console.log('📋 Step 3: Select your sandbox company (9341456246487117)');
  console.log('\n⏳ Waiting for authorization callback...');

  try {
    const { code, realmId } = await startServer();
    
    console.log(`\n✅ Received authorization code for realm ${realmId}`);
    console.log('🔄 Exchanging code for tokens...');

    const tokens = await exchangeCodeForTokens(code, realmId);

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  🎉 SUCCESS! Here are your tokens:                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    console.log('\n📝 REFRESH TOKEN (save this - needed for the seeder):');
    console.log('─'.repeat(70));
    console.log(tokens.refresh_token);
    console.log('─'.repeat(70));

    console.log(`\n📝 ACCESS TOKEN (expires in ${tokens.expires_in} seconds):`);
    console.log('─'.repeat(70));
    console.log(tokens.access_token.substring(0, 50) + '...');
    console.log('─'.repeat(70));

    console.log(`\n📝 REALM ID: ${realmId}`);

    console.log('\n✅ To run the seeder, use:');
    console.log(`\nQUICKBOOKS_REFRESH_TOKEN="${tokens.refresh_token}" npx ts-node scripts/seed-quickbooks-sandbox.ts`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
