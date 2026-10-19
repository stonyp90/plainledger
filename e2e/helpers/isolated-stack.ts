import assert from 'node:assert/strict';
import { Client } from 'pg';
import { type APIRequestContext } from '@playwright/test';
import identity from '../../fixtures/auth/isolated-e2e.json';

/** Refuse account creation or membership writes outside the disposable CI stack. */
export function assertIsolatedStack(baseURL: string | undefined) {
  assert.equal(process.env.CI, 'true', 'Account fixtures require the disposable CI stack');
  assert.equal(baseURL, 'http://localhost:5173');
  assert.equal(process.env.KEYCLOAK_URL, 'http://localhost:8080');
  assert.equal(process.env.KEYCLOAK_REALM, 'plainledger');
  assert.equal(process.env.KEYCLOAK_CLIENT_SECRET, identity.apiSecret);
  assert.equal(process.env.DATABASE_HOST, 'localhost');
  assert.equal(process.env.DATABASE_NAME, 'plainledger');
  assert.equal(process.env.DATABASE_USER, 'plainledger');
  assert.equal(process.env.DATABASE_PASSWORD, 'isolated-e2e-only');
  assert.equal(process.env.TEAM_INVITATIONS_EMAIL_ENABLED, 'false');
  assert.equal(process.env.E2E_USERNAME, identity.username);
  assert.equal(process.env.E2E_PASSWORD, identity.password);
}

export async function openIsolatedDatabase(baseURL: string | undefined) {
  assertIsolatedStack(baseURL);
  const client = new Client({
    host: process.env.DATABASE_HOST, port: 5432,
    user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME, ssl: false,
  });
  await client.connect();
  try {
    const marker = await client.query("SELECT version FROM platform.schema_bootstrap WHERE version='plainledger-initial-20261019'");
    assert.equal(marker.rowCount, 1, 'Expected the guarded empty-database bootstrap marker');
    const owner = await client.query('SELECT organization_id FROM accounting.user_profiles WHERE id=$1 AND email=$2 AND is_active=true', [identity.userId, identity.username]);
    assert.equal(owner.rows[0]?.organization_id, identity.organizationId);
    return client;
  } catch (error) {
    await client.end();
    throw error;
  }
}

export async function keycloakAdminToken(request: APIRequestContext, baseURL: string | undefined) {
  assertIsolatedStack(baseURL);
  const response = await request.post('http://localhost:8080/realms/plainledger/protocol/openid-connect/token', {
    form: { grant_type: 'client_credentials', client_id: 'plainledger-api', client_secret: identity.apiSecret },
  });
  assert.equal(response.status(), 200, 'The isolated Keycloak service account must be available');
  const token = (await response.json() as { access_token?: string }).access_token;
  assert.equal(typeof token, 'string');
  return token as string;
}
