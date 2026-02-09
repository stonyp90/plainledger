import {
  Controller,
  Get,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserPermissionsService, UserPermissions } from '@application/services/user-permissions.service';

/**
 * User Permissions Controller
 * Provides endpoints for fetching user permissions and entitlements
 */
@ApiTags('Users')
@Controller('users/me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserPermissionsController {
  private readonly logger = new Logger(UserPermissionsController.name);

  constructor(
    private readonly userPermissionsService: UserPermissionsService,
  ) {}

  @Get('permissions')
  @ApiOperation({
    summary: 'Get current user permissions and entitlements',
    description:
      'Returns the effective permissions and entitlements for the authenticated user ' +
      'based on their role and organization subscription plan.',
  })
  @ApiResponse({
    status: 200,
    description: 'User permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        entitlements: {
          type: 'array',
          items: { type: 'string' },
          description: 'Feature entitlements from organization subscription plan',
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Action permissions from user role',
        },
        limits: {
          type: 'object',
          description: 'Usage limits from subscription plan',
        },
        overrides: {
          type: 'array',
          items: { type: 'string' },
          description: 'Organization-specific entitlement overrides',
        },
        role: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            tierLevel: { type: 'number' },
          },
        },
        plan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMyPermissions(@Request() req: any): Promise<UserPermissions> {
    const user = req.user;
    const userId = user.sub || user.id;
    const organizationId = user.organizationId || user.organization;

    // Handle demo users or users without organization
    if (!organizationId || organizationId === 'demo-signup') {
      this.logger.log(`Returning default permissions for demo user: ${userId}`);
      // Return default free tier permissions for demo users
      return {
        entitlements: [], // No entitlements for free/demo users
        permissions: ['view'], // Basic view permission
        limits: {
          maxDataSources: 0,
          maxReportsPerMonth: 5,
          maxStorageGB: 0,
        },
        overrides: [],
        role: {
          id: 'viewer',
          name: 'Viewer',
          tierLevel: 1,
        },
        plan: {
          id: 'free',
          name: 'Free',
        },
      };
    }

    try {
      return await this.userPermissionsService.getUserPermissions(
        userId,
        organizationId,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to get permissions for user ${userId}, returning defaults: ${error.message}`,
      );
      // Return default permissions on error (graceful degradation)
      return {
        entitlements: [],
        permissions: ['view'],
        limits: {
          maxDataSources: 0,
          maxReportsPerMonth: 5,
          maxStorageGB: 0,
        },
        overrides: [],
        role: {
          id: 'viewer',
          name: 'Viewer',
          tierLevel: 1,
        },
        plan: {
          id: 'free',
          name: 'Free',
        },
      };
    }
  }
}
