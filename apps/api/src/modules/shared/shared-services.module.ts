import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeycloakAdminService } from '@infrastructure/auth/keycloak-admin.service';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { CacheService } from '@infrastructure/cache/cache.service';
import { EmailTemplatesService } from '@infrastructure/templates/email-templates.service';
import { HealthCheckService } from '@infrastructure/health/health-check.service';

/**
 * SharedServicesModule
 * 
 * This module provides singleton instances of services that need to be shared
 * across multiple modules WITHOUT creating duplicate instances.
 * 
 * Services with onModuleInit hooks (like KeycloakAdminService, CacheService) 
 * must only have ONE instance to avoid duplicate initialization calls.
 * 
 * By making this module @Global(), these services are available everywhere
 * without needing to import this module in every consumer module.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    KeycloakAdminService,
    SESAdapter,
    CacheService,
    EmailTemplatesService,
    HealthCheckService,
  ],
  exports: [
    KeycloakAdminService,
    SESAdapter,
    CacheService,
    EmailTemplatesService,
    HealthCheckService,
  ],
})
export class SharedServicesModule {}
