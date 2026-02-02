/**
 * Permissions Controller
 * Handles permission checks for various features
 * Uses database-backed authorization with Keycloak roles fallback
 */

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CurrentUser } from "@infrastructure/auth/current-user.decorator";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";

// DTOs for Swagger documentation
class StorybookAccessResponseDto {
  allowed: boolean;
}

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
   * 
   * Checks multiple authorization sources:
   * 1. Database featureFlags.storybook:access
   * 2. Keycloak role: storybook-viewer
   * 3. Keycloak role: plainledger-staff (internal staff)
   * 4. Keycloak role: admin or plainledger-admin
   * 
   * @returns {StorybookAccessResponseDto} Permission check result
   */
  @Get("storybook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Check Storybook access permission",
    description:
      "Verifies if the authenticated user has permission to access Storybook component library. " +
      "Checks both database-backed permissions and Keycloak roles.",
  })
  @ApiResponse({
    status: 200,
    description: "Permission check result",
    type: StorybookAccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Missing or invalid authentication token",
  })
  async checkStorybookAccess(
    @CurrentUser() user: { sub: string; email?: string; roles?: string[] },
  ): Promise<StorybookAccessResponseDto> {
    if (!user || !user.sub) {
      throw new UnauthorizedException("User not authenticated");
    }

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
        `Storybook access for ${user.sub} (${user.email}): ${hasAccess ? "allowed" : "denied"}`,
      );

      return { allowed: hasAccess };
    } catch (error) {
      this.logger.error(
        `Error checking Storybook access: ${error.message}`,
        error.stack,
      );
      // Deny access on error for security (fail-secure)
      return { allowed: false };
    }
  }
}
