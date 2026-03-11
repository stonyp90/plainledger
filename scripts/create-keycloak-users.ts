/**
 * Create Keycloak Users Script
 * 
 * Creates test users in Keycloak if they don't exist.
 * Run with: npx tsx scripts/create-keycloak-users.ts
 * 
 * Requires environment variables:
 * - KEYCLOAK_URL (default: http://localhost:8080)
 * - KEYCLOAK_REALM (default: plainledger)
 * - KEYCLOAK_ADMIN_USER (default: admin)
 * - KEYCLOAK_ADMIN_PASSWORD (default: admin)
 */

import { KcAdminClient } from '@keycloak/keycloak-admin-client';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'plainledger';
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || 'admin';
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';

const TEST_USERS = [
  {
    username: 'anthonypaquet1508@gmail.com',
    email: 'anthonypaquet1508@gmail.com',
    firstName: 'Anthony',
    lastName: 'Paquet',
    password: 'S00leils!!!!',
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
          
          // Update password if needed
          if (existingUser.id) {
            await kcAdminClient.users.resetPassword({
              id: existingUser.id,
              credential: {
                temporary: false,
                type: 'password',
                value: userData.password,
              },
            });
            console.log(`  ✓ Password updated`);
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
