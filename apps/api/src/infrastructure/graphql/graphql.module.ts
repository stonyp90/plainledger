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

        // Build base config
        const baseConfig = {
          // Schema generation - use in-memory (no file system access needed in Docker)
          autoSchemaFile: isProduction ? true : join("/tmp", "schema.gql"),
          sortSchema: true,

          // Security settings
          playground: !isProduction,
          introspection:
            !isProduction ||
            configService.get<boolean>("GRAPHQL_INTROSPECTION"),

          // Context setup - pass request for auth (no WebSocket in production)
          context: ({ req, res }: { req?: Request; res?: Response }) => ({
            req,
            res,
          }),

          // CORS handled by NestJS main config
          cors: false,

          // Path configuration
          path: "/graphql",

          // Performance & Security
          cache: "bounded" as const,
          persistedQueries: false as const, // Disable for now, can enable with Redis

          // Error formatting - hide internal errors in production
          formatError: (error: any) => {
            const originalError = error.extensions?.originalError as
              | { message?: string }
              | undefined;

            if (isProduction) {
              return {
                message: error.message,
                path: error.path,
                extensions: {
                  code: error.extensions?.code || "INTERNAL_ERROR",
                },
              };
            }

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

        // Only add subscriptions config in non-production environments
        // In production, completely omit the subscriptions key to prevent
        // any WebSocket/subscription initialization that hangs app.listen()
        if (isProduction) {
          console.log("[GraphQL] Production mode - subscriptions DISABLED");
          return baseConfig;
        }

        console.log("[GraphQL] Development mode - subscriptions enabled");
        return {
          ...baseConfig,
          // Context with WebSocket support for development
          context: ({
            req,
            res,
            connection,
          }: {
            req?: Request;
            res?: Response;
            connection?: any;
          }) => {
            if (connection) {
              return {
                req: connection.context?.req,
                res: connection.context?.res,
                connection,
              };
            }
            return { req, res };
          },
          // Subscriptions only in development
          subscriptions: {
            "graphql-ws": {
              path: "/graphql",
              onConnect: (context: any) => {
                const token =
                  context.connectionParams?.authorization?.replace(
                    "Bearer ",
                    "",
                  );
                return { token };
              },
              onDisconnect: () => {},
            },
            "subscriptions-transport-ws": false,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestGraphQLModule],
})
export class GraphQLModule {}
