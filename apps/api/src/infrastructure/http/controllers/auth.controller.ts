/**
 * Auth Controller
 * Public endpoints for user registration and authentication flows
 * Uses Keycloak Admin API to create users programmatically
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
} from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  Matches,
} from "class-validator";
import { KeycloakAdminService } from "@infrastructure/auth/keycloak-admin.service";
import { PostgresUserProfileRepository } from "@infrastructure/persistence/postgres/postgres-user-profile.repository";

// =====================================================
// DTOs
// =====================================================

// Valid Canadian province/territory codes
const VALID_PROVINCES = [
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

// =====================================================
// CONTROLLER
// =====================================================

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly keycloakAdminService: KeycloakAdminService,
    private readonly userProfileRepository: PostgresUserProfileRepository,
  ) {}

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

      // Create user in Keycloak
      const user = await this.keycloakAdminService.createUser({
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        password: dto.password,
        temporaryPassword: false, // User set their own password
        emailVerified: false,
        sendVerificationEmail: true,
        attributes: {
          ...(dto.organizationName
            ? { organizationName: [dto.organizationName] }
            : {}),
          ...(dto.industry ? { industry: [dto.industry] } : {}),
          province: [dto.province],
          registrationSource: ["web-signup"],
          registeredAt: [new Date().toISOString()],
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

  /**
   * Request password reset
   * Public endpoint - sends password reset email
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
        // Send password reset email
        await this.keycloakAdminService.sendPasswordResetEmail(user.id);
        this.logger.log(`Password reset email sent to: ${dto.email}`);
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
   * Resend verification email
   * Public endpoint - resends email verification
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

        // Send verification email
        await this.keycloakAdminService.sendVerificationEmail(user.id);
        this.logger.log(`Verification email resent to: ${dto.email}`);
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
}
