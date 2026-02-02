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
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticatedUser, Roles } from "nest-keycloak-connect";
import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import * as crypto from "crypto";
import { IKeycloakAdminService } from "@application/ports/outbound/IKeycloakAdminService";
import { KeycloakUser } from "@infrastructure/auth/keycloak-admin.service";
import { SESAdapter } from "@infrastructure/adapters/email/ses/ses.adapter";

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

  constructor(
    @Inject("IKeycloakAdminService")
    private readonly keycloakAdminService: IKeycloakAdminService,
    private readonly sesEmailService: SESAdapter,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a signed verification token for email verification
   */
  private generateVerificationToken(userId: string, email: string): string {
    const secret = this.configService.get<string>(
      "VERIFICATION_SECRET",
      "plainledger-verification-secret",
    );
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const payload = `verify:${userId}:${email}:${expiry}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url")
      .substring(0, 16);
    return Buffer.from(`${payload}:${signature}`).toString("base64url");
  }

  /**
   * Generate a signed password reset token
   */
  private generatePasswordResetToken(userId: string, email: string): string {
    const secret = this.configService.get<string>(
      "RESET_PASSWORD_SECRET",
      "plainledger-reset-secret",
    );
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
    const payload = `reset:${userId}:${email}:${expiry}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url")
      .substring(0, 16);
    return Buffer.from(`${payload}:${signature}`).toString("base64url");
  }

  /**
   * Invite a team member to the organization
   * Creates user in Keycloak if they don't exist, sends branded invitation email via SES
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
      throw new BadRequestException(
        "Team management is not configured. Contact administrator.",
      );
    }

    if (!this.sesEmailService.isAvailable()) {
      throw new BadRequestException(
        "Email service is not configured. Contact administrator.",
      );
    }

    try {
      // Get organization info from current user's attributes
      const currentUser = await this.keycloakAdminService.findUserById(
        user.sub,
      );
      const organizationId =
        currentUser?.attributes?.organization?.[0] || user.sub;
      const organizationName =
        currentUser?.attributes?.organizationName?.[0] || "PlainLedger";
      const industry = currentUser?.attributes?.industry?.[0];

      // Create/update user in Keycloak (no emails sent by Keycloak)
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

      // Send branded invitation emails via SES
      const frontendUrl = this.configService.get<string>(
        "FRONTEND_URL",
        "https://plainledger.ca",
      );

      let verificationEmailSent = false;
      let passwordResetEmailSent = false;

      // For new users, send verification email
      if (!invitedUser.isExisting && !invitedUser.emailVerified) {
        const verificationToken = this.generateVerificationToken(
          invitedUser.id,
          dto.email,
        );
        const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        verificationEmailSent =
          await this.sesEmailService.sendVerificationEmail(
            dto.email,
            dto.firstName || "there",
            verifyUrl,
            invitedUser.id,
          );
      }

      // Send password reset email so they can set their password
      const resetToken = this.generatePasswordResetToken(
        invitedUser.id,
        dto.email,
      );
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      passwordResetEmailSent =
        await this.sesEmailService.sendPasswordResetEmail(
          dto.email,
          dto.firstName || "there",
          resetUrl,
          invitedUser.id,
        );

      this.logger.log(
        `Invitation emails sent to ${dto.email}: verification=${verificationEmailSent}, passwordReset=${passwordResetEmailSent}`,
      );

      return {
        success: true,
        message: `Invitation sent to ${dto.email}`,
        user: {
          id: invitedUser.id,
          email: invitedUser.email,
          firstName: invitedUser.firstName,
          lastName: invitedUser.lastName,
          emailVerified: invitedUser.emailVerified,
          isExisting: invitedUser.isExisting,
        },
        emailsSent: {
          verification: verificationEmailSent,
          passwordReset: passwordResetEmailSent,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to invite team member: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to invite team member: ${error.message}`,
      );
    }
  }

  /**
   * Bulk invite multiple team members
   * Sends branded invitation emails via SES
   */
  @Post("invite/bulk")
  @HttpCode(HttpStatus.OK)
  @Roles({ roles: ["admin", "owner"] })
  async bulkInviteTeamMembers(
    @Body() dto: BulkInviteDto,
    @AuthenticatedUser() user: AuthUser,
  ) {
    this.logger.log(
      `User ${user.email} bulk inviting ${dto.invites.length} members`,
    );

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "Team management is not configured. Contact administrator.",
      );
    }

    if (!this.sesEmailService.isAvailable()) {
      throw new BadRequestException(
        "Email service is not configured. Contact administrator.",
      );
    }

    const results: Array<{
      email: string;
      success: boolean;
      message: string;
      userId?: string;
      emailsSent?: { verification: boolean; passwordReset: boolean };
    }> = [];

    // Get organization info once
    const currentUser = await this.keycloakAdminService.findUserById(user.sub);
    const organizationId =
      currentUser?.attributes?.organization?.[0] || user.sub;
    const organizationName =
      currentUser?.attributes?.organizationName?.[0] || "PlainLedger";
    const industry = currentUser?.attributes?.industry?.[0];

    const frontendUrl = this.configService.get<string>(
      "FRONTEND_URL",
      "https://plainledger.ca",
    );

    for (const invite of dto.invites) {
      try {
        // Create/update user in Keycloak (no emails sent by Keycloak)
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

        // Send branded emails via SES
        let verificationEmailSent = false;
        let passwordResetEmailSent = false;

        // For new users, send verification email
        if (!invitedUser.isExisting && !invitedUser.emailVerified) {
          const verificationToken = this.generateVerificationToken(
            invitedUser.id,
            invite.email,
          );
          const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

          verificationEmailSent =
            await this.sesEmailService.sendVerificationEmail(
              invite.email,
              invite.firstName || "there",
              verifyUrl,
              invitedUser.id,
            );
        }

        // Send password reset email
        const resetToken = this.generatePasswordResetToken(
          invitedUser.id,
          invite.email,
        );
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        passwordResetEmailSent =
          await this.sesEmailService.sendPasswordResetEmail(
            invite.email,
            invite.firstName || "there",
            resetUrl,
            invitedUser.id,
          );

        results.push({
          email: invite.email,
          success: true,
          message: "Invitation sent",
          userId: invitedUser.id,
          emailsSent: {
            verification: verificationEmailSent,
            passwordReset: passwordResetEmailSent,
          },
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
      throw new BadRequestException(
        "Team management is not configured. Contact administrator.",
      );
    }

    try {
      // Get organization ID from current user
      const currentUser = await this.keycloakAdminService.findUserById(
        user.sub,
      );
      const organizationId =
        currentUser?.attributes?.organization?.[0] || user.sub;

      const members =
        await this.keycloakAdminService.getUsersByOrganization(organizationId);

      return {
        success: true,
        organizationId,
        members: members.map((m: KeycloakUser) => ({
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
      this.logger.error(
        `Failed to get team members: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to get team members: ${error.message}`,
      );
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
      throw new BadRequestException(
        "Team management is not configured. Contact administrator.",
      );
    }

    // Cannot remove yourself
    if (userId === user.sub) {
      throw new ForbiddenException("Cannot remove yourself from the team");
    }

    try {
      // Verify user belongs to same organization
      const currentUser = await this.keycloakAdminService.findUserById(
        user.sub,
      );
      const targetUser = await this.keycloakAdminService.findUserById(userId);

      if (!targetUser) {
        throw new NotFoundException("User not found");
      }

      const currentOrg = currentUser?.attributes?.organization?.[0];
      const targetOrg = targetUser?.attributes?.organization?.[0];

      if (currentOrg !== targetOrg) {
        throw new ForbiddenException(
          "User does not belong to your organization",
        );
      }

      // Disable user instead of deleting (safer)
      await this.keycloakAdminService.disableUser(userId);

      return {
        success: true,
        message: `Team member ${targetUser.email} has been removed`,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Failed to remove team member: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to remove team member: ${error.message}`,
      );
    }
  }

  /**
   * Admin endpoint: Create a user directly via API
   * Useful for admin tools, bulk imports, or testing
   * Sends branded verification email via SES (not Keycloak)
   */
  @Post("users/create")
  @HttpCode(HttpStatus.CREATED)
  @Roles({ roles: ["admin"] })
  async createUser(
    @Body() dto: CreateUserDto,
    @AuthenticatedUser() user: AuthUser,
  ): Promise<{ success: boolean; user: KeycloakUser; emailSent: boolean }> {
    this.logger.log(`Admin ${user.email} creating user ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "User management is not configured. Contact administrator.",
      );
    }

    try {
      // Create user WITHOUT sending Keycloak emails - we use SES for branding
      const createdUser = await this.keycloakAdminService.createUser({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        password: dto.password,
        temporaryPassword: !!dto.password,
        emailVerified: false,
        sendVerificationEmail: false, // We send via SES for consistent branding
        attributes: {
          ...(dto.organizationId ? { organization: [dto.organizationId] } : {}),
          ...(dto.organizationName
            ? { organizationName: [dto.organizationName] }
            : {}),
          ...(dto.industry ? { industry: [dto.industry] } : {}),
        },
        roles: dto.role ? [dto.role] : ["viewer"],
      });

      // Send branded verification email via SES
      let emailSent = false;
      if (this.sesEmailService.isAvailable()) {
        const verificationToken = this.generateVerificationToken(
          createdUser.id,
          dto.email,
        );
        const frontendUrl = this.configService.get<string>(
          "FRONTEND_URL",
          "https://plainledger.ca",
        );
        const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        emailSent = await this.sesEmailService.sendVerificationEmail(
          dto.email,
          dto.firstName || "there",
          verifyUrl,
          createdUser.id,
        );

        if (emailSent) {
          this.logger.log(`Verification email sent to ${dto.email} via SES`);
        } else {
          this.logger.warn(`Failed to send verification email to ${dto.email}`);
        }
      }

      return {
        success: true,
        user: createdUser,
        emailSent,
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
      throw new BadRequestException(
        "User management is not configured. Contact administrator.",
      );
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
   * Sends branded emails via SES (not Keycloak)
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
      throw new BadRequestException(
        "Team management is not configured. Contact administrator.",
      );
    }

    if (!this.sesEmailService.isAvailable()) {
      throw new BadRequestException(
        "Email service is not configured. Contact administrator.",
      );
    }

    try {
      const targetUser = await this.keycloakAdminService.findUserById(userId);

      if (!targetUser) {
        throw new NotFoundException("User not found");
      }

      const frontendUrl = this.configService.get<string>(
        "FRONTEND_URL",
        "https://plainledger.ca",
      );

      // Send verification email if not verified
      if (!targetUser.emailVerified) {
        const verificationToken = this.generateVerificationToken(
          userId,
          targetUser.email,
        );
        const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        await this.sesEmailService.sendVerificationEmail(
          targetUser.email,
          targetUser.firstName || "there",
          verifyUrl,
          userId,
        );
        this.logger.log(`Verification email resent to ${targetUser.email}`);
      }

      // Send password reset email
      const resetToken = this.generatePasswordResetToken(
        userId,
        targetUser.email,
      );
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.sesEmailService.sendPasswordResetEmail(
        targetUser.email,
        targetUser.firstName || "there",
        resetUrl,
        userId,
      );
      this.logger.log(`Password reset email sent to ${targetUser.email}`);

      return {
        success: true,
        message: `Invitation resent to ${targetUser.email}`,
        emailsResent: {
          verification: !targetUser.emailVerified,
          passwordReset: true,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Failed to resend invitation: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to resend invitation: ${error.message}`,
      );
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
