/**
 * Team Controller
 * Handles team management: invitations, member listing, role management
 * Uses Keycloak Admin API for user creation and management
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { AuthenticatedUser, Roles } from "nest-keycloak-connect";
import { IsEmail, IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { KeycloakAdminService, KeycloakUser } from "@infrastructure/auth/keycloak-admin.service";

// =====================================================
// DTOs
// =====================================================

class InviteTeamMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  role?: string; // viewer, accountant, admin, owner
}

class BulkInviteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteTeamMemberDto)
  invites: InviteTeamMemberDto[];
}

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  role?: string;
}

interface AuthUser {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  realm_access?: {
    roles: string[];
  };
}

// =====================================================
// CONTROLLER
// =====================================================

@Controller("team")
export class TeamController {
  private readonly logger = new Logger(TeamController.name);

  constructor(private readonly keycloakAdminService: KeycloakAdminService) {}

  /**
   * Invite a team member to the organization
   * Creates user in Keycloak if they don't exist, sends invitation email
   */
  @Post("invite")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async inviteTeamMember(
    @Body() dto: InviteTeamMemberDto,
    @AuthenticatedUser() user: AuthUser,
  ) {
    this.logger.log(`User ${user.email} inviting ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("Team management is not configured. Contact administrator.");
    }

    try {
      // Get organization info from current user's attributes
      const currentUser = await this.keycloakAdminService.findUserById(user.sub);
      const organizationId = currentUser?.attributes?.organization?.[0] || user.sub;
      const organizationName = currentUser?.attributes?.organizationName?.[0] || "PlainLedger";
      const industry = currentUser?.attributes?.industry?.[0];

      const invitedUser = await this.keycloakAdminService.inviteTeamMember({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationId,
        organizationName,
        industry,
        role: dto.role || "viewer",
        invitedBy: user.email || user.sub,
      });

      return {
        success: true,
        message: `Invitation sent to ${dto.email}`,
        user: {
          id: invitedUser.id,
          email: invitedUser.email,
          firstName: invitedUser.firstName,
          lastName: invitedUser.lastName,
          emailVerified: invitedUser.emailVerified,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to invite team member: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to invite team member: ${error.message}`);
    }
  }

  /**
   * Bulk invite multiple team members
   */
  @Post("invite/bulk")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async bulkInviteTeamMembers(
    @Body() dto: BulkInviteDto,
    @AuthenticatedUser() user: AuthUser,
  ) {
    this.logger.log(`User ${user.email} bulk inviting ${dto.invites.length} members`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("Team management is not configured. Contact administrator.");
    }

    const results: Array<{ email: string; success: boolean; message: string; userId?: string }> = [];

    // Get organization info once
    const currentUser = await this.keycloakAdminService.findUserById(user.sub);
    const organizationId = currentUser?.attributes?.organization?.[0] || user.sub;
    const organizationName = currentUser?.attributes?.organizationName?.[0] || "PlainLedger";
    const industry = currentUser?.attributes?.industry?.[0];

    for (const invite of dto.invites) {
      try {
        const invitedUser = await this.keycloakAdminService.inviteTeamMember({
          email: invite.email,
          firstName: invite.firstName,
          lastName: invite.lastName,
          organizationId,
          organizationName,
          industry,
          role: invite.role || "viewer",
          invitedBy: user.email || user.sub,
        });

        results.push({
          email: invite.email,
          success: true,
          message: "Invitation sent",
          userId: invitedUser.id,
        });
      } catch (error) {
        results.push({
          email: invite.email,
          success: false,
          message: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return {
      success: successCount > 0,
      message: `${successCount}/${dto.invites.length} invitations sent`,
      results,
    };
  }

  /**
   * Get all team members for current organization
   */
  @Get("members")
  @HttpCode(HttpStatus.OK)
  async getTeamMembers(@AuthenticatedUser() user: AuthUser) {
    this.logger.log(`User ${user.email} listing team members`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("Team management is not configured. Contact administrator.");
    }

    try {
      // Get organization ID from current user
      const currentUser = await this.keycloakAdminService.findUserById(user.sub);
      const organizationId = currentUser?.attributes?.organization?.[0] || user.sub;

      const members = await this.keycloakAdminService.getUsersByOrganization(organizationId);

      return {
        success: true,
        organizationId,
        members: members.map((m) => ({
          id: m.id,
          email: m.email,
          firstName: m.firstName,
          lastName: m.lastName,
          emailVerified: m.emailVerified,
          enabled: m.enabled,
          role: m.attributes?.role?.[0] || "viewer",
          invitedBy: m.attributes?.invitedBy?.[0],
          invitedAt: m.attributes?.invitedAt?.[0],
          createdTimestamp: m.createdTimestamp,
        })),
        count: members.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get team members: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get team members: ${error.message}`);
    }
  }

  /**
   * Remove a team member from the organization
   */
  @Delete("members/:userId")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async removeTeamMember(
    @Param("userId") userId: string,
    @AuthenticatedUser() user: AuthUser,
  ) {
    this.logger.log(`User ${user.email} removing team member ${userId}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("Team management is not configured. Contact administrator.");
    }

    // Cannot remove yourself
    if (userId === user.sub) {
      throw new ForbiddenException("Cannot remove yourself from the team");
    }

    try {
      // Verify user belongs to same organization
      const currentUser = await this.keycloakAdminService.findUserById(user.sub);
      const targetUser = await this.keycloakAdminService.findUserById(userId);

      if (!targetUser) {
        throw new NotFoundException("User not found");
      }

      const currentOrg = currentUser?.attributes?.organization?.[0];
      const targetOrg = targetUser?.attributes?.organization?.[0];

      if (currentOrg !== targetOrg) {
        throw new ForbiddenException("User does not belong to your organization");
      }

      // Disable user instead of deleting (safer)
      await this.keycloakAdminService.disableUser(userId);

      return {
        success: true,
        message: `Team member ${targetUser.email} has been removed`,
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to remove team member: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to remove team member: ${error.message}`);
    }
  }

  /**
   * Admin endpoint: Create a user directly via API
   * Useful for admin tools, bulk imports, or testing
   */
  @Post("users/create")
  @HttpCode(HttpStatus.CREATED)
  @Roles({ roles: ["admin"] })
  async createUser(
    @Body() dto: CreateUserDto,
    @AuthenticatedUser() user: AuthUser,
  ): Promise<{ success: boolean; user: KeycloakUser }> {
    this.logger.log(`Admin ${user.email} creating user ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("User management is not configured. Contact administrator.");
    }

    try {
      const createdUser = await this.keycloakAdminService.createUser({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: dto.password,
        temporaryPassword: !!dto.password, // If password provided, make it temporary
        emailVerified: false,
        sendVerificationEmail: true,
        attributes: {
          ...(dto.organizationId ? { organization: [dto.organizationId] } : {}),
          ...(dto.organizationName ? { organizationName: [dto.organizationName] } : {}),
          ...(dto.industry ? { industry: [dto.industry] } : {}),
        },
        roles: dto.role ? [dto.role] : ["viewer"],
      });

      return {
        success: true,
        user: createdUser,
      };
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Get user by email (admin only)
   */
  @Get("users/email/:email")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin"] })
  async getUserByEmail(
    @Param("email") email: string,
    @AuthenticatedUser() user: AuthUser,
  ) {
    this.logger.log(`Admin ${user.email} looking up user ${email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("User management is not configured. Contact administrator.");
    }

    try {
      const foundUser = await this.keycloakAdminService.findUserByEmail(email);

      if (!foundUser) {
        throw new NotFoundException(`User not found: ${email}`);
      }

      return {
        success: true,
        user: foundUser,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to find user: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find user: ${error.message}`);
    }
  }

  /**
   * Resend invitation/verification email
   */
  @Post("members/:userId/resend-invite")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async resendInvitation(
    @Param("userId") userId: string,
    @AuthenticatedUser() user: AuthUser,
  ) {
    this.logger.log(`User ${user.email} resending invitation to ${userId}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException("Team management is not configured. Contact administrator.");
    }

    try {
      const targetUser = await this.keycloakAdminService.findUserById(userId);

      if (!targetUser) {
        throw new NotFoundException("User not found");
      }

      // Send both verification and password reset if needed
      if (!targetUser.emailVerified) {
        await this.keycloakAdminService.sendVerificationEmail(userId);
      }
      await this.keycloakAdminService.sendPasswordResetEmail(userId);

      return {
        success: true,
        message: `Invitation resent to ${targetUser.email}`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to resend invitation: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to resend invitation: ${error.message}`);
    }
  }

  /**
   * Health check for Keycloak Admin service
   */
  @Get("status")
  @HttpCode(HttpStatus.OK)
  async getServiceStatus() {
    return {
      keycloakAdmin: {
        available: this.keycloakAdminService.isAvailable(),
        message: this.keycloakAdminService.isAvailable()
          ? "Keycloak Admin API is available"
          : "Keycloak Admin API is not configured",
      },
    };
  }
}
