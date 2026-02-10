import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { GqlThrottlerGuard } from "@infrastructure/http/guards/gql-throttler.guard";
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from "nest-keycloak-connect";

// Configuration
import { AppConfig } from "@infrastructure/config/app.config";

// Domain
import { OrganizationEntity } from "@infrastructure/persistence/postgres/entities/organization.entity";
import { AccountEntity } from "@infrastructure/persistence/postgres/entities/account.entity";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";
import { OrganizationSettingsEntity } from "@infrastructure/persistence/postgres/entities/organization-settings.entity";
import { UserSettingsEntity } from "@infrastructure/persistence/postgres/entities/user-settings.entity";
import { DecisionEventEntity } from "@infrastructure/persistence/postgres/entities/decision-event.entity";
import { IndustryPatternEntity } from "@infrastructure/persistence/postgres/entities/industry-pattern.entity";
import { SharedDocumentEntity } from "@infrastructure/persistence/postgres/entities/shared-document.entity";
import { EmailEventEntity } from "@infrastructure/persistence/postgres/entities/email-event.entity";
import {
  IndustryBenchmarkEntity,
  BenchmarkRefreshLogEntity,
} from "@infrastructure/persistence/postgres/entities/industry-benchmark.entity";
import { VisualizationEntity } from "@infrastructure/persistence/postgres/entities/visualization.entity";
import { CustomEntityEntity } from "@infrastructure/persistence/postgres/entities/custom-entity.entity";
import { SavedReportEntity } from "@infrastructure/persistence/postgres/entities/saved-report.entity";
import { BoardMeetingEntity } from "@infrastructure/persistence/postgres/entities/board-meeting.entity";
import { ScenarioEntity } from "@infrastructure/persistence/postgres/entities/scenario.entity";
import { EntitlementEntity } from "@infrastructure/persistence/postgres/entities/entitlement.entity";
import { SubscriptionPlanEntity } from "@infrastructure/persistence/postgres/entities/subscription-plan.entity";
import { PlanEntitlementEntity } from "@infrastructure/persistence/postgres/entities/plan-entitlement.entity";
import { PermissionEntity } from "@infrastructure/persistence/postgres/entities/permission.entity";
import { RoleEntity } from "@infrastructure/persistence/postgres/entities/role.entity";

// Platform Admin Entities
import {
  AdminUserEntity,
  AdminGroupEntity,
  AdminPermissionEntity,
  AdminAuditLogEntity,
} from "./modules/platform-admin/entities";
import { WebhookLogEntity } from "./modules/platform-admin/entities/webhook-log.entity";
import { OnboardingProgressEntity } from "./modules/platform-admin/entities/onboarding-progress.entity";
import { CommunicationLogEntity } from "./modules/platform-admin/entities/communication-log.entity";

// Infrastructure - HTTP Controllers
import { HealthController } from "@infrastructure/http/controllers/health.controller";
import { OrganizationController } from "@infrastructure/http/controllers/organization.controller";
import { ReportController } from "@infrastructure/http/controllers/report.controller";
import { DataSourceController } from "@infrastructure/http/controllers/datasource.controller";
import { OAuthCallbackController } from "@infrastructure/http/controllers/oauth-callback.controller";
import { ContactController } from "@infrastructure/http/controllers/contact.controller";
import { OnboardingController } from "@infrastructure/http/controllers/onboarding.controller";
import { AIController } from "@infrastructure/http/controllers/ai.controller";
import { AIFeedbackController } from "@infrastructure/http/controllers/ai-feedback.controller";
import { AnalyticsController } from "@infrastructure/http/controllers/analytics.controller";
import { AIAnalyticsController } from "@infrastructure/http/controllers/ai-analytics.controller";
import { BIDataController } from "@infrastructure/http/controllers/bi-data.controller";
import { TeamController } from "@infrastructure/http/controllers/team.controller";
import { AuthController } from "@infrastructure/http/controllers/auth.controller";
import { SyncAdminController } from "@infrastructure/http/controllers/sync-admin.controller";
import { IdentityAdminController } from "@infrastructure/http/controllers/identity-admin.controller";
import { UploadController } from "@infrastructure/http/controllers/upload.controller";
import { SettingsController } from "@infrastructure/http/controllers/settings.controller";
import { DocumentShareController } from "@infrastructure/http/controllers/document-share.controller";
import { ShareController } from "@infrastructure/http/controllers/share.controller";
import { EmailWebhookController } from "@infrastructure/http/controllers/email-webhook.controller";
import { UnsubscribeController } from "@infrastructure/http/controllers/unsubscribe.controller";
import { CacheController } from "@infrastructure/http/controllers/cache.controller";
import { SimilarityController } from "@infrastructure/http/controllers/similarity.controller";
import { ETLProgressController } from "@infrastructure/http/controllers/etl-progress.controller";
import { DataSourceSyncController } from "@infrastructure/http/controllers/datasource-sync.controller";
import { ETLTriggerController } from "@infrastructure/http/controllers/etl-trigger.controller";
import { PermissionsController } from "@infrastructure/http/controllers/permissions.controller";
import { UserPermissionsController } from "@infrastructure/http/controllers/user-permissions.controller";

