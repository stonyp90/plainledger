import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_GUARD } from "@nestjs/core";
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from "nest-keycloak-connect";

// Domain
import { OrganizationEntity } from "@infrastructure/persistence/postgres/entities/organization.entity";
import { AccountEntity } from "@infrastructure/persistence/postgres/entities/account.entity";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";
import { OrganizationSettingsEntity } from "@infrastructure/persistence/postgres/entities/organization-settings.entity";
import { UserSettingsEntity } from "@infrastructure/persistence/postgres/entities/user-settings.entity";

// Infrastructure - HTTP Controllers
import { HealthController } from "@infrastructure/http/controllers/health.controller";
import { OrganizationController } from "@infrastructure/http/controllers/organization.controller";
import { ReportController } from "@infrastructure/http/controllers/report.controller";
import { DataSourceController } from "@infrastructure/http/controllers/datasource.controller";
import { OAuthCallbackController } from "@infrastructure/http/controllers/oauth-callback.controller";
import { ContactController } from "@infrastructure/http/controllers/contact.controller";
import { OnboardingController } from "@infrastructure/http/controllers/onboarding.controller";
import { AIController } from "@infrastructure/http/controllers/ai.controller";
import { AnalyticsController } from "@infrastructure/http/controllers/analytics.controller";
import { PowerBIDataController } from "@infrastructure/http/controllers/powerbi-data.controller";
import { TeamController } from "@infrastructure/http/controllers/team.controller";
import { AuthController } from "@infrastructure/http/controllers/auth.controller";
import { SyncAdminController } from "@infrastructure/http/controllers/sync-admin.controller";
import { KeycloakAdminController } from "@infrastructure/http/controllers/keycloak-admin.controller";
import { UploadController } from "@infrastructure/http/controllers/upload.controller";
import { SettingsController } from "@infrastructure/http/controllers/settings.controller";

// Infrastructure - Auth
import { KeycloakAdminService } from "@infrastructure/auth/keycloak-admin.service";

// Infrastructure - Storage
import { FileStorageService } from "@infrastructure/storage/file-storage.service";
import { AIService } from "@infrastructure/ai/ai.service";
import { PowerBIService } from "@infrastructure/services/powerbi.service";
import { PowerBIThemeService } from "@infrastructure/services/powerbi-theme.service";
import { PowerBIDatalakeService } from "@infrastructure/services/powerbi-datalake.service";
import { DatalakeDataService } from "@infrastructure/services/datalake-data.service";
import { SettingsService } from "@infrastructure/services/settings.service";
import { CacheService } from "@infrastructure/cache/cache.service";
import { CPAAdminGuard } from "@infrastructure/http/guards/cpa-admin.guard";

// Infrastructure - GraphQL
import { GraphQLModule } from "@infrastructure/graphql/graphql.module";
import { FinancialResolver } from "@infrastructure/graphql/resolvers/financial.resolver";
import { OrganizationResolver } from "@infrastructure/graphql/resolvers/organization.resolver";
import { DataSourceResolver } from "@infrastructure/graphql/resolvers/datasource.resolver";
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
import { PostgresAccountRepository } from "@infrastructure/persistence/postgres/postgres-account.repository";
import { PostgresAnalyticsReportRepository } from "@infrastructure/persistence/postgres/postgres-analytics-report.repository";
import { PostgresOrganizationFeaturesRepository } from "@infrastructure/persistence/postgres/postgres-organization-features.repository";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";
import { PostgresOrganizationSettingsRepository } from "@infrastructure/persistence/postgres/postgres-organization-settings.repository";
import { PostgresUserSettingsRepository } from "@infrastructure/persistence/postgres/postgres-user-settings.repository";
import { DatabaseInitializerService } from "@infrastructure/persistence/postgres/database-initializer.service";

// Notifications
import {
  NovuModule,
  NovuService,
} from "./infrastructure/notifications/novu.service";
import { SESEmailService } from "./infrastructure/notifications/ses-email.service";

// Email Templates
import { EmailTemplatesService } from "./infrastructure/templates/email-templates.service";

@Module({
  imports: [
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
        host: configService.get<string>("DB_HOST") || "localhost",
        port: parseInt(configService.get<string>("DB_PORT") || "5432", 10),
        username: configService.get<string>("DB_USERNAME") || "postgres",
        password: configService.get<string>("DB_PASSWORD") || "postgres",
        database: configService.get<string>("DB_NAME") || "plainledger",
        entities: [
          OrganizationEntity,
          AccountEntity,
          UserProfileEntity,
          OrganizationSettingsEntity,
          UserSettingsEntity,
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
        const dataSource = new DataSource(options!);

        // Create schemas before initializing (which runs synchronize)
        const tempDs = new DataSource({
          ...options!,
          synchronize: false,
          logging: false,
        });

        try {
          await tempDs.initialize();
          await tempDs.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
          await tempDs.query("CREATE SCHEMA IF NOT EXISTS accounting");
          await tempDs.query("CREATE SCHEMA IF NOT EXISTS reporting");
          await tempDs.query("CREATE SCHEMA IF NOT EXISTS integration");
          console.log("[Database] Schemas created successfully");
          await tempDs.destroy();
        } catch (error) {
          console.error("[Database] Schema creation error:", error.message);
          try {
            await tempDs.destroy();
          } catch {
            // ignore
          }
        }

        return dataSource;
      },
    }),
    TypeOrmModule.forFeature([
      OrganizationEntity,
      AccountEntity,
      UserProfileEntity,
      OrganizationSettingsEntity,
      UserSettingsEntity,
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

    // Notifications
    NovuModule,

    // GraphQL API
    GraphQLModule,
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
    AnalyticsController,
    PowerBIDataController,
    TeamController,
    AuthController,
    SyncAdminController,
    KeycloakAdminController,
    UploadController,
    SettingsController,
  ],
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
    PowerBIService,
    PowerBIThemeService,
    PowerBIDatalakeService,
    DatalakeDataService,
    KeycloakAdminService,
    NovuService,
    CacheService,
    SettingsService,
    SESEmailService,
    EmailTemplatesService,
    FileStorageService,
    {
      provide: "IPowerBIService",
      useClass: PowerBIService,
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
      useClass: PowerBIDatalakeService,
    },
    {
      provide: "IKeycloakAdminService",
      useClass: KeycloakAdminService,
    },
    {
      provide: "INotificationService",
      useClass: NovuService,
    },

    // GraphQL Resolvers
    FinancialResolver,
    OrganizationResolver,
    DataSourceResolver,
    GqlAuthGuard,

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
  ],
})
export class AppModule {}
