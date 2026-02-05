import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import {
  AdminUserEntity,
  AdminGroupEntity,
  AdminPermissionEntity,
  AdminAuditLogEntity,
} from './entities';
import { WebhookLogEntity } from './entities/webhook-log.entity';
import { OnboardingProgressEntity } from './entities/onboarding-progress.entity';
import { CommunicationLogEntity } from './entities/communication-log.entity';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';
import { DataSourceConnectionEntity } from '@infrastructure/persistence/postgres/entities/data-source-connection.entity';
import { PushNotificationEntity } from '@infrastructure/persistence/postgres/entities/push-notification.entity';
import { AdminChatSessionEntity } from '@infrastructure/persistence/postgres/entities/admin-chat-session.entity';
import { AdminChatMessageEntity } from '@infrastructure/persistence/postgres/entities/admin-chat-message.entity';
import { EntitlementEntity } from '@infrastructure/persistence/postgres/entities/entitlement.entity';
import { SubscriptionPlanEntity } from '@infrastructure/persistence/postgres/entities/subscription-plan.entity';
import { PlanEntitlementEntity } from '@infrastructure/persistence/postgres/entities/plan-entitlement.entity';
import { PermissionEntity } from '@infrastructure/persistence/postgres/entities/permission.entity';
import { RoleEntity } from '@infrastructure/persistence/postgres/entities/role.entity';

// Guards
import { PlatformAdminGuard } from './guards/platform-admin.guard';

// Services
import { AdminAuthService } from './services/admin-auth.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminOrgService } from './services/admin-org.service';
import { AdminUserService } from './services/admin-user.service';
import { AdminHealthService } from './services/admin-health.service';
import { AdminOnboardingService } from './services/admin-onboarding.service';
import { AdminCommunicationService } from './services/admin-communication.service';
import { AdminNotificationService } from './services/admin-notification.service';
import { AdminChatService } from './services/admin-chat.service';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { EmailTemplatesService } from '@infrastructure/templates/email-templates.service';
import { HealthCheckService } from '@infrastructure/health/health-check.service';
import { CacheService } from '@infrastructure/cache/cache.service';

// Controllers
import { AdminOrganizationsController } from './controllers/admin-organizations.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminAdminsController } from './controllers/admin-admins.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminIntegrationController } from './controllers/admin-integration.controller';
import { AdminOnboardingController } from './controllers/admin-onboarding.controller';
import { AdminCommunicationController } from './controllers/admin-communication.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminChatController } from './controllers/admin-chat.controller';
import { AdminSubscriptionPlansController } from './controllers/admin-subscription-plans.controller';
import { AdminEntitlementsController } from './controllers/admin-entitlements.controller';
import { AdminRolesController } from './controllers/admin-roles.controller';
import { AdminPermissionsController } from './controllers/admin-permissions.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      // Platform admin entities
      AdminUserEntity,
      AdminGroupEntity,
      AdminPermissionEntity,
      AdminAuditLogEntity,
      WebhookLogEntity,
      OnboardingProgressEntity,
      CommunicationLogEntity,
      // Existing entities we need access to
      OrganizationEntity,
      UserProfileEntity,
      // New entities for notifications and chat
      DataSourceConnectionEntity,
      PushNotificationEntity,
      AdminChatSessionEntity,
      AdminChatMessageEntity,
      // Tenant permission entities
      EntitlementEntity,
      SubscriptionPlanEntity,
      PlanEntitlementEntity,
      PermissionEntity,
      RoleEntity,
    ]),
  ],
  controllers: [
    AdminOrganizationsController,
    AdminUsersController,
    AdminAuditController,
    AdminAdminsController,
    AdminDashboardController,
    AdminIntegrationController,
    AdminOnboardingController,
    AdminCommunicationController,
    AdminNotificationsController,
    AdminChatController,
    AdminSubscriptionPlansController,
    AdminEntitlementsController,
    AdminRolesController,
    AdminPermissionsController,
  ],
  providers: [
    // Guards
    PlatformAdminGuard,
    // Services
    AdminAuthService,
    AdminAuditService,
    AdminOrgService,
    AdminUserService,
    AdminHealthService,
    AdminOnboardingService,
    AdminCommunicationService,
    AdminNotificationService,
    AdminChatService,
    // External services
    KeycloakAdminService,
    SESAdapter,
    EmailTemplatesService,
    HealthCheckService,
    CacheService,
  ],
  exports: [
    PlatformAdminGuard,
    AdminAuthService,
    AdminAuditService,
    AdminOrgService,
    AdminUserService,
    AdminHealthService,
    AdminOnboardingService,
    AdminCommunicationService,
    AdminNotificationService,
    AdminChatService,
  ],
})
export class PlatformAdminModule {}
