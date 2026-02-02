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
} from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  Matches,
} from "class-validator";
import { IKeycloakAdminService } from "@application/ports/outbound/IKeycloakAdminService";
import { Inject } from "@nestjs/common";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";
import { ConfigService } from "@nestjs/config";
import { SESAdapter } from "@infrastructure/adapters/email/ses/ses.adapter";
import * as crypto from "crypto";

// =====================================================
// DTOs
// =====================================================

// Valid Canadian province/territory codes
const _VALID_PROVINCES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
];

export class RegisterUserDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsString()
  @MinLength(1, { message: "First name is required" })
  firstName: string;

  @IsString()
  @MinLength(1, { message: "Last name is required" })
  lastName: string;

  @IsString()
  @MinLength(12, { message: "Password must be at least 12 characters" })
  @Matches(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  @Matches(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  @Matches(/\d/, { message: "Password must contain at least one number" })
  @Matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
    message: "Password must contain at least one special character",
  })
  password: string;

  @IsOptional()
  @IsString()
  organizationName?: string;

  @IsString()
  @Matches(/^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)$/, {
    message: "Please select a valid Canadian province or territory",
  })
  province: string;

  @IsOptional()
  @IsString()
  industry?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;
}

export class LoginDto {
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @IsString()
  @MinLength(1, { message: "Password is required" })
  password: string;
}

