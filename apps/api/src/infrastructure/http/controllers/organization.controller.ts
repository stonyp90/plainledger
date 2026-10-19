import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Length,
  IsInt,
  Min,
  Max,
  Matches,
  IsEmail,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateClaimedTenant, TenantGuard } from '../../auth/tenant.guard';
import { Public } from 'nest-keycloak-connect';
import { GetOrganizationUseCase } from '@application/use-cases/get-organization.use-case';
import {
  OrganizationActor,
  OrganizationMembershipService,
} from '@application/services/organization-membership.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RateLimit } from '../decorators/rate-limit.decorator';

class CreateOrganizationDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/)
  tenantId: string;
  @IsString()
  @Length(2, 255)
  name: string;
  @IsOptional()
  @IsString()
  @Length(1, 255)
  legalName?: string;
  @IsOptional()
  @IsString()
  @Length(1, 50)
  taxNumber?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  fiscalYearEndMonth?: number;
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;
  @IsOptional()
  @IsString()
  @Length(1, 100)
  industry?: string;
}

class MemberRoleDto {
  @IsIn(['owner', 'admin', 'member', 'viewer'])
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

class InvitationDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @Length(3, 255)
  email: string;

  @IsIn(['admin', 'member', 'viewer'])
  role: 'admin' | 'member' | 'viewer';
}

class InvitationTokenDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  token: string;
}

interface OrganizationRequest {
  user: OrganizationActor;
}

@Controller('organizations')
@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(
    private readonly memberships: OrganizationMembershipService,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
  ) {}

  @Post()
  @UseGuards(TenantGuard)
  @CreateClaimedTenant()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Organization already exists' })
  async create(@Req() request: OrganizationRequest, @Body() dto: CreateOrganizationDto) {
    return this.memberships.createOwnedOrganization(request.user, dto);
  }

  @Post('invitations/preview')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 30, ttl: 60 })
  @ApiOperation({ summary: 'Preview a one-time invitation without consuming it' })
  async previewInvitation(@Body() dto: InvitationTokenDto) {
    return this.memberships.previewInvitation(dto.token);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, ttl: 60 })
  @ApiOperation({ summary: 'Accept an invitation using the verified invited account' })
  async acceptInvitation(@Req() request: OrganizationRequest, @Body() dto: InvitationTokenDto) {
    const organization = await this.memberships.acceptInvitationForExistingUser(
      dto.token,
      request.user,
    );
    return { ...organization, refreshSession: true };
  }

  @Get(':tenantId/members')
  @UseGuards(TenantGuard)
  async members(@Req() request: OrganizationRequest, @Param('tenantId') tenantId: string) {
    return this.memberships.getMembers(request.user, tenantId);
  }

  @Patch(':tenantId/members/:memberId')
  @UseGuards(TenantGuard)
  async updateMemberRole(
    @Req() request: OrganizationRequest,
    @Param('tenantId') tenantId: string,
    @Param('memberId') memberId: string,
    @Body() dto: MemberRoleDto,
  ) {
    return this.memberships.updateMemberRole(request.user, tenantId, memberId, dto.role);
  }

  @Delete(':tenantId/members/:memberId')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Req() request: OrganizationRequest,
    @Param('tenantId') tenantId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.memberships.removeMember(request.user, tenantId, memberId);
  }

  @Get(':tenantId/invitations')
  @UseGuards(TenantGuard)
  async invitations(@Req() request: OrganizationRequest, @Param('tenantId') tenantId: string) {
    return this.memberships.getInvitations(request.user, tenantId);
  }

  @Post(':tenantId/invitations')
  @UseGuards(TenantGuard)
  @RateLimit({ limit: 10, ttl: 60 })
  async invite(
    @Req() request: OrganizationRequest,
    @Param('tenantId') tenantId: string,
    @Body() dto: InvitationDto,
  ) {
    return this.memberships.inviteMember(request.user, tenantId, dto.email, dto.role);
  }

  @Delete(':tenantId/invitations/:invitationId')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeInvitation(
    @Req() request: OrganizationRequest,
    @Param('tenantId') tenantId: string,
    @Param('invitationId') invitationId: string,
  ) {
    await this.memberships.revokeInvitation(request.user, tenantId, invitationId);
  }

  @Post(':tenantId/invitations/:invitationId/resend')
  @UseGuards(TenantGuard)
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, ttl: 60 })
  async resendInvitation(
    @Req() request: OrganizationRequest,
    @Param('tenantId') tenantId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.memberships.resendInvitation(request.user, tenantId, invitationId);
  }

  @Get(':tenantId')
  @UseGuards(TenantGuard)
  @ApiOperation({ summary: 'Get organization by tenant ID' })
  @ApiResponse({ status: 200, description: 'Organization found' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(@Param('tenantId') tenantId: string) {
    return await this.getOrganizationUseCase.execute({ tenantId });
  }
}
