/**
 * AWS Lambda function to create admin user
 * Deploy this to Lambda and invoke it to create the admin user
 */

const { Client } = require('pg');
const https = require('https');

exports.handler = async (event) => {
  const keycloakId = '6840364a-e6d1-4561-ba42-e9971e041443';
  const email = 'tony@plainledger.ca';
  const displayName = 'Tony Admin';

  // Get database credentials from Secrets Manager
  const AWS = require('aws-sdk');
  const secretsManager = new AWS.SecretsManager({ region: 'ca-central-1' });
  
  const dbSecret = await secretsManager.getSecretValue({ SecretId: 'plainledger/prod/db-credentials' }).promise();
  const dbCreds = JSON.parse(dbSecret.SecretString);

  const client = new Client({
    host: dbCreds.host,
    port: dbCreds.port,
    database: dbCreds.dbname,
    user: dbCreds.username,
    password: dbCreds.password,
  });

  try {
    await client.connect();

    // Step 1: Create super-admin group
    await client.query(`
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

    // Step 2: Create admin user
    await client.query(`
      INSERT INTO platform.admin_users (id, keycloak_id, email, display_name, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (keycloak_id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        is_active = true,
        updated_at = NOW();
    `, [keycloakId, email, displayName]);

    // Step 3: Assign user to super-admin group
    await client.query(`
      INSERT INTO platform.user_groups (user_id, group_id)
      SELECT 
        au.id,
        g.id
      FROM platform.admin_users au
      CROSS JOIN platform.groups g
      WHERE au.keycloak_id = $1
        AND g.name = 'super-admin'
      ON CONFLICT DO NOTHING;
    `, [keycloakId]);

    // Step 4: Verify
    const result = await client.query(`
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
      WHERE au.keycloak_id = $1;
    `, [keycloakId]);

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Admin user created successfully',
        user: result.rows[0],
      }),
    };
  } catch (error) {
    await client.end();
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
