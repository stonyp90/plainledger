import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Platform Seeder Service
 *
 * Seeds default platform admin data (permissions, groups, group assignments)
 * AFTER TypeORM synchronize has created the tables with correct metadata.
 *
 * This was previously done in dataSourceFactory (before sync), which caused
 * TypeORM to crash when trying to alter columns on tables that already had rows.
 */
@Injectable()
export class PlatformSeederService implements OnModuleInit {
  private readonly logger = new Logger(PlatformSeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.seedPlatformData();
  }

  private async seedPlatformData() {
    try {
      this.logger.log('Seeding platform admin data...');

      // Check if init-platform.sql already seeded data (Docker init scripts run first)
      const existingPerms = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM platform.admin_permissions`,
      );
      const permCount = parseInt(existingPerms[0]?.count || '0');

      if (permCount > 0) {
        this.logger.log(
          `Platform data already seeded (${permCount} permissions found), skipping`,
        );
        return;
      }

      // Seed minimal permissions for non-Docker environments
      await this.dataSource.query(`
        INSERT INTO platform.admin_permissions (id, name, description, category, is_dangerous)
        VALUES
          ('org:list', 'List Organizations', 'View list of all organizations', 'org', false),
          ('org:view', 'View Organization', 'View organization details', 'org', false),
          ('org:create', 'Create Organization', 'Create new organizations', 'org', false),
          ('org:edit', 'Edit Organization', 'Edit organization settings', 'org', false),
          ('org:delete', 'Delete Organization', 'Soft delete organizations', 'org', true),
          ('user:list', 'List Users', 'View list of users', 'user', false),
          ('user:view', 'View User', 'View user details', 'user', false),
          ('user:edit', 'Edit User', 'Edit user settings', 'user', false),
          ('user:delete', 'Delete User', 'Delete users', 'user', true),
          ('admin:list', 'List Admins', 'View admin users', 'admin', false),
          ('admin:create', 'Create Admin', 'Create admin users', 'admin', true),
          ('group:list', 'List Groups', 'View admin groups', 'admin', false),
          ('group:assign', 'Assign Groups', 'Assign users to groups', 'admin', false),
          ('billing:view', 'View Billing', 'View billing information', 'billing', false),
          ('audit:view', 'View Audit Logs', 'View audit logs', 'audit', false),
          ('sync:view', 'View Sync', 'View sync status', 'sync', false)
        ON CONFLICT (id) DO NOTHING
      `);

      // Seed default Super Admin group
      await this.dataSource.query(`
        INSERT INTO platform.groups (id, name, description, tier_level, is_system)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full access to all admin features', 100, true)
        ON CONFLICT (id) DO NOTHING
      `);

      // Assign all permissions to Super Admin group
      await this.dataSource.query(`
        INSERT INTO platform.group_permissions (group_id, permission_id)
        SELECT '00000000-0000-0000-0000-000000000001', id FROM platform.admin_permissions
        ON CONFLICT DO NOTHING
      `);

      this.logger.log('Platform admin data seeded successfully');
    } catch (error) {
      this.logger.error(`Failed to seed platform data: ${error.message}`);
    }
  }
}
