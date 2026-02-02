/**
 * Permissions Controller
 * Handles permission checks for various features
 * Uses database-backed authorization
 */

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CurrentUser } from "@infrastructure/auth/current-user.decorator";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";

@Controller("permissions")
@ApiTags("permissions")
@ApiBearerAuth()
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(
    private readonly userProfileRepository: PostgresUserProfileRepository,
  ) {}

  /**
   * Check if user has access to Storybook
   * Checks database for storybook:access permission
   */
  @Get("storybook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check Storybook access permission" })
  @ApiResponse({
    status: 200,
    description: "Permission check result",
    schema: {
      type: "object",
      properties: {
        allowed: { type: "boolean" },
      },
    },
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async checkStorybookAccess(
    @CurrentUser() user: { sub: string; email?: string; roles?: string[] },
  ): Promise<{ allowed: boolean }> {
    this.logger.log(`Checking Storybook access for user: ${user.sub}`);

    try {
      // Get user profile from database
      const userProfile = await this.userProfileRepository.findById(user.sub);

      if (!userProfile) {
        this.logger.warn(`User profile not found: ${user.sub}`);
        return { allowed: false };
      }

      // Check if user has storybook:access permission
      // Permissions are stored in featureFlags JSONB column
      // Format: { "storybook:access": true }
      const hasAccess =
        userProfile.featureFlags?.["storybook:access"] === true ||
        // Also check if user has storybook-viewer role in Keycloak
        user.roles?.includes("storybook-viewer") === true ||
        // Allow internal staff (plainledger-staff role)
        user.roles?.includes("plainledger-staff") === true ||
        // Allow admins
        user.roles?.includes("admin") === true ||
        user.roles?.includes("plainledger-admin") === true;

      this.logger.log(
        `Storybook access for ${user.sub}: ${hasAccess ? "allowed" : "denied"}`,
      );

      return { allowed: hasAccess };
    } catch (error) {
      this.logger.error(
        `Error checking Storybook access: ${error.message}`,
        error.stack,
      );
      // Deny access on error for security
      return { allowed: false };
    }
  }
}