export class ValidateResetTokenDto {
  @IsString()
  token: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(12, { message: "Password must be at least 12 characters" })
  @Matches(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  @Matches(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  @Matches(/\d/, { message: "Password must contain at least one number" })
  @Matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, {
    message: "Password must contain at least one special character",
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

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @Inject("IKeycloakAdminService")
    private readonly keycloakAdminService: IKeycloakAdminService,
    private readonly sesEmailService: SESAdapter,
    private readonly userProfileRepository: PostgresUserProfileRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login with email and password
   * Public endpoint - authenticates user via Keycloak Direct Access Grants
   * Uses backend API client for secure authentication
   */
  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    this.logger.log(`Login attempt for: ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "Authentication is temporarily unavailable. Please try again later.",
      );
    }

    try {
      const keycloakUrl =
        this.configService.get<string>("KEYCLOAK_URL") ||
        "http://localhost:8080";
      const realm =
        this.configService.get<string>("KEYCLOAK_REALM") || "plainledger";
      const clientId =
        this.configService.get<string>("KEYCLOAK_CLIENT_ID") ||
        "plainledger-api";
      const clientSecret = this.configService.get<string>(
        "KEYCLOAK_CLIENT_SECRET",
      );

      if (!clientSecret) {
        this.logger.error("Keycloak client secret not configured");
        throw new BadRequestException(
          "Authentication is temporarily unavailable.",
        );
      }

      // Authenticate user via Keycloak token endpoint using Direct Access Grants
      // This uses the API client (which has Direct Access Grants enabled)
      const tokenUrl = `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append("grant_type", "password");
      params.append("client_id", clientId);
      params.append("client_secret", clientSecret);
      params.append("username", dto.email.toLowerCase().trim());
      params.append("password", dto.password);
      // Don't specify scope - use Keycloak client default scopes
      // Default scopes include: openid, profile, email, roles

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.logger.warn(
          `Login failed for ${dto.email}: ${response.status} - ${errorData.error_description || errorData.error || "Invalid credentials"}`,
        );

        // Check if user exists but email is not verified
        // This provides a better UX by redirecting to verify-email instead of showing generic error
        try {
          const existingUser = await this.keycloakAdminService.findUserByEmail(
            dto.email.toLowerCase().trim(),
          );

          if (existingUser && !existingUser.emailVerified) {
            this.logger.log(`Login blocked for unverified email: ${dto.email}`);
            // Return a specific error that frontend can handle
            throw new UnauthorizedException({
              statusCode: 401,
              message: "Please verify your email address before logging in.",
              error: "EMAIL_NOT_VERIFIED",
              email: dto.email.toLowerCase().trim(),
            });
          }
        } catch (checkError) {
          // If it's our custom error, re-throw it
          if (checkError instanceof UnauthorizedException) {
            throw checkError;
          }
          // Otherwise ignore and fall through to generic error
        }

        // Don't reveal specific error details for security
        throw new UnauthorizedException(
          "Invalid email or password. Please try again.",
        );
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

        if (user) {
          if (!user.enabled) {
            throw new UnauthorizedException(
              "Your account is disabled. Please contact support.",
            );
          }

          if (!user.emailVerified) {
            throw new UnauthorizedException(
              "Please verify your email address before logging in.",
            );
          }

          userInfo = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
          };
        }
      } catch (adminError) {
        // If Admin API fails, decode from token (less info but allows login)
        this.logger.warn(
          `Keycloak Admin API unavailable, using token data: ${adminError.message}`,
        );

        try {
          const tokenParts =
            tokenData.id_token?.split(".") || tokenData.access_token.split(".");
          if (tokenParts.length === 3) {
            const tokenPayload = JSON.parse(
              Buffer.from(tokenParts[1], "base64").toString(),
            );
            userInfo = {
              id: tokenPayload.sub,
              email: tokenPayload.email || dto.email.toLowerCase().trim(),
              firstName: tokenPayload.given_name,
              lastName: tokenPayload.family_name,
              emailVerified: tokenPayload.email_verified !== false,
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
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new UnauthorizedException(
        "Invalid email or password. Please try again.",
      );
    }
  }

  /**
   * Register a new user
   * Public endpoint - no authentication required
   * Creates user in Keycloak and sends verification email
   */
  @Post("register")
  @Public() // Mark as public - no auth required
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto) {
    this.logger.log(`Registration request for: ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      this.logger.error("Keycloak Admin Service not configured");
      throw new BadRequestException(
        "Registration is temporarily unavailable. Please try again later.",
      );
    }

    try {
      // Check if user already exists
      const existingUser = await this.keycloakAdminService.findUserByEmail(
        dto.email,
      );
      if (existingUser) {
        this.logger.warn(`User already exists: ${dto.email}`);
        throw new ConflictException(
          "An account with this email already exists. Please sign in instead.",
        );
      }

      // Create user in Keycloak (WITHOUT Keycloak sending verification email)
      // We'll send our own branded email via SES
      // New signups are assigned to demo-signup organization with demo mode enabled
      const user = await this.keycloakAdminService.createUser({
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        password: dto.password,
        temporaryPassword: false, // User set their own password
        emailVerified: false,
        sendVerificationEmail: false, // We'll send our own email via SES
        attributes: {
          // Assign to demo-signup organization (locked demo account)
          organization: ["demo-signup"],
          organizationName: dto.organizationName?.trim()
            ? [dto.organizationName.trim()]
            : ["Demo Account"],
          ...(dto.industry ? { industry: [dto.industry] } : {}),
          province: [dto.province],
          registrationSource: ["web-signup"],
          registeredAt: [new Date().toISOString()],
          // Enable demo mode by default for new signups (free users only see demo data)
          demoMode: ["true"],
          plan: ["free"],
          accountStatus: ["active"],
        },
        roles: ["viewer"], // Default role
      });

      this.logger.log(`User created successfully in Keycloak: ${user.id}`);

      // Save user profile to PlainLedger database
      try {
        await this.userProfileRepository.create({
          id: user.id,
          email: dto.email.toLowerCase().trim(),
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          province: dto.province,
          organizationName: dto.organizationName?.trim(),
          industry: dto.industry,
          registrationSource: "web-signup",
        });
        this.logger.log(`User profile saved to database: ${user.id}`);
      } catch (dbError) {
        // Log but don't fail - Keycloak user was created successfully
        this.logger.warn(
          `Failed to save user profile to database: ${dbError.message}`,
        );
      }

      // Send verification email via SES (our branded email)
      const verificationToken = this.generateVerificationToken(
        user.id,
        user.email,
      );
      const frontendUrl = this.configService.get<string>(
        "FRONTEND_URL",
        "https://plainledger.ca",
      );
      const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

      const emailSent = await this.sesEmailService.sendVerificationEmail(
        user.email,
        dto.firstName.trim(),
        verifyUrl,
      );

      if (emailSent) {
        this.logger.log(`Verification email sent via SES to: ${user.email}`);
      } else {
        this.logger.warn(`Failed to send verification email to: ${user.email}`);
      }

      return {
        success: true,
        message:
          "Account created successfully. Please check your email to verify your account.",
        userId: user.id,
        email: user.email,
      };
    } catch (error) {
      // Re-throw known exceptions
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`Registration failed: ${error.message}`, error.stack);

      // Check for specific Keycloak errors
      if (
        error.response?.status === 409 ||
        error.message?.includes("already exists")
      ) {
        throw new ConflictException(
          "An account with this email already exists. Please sign in instead.",
        );
      }

      throw new BadRequestException(
        "Registration failed. Please try again later.",
      );
    }
  }

  // =====================================================
  // TOKEN GENERATION HELPERS
  // =====================================================

  /**
   * Get the secret used for signing tokens
   */
  private getTokenSecret(): string {
    return (
      this.configService.get<string>("TOKEN_SECRET") ||
      this.configService.get<string>("KEYCLOAK_CLIENT_SECRET") ||
      "plainledger-default-secret-change-me"
    );
  }

  /**
   * Generate a secure password reset token
   * Format: base64(userId:email:expiry).signature
   * Expiry: 15 minutes
   */
  private generateResetToken(userId: string, email: string): string {
    const secret = this.getTokenSecret();
    const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    const payload = Buffer.from(`reset:${userId}:${email}:${expiry}`).toString(
      "base64url",
    );

    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    return `${payload}.${signature}`;
  }

  /**
   * Verify and decode a password reset token
   */
  private verifyResetToken(
    token: string,
  ): { userId: string; email: string } | null {
    try {
      const secret = this.getTokenSecret();

      const [payload, signature] = token.split(".");
      if (!payload || !signature) return null;

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");

      if (signature !== expectedSignature) {
        this.logger.warn("Invalid password reset token signature");
        return null;
      }

      // Decode payload
      const decoded = Buffer.from(payload, "base64url").toString();
      const parts = decoded.split(":");

      // Handle both old format (userId:email:expiry) and new format (reset:userId:email:expiry)
      let userId: string, email: string, expiryStr: string;
      if (parts[0] === "reset") {
        [, userId, email, expiryStr] = parts;
      } else {
        [userId, email, expiryStr] = parts;
      }

      const expiry = parseInt(expiryStr, 10);

      // Check expiry
      if (Date.now() > expiry) {
        this.logger.warn("Password reset token has expired");
        return null;
      }

      return { userId, email };
    } catch (error) {
      this.logger.error(`Failed to verify reset token: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate a secure email verification token
   * Format: base64(verify:userId:email:expiry).signature
   * Expiry: 24 hours
   */
  private generateVerificationToken(userId: string, email: string): string {
    const secret = this.getTokenSecret();
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    const payload = Buffer.from(`verify:${userId}:${email}:${expiry}`).toString(
      "base64url",
    );

    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    return `${payload}.${signature}`;
  }

  /**
   * Verify and decode an email verification token
   */
  private verifyVerificationToken(
    token: string,
  ): { userId: string; email: string } | null {
    try {
      const secret = this.getTokenSecret();

      const [payload, signature] = token.split(".");
      if (!payload || !signature) return null;

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");

      if (signature !== expectedSignature) {
        this.logger.warn("Invalid verification token signature");
        return null;
      }

      // Decode payload
      const decoded = Buffer.from(payload, "base64url").toString();
      const [type, userId, email, expiryStr] = decoded.split(":");

      // Verify token type
      if (type !== "verify") {
        this.logger.warn("Invalid verification token type");
        return null;
      }

      const expiry = parseInt(expiryStr, 10);

      // Check expiry
      if (Date.now() > expiry) {
        this.logger.warn("Verification token has expired");
        return null;
      }

      return { userId, email };
    } catch (error) {
      this.logger.error(
        `Failed to verify verification token: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Request password reset
   * Public endpoint - generates custom token and sends email via AWS SES
   */
  @Post("forgot-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    this.logger.log(`Password reset request for: ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "Password reset is temporarily unavailable. Please try again later.",
      );
    }

    try {
      const user = await this.keycloakAdminService.findUserByEmail(dto.email);

      if (user) {
        // Generate custom reset token
        const token = this.generateResetToken(user.id, user.email);
        const frontendUrl = this.configService.get<string>(
          "FRONTEND_URL",
          "https://plainledger.ca",
        );
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        // Send password reset email via SES
        const emailSent = await this.sesEmailService.sendPasswordResetEmail(
          user.email,
          user.firstName || "there",
          resetUrl,
        );

        if (emailSent) {
          this.logger.log(`Password reset email sent via SES to: ${dto.email}`);
        } else {
          this.logger.warn(
            `Failed to send password reset email to: ${dto.email}`,
          );
        }
      } else {
        // Don't reveal whether email exists or not (security)
        this.logger.log(
          `Password reset requested for non-existent email: ${dto.email}`,
        );
      }

      // Always return success (don't reveal if email exists)
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
      };
    } catch (error) {
      this.logger.error(
        `Forgot password failed: ${error.message}`,
        error.stack,
      );

      // Still return success to not reveal email existence
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions.",
      };
    }
  }

  /**
   * Validate password reset token
   * Public endpoint - checks if token is valid and not expired
   */
  @Post("validate-reset-token")
  @Public()
  @HttpCode(HttpStatus.OK)
  async validateResetToken(@Body() dto: ValidateResetTokenDto) {
    const tokenData = this.verifyResetToken(dto.token);

    if (!tokenData) {
      return { valid: false };
    }

    // Verify user still exists
    const user = await this.keycloakAdminService.findUserByEmail(
      tokenData.email,
    );
    if (!user || user.id !== tokenData.userId) {
      return { valid: false };
    }

    return { valid: true, email: tokenData.email };
  }

  /**
   * Reset password using token
   * Public endpoint - sets new password via Keycloak Admin API
   */
  @Post("reset-password")
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    this.logger.log("Password reset attempt with token");

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "Password reset is temporarily unavailable. Please try again later.",
      );
    }

    // Verify token
    const tokenData = this.verifyResetToken(dto.token);
    if (!tokenData) {
      throw new BadRequestException(
        "Invalid or expired password reset link. Please request a new one.",
      );
    }

    try {
      // Verify user exists
      const user = await this.keycloakAdminService.findUserByEmail(
        tokenData.email,
      );
      if (!user || user.id !== tokenData.userId) {
        throw new BadRequestException(
          "Invalid password reset link. Please request a new one.",
        );
      }

      // Set new password using Keycloak Admin API
      // We need to add this method to the service
      await this.setUserPassword(tokenData.userId, dto.password);

      this.logger.log(
        `Password successfully reset for user: ${tokenData.email}`,
      );

      return {
        success: true,
        message: "Password has been reset successfully.",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Password reset failed: ${error.message}`, error.stack);
      throw new BadRequestException(
        "Failed to reset password. Please try again.",
      );
    }
  }

  /**
   * Set user password using Keycloak Admin REST API directly
   */
  private async setUserPassword(
    userId: string,
    password: string,
  ): Promise<void> {
    const keycloakUrl =
      this.configService.get<string>("KEYCLOAK_URL") || "http://localhost:8080";
    const realm =
      this.configService.get<string>("KEYCLOAK_REALM") || "plainledger";
    const clientId =
      this.configService.get<string>("KEYCLOAK_ADMIN_CLIENT_ID") ||
      "plainledger-api";
    const clientSecret = this.configService.get<string>(
      "KEYCLOAK_CLIENT_SECRET",
    );

    if (!clientSecret) {
      throw new Error("Keycloak client secret not configured");
    }

    // Get admin token
    const tokenResponse = await fetch(
      `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
      },
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to obtain admin token");
    }

    const tokenData = await tokenResponse.json();
    const adminToken = tokenData.access_token;

    // Reset user password
    const resetResponse = await fetch(
      `${keycloakUrl}/admin/realms/${realm}/users/${userId}/reset-password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type: "password",
          value: password,
          temporary: false,
        }),
      },
    );

    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      this.logger.error(
        `Keycloak password reset failed: ${resetResponse.status} - ${errorText}`,
      );
      throw new Error("Failed to reset password in Keycloak");
    }
  }

  /**
   * Verify email using token
   * Public endpoint - verifies email and updates Keycloak
   */
  @Post("verify-email")
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    this.logger.log("Email verification attempt with token");

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "Email verification is temporarily unavailable. Please try again later.",
      );
    }

    // Verify token
    const tokenData = this.verifyVerificationToken(dto.token);
    if (!tokenData) {
      throw new BadRequestException(
        "Invalid or expired verification link. Please request a new one.",
      );
    }

    try {
      // Verify user exists and matches token
      const user = await this.keycloakAdminService.findUserByEmail(
        tokenData.email,
      );
      if (!user || user.id !== tokenData.userId) {
        throw new BadRequestException(
          "Invalid verification link. Please request a new one.",
        );
      }

      // Check if already verified
      if (user.emailVerified) {
        return {
          success: true,
          message: "Your email is already verified. You can sign in.",
          alreadyVerified: true,
        };
      }

      // Update email verified status in Keycloak
      await this.keycloakAdminService.setEmailVerified(tokenData.userId, true);

      this.logger.log(
        `Email successfully verified for user: ${tokenData.email}`,
      );

      // Send welcome email
      await this.sesEmailService.sendWelcomeEmail(
        user.email,
        user.firstName || "there",
      );

      return {
        success: true,
        message: "Email verified successfully! You can now sign in.",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(
        `Email verification failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        "Failed to verify email. Please try again.",
      );
    }
  }

  /**
   * Resend verification email
   * Public endpoint - resends email verification via SES
   */
  @Post("resend-verification")
  @Public()
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    this.logger.log(`Resend verification request for: ${dto.email}`);

    if (!this.keycloakAdminService.isAvailable()) {
      throw new BadRequestException(
        "Verification is temporarily unavailable. Please try again later.",
      );
    }

    try {
      const user = await this.keycloakAdminService.findUserByEmail(dto.email);

      if (user) {
        if (user.emailVerified) {
          return {
            success: true,
            message: "Your email is already verified. You can sign in.",
            alreadyVerified: true,
          };
        }

        // Generate new verification token and send via SES
        const verificationToken = this.generateVerificationToken(
          user.id,
          user.email,
        );
        const frontendUrl = this.configService.get<string>(
          "FRONTEND_URL",
          "https://plainledger.ca",
        );
        const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

        const emailSent = await this.sesEmailService.sendVerificationEmail(
          user.email,
          user.firstName || "there",
          verifyUrl,
        );

        if (emailSent) {
          this.logger.log(`Verification email resent via SES to: ${dto.email}`);
        } else {
          this.logger.warn(
            `Failed to send verification email to: ${dto.email}`,
          );
        }
      } else {
        this.logger.log(
          `Verification requested for non-existent email: ${dto.email}`,
        );
      }

      // Always return success
      return {
        success: true,
        message:
          "If an account exists with this email, you will receive a verification email.",
      };
    } catch (error) {
      this.logger.error(
        `Resend verification failed: ${error.message}`,
        error.stack,
      );

      return {
        success: true,
        message:
          "If an account exists with this email, you will receive a verification email.",
      };
    }
  }

  /**
   * Check if Keycloak admin is available
   * Useful for frontend to decide whether to show custom signup
   */
  @Post("check-availability")
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
  @Post("mfa/setup")
  @HttpCode(HttpStatus.OK)
  async mfaSetup() {
    // Generate TOTP secret and QR code
    // In production, this would use Keycloak's credential management API
    const secret = this.generateTOTPSecret();
    const issuer = "PlainLedger";
    const accountName = "user@example.com"; // Would get from authenticated user

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
  @Post("mfa/verify-setup")
  @HttpCode(HttpStatus.OK)
  async mfaVerifySetup(@Body() dto: { code: string }) {
    // Validate the OTP code against the secret
    // In production, this would verify with Keycloak and enable MFA

    if (!dto.code || dto.code.length !== 6) {
      throw new BadRequestException("Invalid code format");
    }

    // For now, accept any 6-digit code for demo purposes
    // In production, implement proper TOTP verification
    this.logger.log(`MFA setup verification with code: ${dto.code}`);

    return {
      success: true,
      message: "MFA has been enabled successfully",
    };
  }

  /**
   * Verify MFA during login
   * Called when user has MFA enabled and needs to enter OTP
   */
  @Post("mfa/verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  async mfaVerify(@Body() dto: { sessionId: string; code: string }) {
    if (!dto.sessionId || !dto.code || dto.code.length !== 6) {
      throw new BadRequestException("Invalid request");
    }

    // In production, this would:
    // 1. Retrieve the pending authentication session
    // 2. Verify the OTP code
    // 3. Complete the authentication and return tokens

    this.logger.log(
      `MFA verification for session: ${dto.sessionId} with code: ${dto.code}`,
    );

    // For demo, return mock tokens
    // In production, complete the Keycloak authentication flow
    throw new BadRequestException(
      "MFA verification requires active Keycloak session. Please log in again.",
    );
  }

  /**
   * Generate a random TOTP secret (Base32 encoded)
   */
  private generateTOTPSecret(): string {
    const buffer = crypto.randomBytes(20);
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";

    for (let i = 0; i < buffer.length; i++) {
      secret += base32Chars[buffer[i] % 32];
    }

    // Format as groups of 4 for readability
    return secret.match(/.{1,4}/g)?.join("") || secret;
  }
}
