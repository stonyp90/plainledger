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

// Infrastructure - Auth
import { KeycloakAdminService } from "@infrastructure/auth/keycloak-admin.service";
import { AIService } from "@infrastructure/ai/ai.service";
import { PowerBIService } from "@infrastructure/services/powerbi.service";
import { PowerBIThemeService } from "@infrastructure/services/powerbi-theme.service";
import { PowerBIDatalakeService } from "@infrastructure/services/powerbi-datalake.service";
import { DatalakeDataService } from "@infrastructure/services/datalake-data.service";
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

// Repositories
import { PostgresOrganizationRepository } from "@infrastructure/persistence/postgres/postgres-organization.repository";
import { PostgresAccountRepository } from "@infrastructure/persistence/postgres/postgres-account.repository";
import { PostgresAnalyticsReportRepository } from "@infrastructure/persistence/postgres/postgres-analytics-report.repository";
import { PostgresOrganizationFeaturesRepository } from "@infrastructure/persistence/postgres/postgres-organization-features.repository";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";

// Notifications
import { NovuModule } from "./notifications/novu.service";

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
        entities: [OrganizationEntity, AccountEntity, UserProfileEntity],
        synchronize: process.env.NODE_ENV !== "production",
        logging: process.env.NODE_ENV !== "production",
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([OrganizationEntity, AccountEntity, UserProfileEntity]),

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

    // Services
    AIService,
    PowerBIService,
    PowerBIThemeService,
    PowerBIDatalakeService,
    DatalakeDataService,
    KeycloakAdminService,
    {
      provide: "IPowerBIService",
      useClass: PowerBIService,
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
  ],
})
export class AppModule {}
