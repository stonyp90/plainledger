/**
 * GraphQL Module
 *
 * Configures Apollo Server with NestJS.
 * Following best practices:
 * - Schema-first approach with code generation
 * - Playground disabled in production
 * - Introspection controlled by environment
 * - CSRF protection enabled
 *
 * Note: Resolvers are provided in AppModule to ensure proper dependency injection
 * of use cases and repositories.
 */
import { Module } from "@nestjs/common";
import { GraphQLModule as NestGraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";

@Module({
  imports: [
    ConfigModule,
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>("NODE_ENV") === "production";

        return {
          // Schema generation - use in-memory for production (no file system access needed)
          // In development, write to src/schema.gql for IDE support
          autoSchemaFile: isProduction
            ? true
            : join(process.cwd(), "src/schema.gql"),
          sortSchema: true,

          // Security settings
          playground: !isProduction,
          introspection:
            !isProduction ||
            configService.get<boolean>("GRAPHQL_INTROSPECTION"),

          // Context setup - pass request for auth
          context: ({ req, res }: { req: Request; res: Response }) => ({
            req,
            res,
          }),

          // CORS handled by NestJS main config
          cors: false,

          // Path configuration
          path: "/graphql",

          // Performance & Security
          cache: "bounded",
          persistedQueries: false, // Disable for now, can enable with Redis

          // Error formatting - hide internal errors in production
          formatError: (error) => {
            const originalError = error.extensions?.originalError as
              | { message?: string }
              | undefined;

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
  exports: [NestGraphQLModule],
})
export class GraphQLModule {}
