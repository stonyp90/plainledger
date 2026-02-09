#!/usr/bin/env node
/**
 * Create admin user via AWS RDS Data API
 * This works from anywhere without VPC access
 */

const AWS = require('aws-sdk');

const keycloakId = '6840364a-e6d1-4561-ba42-e9971e041443';
const email = 'tony@plainledger.ca';
const displayName = 'Tony Admin';

async function createAdminUser() {
  console.log(`\n🔧 Creating admin user: ${email}\n`);

  // Get database credentials
  const secretsManager = new AWS.SecretsManager({ region: 'ca-central-1' });
  const dbSecret = await secretsManager.getSecretValue({ SecretId: 'plainledger/prod/db-credentials' }).promise();
  const dbCreds = JSON.parse(dbSecret.SecretString);

  // Find RDS cluster/instance
  const rds = new AWS.RDS({ region: 'ca-central-1' });
  const instances = await rds.describeDBInstances().promise();
  const dbInstance = instances.DBInstances.find(
    db => db.DBInstanceIdentifier.includes('plainledger') && db.DBInstanceIdentifier.includes('prod')
  );

  if (!dbInstance) {
    throw new Error('Could not find RDS instance');
  }

  const dbClusterArn = dbInstance.DBClusterIdentifier 
    ? `arn:aws:rds:ca-central-1:436136277668:cluster:${dbInstance.DBClusterIdentifier}`
    : dbInstance.DBInstanceArn;

  // Check if Data API is enabled (requires Aurora Serverless or Data API enabled)
  const dataApi = new AWS.RDSData({ region: 'ca-central-1' });

  try {
    // Step 1: Create super-admin group
    console.log('1. Creating super-admin group...');
    await dataApi.executeStatement({
      resourceArn: dbClusterArn,
      secretArn: dbSecret.ARN,
      database: dbCreds.dbname,
      sql: `
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
      `,
    }).promise();
    console.log('   ✓ Super-admin group ready\n');

    // Step 2: Create admin user
    console.log('2. Creating admin user in database...');
    await dataApi.executeStatement({
      resourceArn: dbClusterArn,
      secretArn: dbSecret.ARN,
      database: dbCreds.dbname,
      sql: `
        INSERT INTO platform.admin_users (id, keycloak_id, email, display_name, is_active, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          :keycloakId,
          :email,
          :displayName,
          true,
          NOW(),
          NOW()
        )
        ON CONFLICT (keycloak_id) DO UPDATE SET
          email = EXCLUDED.email,
          display_name = EXCLUDED.display_name,
          is_active = true,
          updated_at = NOW();
      `,
      parameters: [
        { name: 'keycloakId', value: { stringValue: keycloakId } },
        { name: 'email', value: { stringValue: email } },
        { name: 'displayName', value: { stringValue: displayName } },
      ],
    }).promise();
    console.log('   ✓ Admin user created\n');

    // Step 3: Assign user to super-admin group
    console.log('3. Assigning user to super-admin group...');
    await dataApi.executeStatement({
      resourceArn: dbClusterArn,
      secretArn: dbSecret.ARN,
      database: dbCreds.dbname,
      sql: `
        INSERT INTO platform.user_groups (user_id, group_id)
        SELECT 
          au.id,
          g.id
        FROM platform.admin_users au
        CROSS JOIN platform.groups g
        WHERE au.keycloak_id = :keycloakId
          AND g.name = 'super-admin'
        ON CONFLICT DO NOTHING;
      `,
      parameters: [
        { name: 'keycloakId', value: { stringValue: keycloakId } },
      ],
    }).promise();
    console.log('   ✓ User assigned to super-admin group\n');

    // Step 4: Verify
    console.log('4. Verifying admin user...');
    const result = await dataApi.executeStatement({
      resourceArn: dbClusterArn,
      secretArn: dbSecret.ARN,
      database: dbCreds.dbname,
      sql: `
        SELECT 
          au.id,
          au.email,
          au.display_name,
          au.is_active,
          g.name as group_name,
          g.tier_level
        FROM platform.admin_users au
        LEFT JOIN platform.user_groups ug ON ug.user_id = au.id
        LEFT JOIN platform.groups g ON g.id = ug.group_id
        WHERE au.keycloak_id = :keycloakId;
      `,
      parameters: [
        { name: 'keycloakId', value: { stringValue: keycloakId } },
      ],
    }).promise();

    console.log('✅ Admin user setup complete!');
    console.log(`   Email: ${email}`);
    console.log(`   Keycloak ID: ${keycloakId}`);
    if (result.records && result.records.length > 0) {
      console.log(`   Database ID: ${result.records[0][0].stringValue}`);
      console.log(`   Group: ${result.records[0][4]?.stringValue || 'none'}\n`);
    }

  } catch (error) {
    if (error.code === 'BadRequestException' && error.message.includes('Data API')) {
      console.error('\n✗ RDS Data API is not enabled for this database.');
      console.error('   Please use AWS RDS Query Editor or run the SQL script manually.');
      console.error(`   SQL file: scripts/create-admin-tony.sql\n`);
    } else {
      console.error('\n✗ Error:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

createAdminUser();
