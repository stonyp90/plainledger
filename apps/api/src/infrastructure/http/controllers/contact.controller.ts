/**
 * Contact Form Controller
 * Handles contact form submissions from the website
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import { SESAdapter } from "../../adapters/email/ses/ses.adapter";
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
} from "class-validator";

export class ContactFormDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referralSource?: string;

  @IsOptional()
  @IsString()
  source?: string;
}

@Controller("contact")
@Public() // No authentication required for contact form
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly sesEmailService: SESAdapter) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async submitContactForm(@Body() dto: ContactFormDto) {
    this.logger.log(`Contact form submission from: ${dto.email}`);

    if (!this.sesEmailService.isAvailable()) {
      this.logger.warn("SES email service not available");
      return {
        success: true,
        message: "Thank you for your message. We will get back to you soon.",
      };
    }

    try {
      // Send notification to internal team
      await this.sesEmailService.sendContactFormNotification({
        name: dto.name,
        email: dto.email,
        company: dto.company,
        phone: dto.phone,
        industry: dto.industry,
        subject: dto.subject,
        message: dto.message,
        referralSource: dto.referralSource,
        source: dto.source || "website",
      });

      // Send auto-reply to sender
      await this.sesEmailService.sendContactFormAutoReply({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
      });

      this.logger.log(`Contact form processed successfully for ${dto.email}`);

      return {
        success: true,
        message: "Thank you for your message. We will get back to you soon.",
      };
    } catch (error) {
      this.logger.error(`Failed to process contact form: ${error.message}`);

      // Still return success to user but log the error
      // This prevents exposing internal errors while ensuring user has good UX
      return {
        success: true,
        message: "Thank you for your message. We will get back to you soon.",
      };
    }
  }
}
