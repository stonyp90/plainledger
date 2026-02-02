#!/usr/bin/env npx tsx
/**
 * Configure QuickBooks US Sandbox for Demo Accounts
 * 
 * This script configures demo accounts (@plainledger.ca) to use
 * QuickBooks US Sandbox by default.
 * 
 * QuickBooks US Sandbox:
 * - Realm ID: 9341456072863003
 * - Company: Sandbox Company_US_1
 * - API URL: https://sandbox-quickbooks.api.intuit.com/v3/company
 * 
 * Usage:
 *   npx tsx scripts/configure-quickbooks-sandbox.ts
 * 
 * Required environment variables:
 *   - DATABASE_URL or DATABASE_HOST/DATABASE_PORT/DATABASE_NAME/DATABASE_USER/DATABASE_PASSWORD
 *   - QUICKBOOKS_SANDBOX_REFRESH_TOKEN (optional, for storing token in DB)
 */

import { Pool } from 'pg';

const QUICKBOOKS_SANDBOX_REALM_ID = '9341456072863003';
const QUICKBOOKS_SANDBOX_COMPANY = 'Sandbox Company_US_1';

// Demo organization tenant IDs
const DEMO_ORGS = ['demo-org', 'test-org-free', 'test-org-001', 'test-org-enterprise'];

async function main() {
  console.log('🔧 Configuring QuickBooks US Sandbox for demo accounts...\n');
  
  // Build connection string
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME}`;
  
  const pool = new Pool({ connectionString });
  
  try {
    // Check if integration_providers table exists
    const providersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'integration_providers'
      );
    `);
    
    if (!providersCheck.rows[0].exists) {
      console.log('⚠️  Integration tables not found. Run init-integrations.sql first.');
      process.exit(1);
    }
    
    // Get demo organizations
    const orgsResult = await pool.query(`
      SELECT id, tenant_id, name 
      FROM accounting.organizations 
      WHERE tenant_id = ANY($1)
    `, [DEMO_ORGS]);
    
    if (orgsResult.rows.length === 0) {
      console.log('⚠️  No demo organizations found. Create organizations first.');
      process.exit(1);
    }
    
    console.log(`Found ${orgsResult.rows.length} demo organization(s):\n`);
    
    for (const org of orgsResult.rows) {
      console.log(`  📁 ${org.name} (${org.tenant_id})`);
      
      // Upsert QuickBooks connection
      const result = await pool.query(`
        INSERT INTO datasource_connections (
          organization_id,
          provider_id,
          name,
          company_name,
          realm_id,
          status,
          auto_sync_enabled,
          sync_frequency,
          sync_time_utc,
          sync_to_datalake,
          sync_entities,
          sync_date_range_days,
          next_scheduled_sync_at
        )
        VALUES (
          $1,
          'quickbooks',
          'QuickBooks US Sandbox',
          $2,
          $3,
          'connected',
          true,
          'daily',
          '09:00:00',
          true,
          ARRAY['accounts', 'customers', 'vendors', 'invoices', 'journal_entries'],
          365,
          (CURRENT_DATE + 1 + TIME '09:00:00')::TIMESTAMP WITH TIME ZONE
        )
        ON CONFLICT (organization_id, provider_id, realm_id) 
        DO UPDATE SET
          name = EXCLUDED.name,
          company_name = EXCLUDED.company_name,
          status = 'connected',
          auto_sync_enabled = true,
          sync_to_datalake = true,
          updated_at = NOW()
        RETURNING id, name;
      `, [org.id, QUICKBOOKS_SANDBOX_COMPANY, QUICKBOOKS_SANDBOX_REALM_ID]);
      
      console.log(`     ✅ QuickBooks connection: ${result.rows[0].name}`);
      console.log(`        Realm ID: ${QUICKBOOKS_SANDBOX_REALM_ID}`);
    }
    
    console.log('\n✅ QuickBooks US Sandbox configured for all demo accounts!\n');
    console.log('📋 Next steps:');
    console.log('   1. Add these GitHub secrets:');
    console.log('      - QUICKBOOKS_SANDBOX_CLIENT_ID');
    console.log('      - QUICKBOOKS_SANDBOX_CLIENT_SECRET');
    console.log('      - QUICKBOOKS_SANDBOX_REFRESH_TOKEN');
    console.log('      - QUICKBOOKS_SANDBOX_REALM_ID=9341456072863003');
    console.log('   2. Trigger ETL pipeline: gh workflow run etl-pipeline.yml');
    console.log('   3. Verify data in S3 Gold layer\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
