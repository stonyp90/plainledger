// Synthetic fixture writes are limited to the disposable CI database.
// This file is never copied into a production container.
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const fixture = require('../fixtures/auth/isolated-e2e.json');

async function main() {
  if (process.env.CI !== 'true' || process.env.DATABASE_PASSWORD !== 'isolated-e2e-only' ||
      !['localhost', '127.0.0.1'].includes(process.env.DATABASE_HOST)) {
    throw new Error('Refusing synthetic fixtures outside the isolated CI stack.');
  }
  const client = new Client({ host: process.env.DATABASE_HOST, port: 5432,
    user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME });
  await client.connect();
  try {
    const result = await client.query('SELECT count(*)::int AS count FROM accounting.organizations');
    if (result.rows[0].count !== 0) throw new Error('Fixture database already contains organizations.');
    await client.query('CREATE DATABASE keycloak');
    await client.query('BEGIN');
    await client.query(fs.readFileSync(path.join(__dirname, '../fixtures/accounting/isolated-ledger.sql'), 'utf8'));
    await client.query(`INSERT INTO accounting.user_profiles
      (id,email,first_name,last_name,organization_id,organization_name,role,email_verified,onboarding_completed)
      VALUES ($1,$2,'Isolated','Test',$3,'Isolated Ledger A','owner',true,true)`,
      [fixture.userId, fixture.username, fixture.organizationId]);
    await client.query('COMMIT');
    console.log('Seeded two isolated organizations and dated posted/draft journal entries.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
