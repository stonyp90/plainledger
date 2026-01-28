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
import { NovuService } from "../../notifications/novu.service";
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

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @IsOptional()
  @IsString()
  source?: string;
}

@Controller("contact")
@Public() // No authentication required for contact form
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly novuService: NovuService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async submitContactForm(@Body() dto: ContactFormDto) {
    this.logger.log(`Contact form submission from: ${dto.email}`);

    try {
      await this.novuService.sendContactFormNotification({
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        source: dto.source || "website",
      });

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
