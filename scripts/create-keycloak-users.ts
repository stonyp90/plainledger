/**
 * Create Keycloak Users Script
 *
 * Creates test users in Keycloak if they don't exist, and ensures
 * matching user_profiles records exist in PostgreSQL with email_verified = true.
 *
 * Run with: npx tsx scripts/create-keycloak-users.ts
 *
 * Requires environment variables:
 * - KEYCLOAK_URL (default: http://localhost:8080)
 * - KEYCLOAK_REALM (default: plainledger)
 * - KEYCLOAK_ADMIN_USER (default: admin)
 * - KEYCLOAK_ADMIN_PASSWORD (default: admin)
 * - DATABASE_HOST (default: localhost)
 * - DATABASE_PORT (default: 5434)
 * - DATABASE_NAME (default: plainledger)
 * - DATABASE_USER (default: plainledger)
 * - DATABASE_PASSWORD (default: plainledger_secret)
 */

import KcAdminClient from '@keycloak/keycloak-admin-client';
import pg from 'pg';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'plainledger';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '5434', 10);
const DB_NAME = process.env.DATABASE_NAME || 'plainledger';
const DB_USER = process.env.DATABASE_USER || 'plainledger';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || 'plainledger_secret';

const TEST_USERS = [
  {
    username: 'antoine@tablix.ca',
    email: 'antoine@tablix.ca',
    firstName: 'Antoine',
    lastName: 'Paquet',
    password: 'Logmein123!!',
    enabled: true,
    emailVerified: true,
    realmRoles: ['admin', 'owner', 'platform_admin'],
    groups: ['Administrators'],
    attributes: {
      organization: ['demo-org'],
      locale: ['en'],
    },
  },
  {
    username: 'anthonypaquet1508@gmail.com',
    email: 'anthonypaquet1508@gmail.com',
    firstName: 'Anthony',
    lastName: 'Paquet',
    password: 'Logmein123!!',
    enabled: true,
    emailVerified: true,
    realmRoles: ['admin', 'owner', 'platform_admin'],
    groups: ['Administrators'],
    attributes: {
      organization: ['demo-org'],
      locale: ['en'],
    },
  },
  {
    username: 'admin@plainledger.ca',
    email: 'admin@plainledger.ca',
    firstName: 'Admin',
    lastName: 'User',
    password: 'AdminPass123!@#',
    enabled: true,
    emailVerified: true,
    realmRoles: ['admin', 'owner'],
    groups: ['Administrators'],
    attributes: {
      organization: ['demo-org'],
      locale: ['en'],
    },
  },
  {
    username: 'accountant@plainledger.ca',
    email: 'accountant@plainledger.ca',
    firstName: 'Jane',
    lastName: 'Smith',
    password: 'Accountant123!@#',
    enabled: true,
    emailVerified: true,
    realmRoles: ['accountant'],
    groups: ['Accountants'],
    attributes: {
      organization: ['demo-org'],
      locale: ['en'],
    },
  },
  {
    username: 'demo@plainledger.ca',
    email: 'demo@plainledger.ca',
    firstName: 'Demo',
    lastName: 'User',
    password: 'DemoPass123!@#',
    enabled: true,
    emailVerified: true,
    realmRoles: ['viewer'],
    groups: ['Viewers'],
    attributes: {
      organization: ['demo-org'],
      locale: ['en'],
    },
  },
];

