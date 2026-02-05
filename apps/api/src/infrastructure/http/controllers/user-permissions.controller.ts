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
    const organizationId = user.organizationId;

    if (!organizationId) {
      throw new Error('User is not associated with an organization');
    }

    return this.userPermissionsService.getUserPermissions(
      user.sub,
      organizationId,
    );
  }
}
