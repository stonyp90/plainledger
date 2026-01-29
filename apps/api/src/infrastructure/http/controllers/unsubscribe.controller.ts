/**
 * Unsubscribe Controller
 * Handles email unsubscribe requests (RFC 8058 one-click unsubscribe)
 *
 * Supports:
 * - One-click unsubscribe (POST with List-Unsubscribe=One-Click)
 * - Link-based unsubscribe (GET with token)
 * - Preference management page redirect
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Logger,
  HttpCode,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import { UserProfileEntity } from "@infrastructure/persistence/postgres/entities/user-profile.entity";
import { EmailEventEntity } from "@infrastructure/persistence/postgres/entities/email-event.entity";
import { EmailCategory } from "@infrastructure/notifications/ses-email.service";

// ============================================================================
// Controller
// ============================================================================

@Controller("unsubscribe")
export class UnsubscribeController {
  private readonly logger = new Logger(UnsubscribeController.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    @InjectRepository(UserProfileEntity)
    private userProfileRepository: Repository<UserProfileEntity>,
    @InjectRepository(EmailEventEntity)
    private emailEventRepository: Repository<EmailEventEntity>,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      "APP_URL",
      "https://app.plainledger.ca",
    );
    this.secret = this.configService.get<string>(
      "UNSUBSCRIBE_SECRET",
      "plainledger-secret",
    );
  }

  /**
   * One-click unsubscribe (RFC 8058)
   * Email clients send POST request with List-Unsubscribe=One-Click body
   * Endpoint: POST /api/unsubscribe
   */
  @Post()
  @HttpCode(200)
  async oneClickUnsubscribe(
    @Query("token") token: string,
  ): Promise<{ status: string; message: string }> {
    if (!token) {
      throw new BadRequestException("Missing unsubscribe token");
    }

    const decoded = this.verifyToken(token);
    if (!decoded) {
      throw new BadRequestException("Invalid or expired unsubscribe token");
    }

    await this.processUnsubscribe(
      decoded.userId,
      decoded.email,
      decoded.category,
    );

    return {
      status: "success",
      message: "You have been unsubscribed from marketing emails",
    };
  }

  /**
   * Link-based unsubscribe (user clicks link in email)
   * Shows confirmation page or redirects to preferences
   * Endpoint: GET /api/unsubscribe
   */
  @Get()
  async linkUnsubscribe(
    @Query("token") token: string,
    @Query("confirm") confirm: string,
    @Res() res: Response,
  ): Promise<void> {
    // No token - redirect to settings
    if (!token) {
      return res.redirect(`${this.baseUrl}/app/settings/notifications`);
    }

    const decoded = this.verifyToken(token);
    if (!decoded) {
      // Invalid token - redirect to settings with error
      return res.redirect(
        `${this.baseUrl}/app/settings/notifications?error=invalid_token`,
      );
    }

    // If confirm=1, process unsubscribe and show success page
    if (confirm === "1") {
      await this.processUnsubscribe(
        decoded.userId,
        decoded.email,
        decoded.category,
      );

      // Redirect to confirmation page
      return res.redirect(
        `${this.baseUrl}/unsubscribe-success?email=${encodeURIComponent(decoded.email)}`,
      );
    }

    // Show confirmation page (user needs to click again)
    return res.redirect(
      `${this.baseUrl}/unsubscribe-confirm?token=${encodeURIComponent(token)}&email=${encodeURIComponent(decoded.email)}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Token Handling
  // ---------------------------------------------------------------------------

  /**
   * Verify and decode unsubscribe token
   */
  private verifyToken(
    token: string,
  ): { userId: string; email: string; category: EmailCategory } | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 2) {
        return null;
      }

      const [data, signature] = parts;

      // Verify signature
      const expectedSignature = crypto
        .createHmac("sha256", this.secret)
        .update(data)
        .digest("base64url")
        .substring(0, 16);

      if (signature !== expectedSignature) {
        this.logger.warn("Invalid unsubscribe token signature");
        return null;
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(data, "base64url").toString());

      // Check expiration (7 days)
      const tokenAge = Date.now() - payload.t;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (tokenAge > maxAge) {
        this.logger.warn("Expired unsubscribe token");
        return null;
      }

      return {
        userId: payload.u,
        email: payload.e,
        category: payload.c as EmailCategory,
      };
    } catch (error) {
      this.logger.error(`Failed to verify token: ${error.message}`);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Unsubscribe Processing
  // ---------------------------------------------------------------------------

  /**
   * Process unsubscribe request
   */
  private async processUnsubscribe(
    userId: string,
    email: string,
    category: EmailCategory,
  ): Promise<void> {
    try {
      // Find user by ID or email
      let user = await this.userProfileRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        user = await this.userProfileRepository.findOne({
          where: { email },
        });
      }

      if (!user) {
        this.logger.warn(`User not found for unsubscribe: ${email}`);
        return;
      }

      // Update email preferences based on category
      const prefs = user.emailPreferences || {
        marketingOptIn: true,
        productUpdates: true,
        weeklyDigest: true,
        securityAlerts: true,
      };

      switch (category) {
        case "marketing":
          prefs.marketingOptIn = false;
          break;
        case "journey":
          prefs.marketingOptIn = false;
          prefs.productUpdates = false;
          break;
        default:
          // Unsubscribe from all marketing-related emails
          prefs.marketingOptIn = false;
          prefs.productUpdates = false;
          prefs.weeklyDigest = false;
      }

      prefs.unsubscribedAt = new Date().toISOString();
      prefs.unsubscribeReason = "user_requested";

      await this.userProfileRepository.update(
        { id: user.id },
        { emailPreferences: prefs },
      );

      // Log the unsubscribe event
      await this.emailEventRepository.save({
        userId: user.id,
        recipient: email,
        eventType: "unsubscribed",
        emailCategory: category,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

      this.logger.log(`User ${email} unsubscribed from ${category} emails`);
    } catch (error) {
      this.logger.error(`Failed to process unsubscribe: ${error.message}`);
      throw error;
    }
  }
}
