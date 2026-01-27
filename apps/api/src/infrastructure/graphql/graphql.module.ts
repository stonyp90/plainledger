/**
 * GraphQL Module
 *
 * Configures Apollo Server with NestJS.
 * Following best practices:
 * - Schema-first approach with code generation
 * - Playground disabled in production
 * - Introspection controlled by environment
 * - CSRF protection enabled
 */
import { Module } from "@nestjs/common";
import { GraphQLModule as NestGraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";

// Resolvers
import { FinancialResolver } from "./resolvers/financial.resolver";
import { OrganizationResolver } from "./resolvers/organization.resolver";
import { DataSourceResolver } from "./resolvers/datasource.resolver";

// Guards
import { GqlAuthGuard } from "./guards/gql-auth.guard";

// Use Cases
import { CreateOrganizationUseCase } from "@application/use-cases/create-organization.use-case";
import { GetOrganizationUseCase } from "@application/use-cases/get-organization.use-case";
import { GenerateBalanceSheetUseCase } from "@application/use-cases/generate-balance-sheet.use-case";
import { UpdateOrgFeaturesUseCase } from "@application/use-cases/update-org-features.use-case";

@Module({
  imports: [
    ConfigModule,
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>("NODE_ENV") === "production";
        
        return {
          // Schema generation
          autoSchemaFile: join(process.cwd(), "src/schema.gql"),
          sortSchema: true,
          
          // Security settings
          playground: !isProduction,
          introspection: !isProduction || configService.get<boolean>("GRAPHQL_INTROSPECTION"),
          
          // Context setup - pass request for auth
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
          
          // CORS handled by NestJS main config
          cors: false,
          
          // Path configuration
          path: "/graphql",
          
          // Performance & Security
          cache: "bounded",
          persistedQueries: false, // Disable for now, can enable with Redis
          
          // Error formatting - hide internal errors in production
          formatError: (error) => {
            const originalError = error.extensions?.originalError as { message?: string } | undefined;
            
            if (isProduction) {
              // Don't expose internal error details
              return {
                message: error.message,
                path: error.path,
                extensions: {
                  code: error.extensions?.code || "INTERNAL_ERROR",
                },
              };
            }
            
            // Development: include full error details
            return {
              message: error.message,
              path: error.path,
              locations: error.locations,
              extensions: {
                code: error.extensions?.code,
                stacktrace: error.extensions?.stacktrace,
                originalError: originalError?.message,
              },
            };
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    // Resolvers
    FinancialResolver,
    OrganizationResolver,
    DataSourceResolver,
    
    // Guards
    GqlAuthGuard,
    
    // Use Cases (injected into resolvers)
    CreateOrganizationUseCase,
    GetOrganizationUseCase,
    GenerateBalanceSheetUseCase,
    UpdateOrgFeaturesUseCase,
  ],
  exports: [NestGraphQLModule],
})
export class GraphQLModule {}
