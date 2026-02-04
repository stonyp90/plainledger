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
  ],
})
export class PlatformAdminModule {}
