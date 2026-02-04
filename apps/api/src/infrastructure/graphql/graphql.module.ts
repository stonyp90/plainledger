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
          // Schema generation - use in-memory (no file system access needed in Docker)
          // Write to /tmp in development if file system access is needed
          autoSchemaFile: isProduction ? true : join("/tmp", "schema.gql"),
          sortSchema: true,

          // Security settings
          playground: !isProduction,
          introspection:
            !isProduction ||
            configService.get<boolean>("GRAPHQL_INTROSPECTION"),

          // Context setup - pass request for auth
          context: ({
            req,
            res,
            connection,
          }: {
            req?: Request;
            res?: Response;
            connection?: any;
          }) => {
            // Support both HTTP (queries/mutations) and WebSocket (subscriptions)
            if (connection) {
              // WebSocket connection for subscriptions
              return {
                req: connection.context?.req,
                res: connection.context?.res,
                connection,
              };
            }
            // HTTP request for queries/mutations
            return {
              req,
              res,
            };
          },

          // CORS handled by NestJS main config
          cors: false,

          // Path configuration
          path: "/graphql",

          // Subscriptions configuration (WebSocket)
          // DISABLED in production - WebSocket causes app.listen() to hang in ECS/Fargate
          // See: https://github.com/apollographql/apollo-server/issues/6855
          // TODO: Re-enable after investigating ECS networking/ALB WebSocket configuration
          subscriptions: isProduction
            ? undefined
            : {
                "graphql-ws": {
                  path: "/graphql",
                  onConnect: (context: any) => {
                    // Extract auth token from connection params
                    const token =
                      context.connectionParams?.authorization?.replace(
                        "Bearer ",
                        "",
                      );
                    return { token };
                  },
                  onDisconnect: () => {
                    // Cleanup on disconnect
                  },
                },
                "subscriptions-transport-ws": false, // Legacy protocol, disabled
              },

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
