import { Injectable, Logger, OnModuleInit, OnApplicationBootstrap } from "@nestjs/common";
import { DataSource } from "typeorm";

/**
 * Database Initializer Service
 * Creates required database schemas on application startup if they don't exist.
 * This runs before TypeORM synchronize to ensure schemas are available.
 * Also seeds default roles and permissions after tables are created.
 */
@Injectable()
export class DatabaseInitializerService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseInitializerService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.createSchemas();
  }

  /**
   * Runs after all modules are initialized (after TypeORM sync)
   * This seeds default roles and permissions
   */
  async onApplicationBootstrap() {
    await this.seedRolesAndPermissions();
  }

  private async createSchemas() {
    const schemas = ["accounting", "reporting", "integration", "tenant", "intelligence", "platform"];

    try {
      for (const schema of schemas) {
        await this.dataSource.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
        this.logger.log(`Schema '${schema}' ensured`);
      }

      // Create uuid extension if not exists
      await this.dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
      this.logger.log("UUID extension ensured");
    } catch (error) {
      this.logger.error(`Failed to create schemas: ${error.message}`);
      // Don't throw - allow app to start even if schemas exist
    }
  }

  /**
   * Seeds default roles and permissions
   * Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent
   */
  private async seedRolesAndPermissions() {
    try {
      // Check if roles exist
      const existingRoles = await this.dataSource.query(
        `SELECT COUNT(*) as count FROM tenant.roles`
      );

      if (Number(existingRoles[0]?.count) > 0) {
        this.logger.log("Roles already seeded, skipping...");
        return;
      }

      this.logger.log("Seeding default roles and permissions...");

      // Seed default roles
      await this.dataSource.query(`
        INSERT INTO tenant.roles (id, name, description, tier_level, is_system) VALUES
          ('owner', 'Owner', 'Full organization owner access', 100, true),
          ('admin', 'Administrator', 'Administrative access', 50, true),
          ('member', 'Member', 'Standard member access', 10, true),
          ('viewer', 'Viewer', 'View-only access', 0, true)
        ON CONFLICT (id) DO NOTHING
      `);
      this.logger.log("Default roles seeded");

      // Seed default permissions
      await this.dataSource.query(`
        INSERT INTO tenant.permissions (id, name, description, category) VALUES
          ('manage:organization', 'Manage Organization', 'Full organization management', 'organization'),
          ('manage:members', 'Manage Members', 'Invite/remove team members', 'organization'),
          ('manage:billing', 'Manage Billing', 'Access billing and subscriptions', 'billing'),
          ('manage:connections', 'Manage Connections', 'Add/edit data connections', 'connections'),
          ('manage:reports', 'Manage Reports', 'Create/edit reports', 'reports'),
          ('manage:settings', 'Manage Settings', 'Configure organization settings', 'settings'),
          ('view:dashboard', 'View Dashboard', 'Access dashboard', 'dashboard'),
          ('view:reports', 'View Reports', 'View reports', 'reports'),
          ('view:connections', 'View Connections', 'View data connections', 'connections'),
          ('view:members', 'View Members', 'View team members', 'organization'),
          ('view:billing', 'View Billing', 'View billing information', 'billing'),
          ('export:data', 'Export Data', 'Export data to files', 'data')
        ON CONFLICT (id) DO NOTHING
      `);
      this.logger.log("Default permissions seeded");

      // Assign permissions to roles
      await this.dataSource.query(`
        INSERT INTO tenant.role_permissions (role_id, permission_id) VALUES
          -- Owner: all permissions
          ('owner', 'manage:organization'),
          ('owner', 'manage:members'),
          ('owner', 'manage:billing'),
          ('owner', 'manage:connections'),
          ('owner', 'manage:reports'),
          ('owner', 'manage:settings'),
          ('owner', 'view:dashboard'),
          ('owner', 'view:reports'),
          ('owner', 'view:connections'),
          ('owner', 'view:members'),
          ('owner', 'view:billing'),
          ('owner', 'export:data'),
          -- Admin: most permissions except billing
          ('admin', 'manage:members'),
          ('admin', 'manage:connections'),
          ('admin', 'manage:reports'),
          ('admin', 'manage:settings'),
          ('admin', 'view:dashboard'),
          ('admin', 'view:reports'),
          ('admin', 'view:connections'),
          ('admin', 'view:members'),
          ('admin', 'view:billing'),
          ('admin', 'export:data'),
          -- Member: view and export
          ('member', 'manage:reports'),
          ('member', 'view:dashboard'),
          ('member', 'view:reports'),
          ('member', 'view:connections'),
          ('member', 'view:members'),
          ('member', 'export:data'),
          -- Viewer: view only
          ('viewer', 'view:dashboard'),
          ('viewer', 'view:reports'),
          ('viewer', 'view:connections'),
          ('viewer', 'view:members')
        ON CONFLICT DO NOTHING
      `);
      this.logger.log("Role permissions assigned");

    } catch (error) {
      // Don't throw - allow app to start even if seeding fails
      // This might happen if tables don't exist yet on first run
      this.logger.warn(`Role seeding skipped or failed: ${error.message}`);
    }
  }
}