async function createUsers() {
  const kcAdminClient = new KcAdminClient({
    baseUrl: KEYCLOAK_URL,
    realmName: 'master', // Admin operations use master realm
  });

  try {
    console.log(`Connecting to Keycloak at ${KEYCLOAK_URL}...`);
    await kcAdminClient.auth({
      username: KEYCLOAK_ADMIN_USER,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grantType: 'password',
      clientId: 'admin-cli',
    });
    console.log('✓ Connected to Keycloak Admin API\n');

    kcAdminClient.setConfig({ realmName: KEYCLOAK_REALM });

    for (const userData of TEST_USERS) {
      try {
        // Check if user already exists
        const existingUsers = await kcAdminClient.users.find({
          email: userData.email,
          exact: true,
        });

        if (existingUsers.length > 0) {
          const existingUser = existingUsers[0];
          console.log(`⚠ User ${userData.email} already exists (ID: ${existingUser.id})`);
          
          // Update password if needed (may fail due to password history policy)
          if (existingUser.id) {
            try {
              await kcAdminClient.users.resetPassword({
                id: existingUser.id,
                credential: {
                  temporary: false,
                  type: 'password',
                  value: userData.password,
                },
              });
              console.log(`  ✓ Password updated`);
            } catch (pwError: any) {
              if (pwError?.responseData?.error === 'invalidPasswordHistoryMessage') {
                console.log(`  ✓ Password unchanged (same as current)`);
              } else {
                console.warn(`  ⚠ Password update failed: ${pwError.message}`);
              }
            }
          }
          continue;
        }

        // Create new user
        const createdUser = await kcAdminClient.users.create({
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          enabled: userData.enabled,
          emailVerified: userData.emailVerified,
          attributes: userData.attributes,
        });

        if (!createdUser.id) {
          throw new Error('User created but no ID returned');
        }

        // Set password
        await kcAdminClient.users.resetPassword({
          id: createdUser.id,
          credential: {
            temporary: false,
            type: 'password',
            value: userData.password,
          },
        });

        // Add realm roles
        if (userData.realmRoles.length > 0) {
          const roles = await kcAdminClient.roles.find();
          const userRoles = roles.filter((r) =>
            userData.realmRoles.includes(r.name!),
          );
          if (userRoles.length > 0) {
            await kcAdminClient.users.addRealmRoleMappings({
              id: createdUser.id,
              roles: userRoles,
            });
          }
        }

        // Add to groups
        if (userData.groups.length > 0) {
          const groups = await kcAdminClient.groups.find();
          for (const groupName of userData.groups) {
            const group = groups.find((g) => g.name === groupName);
            if (group && group.id) {
              await kcAdminClient.users.addToGroup({
                id: createdUser.id,
                groupId: group.id,
              });
            }
          }
        }

        console.log(`✓ Created user: ${userData.email}`);
        console.log(`  Password: ${userData.password}`);
        console.log(`  Roles: ${userData.realmRoles.join(', ')}`);
        console.log(`  Groups: ${userData.groups.join(', ')}\n`);
      } catch (error) {
        console.error(`✗ Failed to create user ${userData.email}:`, error);
        if (error instanceof Error) {
          console.error(`  Error: ${error.message}`);
        }
      }
    }

    // =============================================
    // Seed user_profiles in PostgreSQL
    // =============================================
    console.log('\n--- Seeding user_profiles in PostgreSQL ---\n');

    const pool = new pg.Pool({
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
    });

    try {
      for (const userData of TEST_USERS) {
        // Look up the Keycloak user ID (needed as the profile PK)
        const kcUsers = await kcAdminClient.users.find({
          email: userData.email,
          exact: true,
        });

        if (kcUsers.length === 0 || !kcUsers[0].id) {
          console.log(`⚠ Skipping DB profile for ${userData.email} — not found in Keycloak`);
          continue;
        }

        const keycloakId = kcUsers[0].id;

        // Check if profile already exists
        const existing = await pool.query(
          'SELECT id, email_verified FROM accounting.user_profiles WHERE id = $1 OR email = $2',
          [keycloakId, userData.email.toLowerCase()],
        );

        if (existing.rows.length > 0) {
          const row = existing.rows[0];
          if (!row.email_verified) {
            // Fix: mark as verified if Keycloak says verified
            await pool.query(
              'UPDATE accounting.user_profiles SET email_verified = true, updated_at = NOW() WHERE id = $1',
              [row.id],
            );
            console.log(`✓ Fixed email_verified=true for ${userData.email}`);
          } else {
            console.log(`⚠ DB profile for ${userData.email} already exists (verified=${row.email_verified})`);
          }
          continue;
        }

        // Insert new profile
        await pool.query(
          `INSERT INTO accounting.user_profiles (
            id, email, first_name, last_name, email_verified,
            registration_source, journey_stage, is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, true, 'admin-seed', 'activated', true, NOW(), NOW())`,
          [keycloakId, userData.email.toLowerCase(), userData.firstName, userData.lastName],
        );

        console.log(`✓ Created DB profile for ${userData.email} (ID: ${keycloakId})`);
      }
    } finally {
      await pool.end();
    }

    console.log('\n==========================================');
    console.log('User creation complete!');
    console.log('==========================================');
    console.log('\nTest users:');
    TEST_USERS.forEach((user) => {
      console.log(`  ${user.email} / ${user.password}`);
    });
  } catch (error) {
    console.error('Failed to connect to Keycloak:', error);
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

createUsers().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
