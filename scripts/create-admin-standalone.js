#!/usr/bin/env node
/**
 * Standalone script to create admin user
 * Uses direct Keycloak API and PostgreSQL connection
 */

const https = require('https');
const { execSync } = require('child_process');

const email = 'tony@plainledger.ca';
const password = 'S00leils!!!!';
const displayName = 'Tony Admin';
const realm = 'plainledger';
const keycloakUrl = process.env.KEYCLOAK_URL || 'https://auth.plainledger.ca';

// Get secrets from AWS
function getSecret(secretId, returnFullObject = false) {
  try {
    const result = execSync(
      `aws secretsmanager get-secret-value --secret-id ${secretId} --region ca-central-1 --query SecretString --output text`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    try {
      const parsed = JSON.parse(result);
      if (returnFullObject) {
        return parsed;
      }
      return parsed.secret || parsed.client_secret || parsed.password || parsed;
    } catch {
      // If not JSON, return as-is
      return result.trim();
    }
  } catch (error) {
    console.error(`Failed to get secret ${secretId}:`, error.message);
    return null;
  }
}

// Get Keycloak admin token
async function getKeycloakAdminToken() {
  const clientSecret = getSecret('plainledger/prod/keycloak-client');
  if (!clientSecret) {
    throw new Error('Failed to get Keycloak client secret');
  }

  return new Promise((resolve, reject) => {
    const data = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'plainledger-api',
      client_secret: clientSecret,
    });

    const options = {
      hostname: new URL(keycloakUrl).hostname,
      port: 443,
      path: `/realms/${realm}/protocol/openid-connect/token`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.toString().length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const token = JSON.parse(body).access_token;
          resolve(token);
        } else {
          reject(new Error(`Failed to get token: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data.toString());
    req.end();
  });
}

// Find user by email
async function findUserByEmail(token, email) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(keycloakUrl).hostname,
      port: 443,
      path: `/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const users = JSON.parse(body);
          resolve(users.length > 0 ? users[0] : null);
        } else {
          reject(new Error(`Failed to find user: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Create user in Keycloak
async function createKeycloakUser(token, email, password, firstName, lastName) {
  return new Promise((resolve, reject) => {
    const userData = {
      email,
      username: email,
      firstName,
      lastName,
      enabled: true,
      emailVerified: true,
      credentials: [{
        type: 'password',
        value: password,
        temporary: false,
      }],
    };

    const data = JSON.stringify(userData);
    const options = {
      hostname: new URL(keycloakUrl).hostname,
      port: 443,
      path: `/admin/realms/${realm}/users`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 201) {
          // Get user ID from Location header
          const location = res.headers.location;
          const userId = location.split('/').pop();
          resolve({ id: userId, email });
        } else if (res.statusCode === 409) {
          // User already exists
          resolve(null);
        } else {
          reject(new Error(`Failed to create user: ${res.statusCode} ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Reset password
async function resetPassword(token, userId, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      type: 'password',
      value: password,
      temporary: false,
    });

    const options = {
      hostname: new URL(keycloakUrl).hostname,
      port: 443,
      path: `/admin/realms/${realm}/users/${userId}/reset-password`,
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        if (res.statusCode === 204) {
          resolve();
        } else {
          reject(new Error(`Failed to reset password: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Execute SQL
function executeSQL(sql) {
  const creds = getSecret('plainledger/prod/db-credentials', true);
  if (!creds) {
    throw new Error('Failed to get database credentials');
  }

  const dbHost = creds.host;
  const dbPort = creds.port || 5432;
  const dbName = creds.dbname || 'plainledger';
  const dbUser = creds.username;
  const dbPassword = creds.password;

  if (!dbHost || !dbUser || !dbPassword) {
    console.error('Database credentials:', JSON.stringify(creds, null, 2));
    throw new Error(`Missing database credentials. Got keys: ${Object.keys(creds).join(', ')}`);
  }

  const env = {
    ...process.env,
    PGPASSWORD: dbPassword,
  };

  try {
    const result = execSync(
      `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${sql}"`,
      { encoding: 'utf-8', stdio: 'pipe', env }
    );
    return result;
  } catch (error) {
    console.error('SQL Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log(`\n🔧 Creating admin user: ${email}\n`);

  try {
    // Step 1: Get Keycloak admin token
    console.log('1. Getting Keycloak admin token...');
    const token = await getKeycloakAdminToken();
    console.log('   ✓ Token obtained\n');

    // Step 2: Check if user exists
    console.log('2. Checking if user exists in Keycloak...');
    let user = await findUserByEmail(token, email);
    
    if (user) {
      console.log(`   ✓ User exists: ${user.id}`);
      console.log('   Updating password...');
      try {
        await resetPassword(token, user.id, password);
        console.log('   ✓ Password updated\n');
      } catch (error) {
        console.log(`   ⚠ Password update failed (may already be set): ${error.message}\n`);
      }
    } else {
      console.log('   User not found, creating...');
      const firstName = displayName.split(' ')[0] || 'Tony';
      const lastName = displayName.split(' ').slice(1).join(' ') || 'Admin';
      
      user = await createKeycloakUser(token, email, password, firstName, lastName);
      if (!user) {
        // User was created but we need to get the ID
        user = await findUserByEmail(token, email);
      }
      console.log(`   ✓ User created: ${user.id}\n`);
    }

    const keycloakId = user.id;

    // Step 3: Create super-admin group if it doesn't exist
    console.log('3. Ensuring super-admin group exists...');
    executeSQL(`
      INSERT INTO platform.groups (id, name, description, tier_level, is_system, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'super-admin',
        'Super Administrator with all permissions',
        10,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('   ✓ Super-admin group ready\n');

    // Step 4: Create admin user in database
    console.log('4. Creating admin user in database...');
    executeSQL(`
      INSERT INTO platform.admin_users (id, keycloak_id, email, display_name, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        '${keycloakId}',
        '${email}',
        '${displayName}',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (keycloak_id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        is_active = true,
        updated_at = NOW();
    `);
    console.log('   ✓ Admin user created/updated\n');

    // Step 5: Assign user to super-admin group
    console.log('5. Assigning user to super-admin group...');
    executeSQL(`
      INSERT INTO platform.user_groups (user_id, group_id)
      SELECT 
        au.id,
        g.id
      FROM platform.admin_users au
      CROSS JOIN platform.groups g
      WHERE au.keycloak_id = '${keycloakId}'
        AND g.name = 'super-admin'
      ON CONFLICT DO NOTHING;
    `);
    console.log('   ✓ User assigned to super-admin group\n');

    console.log('✅ Admin user setup complete!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Keycloak ID: ${keycloakId}\n`);

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