// Infrastructure - Auth
import { KeycloakAdminService } from "@infrastructure/auth/keycloak-admin.service";

// Infrastructure - Storage
import { FileStorageService } from "@infrastructure/storage/file-storage.service";
import { DocumentShareService } from "@infrastructure/storage/document-share.service";
import { AIService } from "@infrastructure/ai/ai.service";
import { AICacheService } from "@infrastructure/ai/ai-cache.service";
import { PowerBIAdapter } from "@infrastructure/adapters/bi/powerbi/powerbi.adapter";
import { PowerBIThemeAdapter } from "@infrastructure/adapters/bi/powerbi/powerbi-theme.adapter";
import { PowerBIDatalakeAdapter } from "@infrastructure/adapters/bi/powerbi/powerbi-datalake.adapter";
import { DatalakeDataService } from "@infrastructure/services/datalake-data.service";
import { SettingsService } from "@infrastructure/services/settings.service";
import { CacheService } from "@infrastructure/cache/cache.service";
import { EmbeddingService } from "@infrastructure/ai/embedding.service";
import { SimilaritySearchService } from "@application/services/similarity-search.service";
import { CustomEntityService } from "@application/services/custom-entity.service";
import { UserPermissionsService } from "@application/services/user-permissions.service";
import { ProviderFactory } from "@application/services/provider-factory.service";
import { QuickBooksProvider } from "@infrastructure/adapters/accounting/quickbooks/quickbooks.provider";
import { QuickBooksService } from "@infrastructure/adapters/accounting/quickbooks/quickbooks.service";
import { S3CleanupAdapter } from "@infrastructure/adapters/storage/s3/s3-cleanup.adapter";
import { NovuModule } from "@infrastructure/adapters/notifications/novu/novu.adapter";
import { BenchmarkRefreshService } from "@infrastructure/services/benchmark-refresh.service";
import { BenchmarkHealthService } from "@infrastructure/services/benchmark-health.service";
import { ISEDBenchmarkService } from "@infrastructure/services/ised-benchmark.service";
import { StatsCanBenchmarkService } from "@infrastructure/services/statscan-benchmark.service";
import { DataSourceMetadataService } from "@infrastructure/services/datasource-metadata.service";
import { VisualizationQueryService } from "@application/services/visualization-query.service";
import { AthenaQueryAdapter } from "@infrastructure/adapters/analytics/athena-query.adapter";
import { CPAAdminGuard } from "@infrastructure/http/guards/cpa-admin.guard";
import { PubSub } from "graphql-subscriptions";
import { ETLSubscriptionResolver } from "@infrastructure/graphql/resolvers/etl.subscription";
import { AccountBalanceSubscriptionResolver } from "@infrastructure/graphql/resolvers/account-balance.subscription";
import { TransactionSubscriptionResolver } from "@infrastructure/graphql/resolvers/transaction.subscription";
import { ETLPublisherService } from "@infrastructure/services/etl-publisher.service";
import { AccountBalancePublisherService } from "@infrastructure/services/account-balance-publisher.service";

// Infrastructure - GraphQL
import { GraphQLModule } from "@infrastructure/graphql/graphql.module";
import { FinancialResolver } from "@infrastructure/graphql/resolvers/financial.resolver";
import { OrganizationResolver } from "@infrastructure/graphql/resolvers/organization.resolver";
import { DataSourceResolver } from "@infrastructure/graphql/resolvers/datasource.resolver";
import { MarketAnalysisResolver } from "@infrastructure/graphql/resolvers/market-analysis.resolver";
import { VisualizationResolver } from "@infrastructure/graphql/resolvers/visualization.resolver";
import { TaxCreditResolver } from "@infrastructure/graphql/resolvers/tax-credit.resolver";
import { UserSettingsResolver } from "@infrastructure/graphql/resolvers/user-settings.resolver";
import { GqlAuthGuard } from "@infrastructure/graphql/guards/gql-auth.guard";

