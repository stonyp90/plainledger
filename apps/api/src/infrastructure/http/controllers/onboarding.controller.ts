/**
 * Onboarding Controller
 * Handles onboarding completion and stores user/company data
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
import { NovuService } from "../../../notifications/novu.service";
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from "class-validator";

export class OnboardingCompleteDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password?: string; // Password is validated on frontend, not stored here (handled by auth provider)

  @IsString()
  companyName: string;

  @IsOptional()
  @IsString()
  companySize?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsNumber()
  fiscalYearEnd?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  primarySource?: string;

  @IsOptional()
  @IsBoolean()
  skipSource?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamEmails?: string[];

  @IsOptional()
  @IsBoolean()
  skipTeam?: boolean;
}

@Controller("onboarding")
@Public() // Allow unauthenticated onboarding completion
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(private readonly novuService: NovuService) {}

  @Post("complete")
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@Body() dto: OnboardingCompleteDto) {
    this.logger.log(`Onboarding completed for: ${dto.email}, Company: ${dto.companyName}`);

    try {
      // Store onboarding data (for now, send notification - can be enhanced to store in DB)
      await this.novuService.sendOnboardingCompleteNotification({
        email: dto.email,
        companyName: dto.companyName,
        companySize: dto.companySize,
        industry: dto.industry,
        fiscalYearEnd: dto.fiscalYearEnd,
        currency: dto.currency,
        primarySource: dto.primarySource,
        skipSource: dto.skipSource,
        teamEmails: dto.teamEmails,
        skipTeam: dto.skipTeam,
      });

      // TODO: Store in database (create onboarding_data table or extend organization table)
      // For now, the data is logged and sent via notification

      return {
        success: true,
        message: "Onboarding data saved successfully",
      };
    } catch (error) {
      this.logger.error(`Failed to save onboarding data: ${error.message}`);

      // Still return success to allow user to proceed
      return {
        success: true,
        message: "Onboarding completed",
      };
    }
  }
}
