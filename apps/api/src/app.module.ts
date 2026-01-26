import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from 'nest-keycloak-connect';

// Domain
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { AccountEntity } from '@infrastructure/persistence/postgres/entities/account.entity';

// Infrastructure
import { HealthController } from '@infrastructure/http/controllers/health.controller';
import { OrganizationController } from '@infrastructure/http/controllers/organization.controller';
import { ReportController } from '@infrastructure/http/controllers/report.controller';
import { DataSourceController } from '@infrastructure/http/controllers/datasource.controller';
import { ContactController } from '@infrastructure/http/controllers/contact.controller';

// Application - Use Cases
import { CreateOrganizationUseCase } from '@application/use-cases/create-organization.use-case';
import { GetOrganizationUseCase } from '@application/use-cases/get-organization.use-case';
import { GenerateBalanceSheetUseCase } from '@application/use-cases/generate-balance-sheet.use-case';

// Repositories
import { PostgresOrganizationRepository } from '@infrastructure/persistence/postgres/postgres-organization.repository';
import { PostgresAccountRepository } from '@infrastructure/persistence/postgres/postgres-account.repository';

// Notifications
import { NovuModule } from './notifications/novu.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
        username: configService.get<string>('DB_USERNAME') || 'postgres',
        password: configService.get<string>('DB_PASSWORD') || 'postgres',
        database: configService.get<string>('DB_NAME') || 'plainledger',
        entities: [OrganizationEntity, AccountEntity],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV !== 'production',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([OrganizationEntity, AccountEntity]),

    // Keycloak Authentication
    KeycloakConnectModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        authServerUrl: configService.get<string>('KEYCLOAK_URL') || 'http://localhost:8080',
        realm: configService.get<string>('KEYCLOAK_REALM') || 'clarifi',
        clientId: configService.get<string>('KEYCLOAK_CLIENT_ID') || 'clarifi-api',
        secret: configService.get<string>('KEYCLOAK_CLIENT_SECRET') || 'change-me-in-production',
        bearerOnly: true,
      }),
      inject: [ConfigService],
    }),

    // Notifications
    NovuModule,
  ],
  controllers: [HealthController, OrganizationController, ReportController, DataSourceController, ContactController],
  providers: [
    // Guards
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

    // Use Cases
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    GenerateBalanceSheetUseCase,

    // Repositories (Adapters)
    {
      provide: 'IOrganizationRepository',
      useClass: PostgresOrganizationRepository,
    },
    {
      provide: 'IAccountRepository',
      useClass: PostgresAccountRepository,
    },
  ],
})
export class AppModule {}