// Application - Use Cases
import { CreateOrganizationUseCase } from "@application/use-cases/create-organization.use-case";
import { GetOrganizationUseCase } from "@application/use-cases/get-organization.use-case";
import { GenerateBalanceSheetUseCase } from "@application/use-cases/generate-balance-sheet.use-case";
import { GetEmbedConfigUseCase } from "@application/use-cases/get-embed-config.use-case";
import { ListAnalyticsReportsUseCase } from "@application/use-cases/list-analytics-reports.use-case";
import { UpdateOrgFeaturesUseCase } from "@application/use-cases/update-org-features.use-case";
import { GenerateAIResponseUseCase } from "@application/use-cases/generate-ai-response.use-case";

// Repositories
import { PostgresOrganizationRepository } from "@infrastructure/persistence/postgres/postgres-organization.repository";
import { DecisionRepository } from "@infrastructure/persistence/decision.repository";
import { DECISION_REPOSITORY_TOKEN } from "@application/ports/outbound/IDecisionRepository";
import { PostgresAccountRepository } from "@infrastructure/persistence/postgres/postgres-account.repository";
import { PostgresAnalyticsReportRepository } from "@infrastructure/persistence/postgres/postgres-analytics-report.repository";
import { PostgresOrganizationFeaturesRepository } from "@infrastructure/persistence/postgres/postgres-organization-features.repository";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";
import { PostgresOrganizationSettingsRepository } from "@infrastructure/persistence/postgres/postgres-organization-settings.repository";
import { PostgresUserSettingsRepository } from "@infrastructure/persistence/postgres/postgres-user-settings.repository";
import { PostgresVisualizationRepository } from "@infrastructure/persistence/postgres/postgres-visualization.repository";
import { PostgresCustomEntityRepository } from "@infrastructure/persistence/postgres/postgres-custom-entity.repository";
import { DatabaseInitializerService } from "@infrastructure/persistence/postgres/database-initializer.service";

// Notifications (Email via SES Adapter)
import { SESAdapter } from "./infrastructure/adapters/email/ses/ses.adapter";

// Email Templates
import { EmailTemplatesService } from "./infrastructure/templates/email-templates.service";
import { HealthCheckService } from "./infrastructure/health/health-check.service";
import { SharedServicesModule } from "./modules/shared/shared-services.module";

// Journey Tracking
import { JourneyTrackingService } from "@application/services/journey-tracking.service";
import { CustomerJourneyJob } from "@infrastructure/jobs/customer-journey.job";
import { DataRetentionJob } from "@infrastructure/jobs/data-retention.job";
import { TaxCreditSyncJob } from "@infrastructure/jobs/tax-credit-sync.job";
import { JobConfigurationService } from "@application/services/job-configuration.service";
import { JobsController } from "@infrastructure/controllers/jobs.controller";

// MongoDB (Analytics & Audit)
import {
  MongoDBModule,
  MongoDBService,
  AnalyticsRepository,
  AuditRepository,
} from "@infrastructure/persistence/mongodb";

// CRM (HubSpot Adapter)
import { HubSpotAdapter } from "@infrastructure/adapters/crm/hubspot/hubspot.adapter";

// Intelligence Platform
import { IntelligenceModule } from "@infrastructure/intelligence/intelligence.module";

// Platform Admin Module
import { PlatformAdminModule } from "./modules/platform-admin";

