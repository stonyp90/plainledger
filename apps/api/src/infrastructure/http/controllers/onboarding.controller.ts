import {
  BadRequestException, Body, Controller, ForbiddenException, HttpCode, HttpStatus,
  Post, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsInt, IsOptional, IsString,
  Matches, Max, MaxLength, Min, MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '@infrastructure/auth/jwt-auth.guard';
import { AuthenticatedUser } from '@infrastructure/auth/keycloak-token';
import { OrganizationEntity } from '@infrastructure/persistence/postgres/entities/organization.entity';
import { UserProfileEntity } from '@infrastructure/persistence/postgres/entities/user-profile.entity';

export class OnboardingCompleteDto {
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsString() @MinLength(1) @MaxLength(255) @Matches(/\S/) companyName: string;
  @IsOptional() @IsString() @MaxLength(50) companySize?: string;
  @IsOptional() @IsString() @MaxLength(100) industry?: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) fiscalYearEnd?: number;
  @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsString() @MaxLength(50) primarySource?: string;
  @IsOptional() @IsBoolean() skipSource?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsEmail({}, { each: true }) @MaxLength(254, { each: true }) teamEmails?: string[];
  @IsOptional() @IsBoolean() skipTeam?: boolean;
}

/** Onboarding updates the registered membership; it never creates a second tenant. */
@Controller('onboarding')
@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly dataSource: DataSource) {}

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete onboarding for the authenticated user and their existing organization' })
  async completeOnboarding(@Body() dto: OnboardingCompleteDto, @Request() req: { user: AuthenticatedUser }) {
    const user = req.user;
    if (!user?.sub || !user.organizationId || !user.emailVerified) {
      throw new ForbiddenException('Sign in with a verified account to complete onboarding');
    }
    if (dto.email !== undefined && dto.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException('Onboarding email must match the signed-in account');
    }
    return this.dataSource.transaction(async (manager) => {
      const profiles = manager.getRepository(UserProfileEntity);
      const profile = await profiles.findOne({ where: { id: user.sub, isActive: true } });
      if (!profile?.organizationId) throw new ForbiddenException('An active organization membership is required');
      const organizations = manager.getRepository(OrganizationEntity);
      const organization = await organizations.findOne({ where: { id: profile.organizationId }, lock: { mode: 'pessimistic_write' } });
      if (!organization || organization.deletedAt || organization.tenantId !== user.organizationId) {
        throw new ForbiddenException('Onboarding organization does not match the signed-in account');
      }
      const current = await profiles.findOne({ where: { id: user.sub, organizationId: organization.id, isActive: true }, lock: { mode: 'pessimistic_write' } });
      if (!current) throw new ForbiddenException('Organization membership is no longer active');
      const companyName = dto.companyName.trim();
      const changesOrganization = companyName !== organization.name ||
        (dto.industry !== undefined && dto.industry !== organization.industry) ||
        (dto.currency !== undefined && dto.currency !== organization.currency) ||
        (dto.fiscalYearEnd !== undefined && dto.fiscalYearEnd !== organization.fiscalYearEndMonth);
      if (changesOrganization && !['owner', 'admin'].includes(current.role || '')) {
        throw new ForbiddenException('Only organization administrators can change company details');
      }
      if (changesOrganization) {
        organization.name = companyName;
        if (dto.industry !== undefined) organization.industry = dto.industry;
        if (dto.currency !== undefined) organization.currency = dto.currency;
        if (dto.fiscalYearEnd !== undefined) organization.fiscalYearEndMonth = dto.fiscalYearEnd;
        await organizations.save(organization);
      }
      current.organizationName = organization.name;
      current.industry = organization.industry;
      current.onboardingCompleted = true;
      current.onboardingCompletedAt = current.onboardingCompletedAt || new Date();
      current.onboardingData = {
        ...current.onboardingData, companySize: dto.companySize,
        primarySource: dto.primarySource, teamEmails: dto.teamEmails,
      };
      await profiles.save(current);
      return {
        success: true, message: 'Onboarding completed', organizationId: organization.id,
        tenantId: organization.tenantId, teamInvitationsSent: 0,
      };
    });
  }
}
