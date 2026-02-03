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
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';

// Guards
import { PlatformAdminGuard } from './guards/platform-admin.guard';

// Services
import { AdminAuthService } from './services/admin-auth.service';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminOrgService } from './services/admin-org.service';
import { AdminUserService } from './services/admin-user.service';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { EmailTemplatesService } from '@infrastructure/templates/email-templates.service';

// Controllers
import { AdminOrganizationsController } from './controllers/admin-organizations.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminAdminsController } from './controllers/admin-admins.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      // Platform admin entities
      AdminUserEntity,
      AdminGroupEntity,
      AdminPermissionEntity,
      AdminAuditLogEntity,
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
  ],
  providers: [
    // Guards
    PlatformAdminGuard,
    // Services
    AdminAuthService,
    AdminAuditService,
    AdminOrgService,
    AdminUserService,
    // External services needed by AdminUserService
    KeycloakAdminService,
    SESAdapter,
    EmailTemplatesService,
  ],
  exports: [
    PlatformAdminGuard,
    AdminAuthService,
    AdminAuditService,
    AdminOrgService,
    AdminUserService,
  ],
})
export class PlatformAdminModule {}
