/**
 * Swagger/OpenAPI Configuration
 *
 * Dynamically generates OpenAPI spec from decorators.
 * Ensures all endpoints are documented and contract-tested.
 *
 * CRITICAL: All controllers MUST use Swagger decorators:
 * - @ApiTags('tag-name') on controller
 * - @ApiOperation({ summary: '...' }) on each endpoint
 * - @ApiResponse({ status: 200, ... }) for all responses
 * - @ApiProperty() on DTOs
 */

import { DocumentBuilder } from "@nestjs/swagger";

export function createSwaggerConfig() {
  return new DocumentBuilder()
    .setTitle("PlainLedger API")
    .setDescription("Financial Reporting Platform API - Clean Architecture")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token from Keycloak",
      },
      "bearer",
    )
    .addTag("organizations", "Organization management")
    .addTag("accounts", "Chart of accounts")
    .addTag("reports", "Financial reports")
    .addTag("integrations", "Data source integrations")
    .addTag("analytics", "Analytics and insights")
    .addTag("ai", "AI-powered features")
    .addTag("health", "Health check endpoints")
    .addServer("https://plainledger.ca", "Production")
    .addServer("http://localhost:3000", "Local Development")
    .build();
}

/**
 * Export OpenAPI spec for contract testing
 */
export async function exportOpenAPISpec(app: any): Promise<any> {
  const { SwaggerModule } = await import("@nestjs/swagger");
  const config = createSwaggerConfig();
  return SwaggerModule.createDocument(app, config);
}
