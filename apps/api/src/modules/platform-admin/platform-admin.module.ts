import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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

// Controllers
import { AdminOrganizationsController } from './controllers/admin-organizations.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAuditController } from './controllers/admin-audit.controller';
import { AdminAdminsController } from './controllers/admin-admins.controller';

// Note: KeycloakAdminService is imported from app.module.ts

@Module({
  imports: [
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
  ],
  providers: [
    // Guards
    PlatformAdminGuard,
    // Services
    AdminAuthService,
    AdminAuditService,
    AdminOrgService,
    AdminUserService,
    // Note: KeycloakAdminService is provided in app.module.ts and will be injected here
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
