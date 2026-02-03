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

export function createSwaggerConfig(isProduction = false) {
  const builder = new DocumentBuilder()
    .setTitle("PlainLedger API")
    .setDescription(
      `Financial Reporting Platform API - Clean Architecture

## Authentication
This API uses JWT Bearer tokens from Keycloak for authentication.
To authenticate:
1. Log in via the PlainLedger web app or directly to Keycloak
2. Copy your access token
3. Click "Authorize" button and paste the token

## Multi-Tenancy
All requests require an \`X-Tenant-ID\` header to identify the organization context.

## Rate Limiting
API requests are rate-limited. Standard limits are 100 requests per minute per user.
`,
    )
    .setVersion("1.0.0")
    .setContact(
      "PlainLedger Support",
      "https://plainledger.ca",
      "support@plainledger.ca",
    )
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter JWT token from Keycloak",
        in: "header",
      },
      "bearer",
    )
    .addApiKey(
      {
        type: "apiKey",
        name: "X-Tenant-ID",
        in: "header",
        description: "Organization/Tenant ID for multi-tenant context",
      },
      "tenant-id",
    )
    .addTag("health", "Health check and system status endpoints")
    .addTag("organizations", "Organization management and settings")
    .addTag("accounts", "Chart of accounts and financial categories")
    .addTag("reports", "Financial reports generation and management")
    .addTag("integrations", "Data source integrations (QuickBooks, Xero, etc.)")
    .addTag("analytics", "Analytics, insights, and benchmarking")
    .addTag("ai", "AI-powered features and assistants")
    .addTag("files", "File uploads and document management")
    .addTag("cache", "Cache management (admin only)")
    .addTag("sync", "Data synchronization status and triggers")
    // Platform Admin Console Tags
    .addTag("Platform Admin - Organizations", "Manage all organizations (admin.plainledger.ca)")
    .addTag("Platform Admin - Users", "Manage all users across organizations")
    .addTag("Platform Admin - Audit", "View and export audit logs")
    .addTag("Platform Admin - Admin Management", "Manage admin users, groups, and permissions");

  // Add servers based on environment
  // In production, we want relative URLs to work behind reverse proxy
  if (isProduction) {
    // Use relative URL for production - this ensures Swagger works
    // correctly behind ALB/reverse proxy without hardcoded domains
    builder.addServer("/", "Current Server");
    // Also add the explicit production URL for external API consumers
    const prodDomain = process.env.CORS_ORIGIN?.split(",")[0] || "https://plainledger.ca";
    builder.addServer(prodDomain, "Production");
  } else {
    // Local development
    builder.addServer("http://localhost:3000", "Local Development");
    builder.addServer("https://plainledger.ca", "Production");
  }

  return builder.build();
}

/**
 * Export OpenAPI spec for contract testing
 */
export async function exportOpenAPISpec(
  app: any,
  isProduction = false,
): Promise<any> {
  const { SwaggerModule } = await import("@nestjs/swagger");
  const config = createSwaggerConfig(isProduction);
  return SwaggerModule.createDocument(app, config);
}
