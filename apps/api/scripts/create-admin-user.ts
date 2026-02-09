#!/usr/bin/env ts-node
/**
 * Script to create an admin user
 * Usage: ts-node scripts/create-admin-user.ts <email> <password> <displayName>
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { KeycloakAdminService } from '../src/infrastructure/auth/keycloak-admin.service';
import { AdminAuthService } from '../src/modules/platform-admin/services/admin-auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminGroupEntity } from '../src/modules/platform-admin/entities/admin-group.entity';
import { Repository } from 'typeorm';

// Fix TypeScript errors
declare type ErrorWithMessage = Error & { message: string; stack?: string };

async function createAdminUser() {
  const email = process.argv[2] || 'tony@plainledger.ca';
  const password = process.argv[3] || 'S00leils!!!!';
  const displayName = process.argv[4] || 'Tony Admin';

  console.log(`\n🔧 Creating admin user: ${email}\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const keycloakAdmin = app.get(KeycloakAdminService);
  const adminAuthService = app.get(AdminAuthService);
  const groupRepository = app.get<Repository<AdminGroupEntity>>(getRepositoryToken(AdminGroupEntity));

  try {
    // Step 1: Check if user exists in Keycloak
    let keycloakUser;
    try {
      const existingUser = await keycloakAdmin.findUserByEmail(email);
      if (existingUser) {
        keycloakUser = existingUser;
        console.log(`✓ User already exists in Keycloak: ${keycloakUser.id}`);
        
        // Update password using resetPassword
        if (password) {
          // Access the adminClient directly to reset password
          const adminClient = (keycloakAdmin as any).adminClient;
          if (adminClient) {
            await adminClient.users.resetPassword({
              realm: (keycloakAdmin as any).realm || 'plainledger',
              id: keycloakUser.id,
              credential: {
                type: 'password',
                value: password,
                temporary: false,
              },
            });
            console.log(`✓ Password updated`);
          }
        }
      } else {
        // Create user in Keycloak
        console.log(`Creating user in Keycloak...`);
        const firstName = displayName.split(' ')[0] || 'Tony';
        const lastName = displayName.split(' ').slice(1).join(' ') || 'Admin';
        
        keycloakUser = await keycloakAdmin.createUser({
          email,
          firstName,
          lastName,
          password,
          emailVerified: true,
          temporaryPassword: false,
        });
        console.log(`✓ User created in Keycloak: ${keycloakUser.id}`);
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      console.error(`✗ Failed to create/update user in Keycloak:`, err.message);
      throw error;
    }

    // Step 2: Find or create super admin group
    let superAdminGroup = await groupRepository.findOne({
      where: [{ name: 'super-admin' }, { name: 'Super Admin' }],
      relations: ['permissions'],
    });

    if (!superAdminGroup) {
      // Get all groups to see what exists
      const allGroups = await groupRepository.find({ relations: ['permissions'] });
      console.log(`Available groups: ${allGroups.map((g: AdminGroupEntity) => g.name).join(', ') || 'none'}`);
      
      // Use the first group with highest tier level, or create super-admin
      if (allGroups.length > 0) {
        superAdminGroup = allGroups.sort((a: AdminGroupEntity, b: AdminGroupEntity) => b.tierLevel - a.tierLevel)[0];
        console.log(`✓ Using existing group: ${superAdminGroup.name} (tier ${superAdminGroup.tierLevel})`);
      } else {
        // Create super admin group
        console.log(`Creating super-admin group...`);
        superAdminGroup = groupRepository.create({
          name: 'super-admin',
          description: 'Super Administrator with all permissions',
          tierLevel: 10,
          isSystem: true,
        });
        await groupRepository.save(superAdminGroup);
        console.log(`✓ Super admin group created`);
      }
    } else {
      console.log(`✓ Found super admin group: ${superAdminGroup.name}`);
    }

    // Step 3: Check if admin user already exists
    const existingAdmin = await adminAuthService.getAdminWithPermissions(keycloakUser.id);
    
    if (existingAdmin) {
      console.log(`✓ Admin user already exists in database`);
      console.log(`  Email: ${existingAdmin.user.email}`);
      console.log(`  Groups: ${existingAdmin.groups.join(', ') || 'none'}`);
      
      // Update groups if needed
      if (!existingAdmin.groups.includes(superAdminGroup.name)) {
        console.log(`Adding user to ${superAdminGroup.name} group...`);
        await adminAuthService.assignUserToGroups(existingAdmin.user.id, [superAdminGroup.id]);
        console.log(`✓ User added to ${superAdminGroup.name} group`);
      }
    } else {
      // Create admin user
      console.log(`Creating admin user in database...`);
      const adminUser = await adminAuthService.createAdminUser(
        keycloakUser.id,
        email,
        displayName,
        [superAdminGroup.id],
      );
      console.log(`✓ Admin user created: ${adminUser.id}`);
      console.log(`  Email: ${adminUser.email}`);
      console.log(`  Display Name: ${adminUser.displayName}`);
    }

    console.log(`\n✅ Admin user setup complete!`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Keycloak ID: ${keycloakUser.id}`);
    console.log(`   Group: ${superAdminGroup.name}\n`);
    
  } catch (error) {
    const err = error as ErrorWithMessage;
    console.error(`\n✗ Error:`, err.message || err);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

createAdminUser();