@Module({
  imports: [
    // Shared Services (must be imported first to ensure singleton instances)
    SharedServicesModule,
    
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DATABASE_HOST") || "localhost",
        port: parseInt(
          configService.get<string>("DATABASE_PORT") || "5432",
          10,
        ),
        username: configService.get<string>("DATABASE_USER") || "plainledger",
        password:
          configService.get<string>("DATABASE_PASSWORD") || "plainledger",
        database: configService.get<string>("DATABASE_NAME") || "plainledger",
        entities: [
          OrganizationEntity,
          AccountEntity,
          UserProfileEntity,
          OrganizationSettingsEntity,
          UserSettingsEntity,
          DecisionEventEntity,
          IndustryPatternEntity,
          SharedDocumentEntity,
          EmailEventEntity,
          IndustryBenchmarkEntity,
          BenchmarkRefreshLogEntity,
          VisualizationEntity,
          CustomEntityEntity,
          SavedReportEntity,
          BoardMeetingEntity,
          ScenarioEntity,
          EntitlementEntity,
          SubscriptionPlanEntity,
          PlanEntitlementEntity,
          PermissionEntity,
          RoleEntity,
          // Platform Admin Entities
          AdminUserEntity,
          AdminGroupEntity,
          AdminPermissionEntity,
          AdminAuditLogEntity,
          WebhookLogEntity,
          OnboardingProgressEntity,
          CommunicationLogEntity,
        ],
        // Enable synchronize if SYNC_DB=true or in development
        synchronize:
          process.env.SYNC_DB === "true" ||
          process.env.NODE_ENV !== "production",
        logging:
          process.env.NODE_ENV !== "production" ||
          process.env.SYNC_DB === "true",
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
      // Create schemas before TypeORM synchronize
      async dataSourceFactory(options) {
        const { DataSource } = await import("typeorm");
        const { Client } = await import("pg");
        
        // Create schemas using raw PostgreSQL client before TypeORM initializes
        // Cast options to access PostgreSQL-specific properties
        const pgOptions = options as any;
        const client = new Client({
          host: pgOptions.host,
          port: pgOptions.port,
          database: pgOptions.database,
          user: pgOptions.username,
          password: pgOptions.password,
          ssl: pgOptions.ssl,
        });

        try {
          await client.connect();
          await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
          await client.query("CREATE SCHEMA IF NOT EXISTS accounting");
          await client.query("CREATE SCHEMA IF NOT EXISTS reporting");
          await client.query("CREATE SCHEMA IF NOT EXISTS integration");
          await client.query("CREATE SCHEMA IF NOT EXISTS intelligence");
          await client.query("CREATE SCHEMA IF NOT EXISTS platform");
          await client.query("CREATE SCHEMA IF NOT EXISTS tenant");
          
          // Create subscription_plans table if it doesn't exist (TypeORM will create it later, but we need it now)
          await client.query(`
            CREATE TABLE IF NOT EXISTS tenant.subscription_plans (
              id VARCHAR(50) PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              description TEXT,
              stripe_product_id VARCHAR(100),
              stripe_price_id VARCHAR(100),
              stripe_price_id_annual VARCHAR(100),
              limits JSONB NOT NULL DEFAULT '{}',
              is_active BOOLEAN DEFAULT true,
              display_order INTEGER DEFAULT 0,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
          `);
          
          // Seed default subscription plans before TypeORM synchronizes
          // This ensures foreign key constraints can be created successfully
          await client.query(`
            INSERT INTO tenant.subscription_plans (id, name, description, limits, display_order, is_active)
            VALUES 
              ('free', 'Free', 'Basic access with limited features', 
               '{"users": 1, "connections": 0, "reports": 5, "storage": 100, "apiCalls": 100, "powerBiDashboards": 0}'::jsonb, 
               1, true),
              ('professional', 'Professional', 'Full accounting features for growing businesses', 
               '{"users": 5, "connections": 2, "reports": 50, "storage": 5000, "apiCalls": 10000, "powerBiDashboards": 2}'::jsonb, 
               2, true),
              ('enterprise', 'Enterprise', 'Unlimited access with priority support', 
               '{"users": -1, "connections": -1, "reports": -1, "storage": -1, "apiCalls": -1, "powerBiDashboards": -1}'::jsonb, 
               3, true)
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              limits = EXCLUDED.limits,
              display_order = EXCLUDED.display_order
          `);
          
          // Add subscription_plan_id column to organizations if it doesn't exist
          await client.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'accounting' 
                AND table_name = 'organizations' 
                AND column_name = 'subscription_plan_id'
              ) THEN
                ALTER TABLE accounting.organizations 
                ADD COLUMN subscription_plan_id VARCHAR(50) DEFAULT 'free';
              END IF;
            END $$;
          `);
          
          // Update ALL organizations to use 'free' plan to ensure FK constraint can be created
          // This prevents foreign key constraint violations during TypeORM synchronize
          // Use a transaction to ensure atomicity
          await client.query('BEGIN');
          try {
            // First, update NULL values
            const nullUpdateResult = await client.query(`
              UPDATE accounting.organizations 
              SET subscription_plan_id = 'free' 
              WHERE subscription_plan_id IS NULL
            `);
            console.log(`[Database] Updated ${nullUpdateResult.rowCount} organizations with NULL subscription_plan_id`);
            
            // Then, update any invalid values (not in subscription_plans table)
            const invalidUpdateResult = await client.query(`
              UPDATE accounting.organizations 
              SET subscription_plan_id = 'free' 
              WHERE subscription_plan_id IS NOT NULL 
              AND subscription_plan_id NOT IN (SELECT id FROM tenant.subscription_plans)
            `);
            console.log(`[Database] Updated ${invalidUpdateResult.rowCount} organizations with invalid subscription_plan_id`);
            
            // Finally, ensure ALL organizations have a valid subscription_plan_id
            // This is a safety check - set any remaining invalid values to 'free'
            const finalUpdateResult = await client.query(`
              UPDATE accounting.organizations 
              SET subscription_plan_id = 'free' 
              WHERE subscription_plan_id IS NOT NULL 
              AND NOT EXISTS (SELECT 1 FROM tenant.subscription_plans WHERE id = accounting.organizations.subscription_plan_id)
            `);
            console.log(`[Database] Final safety update: ${finalUpdateResult.rowCount} organizations`);
            
            // Verify all organizations now have valid subscription_plan_id
            const invalidCount = await client.query(`
              SELECT COUNT(*) as count 
              FROM accounting.organizations 
              WHERE subscription_plan_id IS NULL 
              OR subscription_plan_id NOT IN (SELECT id FROM tenant.subscription_plans)
            `);
            const invalidCountNum = parseInt(invalidCount.rows[0]?.count || '0');
            if (invalidCountNum > 0) {
              console.warn(`[Database] WARNING: ${invalidCountNum} organizations still have invalid subscription_plan_id`);
            } else {
              console.log(`[Database] ✅ All organizations have valid subscription_plan_id`);
            }
            
            // Fix user_profiles with invalid organization_id references
            // This prevents FK constraint violations when TypeORM synchronizes
            const userProfilesUpdateResult = await client.query(`
              UPDATE accounting.user_profiles 
              SET organization_id = NULL 
              WHERE organization_id IS NOT NULL 
              AND organization_id NOT IN (SELECT id FROM accounting.organizations)
            `);
            console.log(`[Database] Updated ${userProfilesUpdateResult.rowCount} user_profiles with invalid organization_id`);
            
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            console.error("[Database] Error updating organizations:", error.message);
            throw error;
          }
          
          // Create platform admin tables if they don't exist
          // These are required for the admin panel to function
          console.log("[Database] Creating platform admin tables...");
          
          // Create permissions table
          await client.query(`
            CREATE TABLE IF NOT EXISTS platform.permissions (
              id VARCHAR(100) PRIMARY KEY,
              name VARCHAR(100) NOT NULL,
              description TEXT,
              category VARCHAR(50) NOT NULL,
              is_dangerous BOOLEAN DEFAULT false,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
          `);
          
          // Create groups table
          await client.query(`
            CREATE TABLE IF NOT EXISTS platform.groups (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name VARCHAR(100) NOT NULL UNIQUE,
              description TEXT,
              tier_level INTEGER DEFAULT 1,
              is_system BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
          `);
          
          // Create admin_users table
          await client.query(`
            CREATE TABLE IF NOT EXISTS platform.admin_users (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              keycloak_id VARCHAR(100) NOT NULL UNIQUE,
              email VARCHAR(255) NOT NULL,
              display_name VARCHAR(255),
              avatar_url VARCHAR(500),
              is_active BOOLEAN DEFAULT true,
              mfa_enabled BOOLEAN DEFAULT false,
              last_access_at TIMESTAMP WITH TIME ZONE,
              invited_by UUID REFERENCES platform.admin_users(id),
              notes TEXT,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
              updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
          `);
          
          // Create user_groups junction table
          await client.query(`
            CREATE TABLE IF NOT EXISTS platform.user_groups (
              user_id UUID NOT NULL REFERENCES platform.admin_users(id) ON DELETE CASCADE,
              group_id UUID NOT NULL REFERENCES platform.groups(id) ON DELETE CASCADE,
              PRIMARY KEY (user_id, group_id)
            )
          `);
          
          // Create group_permissions junction table
          await client.query(`
            CREATE TABLE IF NOT EXISTS platform.group_permissions (
              group_id UUID NOT NULL REFERENCES platform.groups(id) ON DELETE CASCADE,
              permission_id VARCHAR(100) NOT NULL REFERENCES platform.permissions(id) ON DELETE CASCADE,
              PRIMARY KEY (group_id, permission_id)
            )
          `);
          
          // Create audit_log table (matches AdminAuditLogEntity)
          await client.query(`
            CREATE TABLE IF NOT EXISTS platform.audit_log (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              admin_user_id UUID REFERENCES platform.admin_users(id),
              admin_email VARCHAR(255),
              action VARCHAR(100) NOT NULL,
              resource_type VARCHAR(50) NOT NULL,
              resource_id VARCHAR(100),
              resource_name VARCHAR(255),
              target_org_id UUID,
              target_org_name VARCHAR(255),
              target_user_id VARCHAR(100),
              target_user_email VARCHAR(255),
              before_state JSONB,
              after_state JSONB,
              metadata JSONB,
              ip_address VARCHAR(45),
              user_agent TEXT,
              session_id VARCHAR(100),
              duration_ms INTEGER,
              success BOOLEAN DEFAULT true,
              error_message TEXT,
              created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
            )
          `);
          
          // Seed default permissions
          await client.query(`
            INSERT INTO platform.permissions (id, name, description, category, is_dangerous)
            VALUES 
              ('org:list', 'List Organizations', 'View list of all organizations', 'org', false),
              ('org:view', 'View Organization', 'View organization details', 'org', false),
              ('org:create', 'Create Organization', 'Create new organizations', 'org', false),
              ('org:edit', 'Edit Organization', 'Edit organization settings', 'org', false),
              ('org:delete', 'Delete Organization', 'Soft delete organizations', 'org', true),
              ('org:hard_delete', 'Hard Delete Organization', 'Permanently delete organizations', 'org', true),
              ('user:list', 'List Users', 'View list of users', 'user', false),
              ('user:view', 'View User', 'View user details', 'user', false),
              ('user:create', 'Create User', 'Create new users', 'user', false),
              ('user:edit', 'Edit User', 'Edit user settings', 'user', false),
              ('user:delete', 'Delete User', 'Delete users', 'user', true),
              ('user:impersonate', 'Impersonate User', 'Login as another user', 'user', true),
              ('admin:list', 'List Admins', 'View admin users', 'admin', false),
              ('admin:create', 'Create Admin', 'Create admin users', 'admin', true),
              ('admin:disable', 'Disable Admin', 'Disable admin users', 'admin', true),
              ('group:list', 'List Groups', 'View admin groups', 'admin', false),
              ('group:assign', 'Assign Groups', 'Assign users to groups', 'admin', false),
              ('billing:view', 'View Billing', 'View billing information', 'billing', false),
              ('billing:manage', 'Manage Billing', 'Manage billing settings', 'billing', false),
              ('audit:view', 'View Audit Logs', 'View audit logs', 'audit', false),
              ('audit:export', 'Export Audit Logs', 'Export audit logs', 'audit', false),
              ('health:view', 'View Health', 'View system health', 'health', false),
              ('sync:view', 'View Sync', 'View sync status', 'sync', false),
              ('sync:manage', 'Manage Sync', 'Manage data sync', 'sync', false),
              ('notification:list', 'List Notifications', 'View notifications', 'notification', false),
              ('notification:create', 'Create Notification', 'Send notifications', 'notification', false),
              ('notification:delete', 'Delete Notification', 'Delete notifications', 'notification', false),
              ('integration:view', 'View Integrations', 'View integrations', 'integration', false),
              ('integration:manage', 'Manage Integrations', 'Manage integrations', 'integration', false),
              ('onboarding:view', 'View Onboarding', 'View onboarding progress', 'onboarding', false),
              ('onboarding:manage', 'Manage Onboarding', 'Manage onboarding', 'onboarding', false),
              ('communication:view', 'View Communications', 'View communications', 'communication', false),
              ('communication:send', 'Send Communication', 'Send communications', 'communication', false),
              ('chat:view', 'View Chats', 'View support chats', 'chat', false),
              ('chat:respond', 'Respond to Chats', 'Respond to support chats', 'chat', false)
            ON CONFLICT (id) DO NOTHING
          `);
          
          // Cleanup duplicate/stale groups (keep only Super Admin)
          await client.query(`
            DELETE FROM platform.group_permissions 
            WHERE group_id IN (
              SELECT id FROM platform.groups 
              WHERE id != '00000000-0000-0000-0000-000000000001'
            )
          `);
          await client.query(`
            DELETE FROM platform.user_groups 
            WHERE group_id IN (
              SELECT id FROM platform.groups 
              WHERE id != '00000000-0000-0000-0000-000000000001'
            )
          `);
          await client.query(`
            DELETE FROM platform.groups 
            WHERE id != '00000000-0000-0000-0000-000000000001'
          `);
          
          // Seed default Super Admin group
          await client.query(`
            INSERT INTO platform.groups (id, name, description, tier_level, is_system)
            VALUES ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Full access to all admin features', 100, true)
            ON CONFLICT (id) DO UPDATE SET name = 'Super Admin', description = 'Full access to all admin features'
          `);
          
          // Assign all permissions to Super Admin group
          await client.query(`
            INSERT INTO platform.group_permissions (group_id, permission_id)
            SELECT '00000000-0000-0000-0000-000000000001', id FROM platform.permissions
            ON CONFLICT DO NOTHING
          `);
          
          console.log("[Database] Platform admin tables created successfully");
          
          console.log("[Database] Schemas created successfully");
        } catch (error) {
          console.error("[Database] Schema creation error:", error.message);
        } finally {
          await client.end();
        }

        // Return DataSource - schemas are now created
        return new DataSource(options!);
      },
    }),
    TypeOrmModule.forFeature([
      OrganizationEntity,
      AccountEntity,
      UserProfileEntity,
      OrganizationSettingsEntity,
      UserSettingsEntity,
      DecisionEventEntity,
      IndustryPatternEntity,
      SharedDocumentEntity,
      EmailEventEntity,
      IndustryBenchmarkEntity,
      BenchmarkRefreshLogEntity,
      VisualizationEntity,
      CustomEntityEntity,
      SavedReportEntity,
      BoardMeetingEntity,
      ScenarioEntity,
      EntitlementEntity,
      SubscriptionPlanEntity,
      PermissionEntity,
      RoleEntity,
    ]),

    // Keycloak Authentication
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        authServerUrl:
          configService.get<string>("KEYCLOAK_URL") || "http://localhost:8080",
        realm: configService.get<string>("KEYCLOAK_REALM") || "plainledger",
        clientId:
          configService.get<string>("KEYCLOAK_CLIENT_ID") || "plainledger-api",
        secret:
          configService.get<string>("KEYCLOAK_CLIENT_SECRET") ||
          "change-me-in-production",
        bearerOnly: true,
      }),
      inject: [ConfigService],
    }),

    // Notifications (SES handled via SESEmailModule in SESAdapter)

    // MongoDB (Analytics & Audit - optional, graceful degradation)
    MongoDBModule,

    // Notifications (Novu)
    NovuModule,

    // GraphQL API
    GraphQLModule,

    // Intelligence Platform
    IntelligenceModule,

    // Platform Admin Module (admin.plainledger.ca)
    PlatformAdminModule,

    // Scheduled Jobs
    ScheduleModule.forRoot(),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: 60, // Time window in seconds
            limit: configService.get<number>("RATE_LIMIT_REQUESTS", 100), // Max requests per window
          },
        ],
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    HealthController,
    OrganizationController,
    ReportController,
    DataSourceController,
    OAuthCallbackController,
    ContactController,
    OnboardingController,
    AIController,
    AIFeedbackController,
    AnalyticsController,
    AIAnalyticsController,
    BIDataController,
    TeamController,
    AuthController,
    SyncAdminController,
    IdentityAdminController,
    UploadController,
    SettingsController,
    DocumentShareController,
    ShareController,
    EmailWebhookController,
    UnsubscribeController,
    CacheController,
    SimilarityController,
    ETLProgressController,
    DataSourceSyncController,
    ETLTriggerController,
    JobsController,
    PermissionsController,
    UserPermissionsController,
  ],
  providers: [
    // Guards - conditionally register Keycloak guards based on SKIP_AUTH
    // In development with SKIP_AUTH=true, we skip these guards to allow unauthenticated access
    ...(process.env.SKIP_AUTH === "true" &&
    process.env.NODE_ENV !== "production"
      ? []
      : [
          {
            provide: APP_GUARD,
            useClass: AuthGuard,
          },
          {
            provide: APP_GUARD,
            useClass: ResourceGuard,
          },
          {
            provide: APP_GUARD,
            useClass: RoleGuard,
          },
        ]),
    // Rate Limiting Guard (applies to all routes including GraphQL)
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    CPAAdminGuard,

    // Use Cases
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    GenerateBalanceSheetUseCase,
    GetEmbedConfigUseCase,
    ListAnalyticsReportsUseCase,
    UpdateOrgFeaturesUseCase,
    GenerateAIResponseUseCase,

    // Services
    AIService,
    AICacheService,
    PowerBIAdapter,
    PowerBIThemeAdapter,
    PowerBIDatalakeAdapter,
    DatalakeDataService,
    // Note: KeycloakAdminService, CacheService are provided by SharedServicesModule
    EmbeddingService,
    SimilaritySearchService,
    UserPermissionsService,
    ProviderFactory,
    QuickBooksService,
    QuickBooksProvider,
    ETLPublisherService,
    AccountBalancePublisherService,
    SettingsService,
    // Note: SESAdapter, EmailTemplatesService, HealthCheckService are provided by SharedServicesModule
    FileStorageService,
    DocumentShareService,
    JourneyTrackingService,
    CustomerJourneyJob,
    DataRetentionJob,
    TaxCreditSyncJob,
    S3CleanupAdapter,
    BenchmarkRefreshService,
    BenchmarkHealthService,
    ISEDBenchmarkService,
    StatsCanBenchmarkService,
    JobConfigurationService,
    {
      provide: "IPowerBIAdapter",
      useClass: PowerBIAdapter,
    },
    // Register interfaces for dependency injection
    {
      provide: "IAIService",
      useClass: AIService,
    },
    {
      provide: "IDatalakeDataService",
      useClass: DatalakeDataService,
    },
    {
      provide: "IPowerBIDatalakeService",
      useClass: PowerBIDatalakeAdapter,
    },
    {
      provide: "IKeycloakAdminService",
      useExisting: KeycloakAdminService, // Use existing instance instead of creating another
    },
    // INotificationService removed - use SESAdapter directly

    // GraphQL Resolvers
    FinancialResolver,
    OrganizationResolver,
    DataSourceResolver,
    MarketAnalysisResolver,
    TaxCreditResolver,
    VisualizationResolver,
    UserSettingsResolver,
    GqlAuthGuard,

    // GraphQL PubSub for subscriptions - keep mock for services that inject it
    {
      provide: "PUB_SUB",
      useValue: {
        publish: () => Promise.resolve(),
        subscribe: () => ({ [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }) }),
        asyncIterator: () => ({ [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }) }),
      },
    },

    // Repositories (Adapters)
    {
      provide: "IOrganizationRepository",
      useClass: PostgresOrganizationRepository,
    },
    {
      provide: "IAccountRepository",
      useClass: PostgresAccountRepository,
    },
    // TODO: Implement these repositories
    {
      provide: "IAnalyticsReportRepository",
      useClass: PostgresAnalyticsReportRepository,
    },
    {
      provide: "IOrganizationFeaturesRepository",
      useClass: PostgresOrganizationFeaturesRepository,
    },
    PostgresUserProfileRepository,
    PostgresOrganizationSettingsRepository,
    PostgresUserSettingsRepository,
    DatabaseInitializerService,
    DecisionRepository,
    {
      provide: DECISION_REPOSITORY_TOKEN,
      useClass: DecisionRepository,
    },

    // MongoDB Repositories (Analytics & Audit)
    AnalyticsRepository,
    AuditRepository,

    // CRM (HubSpot)
    HubSpotAdapter,

    // Visualization & Custom Entity Repositories
    PostgresVisualizationRepository,
    PostgresCustomEntityRepository,
    {
      provide: "IVisualizationRepository",
      useClass: PostgresVisualizationRepository,
    },
    {
      provide: "ICustomEntityRepository",
      useClass: PostgresCustomEntityRepository,
    },
    {
      provide: "IDataSourceMetadataService",
      useClass: DataSourceMetadataService,
    },
    AthenaQueryAdapter,
    {
      provide: "IQueryExecutor",
      useClass: AthenaQueryAdapter,
    },
    CustomEntityService,
    VisualizationQueryService,

    // Centralized Application Configuration
    {
      provide: AppConfig,
      useFactory: (configService: ConfigService) =>
        new AppConfig(configService),
      inject: [ConfigService],
    },
  ],
  exports: [
    AppConfig,
    // Note: KeycloakAdminService, SESAdapter, CacheService, EmailTemplatesService, HealthCheckService
    // are exported by SharedServicesModule (which is @Global())
  ],
})
export class AppModule {}
