#!/usr/bin/env node
/**
 * Update Keycloak Client Configuration
 * Enables Direct Access Grants on plainledger-web client
 */

const KcAdminClient = require('@keycloak/keycloak-admin-client').default;
const https = require('https');

// Allow self-signed certificates for Keycloak
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'https://auth.plainledger.ca';
const REALM = process.env.KEYCLOAK_REALM || 'plainledger';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'plainledger-api';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
const ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD;

async function updateClient() {
  const adminClient = new KcAdminClient({
    baseUrl: KEYCLOAK_URL,
    realmName: 'master', // Authenticate to master realm
  });

  try {
    console.log('🔐 Authenticating to Keycloak...');
    
    // Try admin credentials first
    if (ADMIN_PASSWORD) {
      await adminClient.auth({
        username: ADMIN_USER,
        password: ADMIN_PASSWORD,
        grantType: 'password',
        clientId: 'admin-cli',
      });
    } else if (CLIENT_SECRET) {
      // Fallback to client credentials
      await adminClient.auth({
        grantType: 'client_credentials',
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
      });
    } else {
      throw new Error('Either KEYCLOAK_ADMIN_PASSWORD or KEYCLOAK_CLIENT_SECRET must be set');
    }

    console.log('✅ Authenticated successfully');

    // Switch to plainledger realm
    adminClient.setConfig({ realmName: REALM });

    console.log(`📋 Fetching plainledger-web client configuration...`);
    const clients = await adminClient.clients.find({
      clientId: 'plainledger-web',
    });

    if (!clients || clients.length === 0) {
      throw new Error('Client "plainledger-web" not found');
    }

    const client = clients[0];
    console.log(`✅ Found client with ID: ${client.id}`);

    const currentStatus = client.directAccessGrantsEnabled;
    console.log(`📊 Current Direct Access Grants status: ${currentStatus}`);

    if (currentStatus === true) {
      console.log('✅ Direct Access Grants is already enabled');
      return;
    }

    console.log('🔧 Enabling Direct Access Grants...');
    await adminClient.clients.update(
      { id: client.id },
      {
        ...client,
        directAccessGrantsEnabled: true,
      }
    );

    console.log('✅ Successfully enabled Direct Access Grants on plainledger-web client');
    console.log('🎉 Configuration updated!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data || error.response.statusText);
    }
    process.exit(1);
  }
}

updateClient();
