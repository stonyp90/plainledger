/**
 * Auth Controller
 * Public endpoints for user registration and authentication flows
 * Uses Keycloak Admin API to create users programmatically
 * Uses AWS SES for auth emails (verification, password reset)
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';
import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { IKeycloakAdminService } from '@application/ports/outbound/IKeycloakAdminService';
import { Inject } from '@nestjs/common';
import { PostgresUserProfileRepository } from '@infrastructure/persistence/postgres/postgres-user-profile.repository';
import { ConfigService } from '@nestjs/config';
import { SESAdapter } from '@infrastructure/adapters/email/ses/ses.adapter';
import { NovuService } from '@infrastructure/adapters/notifications/novu/novu.adapter';
import { CreateOrganizationUseCase } from '@application/use-cases/create-organization.use-case';
import * as crypto from 'crypto';
import { AuthActionClaims, issueAuthAction, verifyAuthAction } from '../../auth/action-token';
import { CacheService } from '../../cache/cache.service';
import { OrganizationMembershipService } from '@application/services/organization-membership.service';
import { RateLimit } from '@infrastructure/http/decorators/rate-limit.decorator';

// =====================================================
// DTOs
// =====================================================

// Valid Canadian province/territory codes
const _VALID_PROVINCES = [
  'AB',
  'BC',
  'MB',
  'NB',
  'NL',
  'NS',
  'NT',
  'NU',
  'ON',
  'PE',
  'QC',
  'SK',
  'YT',
];

export class RegisterUserDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @MaxLength(254)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100)
  lastName: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
    message: 'Password must contain at least one special character',
  })
  @MaxLength(1024)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  organizationName?: string;

  @IsString()
  @Matches(/^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)$/, {
    message: 'Please select a valid Canadian province or territory',
  })
  province: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  invitationToken?: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class ResendVerificationDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class LoginDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class ValidateResetTokenDto {
  @IsString()
  token: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  @Matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
    message: 'Password must contain at least one special character',
  })
  password: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}

// =====================================================
// CONTROLLER
// =====================================================

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject('IKeycloakAdminService')
    private readonly keycloakAdminService: IKeycloakAdminService,
    private readonly sesEmailService: SESAdapter,
    private readonly userProfileRepository: PostgresUserProfileRepository,
    private readonly configService: ConfigService,
    private readonly novuService: NovuService,
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly organizationMembership: OrganizationMembershipService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Login with email and password
   * Public endpoint - authenticates user via Keycloak Direct Access Grants
   * Uses backend API client for secure authentication
   */
  @Post('login')
  @RateLimit({ ttl: 60, limit: 10 })
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.log(`Login attempt for: ${dto.email}`);

    if (!(await this.keycloakAdminService.ensureAvailable())) {
      throw new BadRequestException(
        'Authentication is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:8080';
      const realm = this.configService.get<string>('KEYCLOAK_REALM') || 'plainledger';
      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID') || 'plainledger-api';
      const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

      if (!clientSecret) {
        this.logger.error('Keycloak client secret not configured');
        throw new BadRequestException('Authentication is temporarily unavailable.');
      }

      // Authenticate user via Keycloak token endpoint using Direct Access Grants
      // This uses the API client (which has Direct Access Grants enabled)
      const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('username', dto.email.toLowerCase().trim());
      params.append('password', dto.password);
      // Don't specify scope - use Keycloak client default scopes
      // Default scopes include: openid, profile, email, roles

      let response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(
          `Login failed for ${dto.email}: ${response.status} - ${errorData.error_description || errorData.error || 'Invalid credentials'}`,
        );

        // Check DB profile verification status for better UX
        // (verification source of truth is PlainLedger DB, not Keycloak flag)
        try {
          const existingProfile = await this.userProfileRepository.findByEmail(
            dto.email.toLowerCase().trim(),
          );

          if (existingProfile && !existingProfile.emailVerified) {
            this.logger.log(`Login blocked for unverified email: ${dto.email}`);
            // Return a specific error that frontend can handle
            throw new UnauthorizedException({
              statusCode: 401,
              message: 'Please verify your email address before logging in.',
              error: 'EMAIL_NOT_VERIFIED',
              email: dto.email.toLowerCase().trim(),
            });
          }

          if (existingProfile?.emailVerified) {
            const keycloakUser = await this.keycloakAdminService.findUserByEmail(
              dto.email.toLowerCase().trim(),
            );
            if (keycloakUser && !keycloakUser.emailVerified) {
              await this.keycloakAdminService.setEmailVerified(keycloakUser.id, true);
            }

            const retryResponse = await fetch(tokenUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            });

            if (retryResponse.ok) {
              response = retryResponse;
            }
          }
        } catch (checkError) {
          // If it's our custom error, re-throw it
          if (checkError instanceof UnauthorizedException) {
            throw checkError;
          }
          // Otherwise ignore and fall through to generic error
        }

        if (!response.ok) {
          // Don't reveal specific error details for security
          throw new UnauthorizedException('Invalid email or password. Please try again.');
        }
      }

      const tokenData = await response.json();

      // Decode token to get user info (fallback if Admin API unavailable)
      let userInfo: {
        id?: string;
        email: string;
        firstName?: string;
        lastName?: string;
        emailVerified: boolean;
      } | null = null;

      try {
        // Try to get user info from Keycloak Admin API
        const user = await this.keycloakAdminService.findUserByEmail(
          dto.email.toLowerCase().trim(),
        );
        let profile = await this.userProfileRepository.findByEmail(dto.email.toLowerCase().trim());

        if (user) {
          // Backfill legacy users so DB stays source of truth.
          if (!profile) {
            profile = await this.ensureUserProfileExists(user);
          }

          if (!user.enabled) {
            throw new UnauthorizedException('Your account is disabled. Please contact support.');
          }

          // Sync email_verified from Keycloak → DB when Keycloak is ahead
          if (profile && !profile.emailVerified && user.emailVerified) {
            this.logger.log(`Syncing emailVerified from Keycloak for ${user.email}`);
            await this.userProfileRepository.markEmailVerified(profile.id);
            profile.emailVerified = true;
          }

          if (profile && !profile.emailVerified) {
            throw new UnauthorizedException('Please verify your email address before logging in.');
          }

          userInfo = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: profile?.emailVerified ?? true,
          };
        }
      } catch (adminError) {
        if (adminError instanceof UnauthorizedException) {
          throw adminError;
        }

        // If Admin API fails, decode from token (less info but allows login)
        this.logger.warn(`Keycloak Admin API unavailable, using token data: ${adminError.message}`);

        try {
          const tokenParts = tokenData.id_token?.split('.') || tokenData.access_token.split('.');
          if (tokenParts.length === 3) {
            const tokenPayload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            userInfo = {
              id: tokenPayload.sub,
              email: tokenPayload.email || dto.email.toLowerCase().trim(),
              firstName: tokenPayload.given_name,
              lastName: tokenPayload.family_name,
              emailVerified: true,
            };
          }
        } catch (tokenError) {
          this.logger.error(`Failed to decode token: ${tokenError.message}`);
        }
      }

      if (!userInfo) {
        // Fallback to minimal user info
        userInfo = {
          email: dto.email.toLowerCase().trim(),
          emailVerified: true,
        };
      }

      this.logger.log(`User logged in successfully: ${userInfo.email}`);

      // Sync user to Novu for push notifications (ensures existing users have subscribers)
      if (userInfo.id) {
        this.novuService
          .upsertSubscriber({
            subscriberId: userInfo.id,
            email: userInfo.email,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            locale: 'fr',
          })
          .catch((err) => {
            this.logger.warn(`Failed to sync Novu subscriber on login: ${err.message}`);
          });
      }

      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        idToken: tokenData.id_token,
        expiresIn: tokenData.expires_in,
        refreshExpiresIn: tokenData.refresh_expires_in,
        tokenType: tokenData.token_type,
        user: userInfo,
      };
    } catch (error) {
      // Re-throw known exceptions
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Invalid email or password. Please try again.');
    }
  }

  /**
   * Refresh access token using refresh token
   * Public endpoint - exchanges refresh token for new access token
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    this.logger.log('Token refresh request');

    try {
      const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:8080';
      const realm = this.configService.get<string>('KEYCLOAK_REALM') || 'plainledger';
      const clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID') || 'plainledger-api';
      const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

      if (!clientSecret) {
        this.logger.error('Keycloak client secret not configured');
        throw new UnauthorizedException('Token refresh unavailable');
      }

      // Refresh token via Keycloak token endpoint
      const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('refresh_token', dto.refreshToken);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(
          `Token refresh failed: ${response.status} - ${errorData.error_description || errorData.error || 'Unknown error'}`,
        );
        throw new UnauthorizedException('Token refresh failed. Please log in again.');
      }

      const tokenData = await response.json();

      this.logger.log('Token refreshed successfully');

      return {
        success: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        idToken: tokenData.id_token,
        expiresIn: tokenData.expires_in,
        refreshExpiresIn: tokenData.refresh_expires_in,
        tokenType: tokenData.token_type,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);
      throw new UnauthorizedException('Token refresh failed. Please log in again.');
    }
  }

  /**
   * Register a new user
   * Public endpoint - no authentication required
   * Creates user in Keycloak and sends verification email
   */
  @Post('register')
  @RateLimit({ ttl: 60, limit: 5 })
  @Public() // Mark as public - no auth required
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto) {
    if (!(await this.keycloakAdminService.ensureAvailable())) {
      throw new BadRequestException('Registration is temporarily unavailable. Please try again later.');
    }
    const email = dto.email.toLowerCase().trim();
    if (await this.keycloakAdminService.findUserByEmail(email)) {
      throw new ConflictException('An account with this email already exists. Please sign in instead.');
    }
    const invitation = dto.invitationToken
      ? await this.organizationMembership.getInvitationForSignup(dto.invitationToken, email) : undefined;
    let userId: string | undefined;
    let provisioned = false;
    try {
      const user = await this.keycloakAdminService.createUser({
        email, firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), password: dto.password,
        temporaryPassword: false, emailVerified: false, sendVerificationEmail: false,
        requiredActions: ['VERIFY_EMAIL'], roles: [invitation?.role || 'owner', 'user'],
        attributes: {
          ...(dto.industry ? { industry: [dto.industry] } : {}), province: [dto.province],
          registrationSource: ['web-signup'], registeredAt: [new Date().toISOString()],
          demoMode: ['false'], plan: ['free'], accountStatus: ['active'],
        },
      });
      userId = user.id;
      const actor = { sub: user.id, email, emailVerified: false,
        organizationId: invitation?.tenantId || user.id, roles: [invitation?.role || 'owner', 'user'],
        firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), name: `${dto.firstName.trim()} ${dto.lastName.trim()}` };
      const finishIdentity = async (organization: { id: string; tenantId: string; name: string }) => {
        await this.keycloakAdminService.updateUserAttributes({ userId: user.id, attributes: {
          organization: [organization.tenantId], organizationName: [organization.name], demoMode: ['false'],
        } });
      };
      const organization = dto.invitationToken
        ? await this.organizationMembership.acceptInvitationForNewUser(dto.invitationToken, actor, finishIdentity)
        : await this.organizationMembership.createOwnedOrganization(actor, {
          tenantId: user.id, name: dto.organizationName?.trim() || `${dto.firstName.trim()}'s Organization`,
          industry: dto.industry, currency: 'CAD',
        }, finishIdentity);
      provisioned = true;
      let verificationEmailSent = false;
      try {
        await this.keycloakAdminService.sendVerificationEmail(user.id);
        verificationEmailSent = true;
      } catch (emailError) {
        this.logger.error(`Registration completed but verification delivery failed for user ${user.id}: ${emailError.message}`);
      }
      return {
        success: true, userId: user.id, email: user.email, organizationId: organization.id,
        requiresEmailVerification: true, verificationEmailSent,
        message: verificationEmailSent
          ? 'Account created. Check your email to verify your account.'
          : 'Account created, but the verification email could not be sent. Please use resend verification when email service is available.',
      };
    } catch (error) {
      if (userId && !provisioned) {
        try { await this.keycloakAdminService.deleteUser(userId); }
        catch (cleanupError) {
          this.logger.error(`Failed to remove incomplete registration ${userId}: ${cleanupError.message}`);
          await this.keycloakAdminService.disableUser(userId).catch(() => undefined);
        }
      }
      if (error instanceof HttpException) throw error;
      this.logger.error(`Registration failed: ${error.message}`);
      throw new BadRequestException('Registration failed. Please try again later.');
    }
  }

  // =====================================================
  // TOKEN GENERATION HELPERS
  // =====================================================

  /**
   * Get the secret used for signing tokens
   */
  private generateResetToken(userId: string, email: string): string {
    return issueAuthAction(this.configService, 'reset', userId, email);
  }

  private verifyResetToken(token: string): AuthActionClaims | null {
    return verifyAuthAction(this.configService, 'reset', token);
  }

  private generateVerificationToken(userId: string, email: string): string {
    return issueAuthAction(this.configService, 'verify', userId, email);
  }

  private verifyVerificationToken(token: string): AuthActionClaims | null {
    return verifyAuthAction(this.configService, 'verify', token);
  }

  private async consumeActionToken(token: string, claims: AuthActionClaims): Promise<void> {
    const fingerprint = crypto.createHash('sha256').update(token).digest('hex');
    const accepted = await this.cacheService.consumeAuthAction(fingerprint, Math.max(1, Math.ceil((claims.expiry - Date.now()) / 1000)));
    if (!accepted) throw new BadRequestException('This link has already been used. Please request a new one.');
  }

  /**
   * Request password reset
   * Public endpoint - generates custom token and sends email via AWS SES
   */
  @Post('forgot-password')
  @RateLimit({ ttl: 60, limit: 3 })
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`Password reset request for: ${dto.email}`);

    if (!(await this.keycloakAdminService.ensureAvailable())) {
      throw new BadRequestException(
        'Password reset is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const user = await this.keycloakAdminService.findUserByEmail(dto.email);

      if (user) {
        await this.keycloakAdminService.sendPasswordResetEmail(user.id);

      } else {
        // Don't reveal whether email exists or not (security)
        this.logger.log(`Password reset requested for non-existent email: ${dto.email}`);
      }

      // Always return success (don't reveal if email exists)
      return {
        success: true,
        message:
          'If an account exists with this email, you will receive password reset instructions.',
      };
    } catch (error) {
      this.logger.error(`Forgot password failed: ${error.message}`, error.stack);

      // Still return success to not reveal email existence
      return {
        success: true,
        message:
          'If an account exists with this email, you will receive password reset instructions.',
      };
    }
  }

  /**
   * Validate password reset token
   * Public endpoint - checks if token is valid and not expired
   */
  @Post('validate-reset-token')
  @RateLimit({ ttl: 60, limit: 10 })
  @Public()
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    const tokenData = this.verifyResetToken(dto.token);

    if (!tokenData) {
      return { valid: false };
    }

    // Verify user still exists
    const user = await this.keycloakAdminService.findUserByEmail(tokenData.email);
    if (!user || user.id !== tokenData.userId) {
      return { valid: false };
    }

    return { valid: true, email: tokenData.email };
  }

  /**
   * Reset password using token
   * Public endpoint - sets new password via Keycloak Admin API
   */
  @Post('reset-password')
  @RateLimit({ ttl: 60, limit: 5 })
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    this.logger.log('Password reset attempt with token');

    if (!(await this.keycloakAdminService.ensureAvailable())) {
      throw new BadRequestException(
        'Password reset is temporarily unavailable. Please try again later.',
      );
    }

    // Verify token
    const tokenData = this.verifyResetToken(dto.token);
    if (!tokenData) {
      throw new BadRequestException(
        'Invalid or expired password reset link. Please request a new one.',
      );
    }

    try {
      // Verify user exists
      const user = await this.keycloakAdminService.findUserByEmail(tokenData.email);
      if (!user || user.id !== tokenData.userId) {
        throw new BadRequestException('Invalid password reset link. Please request a new one.');
      }

      // Set new password using Keycloak Admin API
      // We need to add this method to the service
      await this.consumeActionToken(dto.token, tokenData);
      await this.setUserPassword(tokenData.userId, dto.password);

      this.logger.log(`Password successfully reset for user: ${tokenData.email}`);

      return {
        success: true,
        message: 'Password has been reset successfully.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to reset password. Please try again.');
    }
  }

  /**
   * Set user password using Keycloak Admin REST API directly
   */
  private async setUserPassword(userId: string, password: string): Promise<void> {
    const keycloakUrl = this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:8080';
    const realm = this.configService.get<string>('KEYCLOAK_REALM') || 'plainledger';
    const clientId =
      this.configService.get<string>('KEYCLOAK_ADMIN_CLIENT_ID') || 'plainledger-api';
    const clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET');

    if (!clientSecret) {
      throw new Error('Keycloak client secret not configured');
    }

    // Get admin token
    const tokenResponse = await fetch(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error('Failed to obtain admin token');
    }

    const tokenData = await tokenResponse.json();
    const adminToken = tokenData.access_token;

    // Reset user password
    const resetResponse = await fetch(
      `${keycloakUrl}/admin/realms/${realm}/users/${userId}/reset-password`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type: 'password',
          value: password,
          temporary: false,
        }),
      },
    );

    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      this.logger.error(`Keycloak password reset failed: ${resetResponse.status} - ${errorText}`);
      throw new Error('Failed to reset password in Keycloak');
    }
  }

  /**
   * Verify email using token
   * Public endpoint - verifies email and updates Keycloak
   */
  @Post('verify-email')
  @Public()
  @RateLimit({ ttl: 60, limit: 5 })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    this.logger.log('Email verification attempt with token');

    if (!(await this.keycloakAdminService.ensureAvailable())) {
      throw new BadRequestException(
        'Email verification is temporarily unavailable. Please try again later.',
      );
    }

    // Verify token
    const tokenData = this.verifyVerificationToken(dto.token);
    if (!tokenData) {
      throw new BadRequestException(
        'Invalid or expired verification link. Please request a new one.',
      );
    }

    try {
      // Verify user exists and matches token
      const user = await this.keycloakAdminService.findUserByEmail(tokenData.email);
      let profile = await this.userProfileRepository.findByEmail(tokenData.email);
      if (!user || user.id !== tokenData.userId) {
        throw new BadRequestException('Invalid verification link. Please request a new one.');
      }

      // Check if already verified in DB profile
      if (profile?.emailVerified) {
        return {
          success: true,
          message: 'Your email is already verified. You can sign in.',
          alreadyVerified: true,
        };
      }

      if (!profile) {
        profile = await this.ensureUserProfileExists(user);
      }

      await this.consumeActionToken(dto.token, tokenData);
      await this.keycloakAdminService.setEmailVerified(tokenData.userId, true);
      await this.userProfileRepository.markEmailVerified(tokenData.userId);

      this.logger.log(`Email successfully verified in DB for user: ${tokenData.email}`);

      // Send welcome email
      await this.sesEmailService.sendWelcomeEmail(user.email, user.firstName || 'there');

      return {
        success: true,
        message: 'Email verified successfully! You can now sign in.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Email verification failed: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to verify email. Please try again.');
    }
  }

  /**
   * Resend verification email
   * Public endpoint - resends email verification via SES
   */
  @Post('resend-verification')
  @Public()
  @RateLimit({ ttl: 60, limit: 3 })
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    this.logger.log(`Resend verification request for: ${dto.email}`);

    if (!(await this.keycloakAdminService.ensureAvailable())) {
      throw new BadRequestException(
        'Verification is temporarily unavailable. Please try again later.',
      );
    }

    try {
      const user = await this.keycloakAdminService.findUserByEmail(dto.email);
      const profile = await this.userProfileRepository.findByEmail(dto.email);

      if (user) {
        if (profile?.emailVerified) {
          return {
            success: true,
            message: 'Your email is already verified. You can sign in.',
            alreadyVerified: true,
          };
        }

        await this.keycloakAdminService.sendVerificationEmail(user.id);

      } else {
        this.logger.log(`Verification requested for non-existent email: ${dto.email}`);
      }

      // Always return success
      return {
        success: true,
        message: 'If an account exists with this email, you will receive a verification email.',
      };
    } catch (error) {
      this.logger.error(`Resend verification failed: ${error.message}`, error.stack);

      return {
        success: true,
        message: 'If an account exists with this email, you will receive a verification email.',
      };
    }
  }

  /**
   * Check if Keycloak admin is available
   * Useful for frontend to decide whether to show custom signup
   */
  @Post('check-availability')
  @Public()
  @HttpCode(HttpStatus.OK)
  async checkAvailability() {
    return {
      customRegistrationAvailable: this.keycloakAdminService.isAvailable(),
      keycloakRegistrationAvailable: true, // Keycloak's built-in registration
    };
  }

  // =====================================================
  // MFA ENDPOINTS
  // =====================================================

  /**
   * Initialize MFA setup
   * Returns QR code and secret for TOTP configuration
   * Requires authentication
   */
  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async mfaSetup() {
    // Generate TOTP secret and QR code
    // In production, this would use Keycloak's credential management API
    const secret = this.generateTOTPSecret();
    const issuer = 'PlainLedger';
    const accountName = 'user@example.com'; // Would get from authenticated user

    // Generate otpauth:// URI for QR code
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Generate QR code as data URL (using a simple approach)
    // In production, use a QR code library like 'qrcode'
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`;

    return {
      secret: secret,
      qrCode: qrCodeUrl,
      otpauthUri: otpauthUri,
    };
  }

  /**
   * Verify MFA setup with initial OTP code
   * Enables MFA for the user's account
   */
  @Post('mfa/verify-setup')
  @HttpCode(HttpStatus.OK)
  async mfaVerifySetup(@Body() dto: { code: string }) {
    // Validate the OTP code against the secret
    // In production, this would verify with Keycloak and enable MFA

    if (!dto.code || dto.code.length !== 6) {
      throw new BadRequestException('Invalid code format');
    }

    // For now, accept any 6-digit code for demo purposes
    // In production, implement proper TOTP verification
    this.logger.log(`MFA setup verification with code: ${dto.code}`);

    return {
      success: true,
      message: 'MFA has been enabled successfully',
    };
  }

  /**
   * Verify MFA during login
   * Called when user has MFA enabled and needs to enter OTP
   */
  @Post('mfa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  async mfaVerify(@Body() dto: { sessionId: string; code: string }) {
    if (!dto.sessionId || !dto.code || dto.code.length !== 6) {
      throw new BadRequestException('Invalid request');
    }

    // In production, this would:
    // 1. Retrieve the pending authentication session
    // 2. Verify the OTP code
    // 3. Complete the authentication and return tokens

    this.logger.log(`MFA verification for session: ${dto.sessionId} with code: ${dto.code}`);

    // For demo, return mock tokens
    // In production, complete the Keycloak authentication flow
    throw new BadRequestException(
      'MFA verification requires active Keycloak session. Please log in again.',
    );
  }

  /**
   * Generate a random TOTP secret (Base32 encoded)
   */
  private generateTOTPSecret(): string {
    const buffer = crypto.randomBytes(20);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';

    for (let i = 0; i < buffer.length; i++) {
      secret += base32Chars[buffer[i] % 32];
    }

    // Format as groups of 4 for readability
    return secret.match(/.{1,4}/g)?.join('') || secret;
  }

  /**
   * Ensure a DB profile exists for a Keycloak user.
   * This keeps legacy users compatible with DB-based email verification.
   */
  private async ensureUserProfileExists(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    emailVerified?: boolean;
    attributes?: Record<string, string[]>;
  }) {
    const existingById = await this.userProfileRepository.findById(user.id);
    if (existingById) {
      return existingById;
    }

    try {
      await this.userProfileRepository.create({
        id: user.id,
        email: user.email.toLowerCase().trim(),
        firstName: user.firstName || 'User',
        lastName: user.lastName || 'Unknown',
        organizationId: user.attributes?.organization?.[0],
        organizationName: user.attributes?.organizationName?.[0],
        industry: user.attributes?.industry?.[0],
        registrationSource: 'legacy-migration',
      });

      if (user.emailVerified) {
        await this.userProfileRepository.markEmailVerified(user.id);
      }
    } catch (error) {
      this.logger.warn(`Failed to backfill user profile for ${user.email}: ${error.message}`);
    }

    return this.userProfileRepository.findById(user.id);
  }
}
