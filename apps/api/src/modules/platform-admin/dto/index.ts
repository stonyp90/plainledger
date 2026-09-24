import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsEmail, IsBoolean, IsNumber, IsArray, IsEnum } from 'class-validator';

// ============================================
// Organization DTOs
// ============================================

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Unique tenant identifier', example: 'acme-corp-001' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: 'Organization display name', example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Legal business name', example: 'Acme Corporation Inc.' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: 'Industry classification', example: 'Technology' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Default currency', example: 'CAD', default: 'CAD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Fiscal year end month (1-12)', example: 12, default: 12 })
  @IsOptional()
  @IsNumber()
  fiscalYearEndMonth?: number;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Legal business name' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional({ description: 'Industry classification' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Default currency' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Fiscal year end month (1-12)' })
  @IsOptional()
  @IsNumber()
  fiscalYearEndMonth?: number;

  @ApiPropertyOptional({ description: 'Subscription plan ID', example: 'enterprise' })
  @IsOptional()
  @IsString()
  subscriptionPlanId?: string;
}

export class OrganizationListResponseDto {
  @ApiProperty({ description: 'List of organizations', type: 'array' })
  organizations: any[];

  @ApiProperty({ description: 'Total count', example: 100 })
  total: number;
}

export class OrganizationStatsDto {
  @ApiProperty({ description: 'Total organizations', example: 150 })
  totalOrganizations: number;

  @ApiProperty({ description: 'Active organizations', example: 142 })
  activeOrganizations: number;

  @ApiProperty({ description: 'Organizations by plan', example: { starter: 50, professional: 80, enterprise: 20 } })
  byPlan: Record<string, number>;

  @ApiProperty({ description: 'Organizations by industry', example: { Technology: 45, Finance: 30, Healthcare: 25 } })
  byIndustry: Record<string, number>;
}

// ============================================
// User DTOs
// ============================================

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Organization ID to add user to' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'User role in organization', example: 'member', default: 'member' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Send invitation email', default: true })
  @IsOptional()
  @IsBoolean()
  sendInvite?: boolean;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'User role' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class InviteUserDto {
  @ApiProperty({ description: 'User email address', example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Organization ID to invite user to' })
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional({ description: 'User role', example: 'member', default: 'member' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UserListResponseDto {
  @ApiProperty({ description: 'List of users', type: 'array' })
  users: any[];

  @ApiProperty({ description: 'Total count', example: 500 })
  total: number;
}

export class UserStatsDto {
  @ApiProperty({ description: 'Total users', example: 1250 })
  totalUsers: number;

  @ApiProperty({ description: 'Active users', example: 1180 })
  activeUsers: number;

  @ApiProperty({ description: 'Verified users', example: 1100 })
  verifiedUsers: number;

  @ApiProperty({ description: 'Recent signups (7 days)', example: 45 })
  recentSignups: number;
}

// ============================================
// Admin User DTOs
// ============================================

export class CreateAdminUserDto {
  @ApiPropertyOptional({ description: 'Keycloak user ID (auto-resolved from email if omitted)' })
  @IsOptional()
  @IsString()
  keycloakId?: string;

  @ApiProperty({ description: 'Admin email', example: 'admin@plainledger.ca' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Display name', example: 'John Admin' })
  @IsString()
  displayName: string;

  @ApiProperty({ description: 'Group IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[];
}

export class AssignGroupsDto {
  @ApiProperty({ description: 'Group IDs to assign', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  groupIds: string[];
}

export class AdminUserResponseDto {
  @ApiProperty({ description: 'Admin user details' })
  user: any;

  @ApiProperty({ description: 'List of permissions', type: [String] })
  permissions: string[];

  @ApiProperty({ description: 'List of groups', type: [String] })
  groups: string[];

  @ApiProperty({ description: 'Maximum tier level', example: 10 })
  maxTierLevel: number;
}

// ============================================
// Audit DTOs
// ============================================

export class AuditLogFilterDto {
  @ApiPropertyOptional({ description: 'Filter by admin user ID' })
  @IsOptional()
  @IsUUID()
  adminUserId?: string;

  @ApiPropertyOptional({ description: 'Filter by action', example: 'org:create' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by resource type', example: 'org' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by target organization ID' })
  @IsOptional()
  @IsUUID()
  targetOrgId?: string;

  @ApiPropertyOptional({ description: 'Filter by success status' })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Limit results', default: 100 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log entries', type: 'array' })
  logs: any[];

  @ApiProperty({ description: 'Total count', example: 1000 })
  total: number;
}

// ============================================
// Permission DTOs
// ============================================

export class PermissionDto {
  @ApiProperty({ description: 'Permission ID', example: 'org:view' })
  id: string;

  @ApiProperty({ description: 'Permission name', example: 'View Organization' })
  name: string;

  @ApiProperty({ description: 'Permission description' })
  description: string;

  @ApiProperty({ description: 'Permission category', example: 'org' })
  category: string;

  @ApiProperty({ description: 'Is dangerous action', example: false })
  isDangerous: boolean;
}

export class GroupDto {
  @ApiProperty({ description: 'Group ID' })
  id: string;

  @ApiProperty({ description: 'Group name', example: 'L1 Support' })
  name: string;

  @ApiProperty({ description: 'Group description' })
  description: string;

  @ApiProperty({ description: 'Tier level', example: 1 })
  tierLevel: number;

  @ApiProperty({ description: 'Is system group', example: true })
  isSystem: boolean;

  @ApiProperty({ description: 'Assigned permissions', type: [PermissionDto] })
  permissions: PermissionDto[];
}
