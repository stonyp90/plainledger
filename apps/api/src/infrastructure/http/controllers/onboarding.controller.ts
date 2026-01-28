/**
 * Onboarding Controller
 * Handles onboarding completion and creates organization in database
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from "@nestjs/common";
import { AuthenticatedUser } from "nest-keycloak-connect";
import { NovuService } from "../../../notifications/novu.service";
import { CreateOrganizationUseCase } from "@application/use-cases/create-organization.use-case";
import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
} from "class-validator";

export class OnboardingCompleteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

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

interface KeycloakUser {
  sub: string; // Keycloak user ID
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
}

@Controller("onboarding")
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly novuService: NovuService,
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
  ) {}

  @Post("complete")
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @Body() dto: OnboardingCompleteDto,
    @AuthenticatedUser() user: KeycloakUser,
  ) {
    const userEmail = dto.email || user.email;
    this.logger.log(`Onboarding completed for: ${userEmail}, Company: ${dto.companyName}, User ID: ${user.sub}`);

    try {
      // Create organization in database using Keycloak user ID as tenant ID
      let organization;
      try {
        organization = await this.createOrganizationUseCase.execute({
          tenantId: user.sub, // Use Keycloak user ID as tenant ID
          name: dto.companyName,
          fiscalYearEndMonth: dto.fiscalYearEnd || 12,
          currency: dto.currency || "CAD",
          industry: dto.industry,
        });
        this.logger.log(`Organization created: ${organization.id} for tenant: ${organization.tenantId}`);
      } catch (orgError) {
        // If organization already exists (duplicate), that's okay - user might be re-onboarding
        if (orgError.message?.includes("already exists") || orgError.name === "DuplicateEntityError") {
          this.logger.log(`Organization already exists for tenant: ${user.sub}, continuing with onboarding`);
        } else {
          throw orgError;
        }
      }

      // Send notification for onboarding completion
      try {
        await this.novuService.sendOnboardingCompleteNotification({
          email: userEmail,
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
      } catch (notifError) {
        // Non-critical - log but don't fail
        this.logger.warn(`Failed to send onboarding notification: ${notifError.message}`);
      }

      return {
        success: true,
        message: "Onboarding completed successfully",
        organizationId: organization?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to complete onboarding: ${error.message}`, error.stack);

      // Return error to inform user
      return {
        success: false,
        message: "Failed to complete onboarding. Please try again.",
        error: error.message,
      };
    }
  }
}
